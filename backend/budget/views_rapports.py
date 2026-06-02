"""
BudgetFlow — Vues KPIs & Rapports analytiques
Endpoints: /api/v1/rapports/
"""
import datetime
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone

from .models import Budget, StatutBudget, AllocationDepartementale, ConsommationLigne


class KpisView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total     = Budget.objects.count()
        approuves = Budget.objects.filter(statut=StatutBudget.APPROUVE).count()
        soumis    = Budget.objects.filter(statut=StatutBudget.SOUMIS).count()
        rejetes   = Budget.objects.filter(statut=StatutBudget.REJETE).count()
        taux_approbation = round(approuves / total * 100, 1) if total else 0

        allocs = AllocationDepartementale.objects.all()
        nb_critiques = sum(
            1 for a in allocs
            if a.montant_alloue and (a.montant_consomme / a.montant_alloue) >= Decimal('0.9')
        )

        return Response({'data': {
            'budgets': {
                'total':    total,
                'approuves': approuves,
                'soumis':    soumis,
                'rejetes':   rejetes,
            },
            'taux_approbation':      taux_approbation,
            'nb_enveloppes_critiques': nb_critiques,
        }})


class EvolutionMensuelleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', '12M')
        today  = timezone.now().date()

        if period == '3M':
            date_debut = (today.replace(day=1) - datetime.timedelta(days=60))
        elif period == 'YTD':
            date_debut = today.replace(month=1, day=1)
        elif period == 'Tout':
            date_debut = None
        else:  # 12M (défaut)
            date_debut = today.replace(day=1) - datetime.timedelta(days=335)

        qs = ConsommationLigne.objects.annotate(mois=TruncMonth('date'))
        if date_debut:
            qs = qs.filter(date__date__gte=date_debut)

        data = (
            qs
            .values('mois')
            .annotate(montant_total=Sum('montant'), nb_depenses=Count('id'))
            .order_by('mois')
        )
        return Response({'data': list(data)})


class ParDepartementView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = (
            Budget.objects
            .filter(departement__isnull=False)
            .values('departement__code', 'departement__nom')
            .annotate(montant_total=Sum('montant_global'), nb_budgets=Count('id'))
            .order_by('-montant_total')
        )
        return Response({'data': list(data)})


class TauxUtilisationEnveloppesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        allocs = AllocationDepartementale.objects.select_related('departement').all()
        result = []
        for a in allocs:
            if a.montant_alloue:
                taux = round(float(a.montant_consomme) / float(a.montant_alloue) * 100, 1)
            else:
                taux = 0
            result.append({
                'id':             str(a.id),
                'departement':    str(a.departement),
                'montant_alloue': str(a.montant_consomme),   # consommé affiché à gauche
                'montant_total':  str(a.montant_alloue),     # total alloué affiché à droite
                'taux_utilisation': taux,
                'est_critique':   taux >= 90,
            })
        return Response({'data': result})


class ExecutionBudgetaireView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = (
            Budget.objects
            .filter(statut=StatutBudget.APPROUVE)
            .values('code', 'nom', 'montant_global', 'montant_consomme', 'montant_disponible')
            .order_by('-montant_global')[:20]
        )
        return Response({'data': list(data)})


class ParCategorieView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Dépenses réelles regroupées par catégorie principale
        qs = (
            ConsommationLigne.objects
            .filter(ligne__isnull=False, ligne__sous_categorie__categorie__isnull=False)
            .values('ligne__sous_categorie__categorie__libelle')
            .annotate(montant_total=Sum('montant'), nb_lignes=Count('id'))
            .order_by('-montant_total')
        )

        rows = list(qs)
        total = sum(float(r['montant_total'] or 0) for r in rows)

        result = [
            {
                'libelle':     r['ligne__sous_categorie__categorie__libelle'] or 'Autre',
                'montant':     float(r['montant_total'] or 0),
                'pourcentage': round(float(r['montant_total'] or 0) / total * 100, 1) if total else 0,
                'nb_lignes':   r['nb_lignes'],
            }
            for r in rows
        ]

        # Si aucune dépense : revenir aux montants budgétisés par catégorie
        if not result:
            from .models import LigneBudgetaire
            qs2 = (
                LigneBudgetaire.objects
                .filter(sous_categorie__categorie__isnull=False)
                .values('sous_categorie__categorie__libelle')
                .annotate(montant_total=Sum('montant_global'), nb_lignes=Count('id'))
                .order_by('-montant_total')
            )
            rows2 = list(qs2)
            total2 = sum(float(r['montant_total'] or 0) for r in rows2)
            result = [
                {
                    'libelle':     r['sous_categorie__categorie__libelle'] or 'Autre',
                    'montant':     float(r['montant_total'] or 0),
                    'pourcentage': round(float(r['montant_total'] or 0) / total2 * 100, 1) if total2 else 0,
                    'nb_lignes':   r['nb_lignes'],
                }
                for r in rows2
            ]

        return Response({'data': result})
