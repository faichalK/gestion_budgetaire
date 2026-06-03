"""
BudgetFlow — Vues Intelligence Artificielle (Claude Anthropic)
Endpoints: /api/v1/ia/

Chaque vue tente d'appeler l'API Claude.
Si SKIP_CLAUDE_API=True ou qu'aucune clé n'est configurée, une réponse simulée est retournée.
"""
import os
import uuid
from decimal import Decimal
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import Budget, LigneBudgetaire, ConsommationLigne, StatutBudget


# ── Helpers ───────────────────────────────────────────────────────────────────

def _skip_ia():
    return os.getenv('SKIP_CLAUDE_API', 'True').lower() in ('true', '1', 'yes')


def _budget_ou_404(pk):
    try:
        return Budget.objects.select_related('departement', 'gestionnaire').prefetch_related('lignes').get(pk=pk)
    except Budget.DoesNotExist:
        return None


# ── F1 — Analyse Budgétaire ───────────────────────────────────────────────────

class AnalyserBudgetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        budget = _budget_ou_404(pk)
        if not budget:
            return Response({'detail': 'Budget introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        taux = budget.calculer_taux_consommation()
        nb_lignes = budget.lignes.count()

        # Préparer le contexte commun (lignes détaillées)
        lignes_data = []
        for l in budget.lignes.filter(parent__isnull=True):
            if float(l.montant_alloue or 0) > 0:
                tl = round(float(l.montant_consomme) / float(l.montant_alloue) * 100, 1)
                lignes_data.append({
                    'libelle': l.libelle,
                    'alloue': float(l.montant_alloue),
                    'consomme': float(l.montant_consomme),
                    'disponible': float(l.montant_disponible),
                    'taux': tl,
                })
        nb_depenses = ConsommationLigne.objects.filter(ligne__budget=budget).count()
        lignes_critiques = [l for l in lignes_data if l['taux'] >= 90]
        lignes_sous_utilisees = [l for l in lignes_data if l['taux'] < 20 and l['alloue'] > 0]

        if _skip_ia():
            # Simulated response using real DB data
            if taux >= 90:
                niveau = 'préoccupant'
                points_forts = ["Traçabilité des dépenses assurée."]
                points_amelioration = [
                    f"Taux critique à {taux}% — risque de dépassement imminent.",
                    f"{len(lignes_critiques)} ligne(s) à plus de 90% de consommation.",
                ]
                recommandations = [
                    "Suspendre les dépenses non essentielles immédiatement.",
                    "Initier une demande de révision budgétaire auprès du comptable.",
                    "Réaffecter les crédits disponibles vers les lignes critiques.",
                ]
                score = max(20, 60 - (taux - 90))
            elif taux >= 70:
                niveau = 'satisfaisant'
                points_forts = [
                    f"Exécution avancée à {taux}% — bon niveau de réalisation.",
                    f"{nb_lignes} ligne(s) budgétaire(s) structurées.",
                ]
                points_amelioration = [
                    "Surveiller les lignes approchant leur plafond.",
                    "Vérifier la complétude des pièces justificatives.",
                ]
                recommandations = [
                    "Maintenir le rythme d'exécution actuel.",
                    f"Porter une attention particulière aux {len(lignes_critiques)} ligne(s) à risque.",
                ]
                score = min(85, 70 + (taux - 70) * 0.3)
            elif taux >= 30:
                niveau = 'en cours'
                points_forts = [
                    f"Budget de {float(budget.montant_global):,.0f} FCFA bien dimensionné.",
                    f"{nb_depenses} dépense(s) enregistrée(s) avec traçabilité.",
                ]
                points_amelioration = [
                    "Accélérer l'exécution pour atteindre les objectifs.",
                    f"{len(lignes_sous_utilisees)} ligne(s) sous-utilisée(s) à surveiller.",
                ]
                recommandations = [
                    "Planifier les achats en attente avant la fin de période.",
                    "Vérifier que toutes les lignes sont correctement alimentées.",
                ]
                score = 70
            else:
                niveau = 'démarrant'
                points_forts = [f"Budget structuré avec {nb_lignes} ligne(s)."]
                points_amelioration = [
                    f"Taux très faible ({taux}%) — exécution à initier.",
                    "Risque de sous-consommation en fin de période.",
                ]
                recommandations = [
                    "Engager rapidement les dépenses prévues.",
                    "Vérifier que les fournisseurs sont contactés.",
                ]
                score = max(40, 55 - abs(taux - 50))

            analyse = {
                'resume': (
                    f"Le budget « {budget.nom} » ({budget.code}) présente un niveau d'exécution {niveau} "
                    f"avec un taux de consommation de {taux}% "
                    f"({float(budget.montant_consomme):,.0f} / {float(budget.montant_global):,.0f} FCFA). "
                    f"Il comporte {nb_lignes} ligne(s) et {nb_depenses} dépense(s) enregistrée(s). "
                    f"Statut : {budget.get_statut_display()}."
                ),
                'points_forts': points_forts,
                'points_amelioration': points_amelioration,
                'recommandations': recommandations,
                'score_global': round(score, 1),
            }
        else:
            try:
                from .ia_client import ClaudeClient
                client = ClaudeClient()
                lignes_txt = '\n'.join(
                    f"  - {l['libelle']} : {l['alloue']:,.0f} alloué, {l['consomme']:,.0f} consommé ({l['taux']}%)"
                    for l in lignes_data[:10]
                )
                prompt = (
                    f"Tu es un expert en gestion budgétaire. Analyse ce budget en français et réponds UNIQUEMENT en JSON.\n\n"
                    f"Budget : {budget.nom} ({budget.code})\n"
                    f"Département : {budget.departement or 'Non défini'}\n"
                    f"Montant global : {float(budget.montant_global):,.0f} FCFA\n"
                    f"Montant consommé : {float(budget.montant_consomme):,.0f} FCFA\n"
                    f"Taux de consommation : {taux}%\n"
                    f"Statut : {budget.get_statut_display()}\n"
                    f"Nombre de lignes : {nb_lignes}\n"
                    f"Nombre de dépenses : {nb_depenses}\n"
                    f"Lignes principales :\n{lignes_txt}\n\n"
                    f"Réponds avec ce JSON exact :\n"
                    f'{{"resume": "...", "points_forts": ["..."], "points_amelioration": ["..."], '
                    f'"recommandations": ["..."], "score_global": 75}}'
                )
                import json as _json
                rep = client.complete(prompt)
                try:
                    content = rep.content.strip()
                    if content.startswith('```'):
                        content = content.split('```')[1]
                        if content.startswith('json'):
                            content = content[4:]
                    analyse = _json.loads(content)
                except Exception:
                    analyse = {'resume': rep.content, 'points_forts': [], 'points_amelioration': [], 'recommandations': [], 'score_global': 50}
            except Exception:
                analyse = {'resume': 'Analyse indisponible (service IA non configuré).', 'recommandations': [], 'points_forts': [], 'points_amelioration': [], 'score_global': 0}

        return Response({'data': analyse, 'budget_id': str(pk)})


class AnalysesBudgetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        budget = _budget_ou_404(pk)
        if not budget:
            return Response({'detail': 'Budget introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'data': [], 'budget_id': str(pk)})


# ── F2 — Chatbot Financier ────────────────────────────────────────────────────

# Stockage en mémoire pour la démo (remplacer par un modèle persistant en prod)
_conversations = {}


class ConversationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = str(request.user.id)
        convs = [v for v in _conversations.values() if v['utilisateur_id'] == user_id]
        return Response({'data': convs})

    def post(self, request):
        user_id = str(request.user.id)
        conv_id = str(uuid.uuid4())
        titre   = request.data.get('titre', 'Nouvelle conversation')
        _conversations[conv_id] = {
            'id':            conv_id,
            'titre':         titre,
            'utilisateur_id': user_id,
            'messages':      [],
            'date_creation': datetime.now().isoformat(),
        }
        return Response({'data': _conversations[conv_id]}, status=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        conv = _conversations.get(str(pk))
        if not conv:
            return Response({'detail': 'Conversation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'data': conv})

    def delete(self, request, pk):
        _conversations.pop(str(pk), None)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EnvoyerMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        conv = _conversations.get(str(pk))
        if not conv:
            # Conversation perdue (redémarrage serveur) — on la recrée automatiquement
            conv = {
                'id':       str(pk),
                'user_id':  str(request.user.pk),
                'messages': [],
                'created':  datetime.now().isoformat(),
            }
            _conversations[str(pk)] = conv

        contenu = request.data.get('contenu', '').strip()
        if not contenu:
            return Response({'detail': 'Message vide.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ajouter le message utilisateur
        msg_user = {
            'id':      str(uuid.uuid4()),
            'role':    'user',
            'contenu': contenu,
            'date':    datetime.now().isoformat(),
        }
        conv['messages'].append(msg_user)

        # Générer la réponse
        if _skip_ia():
            reponse = _reponse_chatbot_simulee(contenu, request.user)
        else:
            try:
                from .ia_client import ClaudeClient
                client  = ClaudeClient()
                reponse = client.chat(
                    user_message=contenu,
                    historique=conv['messages'],
                    user=request.user,
                )
            except Exception as e:
                reponse = f"Service IA temporairement indisponible. ({e})"

        msg_assistant = {
            'id':      str(uuid.uuid4()),
            'role':    'assistant',
            'contenu': reponse,
            'date':    datetime.now().isoformat(),
        }
        conv['messages'].append(msg_assistant)

        return Response({'data': msg_assistant})


def _reponse_chatbot_simulee(question, user=None):
    """
    Assistant financier BudgetFlow — simulation avancee basee sur les donnees reelles.
    Utilisee quand SKIP_CLAUDE_API=True ou qu'aucune cle API n'est configuree.
    """
    import unicodedata
    from django.db.models import Sum, Count, Avg
    from django.utils import timezone

    def _norm(s):
        return ''.join(
            c for c in unicodedata.normalize('NFD', s.lower())
            if unicodedata.category(c) != 'Mn'
        )

    q = _norm(question)

    # Recuperer les budgets selon le role
    budgets = []
    if user:
        try:
            if user.is_gestionnaire:
                budgets = list(
                    Budget.objects.filter(gestionnaire=user)
                    .select_related('departement')
                    .order_by('-date_creation')
                )
            elif user.is_comptable:
                budgets = list(
                    Budget.objects.exclude(statut='BROUILLON')
                    .select_related('departement', 'gestionnaire')
                    .order_by('-date_creation')
                )
            else:
                budgets = list(Budget.objects.select_related('departement', 'gestionnaire').order_by('-date_creation'))
        except Exception:
            budgets = []

    total_budgets    = len(budgets)
    approuves        = [b for b in budgets if b.statut == 'APPROUVE']
    soumis           = [b for b in budgets if b.statut == 'SOUMIS']
    brouillons       = [b for b in budgets if b.statut == 'BROUILLON']
    rejetes          = [b for b in budgets if b.statut == 'REJETE']
    montant_total    = sum(float(b.montant_global or 0) for b in budgets)
    montant_consomme = sum(float(b.montant_consomme or 0) for b in budgets)
    taux_global      = round(montant_consomme / montant_total * 100, 1) if montant_total > 0 else 0
    en_alerte        = [b for b in approuves if b.calculer_taux_consommation() >= 75]
    critiques        = [b for b in approuves if b.calculer_taux_consommation() >= 100]

    def _fmt(n):
        return f"{float(n):,.0f}".replace(',', '\u202f')

    def _barre(pct, longueur=10):
        filled = round(min(pct, 100) / 100 * longueur)
        return '\u2588' * filled + '\u2591' * (longueur - filled)

    # Salutation
    SALUTATIONS = {'salut': 'Salut', 'slt': 'Salut', 'coucou': 'Coucou',
                   'bonsoir': 'Bonsoir', 'bonjour': 'Bonjour', 'bjr': 'Bonjour',
                   'hello': 'Hello', 'hi': 'Bonjour'}
    mot_salut = next((SALUTATIONS[w] for w in SALUTATIONS if w in q), None)
    if mot_salut:
        prenom    = getattr(user, 'prenom', '') or ''
        nom       = getattr(user, 'nom', '')    or ''
        nom_complet = f"{prenom} {nom}".strip() if (prenom or nom) else ''
        if user:
            if user.is_gestionnaire:
                role_txt = (
                    f"En tant que **gestionnaire**, vous gerez **{total_budgets} budget(s)**. "
                    f"Taux d'execution global : **{taux_global}%**."
                )
            elif user.is_comptable:
                role_txt = (
                    f"En tant que **comptable**, vous supervisez **{total_budgets} budget(s)** "
                    f"dont **{len(soumis)}** en attente de validation."
                )
            else:
                role_txt = (
                    f"En tant qu'**administrateur**, vous avez acces a **{total_budgets} budget(s)** "
                    f"dans le systeme. Taux global : **{taux_global}%**."
                )
        else:
            role_txt = ''

        alerte_txt = ''
        if en_alerte:
            alerte_txt = f"\n\n**{len(en_alerte)} alerte(s) active(s)** sur vos budgets — tapez *alertes* pour les details."

        return (
            f"{mot_salut} **{nom_complet}** ! Je suis votre assistant financier **Atlas Finance**. "
            f"Comment puis-je vous aider ?\n\n"
            f"{role_txt}"
            f"{alerte_txt}\n\n"
            f"**Situation :** {len(approuves)} approuve(s) · {len(soumis)} soumis · "
            f"{len(en_alerte)} alerte(s) · taux global **{taux_global}%**\n\n"
            "Tapez **aide** pour voir tout ce que je sais faire."
        )

    # Aide
    if any(w in q for w in ['aide', 'help', 'que peux', 'capacite', 'fonction', 'quoi', 'menu']):
        return (
            "**Voici ce que je sais faire :**\n\n"
            "**Analyse :**\n"
            "- *taux d'execution* - consommation de vos budgets\n"
            "- *alertes* - budgets en depassement ou a risque\n"
            "- *disponible* - fonds restants par budget\n"
            "- *departement* - analyse par departement\n"
            "- *top depenses* - les depenses les plus elevees\n"
            "- *prediction* - projection de fin de periode\n\n"
            "**Gestion :**\n"
            "- *situation* - resume complet de vos budgets\n"
            "- *creer un budget* - guide pas a pas\n"
            "- *workflow* - circuit de validation\n"
            "- *enregistrer une depense* - procedure\n\n"
            "**Recherche :**\n"
            "- *budget [nom ou code]* - detail d'un budget specifique\n"
            "- *recommandations* - conseils personnalises\n"
            "- *rapport* - generer un rapport IA"
        )

    # Taux d'execution
    if any(w in q for w in ['taux', 'execution', 'consommation', 'consomme', 'utilisation', 'realisation']):
        if not budgets:
            return "Vous n'avez pas encore de budget. Creez votre premier budget depuis 'Mes budgets'."
        lignes = []
        for b in approuves[:6]:
            t = b.calculer_taux_consommation()
            emoji = '[CRITIQUE]' if t >= 100 else '[ROUGE]' if t >= 90 else '[ORANGE]' if t >= 75 else '[OK]'
            lignes.append(
                f"{emoji} **{b.nom}** ({b.code})\n"
                f"   `{_barre(t)}` {t}% - {_fmt(b.montant_consomme)} / {_fmt(b.montant_global)} FCFA"
            )
        if not lignes:
            return (
                f"Aucun budget approuve pour l'instant.\n"
                f"Taux global (tous statuts) : **{taux_global}%** - {_fmt(montant_consomme)} / {_fmt(montant_total)} FCFA."
            )
        return (
            f"**Taux d'execution - budgets approuves :**\n\n"
            + '\n\n'.join(lignes) +
            f"\n\n---\n**Consolide** : {taux_global}% "
            f"({_fmt(montant_consomme)} / {_fmt(montant_total)} FCFA)\n"
            "_[OK] < 75% | [ORANGE] 75-90% | [ROUGE] 90-100% | [CRITIQUE] > 100%_"
        )

    # Alertes / depassements
    if any(w in q for w in ['alerte', 'depassement', 'depasse', 'seuil', 'risque', 'critique', 'urgence', 'danger']):
        if not en_alerte and not critiques:
            return (
                "**Aucune alerte detectee.**\n\n"
                f"Tous vos {len(approuves)} budget(s) approuve(s) sont sous le seuil de 75%.\n"
                f"Taux global : **{taux_global}%**"
            )
        lignes = []
        for b in critiques:
            t = b.calculer_taux_consommation()
            depasse = float(b.montant_consomme) - float(b.montant_global)
            lignes.append(
                f"**[DEPASSEMENT]** - {b.nom} ({b.code})\n"
                f"   {t}% consomme | depassement : **{_fmt(depasse)} FCFA**\n"
                f"   `{_barre(t)}` - Action immediate requise"
            )
        for b in en_alerte:
            if b not in critiques:
                t = b.calculer_taux_consommation()
                restant = float(b.montant_disponible or 0)
                niveau = '[ROUGE]' if t >= 90 else '[ORANGE]'
                lignes.append(
                    f"**{niveau}** - {b.nom} ({b.code})\n"
                    f"   {t}% consomme | {_fmt(restant)} FCFA restants\n"
                    f"   `{_barre(t)}`"
                )
        conseils = (
            "\n\n**Recommandations :**\n"
            "- Suspendre les depenses non essentielles sur les budgets critiques\n"
            "- Initier une demande de revision budgetaire si necessaire\n"
            "- Consulter le module **Anomalies IA** pour le detail"
        )
        return (
            f"**{len(en_alerte) + len(critiques)} alerte(s) active(s) :**\n\n"
            + '\n\n'.join(lignes) + conseils
        )

    # Analyse par departement
    if any(w in q for w in ['departement', 'service', 'direction', 'unite', 'pole', 'equipe']):
        try:
            deps = (
                Budget.objects.filter(id__in=[b.id for b in budgets], departement__isnull=False)
                .values('departement__nom')
                .annotate(
                    nb=Count('id'),
                    total_alloue=Sum('montant_global'),
                    total_consomme=Sum('montant_consomme'),
                )
                .order_by('-total_alloue')[:8]
            )
            if not deps:
                return "Aucun budget associe a un departement dans vos donnees."
            lignes = []
            for d in deps:
                nom = d['departement__nom'] or 'Non defini'
                alloue = float(d['total_alloue'] or 0)
                consomme = float(d['total_consomme'] or 0)
                taux = round(consomme / alloue * 100, 1) if alloue > 0 else 0
                emoji = '[CRITIQUE]' if taux >= 100 else '[ROUGE]' if taux >= 90 else '[ORANGE]' if taux >= 75 else '[OK]'
                lignes.append(
                    f"{emoji} **{nom}** - {d['nb']} budget(s)\n"
                    f"   {_fmt(consomme)} / {_fmt(alloue)} FCFA | {taux}%"
                )
            return (
                f"**Analyse par departement :**\n\n"
                + '\n\n'.join(lignes)
            )
        except Exception:
            return "Impossible d'analyser les donnees par departement pour le moment."

    # Top depenses
    if any(w in q for w in ['top', 'plus grosse', 'plus grande', 'plus elevee', 'plus importante', 'plus chere', 'recente']):
        try:
            qs = ConsommationLigne.objects.filter(
                ligne__budget__in=budgets
            ).select_related('ligne', 'ligne__budget').order_by('-montant')[:8]
            if not qs.exists():
                return "Aucune depense enregistree sur vos budgets pour l'instant."
            lignes = []
            for i, dep in enumerate(qs, 1):
                label = dep.description or dep.ligne.libelle
                date_str = dep.date_consommation.strftime('%d/%m/%Y') if dep.date_consommation else ''
                lignes.append(
                    f"**{i}.** {label} - **{_fmt(dep.montant)} FCFA**\n"
                    f"   Budget : {dep.ligne.budget.nom} ({dep.ligne.budget.code}) | {date_str}"
                )
            total_dep = ConsommationLigne.objects.filter(ligne__budget__in=budgets).aggregate(t=Sum('montant'))['t'] or 0
            return (
                f"**Top depenses enregistrees :**\n\n"
                + '\n\n'.join(lignes) +
                f"\n\n---\nTotal toutes depenses : **{_fmt(total_dep)} FCFA**"
            )
        except Exception:
            return "Impossible de recuperer les depenses pour le moment."

    # Recherche budget par nom ou code (doit etre avant "situation/liste")
    budget_trouve = None
    for b in budgets:
        if _norm(b.nom) in q or _norm(b.code) in q:
            budget_trouve = b
            break

    if budget_trouve:
        b = budget_trouve
        t = b.calculer_taux_consommation()
        nb_dep = ConsommationLigne.objects.filter(ligne__budget=b).count()
        lignes_qs = list(b.lignes.filter(parent__isnull=True)[:5])
        detail_lignes = ''
        if lignes_qs:
            rows = []
            for l in lignes_qs:
                tl = round(float(l.montant_consomme) / float(l.montant_alloue) * 100, 1) if l.montant_alloue else 0
                em = '[CRITIQUE]' if tl >= 100 else '[ROUGE]' if tl >= 90 else '[ORANGE]' if tl >= 75 else '[OK]'
                rows.append(f"{em} {l.libelle[:30]} : {tl}% ({_fmt(l.montant_consomme)} / {_fmt(l.montant_alloue)} FCFA)")
            detail_lignes = '\n\n**Lignes budgetaires :**\n' + '\n'.join(rows)
        emoji_statut = 'APPROUVE' if b.statut == 'APPROUVE' else 'EN VALIDATION' if b.statut == 'SOUMIS' else 'BROUILLON' if b.statut == 'BROUILLON' else 'REJETE'
        etat = '[CRITIQUE]' if t >= 100 else '[ROUGE]' if t >= 90 else '[ORANGE]' if t >= 75 else '[OK]'
        return (
            f"**Budget : {b.nom}**\n\n"
            f"- Code : `{b.code}`\n"
            f"- Statut : {emoji_statut}\n"
            f"- Departement : {b.departement or 'Non defini'}\n"
            f"- Periode : {b.date_debut} -> {b.date_fin}\n\n"
            f"**Execution financiere :**\n"
            f"- Alloue : **{_fmt(b.montant_global)} FCFA**\n"
            f"- Consomme : **{_fmt(b.montant_consomme)} FCFA**\n"
            f"- Disponible : **{_fmt(b.montant_disponible)} FCFA**\n"
            f"- Taux : `{_barre(t)}` **{t}%** - {etat}\n"
            f"- Depenses enregistrees : {nb_dep}"
            + detail_lignes
        )

    # Etat / resume global
    if any(w in q for w in ['etat', 'resume', 'situation', 'tableau', 'bord', 'synthese', 'mes budgets', 'liste', 'tous', 'global', 'vue']):
        if not budgets:
            return "Vous n'avez aucun budget pour le moment. Creez votre premier budget depuis 'Nouveau budget'."
        total_dispo = sum(float(b.montant_disponible or 0) for b in approuves)
        top3 = sorted(approuves, key=lambda b: b.calculer_taux_consommation(), reverse=True)[:3]
        top3_txt = ''
        if top3:
            top3_txt = '\n\n**Top consommation :**\n' + '\n'.join(
                f"  {'[ROUGE]' if b.calculer_taux_consommation() >= 90 else '[ORANGE]'} {b.nom} - {b.calculer_taux_consommation()}%"
                for b in top3
            )
        return (
            f"**Tableau de bord budgetaire :**\n\n"
            f"| Statut | Nombre | Montant total |\n"
            f"|--------|--------|---------------|\n"
            f"| Approuves | {len(approuves)} | {_fmt(sum(float(b.montant_global or 0) for b in approuves))} FCFA |\n"
            f"| Soumis | {len(soumis)} | {_fmt(sum(float(b.montant_global or 0) for b in soumis))} FCFA |\n"
            f"| Brouillons | {len(brouillons)} | {_fmt(sum(float(b.montant_global or 0) for b in brouillons))} FCFA |\n"
            f"| Rejetes | {len(rejetes)} | {_fmt(sum(float(b.montant_global or 0) for b in rejetes))} FCFA |\n\n"
            f"**Enveloppe totale** : {_fmt(montant_total)} FCFA\n"
            f"**Taux d'execution global** : {taux_global}% ({_fmt(montant_consomme)} consomme)\n"
            f"**Fonds disponibles (approuves)** : {_fmt(total_dispo)} FCFA\n"
            f"**Alertes actives** : {len(en_alerte) + len(critiques)}"
            + top3_txt
        )

    # Fonds disponibles / solde
    if any(w in q for w in ['disponible', 'solde', 'reste', 'restant', 'combien', 'fonds']):
        if not budgets:
            return "Vous n'avez aucun budget. Creez votre premier budget depuis 'Nouveau budget'."
        _statut_info = {
            'APPROUVE':  ('APPROUVE', 'depensable'),
            'BROUILLON': ('BROUILLON', 'non actif'),
            'SOUMIS':    ('EN VALIDATION', 'en validation'),
            'REJETE':    ('REJETE', 'rejete'),
            'CLOTURE':   ('CLOTURE', 'cloture'),
            'ARCHIVE':   ('ARCHIVE', 'archive'),
        }
        lignes = []
        for b in budgets[:8]:
            dispo = float(b.montant_disponible or 0)
            global_m = float(b.montant_global or 0)
            icone, libelle = _statut_info.get(b.statut, ('', b.statut))
            if b.statut == 'APPROUVE':
                t = b.calculer_taux_consommation()
                lignes.append(f"[{icone}] **{b.nom}** ({b.code}) - {_fmt(dispo)} FCFA dispo | {t}%")
            else:
                lignes.append(f"[{icone}] **{b.nom}** ({b.code}) - {_fmt(global_m)} FCFA alloues _{libelle}_")
        total_dispo = sum(float(b.montant_disponible or 0) for b in approuves)
        return (
            f"**Fonds disponibles ({total_budgets} budget(s)) :**\n\n"
            + '\n'.join(lignes) +
            f"\n\n**Total depensable (budgets approuves) : {_fmt(total_dispo)} FCFA**\n"
            "_Seuls les budgets APPROUVES permettent d'enregistrer des depenses._"
        )

    # Recommandations personnalisees
    if any(w in q for w in ['recommandation', 'conseil', 'que faire', 'action', 'suggestion', 'ameliorer']):
        recs = []
        if critiques:
            recs.append(f"**Urgence** : {len(critiques)} budget(s) en depassement - suspendre les depenses non essentielles immediatement.")
        if len(en_alerte) > len(critiques):
            recs.append(f"**Vigilance** : {len(en_alerte) - len(critiques)} budget(s) entre 75-100% - surveiller de pres.")
        if soumis:
            recs.append(f"**Validation en attente** : {len(soumis)} budget(s) attendent approbation - traiter rapidement.")
        if brouillons:
            recs.append(f"**Completion** : {len(brouillons)} brouillon(s) a finaliser et soumettre.")
        sous_utilises = [b for b in approuves if b.calculer_taux_consommation() < 20]
        if sous_utilises:
            recs.append(f"**Sous-utilisation** : {len(sous_utilises)} budget(s) approuve(s) a moins de 20% - risque de sous-execution.")
        if not recs:
            recs.append("Aucune action urgente. Continuez le suivi regulier de vos budgets.")
        return "**Recommandations personnalisees :**\n\n" + '\n'.join(f"- {r}" for r in recs)

    # Predictions / projections
    if any(w in q for w in ['prediction', 'prevision', 'projection', 'futur', 'fin de periode', 'fin periode', 'tendance']):
        if not approuves:
            return "Aucun budget approuve pour calculer une projection."
        resultats = []
        for b in approuves[:3]:
            t = b.calculer_taux_consommation()
            try:
                jours_ecoules = max(1, (timezone.now().date() - b.date_debut).days)
                jours_total = max(1, (b.date_fin - b.date_debut).days)
                taux_temps = round(jours_ecoules / jours_total * 100, 1)
                taux_jour = float(b.montant_consomme or 0) / jours_ecoules
                proj = taux_jour * jours_total
                delta = proj - float(b.montant_global)
                if delta > 0:
                    statut_proj = f"Risque depassement de {_fmt(delta)} FCFA"
                elif t > taux_temps + 20:
                    statut_proj = "Rythme eleve - surveiller"
                else:
                    statut_proj = "Tendance normale"
                resultats.append(
                    f"**{b.nom}** ({t}% consomme / {taux_temps}% periode ecoulee)\n"
                    f"   Projection fin : **{_fmt(proj)} FCFA** / {_fmt(b.montant_global)} FCFA\n"
                    f"   {statut_proj}"
                )
            except Exception:
                resultats.append(f"**{b.nom}** : {t}% (calcul indisponible)")
        return "**Projections de fin de periode :**\n\n" + '\n\n'.join(resultats)

    # Creer un budget
    if any(w in q for w in ['creer', 'nouveau', 'ajouter', 'cree', 'creer', 'initialiser']):
        return (
            "**Creer un nouveau budget :**\n\n"
            "1. Cliquez sur **'Nouveau budget'** dans le menu\n"
            "2. Choisissez l'**exercice budgetaire** et le **departement**\n"
            "3. Renseignez le nom, les dates debut/fin et le montant global\n"
            "4. Enregistrez - le budget est en **BROUILLON**\n"
            "5. Ajoutez vos **lignes budgetaires** (postes de depenses)\n"
            "6. Soumettez pour validation par le comptable\n\n"
            "_BROUILLON -> SOUMIS -> APPROUVE (ou REJETE)_\n\n"
            f"Vous avez actuellement **{len(brouillons)}** brouillon(s) en cours."
        )

    # Workflow / validation
    if any(w in q for w in ['soumettre', 'valider', 'validation', 'approuver', 'approuve', 'comptable', 'workflow', 'circuit', 'rejet']):
        en_attente = ''
        if soumis:
            en_attente = f"\n\n**Actuellement en attente** : {len(soumis)} budget(s)\n"
            en_attente += '\n'.join(f"  - {b.nom} ({b.code})" for b in soumis[:5])
        return (
            "**Circuit de validation BudgetFlow :**\n\n"
            "```\n"
            "Gestionnaire            Comptable\n"
            "────────────────        ──────────────────\n"
            "1. Cree le budget  →\n"
            "2. Ajoute lignes   →\n"
            "3. Soumet          →    4. Examine\n"
            "                        5. Approuve ou Rejette\n"
            "6. Corrige (si rejet) → 7. Re-examine\n"
            "```\n\n"
            "**Notifications automatiques** envoyees a chaque changement de statut."
            + en_attente
        )

    # Depenses
    if any(w in q for w in ['depense', 'saisir', 'enregistrer', 'payer', 'achat', 'facture', 'piece', 'justificatif']):
        nb_dep_total = 0
        total_dep = 0
        try:
            agg = ConsommationLigne.objects.filter(ligne__budget__in=budgets).aggregate(
                nb=Count('id'), total=Sum('montant')
            )
            nb_dep_total = agg['nb'] or 0
            total_dep = float(agg['total'] or 0)
        except Exception:
            pass
        return (
            "**Enregistrer une depense :**\n\n"
            "1. Ouvrez un budget **APPROUVE** depuis 'Mes budgets'\n"
            "2. Cliquez **'Enregistrer une depense'**\n"
            "3. Choisissez la **ligne budgetaire** concernee\n"
            "4. Saisissez le montant (ne doit pas depasser le disponible)\n"
            "5. Ajoutez la **piece justificative** si montant > 50 000 FCFA\n"
            "6. Validez - la depense est soumise au comptable\n\n"
            f"Vos statistiques : **{nb_dep_total}** depense(s) | **{_fmt(total_dep)} FCFA** depenses au total."
        )

    # Lignes budgetaires
    if any(w in q for w in ['ligne', 'poste', 'categorie', 'rubrique']):
        nb_lignes_total = sum(b.lignes.count() for b in budgets[:10])
        return (
            "**Lignes budgetaires :**\n\n"
            "Chaque budget est ventile en lignes (postes de depenses) :\n"
            "- **Libelle** : nom du poste (ex: Materiel informatique, Formations...)\n"
            "- **Montant alloue** : enveloppe prevue pour ce poste\n"
            "- **Montant consomme** : depenses reelles enregistrees\n"
            "- **Disponible** : alloue - consomme\n"
            "- **Lignes enfants** : sous-postes pour une granularite fine\n\n"
            f"Vos budgets comptent **{nb_lignes_total}** ligne(s) au total.\n"
            "_Toute depense doit etre rattachee a une ligne budgetaire._"
        )

    # Anomalies
    if any(w in q for w in ['anomalie', 'irregularite', 'probleme', 'erreur', 'ecart', 'fraude', 'incident']):
        return (
            "**Detection d'anomalies IA :**\n\n"
            "L'IA BudgetFlow analyse automatiquement :\n"
            "- **Depassements globaux** : montant consomme > montant alloue\n"
            "- **Depassements de ligne** : poste depasse individuellement\n"
            "- **Seuil d'alerte** : consommation >= 85% de l'enveloppe\n"
            "- **Sous-utilisation** : budget approuve a < 5% de consommation\n"
            "- **Structure manquante** : budget sans lignes budgetaires\n\n"
            "Accedez a **Intelligence IA > Anomalies** pour detecter et traiter les anomalies."
        )

    # Rapport
    if any(w in q for w in ['rapport', 'reporting', 'bilan', 'export', 'statistique', 'kpi']):
        return (
            "**Rapports disponibles dans BudgetFlow :**\n\n"
            "**Rapports IA (Intelligence IA > Rapports) :**\n"
            "- Generation automatique via IA\n"
            "- Analyse narrative avec recommandations\n"
            "- Export PDF professionnel\n\n"
            "**Rapports detailles (menu Rapports) :**\n"
            "- **Mensuel** - analyse par mois\n"
            "- **Trimestriel** - vue par trimestre\n"
            "- **Annuel** - bilan de l'exercice budgetaire\n"
            "- **Ad hoc** - periode et filtres personnalises\n"
            "- Export Excel et PDF\n\n"
            f"Vous avez **{total_budgets}** budget(s) disponible(s) pour generer des rapports."
        )

    # Reponse par defaut contextuelle
    ctx_parts = []
    if budgets:
        ctx_parts.append(f"{total_budgets} budget(s) | taux global {taux_global}% | {len(en_alerte) + len(critiques)} alerte(s)")
    ctx = f"\n\n_Votre contexte : {' | '.join(ctx_parts)}_" if ctx_parts else ""
    return (
        "Je n'ai pas bien compris votre demande. Voici quelques exemples :\n\n"
        "- _'Mon taux d'execution'_\n"
        "- _'Alertes de depassement'_\n"
        "- _'Fonds disponibles'_\n"
        "- _'Situation globale'_\n"
        "- _'Recommandations'_\n"
        "- _'Budget [nom du budget]'_\n\n"
        "Tapez **aide** pour voir toutes mes capacites."
        + ctx
    )



# ── F3 — Détection d'Anomalies ────────────────────────────────────────────────

class DetecterAnomaliesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        budget = _budget_ou_404(pk)
        if not budget:
            return Response({'detail': 'Budget introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        now = datetime.now().isoformat()
        nouvelles = []
        taux_budget = budget.calculer_taux_consommation()
        nb_lignes   = budget.lignes.count()

        def _ajouter(type_anomalie, niveau, description, confiance):
            a = {
                'id':               str(uuid.uuid4()),
                'type_anomalie':    type_anomalie,
                'niveau':           niveau,
                'description':      description,
                'budget_reference': budget.code,
                'score_confiance':  confiance,
                'statut':           'DETECTEE',
                'created_at':       now,
            }
            _anomalies[a['id']] = a
            nouvelles.append(a)

        # 1. Dépassement global
        if taux_budget >= 100:
            _ajouter('DEPASSEMENT_GLOBAL', 'CRITIQUE',
                f"Budget {budget.code} dépasse son enveloppe ({taux_budget:.1f}% consommé — "
                f"{float(budget.montant_consomme):,.0f} FCFA sur {float(budget.montant_global):,.0f} FCFA).",
                0.98)

        # 2. Seuil d'alerte global
        elif taux_budget >= 85:
            _ajouter('ALERTE_SEUIL', 'ELEVE',
                f"Budget {budget.code} à {taux_budget:.1f}% de consommation — risque de dépassement imminent.",
                0.90)
        elif taux_budget >= 70:
            _ajouter('ALERTE_SEUIL', 'MOYEN',
                f"Budget {budget.code} à {taux_budget:.1f}% — surveillance recommandée.",
                0.75)

        # 3. Sous-utilisation (budget approuvé avec très peu de consommation)
        if budget.statut == StatutBudget.APPROUVE and taux_budget < 5 and float(budget.montant_global) > 0:
            _ajouter('SOUS_UTILISATION', 'FAIBLE',
                f"Budget {budget.code} approuvé mais seulement {taux_budget:.1f}% consommé "
                f"({float(budget.montant_consomme):,.0f} FCFA sur {float(budget.montant_global):,.0f} FCFA). "
                "Risque de sous-exécution budgétaire.",
                0.80)

        # 4. Budget sans lignes
        if nb_lignes == 0:
            _ajouter('STRUCTURE_MANQUANTE', 'MOYEN',
                f"Budget {budget.code} ne contient aucune ligne budgétaire. "
                "Structuration requise avant toute dépense.",
                0.99)

        # 5. Anomalies par ligne (dépassement unitaire)
        for ligne in budget.lignes.filter(parent__isnull=True):
            if not ligne.montant_alloue:
                continue
            taux_ligne = float(ligne.montant_consomme) / float(ligne.montant_alloue) * 100
            if taux_ligne >= 100:
                _ajouter('DEPASSEMENT_LIGNE', 'CRITIQUE',
                    f"Ligne « {ligne.libelle} » ({budget.code}) : {taux_ligne:.1f}% consommé "
                    f"({float(ligne.montant_consomme):,.0f} / {float(ligne.montant_alloue):,.0f} FCFA).",
                    0.95)
            elif taux_ligne >= 80:
                _ajouter('ALERTE_LIGNE', 'ELEVE',
                    f"Ligne « {ligne.libelle} » ({budget.code}) : {taux_ligne:.1f}% consommé — seuil critique.",
                    0.85)

        return Response({'data': nouvelles, 'budget_id': str(pk), 'nb_anomalies': len(nouvelles)})


class AnomaliesListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        statut = request.query_params.get('statut')
        items = list(_anomalies.values())
        if statut:
            items = [a for a in items if a.get('statut') == statut]
        return Response({'data': items, 'count': len(items)})


class TraiterAnomalieView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        anomalie = _anomalies.get(str(pk))
        if not anomalie:
            return Response({'detail': 'Anomalie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        nouveau_statut = request.data.get('statut')
        if nouveau_statut:
            _anomalies[str(pk)]['statut'] = nouveau_statut
        return Response({'detail': 'Anomalie traitée.', 'statut': nouveau_statut})


# ── F4 — Rapports Narratifs ───────────────────────────────────────────────────

_rapports    = {}
_anomalies   = {}   # id -> anomalie dict
_predictions = {}   # budget_id -> prediction dict


class RapportsNaratifsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'data': list(_rapports.values())})

    def post(self, request):
        budget_id    = request.data.get('budget_id')
        type_rapport = request.data.get('type_rapport') or request.data.get('type', 'MENSUEL')

        if budget_id:
            budget = _budget_ou_404(budget_id)
            if not budget:
                return Response({'detail': 'Budget introuvable.'}, status=status.HTTP_404_NOT_FOUND)
            taux = budget.calculer_taux_consommation()
            nb_dep = ConsommationLigne.objects.filter(ligne__budget=budget).count()
            lignes_racines = list(budget.lignes.filter(parent__isnull=True))
            lignes_section = '\n'.join(
                f"| {l.libelle[:30]} | {float(l.montant_alloue):,.0f} | {float(l.montant_consomme):,.0f} | "
                f"{round(float(l.montant_consomme)/float(l.montant_alloue)*100,1) if l.montant_alloue else 0}% |"
                for l in lignes_racines[:10]
            )
            titre = f"Rapport {type_rapport.lower()} — {budget.nom}"
            statut_eval = (
                'CRITIQUE' if taux >= 100 else
                'PRÉOCCUPANT' if taux >= 85 else
                'SATISFAISANT' if taux >= 50 else
                'INSUFFISANT'
            )
            contenu = (
                f"# Rapport {type_rapport} — {budget.nom}\n\n"
                f"**Date d'édition** : {datetime.now().strftime('%d/%m/%Y à %H:%M')}\n\n"
                f"---\n\n"
                f"## 1. Contexte\n\n"
                f"| Champ | Valeur |\n|---|---|\n"
                f"| Code | {budget.code} |\n"
                f"| Département | {budget.departement or 'Non défini'} |\n"
                f"| Exercice | {budget.budget_annuel or 'Non défini'} |\n"
                f"| Statut | {budget.get_statut_display()} |\n"
                f"| Période | {budget.date_debut} → {budget.date_fin} |\n\n"
                f"## 2. Analyse financière\n\n"
                f"| Indicateur | Montant |\n|---|---|\n"
                f"| Montant global alloué | {float(budget.montant_global):,.0f} FCFA |\n"
                f"| Montant consommé | {float(budget.montant_consomme):,.0f} FCFA |\n"
                f"| Montant disponible | {float(budget.montant_disponible):,.0f} FCFA |\n"
                f"| Taux de consommation | **{taux}%** |\n"
                f"| Nombre de dépenses | {nb_dep} |\n\n"
                f"**Évaluation globale : {statut_eval}**\n\n"
                f"## 3. Détail par ligne budgétaire\n\n"
                f"| Désignation | Alloué (FCFA) | Consommé (FCFA) | Taux |\n|---|---|---|---|\n"
                f"{lignes_section}\n\n"
                f"## 4. Recommandations\n\n"
                + (
                    "- ⚠️ **Dépassement critique** — Suspendre les dépenses non essentielles.\n"
                    "- Initier une révision budgétaire d'urgence.\n"
                    "- Identifier les lignes dépassées et les causes.\n"
                    if taux >= 100 else
                    "- Surveiller de près les lignes à fort taux de consommation.\n"
                    "- Planifier les dépenses restantes avant la fin de période.\n"
                    if taux >= 75 else
                    "- Maintenir le rythme d'exécution actuel.\n"
                    "- Vérifier la complétude des pièces justificatives.\n"
                ) +
                f"\n## 5. Conclusion\n\n"
                f"Le budget « {budget.nom} » présente une exécution {statut_eval.lower()} "
                f"avec {taux}% de consommation au {datetime.now().strftime('%d/%m/%Y')}. "
                f"{'Une action corrective est requise.' if taux >= 85 else 'Le suivi régulier est recommandé.'}"
            )
        else:
            from django.db.models import Sum
            total    = Budget.objects.count()
            approuves = Budget.objects.filter(statut=StatutBudget.APPROUVE).count()
            soumis   = Budget.objects.filter(statut=StatutBudget.SOUMIS).count()
            agg      = Budget.objects.aggregate(
                total_alloue=Sum('montant_global'),
                total_consomme=Sum('montant_consomme'),
            )
            montant_alloue   = float(agg['total_alloue'] or 0)
            montant_consomme = float(agg['total_consomme'] or 0)
            taux_global = round(montant_consomme / montant_alloue * 100, 1) if montant_alloue > 0 else 0
            titre = f"Rapport {type_rapport.lower()} global — {datetime.now().strftime('%d/%m/%Y')}"
            contenu = (
                f"# Rapport {type_rapport} global\n\n"
                f"**Date** : {datetime.now().strftime('%d/%m/%Y à %H:%M')}\n\n"
                f"---\n\n"
                f"## 1. Vue d'ensemble\n\n"
                f"| Indicateur | Valeur |\n|---|---|\n"
                f"| Total budgets | {total} |\n"
                f"| Budgets approuvés | {approuves} |\n"
                f"| Budgets en validation | {soumis} |\n"
                f"| Montant global alloué | {montant_alloue:,.0f} FCFA |\n"
                f"| Montant consommé | {montant_consomme:,.0f} FCFA |\n"
                f"| Taux d'exécution global | **{taux_global}%** |\n\n"
                f"## 2. Recommandations\n\n"
                f"- Continuer le suivi rigoureux de l'exécution budgétaire.\n"
                f"- {'Traiter en priorité les ' + str(soumis) + ' budget(s) en attente de validation.' if soumis > 0 else 'Aucun budget en attente — situation à jour.'}\n"
                f"- Vérifier les budgets dépassant 85% de consommation.\n\n"
                f"## 3. Conclusion\n\n"
                f"Taux global d'exécution : **{taux_global}%**. "
                f"{'Niveau satisfaisant.' if taux_global < 85 else 'Vigilance requise sur les dépassements potentiels.'}"
            )

        rapport_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        rapport = {
            'id':             rapport_id,
            'titre':          titre,
            'type_rapport':   type_rapport,
            'contenu':        contenu,
            'budget_id':      budget_id,
            'created_at':     now,
            'tokens_utilises': 0,
        }
        _rapports[rapport_id] = rapport
        return Response({'data': rapport}, status=status.HTTP_201_CREATED)


class RapportNaratifDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        rapport = _rapports.get(str(pk))
        if not rapport:
            return Response({'detail': 'Rapport introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'data': rapport})


# ── F5 — Prédiction de Dépassement ────────────────────────────────────────────

class PredireDepassementView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        budget = _budget_ou_404(pk)
        if not budget:
            return Response({'detail': 'Budget introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone
        taux = budget.calculer_taux_consommation()
        montant_global   = float(budget.montant_global)
        montant_consomme = float(budget.montant_consomme)

        # Analyse temporelle
        today = timezone.now().date()
        jours_total   = max(1, (budget.date_fin - budget.date_debut).days)
        jours_ecoules = max(1, (today - budget.date_debut).days)
        jours_restants = max(0, (budget.date_fin - today).days)
        pct_periode   = round(jours_ecoules / jours_total * 100, 1)

        # Vélocité journalière et projection
        velocite_jour = montant_consomme / jours_ecoules if jours_ecoules > 0 else 0
        montant_projete = montant_consomme + (velocite_jour * jours_restants)
        ecart_projete   = montant_projete - montant_global

        # Taux de consommation attendu vs réel (sur-consommation ou sous-consommation)
        taux_attendu = pct_periode  # on s'attend à consommer proportionnellement à la période
        ecart_rythme = taux - taux_attendu  # positif = on consomme trop vite

        # Calcul probabilité
        if montant_projete >= montant_global * 1.1:
            probabilite = 95
            niveau = 'CRITIQUE'
        elif montant_projete >= montant_global:
            probabilite = 80
            niveau = 'ELEVE'
        elif ecart_rythme > 20:
            probabilite = 60
            niveau = 'MODERE'
        elif ecart_rythme > 10:
            probabilite = 35
            niveau = 'FAIBLE'
        else:
            probabilite = 10
            niveau = 'NEGLIGEABLE'

        lignes_critiques = [l for l in budget.lignes.all() if l.montant_alloue and float(l.montant_consomme) / float(l.montant_alloue) > 0.9]

        facteurs = [
            {
                'facteur': 'Taux de consommation actuel',
                'valeur':  f"{taux}%",
                'impact':  'POSITIF' if taux < taux_attendu else 'NEGATIF',
            },
            {
                'facteur': 'Avancement de la période',
                'valeur':  f"{pct_periode}% écoulé ({jours_ecoules}/{jours_total} jours)",
                'impact':  'NEUTRE',
            },
            {
                'facteur': 'Vélocité journalière',
                'valeur':  f"{velocite_jour:,.0f} FCFA/jour",
                'impact':  'NEGATIF' if velocite_jour * jours_total > montant_global * 1.05 else 'POSITIF',
            },
        ]
        if lignes_critiques:
            facteurs.append({
                'facteur': f"{len(lignes_critiques)} ligne(s) à plus de 90%",
                'valeur':   str(len(lignes_critiques)),
                'impact':   'NEGATIF',
            })

        if ecart_rythme > 15:
            recommandation = (
                f"Rythme de consommation trop rapide (+{ecart_rythme:.1f}% vs période). "
                "Freiner les dépenses non essentielles."
            )
        elif ecart_rythme < -20:
            recommandation = (
                f"Sous-exécution détectée ({abs(ecart_rythme):.1f}% en retard). "
                "Accélérer l'engagement des dépenses planifiées."
            )
        else:
            recommandation = "Rythme d'exécution conforme à la période. Maintenir la vigilance."

        prediction = {
            'id':                      str(uuid.uuid4()),
            'budget_reference':        budget.code,
            'probabilite_depassement': round(probabilite / 100, 2),
            'niveau_risque':           niveau,
            'taux_actuel':             taux,
            'taux_attendu':            taux_attendu,
            'ecart_rythme':            round(ecart_rythme, 1),
            'montant_prevu_final':     round(montant_projete, 2),
            'ecart_prevu':             round(ecart_projete, 2),
            'jours_restants':          jours_restants,
            'pct_periode_ecoulee':     pct_periode,
            'facteurs':                facteurs,
            'recommandation':          recommandation,
            'created_at':              datetime.now().isoformat(),
        }
        _predictions[str(pk)] = prediction

        return Response({'data': prediction, 'budget_id': str(pk)})


class PredictionsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'data': list(_predictions.values())})


# ── F6 — Scoring Budgétaire ───────────────────────────────────────────────────

class ScorerBudgetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        budget = _budget_ou_404(pk)
        if not budget:
            return Response({'detail': 'Budget introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        taux      = budget.calculer_taux_consommation()
        nb_lignes = budget.lignes.count()

        # Score exécution (optimal 60–85%)
        if 60 <= taux <= 85:
            score_execution = 100
        elif taux > 85:
            score_execution = max(0, 100 - (taux - 85) * 2)
        elif taux > 0:
            score_execution = max(30, taux * 1.2)
        else:
            score_execution = 20

        # Score complétude (lignes + structure)
        score_completude = min(100, nb_lignes * 12)

        # Score conformité (statut + soumission dans les délais)
        if budget.statut == StatutBudget.APPROUVE:
            score_conformite = 95
        elif budget.statut == StatutBudget.SOUMIS:
            score_conformite = 75
        elif budget.statut == StatutBudget.REJETE:
            score_conformite = 40
        elif budget.statut == StatutBudget.CLOTURE:
            score_conformite = 90
        else:
            score_conformite = 55

        # Score documentation (pièces justificatives sur les dépenses)
        nb_depenses = ConsommationLigne.objects.filter(ligne__budget=budget).count()
        nb_avec_pj  = ConsommationLigne.objects.filter(ligne__budget=budget).exclude(piece_justificative='').exclude(piece_justificative__isnull=True).count()
        if nb_depenses == 0:
            score_documentation = 70  # neutre si pas de dépenses
        else:
            ratio_pj = nb_avec_pj / nb_depenses
            score_documentation = round(ratio_pj * 100)

        # Score anomalies (malus si lignes dépassées)
        lignes_depassees    = budget.lignes.filter(parent__isnull=True)
        nb_lignes_depassees = sum(1 for l in lignes_depassees if l.montant_alloue and float(l.montant_consomme) > float(l.montant_alloue))
        malus_anomalies     = min(30, nb_lignes_depassees * 10)

        score_global = round(
            max(0, (
                score_execution     * 0.35 +
                score_completude    * 0.20 +
                score_conformite    * 0.25 +
                score_documentation * 0.20
            ) - malus_anomalies),
            1
        )

        if score_global >= 85:
            note, niveau = 'A', 'EXCELLENT'
        elif score_global >= 70:
            note, niveau = 'B', 'BON'
        elif score_global >= 50:
            note, niveau = 'C', 'MOYEN'
        else:
            note, niveau = 'D', 'CRITIQUE'

        recommandations = []
        if score_documentation < 60:
            recommandations.append(f"Ajouter les pièces justificatives manquantes ({nb_depenses - nb_avec_pj} dépense(s) sans PJ).")
        if nb_lignes < 3:
            recommandations.append("Structurer le budget avec davantage de lignes détaillées.")
        if nb_lignes_depassees > 0:
            recommandations.append(f"Corriger les {nb_lignes_depassees} ligne(s) en dépassement.")
        if taux < 30 and budget.statut == StatutBudget.APPROUVE:
            recommandations.append("Accélérer l'exécution — taux trop faible pour un budget approuvé.")
        if not recommandations:
            recommandations.append("Budget bien géré. Maintenir ce niveau de rigueur.")

        return Response({
            'data': {
                'score_global': score_global,
                'note':         note,
                'niveau':       niveau,
                'details': {
                    'execution':     round(score_execution, 1),
                    'completude':    round(score_completude, 1),
                    'conformite':    round(score_conformite, 1),
                    'documentation': round(score_documentation, 1),
                    'malus_anomalies': malus_anomalies,
                },
                'recommandations': recommandations,
                'stats': {
                    'nb_lignes':         nb_lignes,
                    'nb_depenses':       nb_depenses,
                    'nb_avec_pj':        nb_avec_pj,
                    'nb_lignes_depassees': nb_lignes_depassees,
                    'taux_consommation': taux,
                },
            },
            'budget_id': str(pk),
        })


class ScoreBudgetDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        budget = _budget_ou_404(pk)
        if not budget:
            return Response({'detail': 'Budget introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        # Recalcul à la volée
        return ScorerBudgetView().post(request, pk)
