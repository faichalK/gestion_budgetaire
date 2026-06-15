"""
Atlas Finance — Service de génération de rapports budgétaires.
Quatre types : Mensuel, Trimestriel, Annuel, Ad-hoc.
"""
from decimal import Decimal
from datetime import date, timedelta
import calendar

from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone

from .models import (
    Budget, StatutBudget,
    LigneBudgetaire, ConsommationLigne,
    AllocationDepartementale, BudgetAnnuel,
)
from accounts.models import Departement


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _dec(v):
    """Retourne un Decimal depuis n'importe quelle valeur numérique."""
    return Decimal(str(v or 0))


def _taux(consomme, alloue):
    a = _dec(alloue)
    return round(float(_dec(consomme) / a * 100), 2) if a else 0.0


def _periode_mois(mois: int, annee: int):
    """Retourne (date_debut, date_fin) pour un mois donné."""
    dernier_jour = calendar.monthrange(annee, mois)[1]
    return date(annee, mois, 1), date(annee, mois, dernier_jour)


def _periode_trimestre(trimestre: int, annee: int):
    """Retourne (date_debut, date_fin) pour un trimestre donné (1–4)."""
    mois_debut = (trimestre - 1) * 3 + 1
    mois_fin   = mois_debut + 2
    dernier_jour = calendar.monthrange(annee, mois_fin)[1]
    return date(annee, mois_debut, 1), date(annee, mois_fin, dernier_jour)


def _periode_annee(annee: int):
    return date(annee, 1, 1), date(annee, 12, 31)


# ─── Requêtes communes ────────────────────────────────────────────────────────

def _budgets_actifs(date_debut=None, date_fin=None, departements_ids=None):
    """Budgets non-brouillons dans la période, avec prefetch."""
    qs = (
        Budget.objects
        .exclude(statut=StatutBudget.BROUILLON)
        .select_related('departement', 'gestionnaire', 'comptable', 'budget_annuel')
    )
    if date_debut:
        qs = qs.filter(date_fin__gte=date_debut)
    if date_fin:
        qs = qs.filter(date_debut__lte=date_fin)
    if departements_ids:
        qs = qs.filter(departement_id__in=departements_ids)
    return qs


def _consommations_periode(date_debut, date_fin, departements_ids=None, lignes_ids=None):
    """ConsommationLigne dans la période, avec options de filtre."""
    qs = (
        ConsommationLigne.objects
        .filter(date__date__gte=date_debut, date__date__lte=date_fin)
        .select_related('ligne__budget__departement', 'ligne__sous_categorie__categorie')
    )
    if departements_ids:
        qs = qs.filter(ligne__budget__departement_id__in=departements_ids)
    if lignes_ids:
        qs = qs.filter(ligne_id__in=lignes_ids)
    return qs


# ─── Agrégations communes ─────────────────────────────────────────────────────

def _stats_budgets(budgets_qs):
    agg = budgets_qs.aggregate(
        total_global=Sum('montant_global'),
        total_consomme=Sum('montant_consomme'),
        total_disponible=Sum('montant_disponible'),
        nb=Count('id'),
    )
    total_global   = _dec(agg['total_global'])
    total_consomme = _dec(agg['total_consomme'])
    return {
        'nb_budgets':       agg['nb'] or 0,
        'montant_global':   total_global,
        'montant_consomme': total_consomme,
        'montant_disponible': _dec(agg['total_disponible']),
        'taux_global':      _taux(total_consomme, total_global),
        'nb_par_statut': {
            s: budgets_qs.filter(statut=s).count()
            for s in [StatutBudget.APPROUVE, StatutBudget.SOUMIS,
                      StatutBudget.REJETE, StatutBudget.CLOTURE]
        },
    }


def _evolution_depenses(consommations_qs):
    """Dépenses agrégées par mois (pour graphiques)."""
    return list(
        consommations_qs
        .annotate(mois=TruncMonth('date'))
        .values('mois')
        .annotate(total=Sum('montant'), nb=Count('id'))
        .order_by('mois')
    )


def _top_depenses(consommations_qs, limit=10):
    """Top N lignes budgétaires les plus consommatrices dans la période."""
    return list(
        consommations_qs
        .values('ligne_id', 'ligne__libelle', 'ligne__budget__code', 'ligne__budget__nom')
        .annotate(total=Sum('montant'), nb=Count('id'))
        .order_by('-total')[:limit]
    )


def _depenses_par_departement(consommations_qs):
    return list(
        consommations_qs
        .values('ligne__budget__departement_id', 'ligne__budget__departement__nom')
        .annotate(total=Sum('montant'), nb=Count('id'))
        .order_by('-total')
    )


def _repartition_par_budget(consommations_qs):
    return list(
        consommations_qs
        .values('ligne__budget_id', 'ligne__budget__code', 'ligne__budget__nom',
                'ligne__budget__departement__nom')
        .annotate(total_consomme=Sum('montant'), nb_depenses=Count('id'))
        .order_by('-total_consomme')
    )


def _alertes(budgets_qs):
    """Budgets en dépassement ou proches du seuil."""
    alertes = []
    for b in budgets_qs:
        taux = float(b.montant_consomme) / float(b.montant_global) * 100 if b.montant_global else 0
        niveau = None
        if taux >= 100:
            niveau = 'CRITIQUE'
        elif taux >= 90:
            niveau = 'ROUGE'
        elif taux >= 75:
            niveau = 'ORANGE'
        if niveau:
            alertes.append({
                'budget_id':    str(b.id),
                'budget_code':  b.code,
                'budget_nom':   b.nom,
                'departement':  b.departement.nom if b.departement else '—',
                'taux':         round(taux, 2),
                'niveau':       niveau,
                'montant_global':   b.montant_global,
                'montant_consomme': b.montant_consomme,
            })
    return sorted(alertes, key=lambda a: a['taux'], reverse=True)


# ─── Méta-données du rapport ──────────────────────────────────────────────────

def _meta(type_rapport, label_periode, date_debut, date_fin):
    return {
        'type':          type_rapport,
        'label_periode': label_periode,
        'date_debut':    date_debut.isoformat(),
        'date_fin':      date_fin.isoformat(),
        'genere_le':     timezone.now().isoformat(),
    }


# ─── Service principal ────────────────────────────────────────────────────────

class RapportService:

    # ── 1. Rapport mensuel ────────────────────────────────────────────────────

    @staticmethod
    def generer_rapport_mensuel(mois: int, annee: int):
        date_debut, date_fin = _periode_mois(mois, annee)
        mois_fr = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre']
        label   = f"{mois_fr[mois - 1]} {annee}"

        budgets   = _budgets_actifs(date_debut, date_fin)
        consos    = _consommations_periode(date_debut, date_fin)

        return {
            'meta':                     _meta('MENSUEL', label, date_debut, date_fin),
            'resume':                   _stats_budgets(budgets),
            'evolution_depenses':       _evolution_depenses(consos),
            'top_depenses':             _top_depenses(consos),
            'depenses_par_departement': _depenses_par_departement(consos),
            'repartition_par_budget':   _repartition_par_budget(consos),
            'alertes':                  _alertes(budgets),
            'total_depenses_periode':   _dec(consos.aggregate(s=Sum('montant'))['s']),
            'nb_depenses_periode':      consos.count(),
        }

    # ── 2. Rapport trimestriel ────────────────────────────────────────────────

    @staticmethod
    def generer_rapport_trimestriel(trimestre: int, annee: int):
        date_debut, date_fin = _periode_trimestre(trimestre, annee)
        label = f"T{trimestre} {annee}"

        budgets = _budgets_actifs(date_debut, date_fin)
        consos  = _consommations_periode(date_debut, date_fin)

        # Décomposition mois par mois dans le trimestre
        mois_debut = (trimestre - 1) * 3 + 1
        detail_mois = []
        for m in range(mois_debut, mois_debut + 3):
            dd, df = _periode_mois(m, annee)
            c_mois = _consommations_periode(dd, df)
            detail_mois.append({
                'mois':   m,
                'total':  _dec(c_mois.aggregate(s=Sum('montant'))['s']),
                'nb':     c_mois.count(),
            })

        return {
            'meta':                     _meta('TRIMESTRIEL', label, date_debut, date_fin),
            'resume':                   _stats_budgets(budgets),
            'evolution_depenses':       _evolution_depenses(consos),
            'detail_mois':              detail_mois,
            'top_depenses':             _top_depenses(consos),
            'depenses_par_departement': _depenses_par_departement(consos),
            'repartition_par_budget':   _repartition_par_budget(consos),
            'alertes':                  _alertes(budgets),
            'total_depenses_periode':   _dec(consos.aggregate(s=Sum('montant'))['s']),
            'nb_depenses_periode':      consos.count(),
        }

    # ── 3. Rapport annuel ─────────────────────────────────────────────────────

    @staticmethod
    def generer_rapport_annuel(annee: int):
        date_debut, date_fin = _periode_annee(annee)

        budgets = _budgets_actifs(date_debut, date_fin)
        consos  = _consommations_periode(date_debut, date_fin)

        # Comparaison avec l'année précédente
        dd_prev, df_prev = _periode_annee(annee - 1)
        consos_prev      = _consommations_periode(dd_prev, df_prev)
        total_prev       = _dec(consos_prev.aggregate(s=Sum('montant'))['s'])
        total_actuel     = _dec(consos.aggregate(s=Sum('montant'))['s'])
        variation_pct    = (
            round(float((total_actuel - total_prev) / total_prev * 100), 2)
            if total_prev else None
        )

        # Exercice budgétaire de l'année
        budget_annuel = BudgetAnnuel.objects.filter(annee=annee).first()
        budget_annuel_info = None
        if budget_annuel:
            allocs = budget_annuel.allocations.select_related('departement').all()
            budget_annuel_info = {
                'id':             str(budget_annuel.id),
                'annee':          budget_annuel.annee,
                'montant_global': budget_annuel.montant_global,
                'nb_allocations': allocs.count(),
                'allocations': [
                    {
                        'departement': a.departement.nom if a.departement else '—',
                        'montant_alloue':     a.montant_alloue,
                        'montant_consomme':   a.montant_consomme,
                        'montant_disponible': a.montant_disponible,
                        'taux': _taux(a.montant_consomme, a.montant_alloue),
                    }
                    for a in allocs
                ],
            }

        # Détail par trimestre
        detail_trimestres = []
        for t in range(1, 5):
            dd, df = _periode_trimestre(t, annee)
            c_t    = _consommations_periode(dd, df)
            detail_trimestres.append({
                'trimestre': t,
                'total':     _dec(c_t.aggregate(s=Sum('montant'))['s']),
                'nb':        c_t.count(),
            })

        return {
            'meta':                     _meta('ANNUEL', str(annee), date_debut, date_fin),
            'resume':                   _stats_budgets(budgets),
            'budget_annuel':            budget_annuel_info,
            'evolution_depenses':       _evolution_depenses(consos),
            'detail_trimestres':        detail_trimestres,
            'top_depenses':             _top_depenses(consos, limit=15),
            'depenses_par_departement': _depenses_par_departement(consos),
            'repartition_par_budget':   _repartition_par_budget(consos),
            'alertes':                  _alertes(budgets),
            'total_depenses_periode':   total_actuel,
            'nb_depenses_periode':      consos.count(),
            'comparaison': {
                'annee_precedente':   annee - 1,
                'total_precedent':    total_prev,
                'total_actuel':       total_actuel,
                'variation_pct':      variation_pct,
            },
        }

    # ── 4. Rapport ad-hoc ─────────────────────────────────────────────────────

    @staticmethod
    def generer_rapport_adhoc(
        date_debut: date,
        date_fin:   date,
        departements_ids=None,
        lignes_ids=None,
    ):
        label = (
            f"{date_debut.strftime('%d/%m/%Y')} → {date_fin.strftime('%d/%m/%Y')}"
        )
        budgets = _budgets_actifs(date_debut, date_fin, departements_ids)
        consos  = _consommations_periode(date_debut, date_fin, departements_ids, lignes_ids)

        # Filtres actifs — utile pour affichage dans le rapport
        filtres_actifs = {}
        if departements_ids:
            depts = Departement.objects.filter(id__in=departements_ids).values_list('nom', flat=True)
            filtres_actifs['departements'] = list(depts)
        if lignes_ids:
            filtres_actifs['nb_lignes_filtrees'] = len(lignes_ids)

        return {
            'meta':                     _meta('ADHOC', label, date_debut, date_fin),
            'filtres_actifs':           filtres_actifs,
            'resume':                   _stats_budgets(budgets),
            'evolution_depenses':       _evolution_depenses(consos),
            'top_depenses':             _top_depenses(consos),
            'depenses_par_departement': _depenses_par_departement(consos),
            'repartition_par_budget':   _repartition_par_budget(consos),
            'alertes':                  _alertes(budgets),
            'total_depenses_periode':   _dec(consos.aggregate(s=Sum('montant'))['s']),
            'nb_depenses_periode':      consos.count(),
        }
