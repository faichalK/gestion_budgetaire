"""
BudgetFlow — Client Anthropic Claude pour l'IA budgétaire.
"""
import os
import anthropic

from .models import Budget, ConsommationLigne, StatutBudget, AllocationDepartementale
from accounts.models import Departement
from django.db.models import Sum, Count


def _fmt(n):
    try:
        return f"{float(n or 0):,.0f}".replace(',', ' ')
    except (TypeError, ValueError):
        return '0'


def _build_context(user):
    """Construit le contexte budgétaire complet de l'utilisateur pour Claude."""
    lines = []

    try:
        # Identité de l'utilisateur — toujours incluse en premier
        prenom = getattr(user, 'prenom', '') or ''
        nom    = getattr(user, 'nom', '')    or ''
        nom_complet = f"{prenom} {nom}".strip() or 'Utilisateur'
        lines.append(f"Utilisateur connecté : {nom_complet}")
        lines.append(f"Matricule : {getattr(user, 'matricule', '—')}")

        # Budgets selon le rôle
        if getattr(user, 'is_gestionnaire', False) or user.role == 'GESTIONNAIRE':
            budgets = list(
                Budget.objects.filter(gestionnaire=user)
                .select_related('departement', 'budget_annuel')
                .order_by('-date_creation')[:10]
            )
            lines.append(f"Rôle : Gestionnaire de budget")
        elif getattr(user, 'is_comptable', False) or user.role == 'COMPTABLE':
            budgets = list(
                Budget.objects.exclude(statut='BROUILLON')
                .select_related('departement', 'gestionnaire')
                .order_by('-date_creation')[:10]
            )
            lines.append(f"Rôle : Comptable / Validateur")
        else:
            budgets = list(
                Budget.objects.select_related('departement', 'gestionnaire')
                .order_by('-date_creation')[:10]
            )
            lines.append(f"Rôle : Administrateur")

        if budgets:
            lines.append(f"\nBudgets ({len(budgets)}) :")
            for b in budgets:
                taux = b.calculer_taux_consommation()
                alerte = b.niveau_alerte
                lines.append(
                    f"  • [{b.code}] {b.nom} | Statut: {b.get_statut_display()} | "
                    f"Global: {_fmt(b.montant_global)} FCFA | "
                    f"Consommé: {_fmt(b.montant_consomme)} FCFA ({taux}%) | "
                    f"Disponible: {_fmt(b.montant_disponible)} FCFA | "
                    f"Alerte: {alerte} | "
                    f"Département: {b.departement.nom if b.departement else '—'} | "
                    f"Période: {b.date_debut} → {b.date_fin}"
                )

        # Statistiques globales
        total = len(budgets)
        approuves  = sum(1 for b in budgets if b.statut == 'APPROUVE')
        soumis     = sum(1 for b in budgets if b.statut == 'SOUMIS')
        brouillons = sum(1 for b in budgets if b.statut == 'BROUILLON')
        rejetes    = sum(1 for b in budgets if b.statut == 'REJETE')
        montant_total    = sum(float(b.montant_global or 0) for b in budgets)
        montant_consomme = sum(float(b.montant_consomme or 0) for b in budgets)
        taux_global = round(montant_consomme / montant_total * 100, 1) if montant_total else 0

        lines.append(f"\nRésumé global :")
        lines.append(f"  • Total budgets : {total} | Approuvés : {approuves} | Soumis : {soumis} | Brouillons : {brouillons} | Rejetés : {rejetes}")
        lines.append(f"  • Montant total alloué : {_fmt(montant_total)} FCFA")
        lines.append(f"  • Montant total consommé : {_fmt(montant_consomme)} FCFA")
        lines.append(f"  • Taux d'exécution global : {taux_global}%")

        # Alertes
        alertes = [b for b in budgets if b.statut == 'APPROUVE' and b.calculer_taux_consommation() >= 75]
        if alertes:
            lines.append(f"\nBudgets en alerte ({len(alertes)}) :")
            for b in alertes:
                t = b.calculer_taux_consommation()
                lines.append(f"  ⚠ [{b.code}] {b.nom} : {t}% consommé")

        # Dépenses récentes
        depenses_recentes = ConsommationLigne.objects.select_related(
            'ligne__budget', 'enregistre_par'
        ).order_by('-date')[:5]
        if depenses_recentes:
            lines.append(f"\nDernières dépenses enregistrées :")
            for d in depenses_recentes:
                lines.append(
                    f"  • {d.reference or d.id} | {_fmt(d.montant)} FCFA | "
                    f"Budget: {d.ligne.budget.code} | Ligne: {d.ligne.libelle} | "
                    f"Statut: {d.get_statut_display()} | Date: {d.date.strftime('%d/%m/%Y') if d.date else '—'}"
                )

    except Exception as e:
        lines.append(f"\n[Erreur de chargement du contexte : {e}]")

    return '\n'.join(lines)


SYSTEM_PROMPT = """Tu es BudgetFlow AI, un assistant financier expert intégré à la plateforme de gestion budgétaire BudgetFlow.

Ton rôle :
- Analyser les données budgétaires réelles de l'utilisateur
- Donner des conseils précis, chiffrés et actionnables
- Détecter les risques, anomalies et opportunités d'optimisation
- Guider l'utilisateur dans l'utilisation de la plateforme
- Répondre en français, de façon professionnelle mais accessible

Contexte plateforme :
- Les budgets suivent le workflow : BROUILLON → SOUMIS → APPROUVÉ → CLÔTURÉ
- Seuls les budgets APPROUVÉS permettent d'enregistrer des dépenses
- Les alertes se déclenchent à 75% (ORANGE), 90% (ROUGE), 100% (CRITIQUE)
- La plateforme est utilisée dans un contexte d'organisations africaines (FCFA)

Règles de réponse :
- Appuie-toi sur les données réelles fournies dans le contexte
- Sois précis avec les chiffres (noms des budgets, codes, montants exacts)
- Formule des recommandations concrètes
- Utilise le markdown (gras, listes) pour structurer ta réponse
- Si l'information n'est pas dans le contexte, dis-le clairement
- Reste concis : 3-6 paragraphes maximum sauf si l'analyse le justifie

Règles de salutation :
- Quand l'utilisateur dit bonjour/salut/hello, réponds avec son prénom ET son nom complet
  Exemple : "Bonjour Aminata COULIBALY ! Comment puis-je vous aider ?"
- Adapte la salutation à celle de l'utilisateur (salut → salut, bonjour → bonjour)
- Après la salutation, fais un bref récapitulatif de sa situation budgétaire
"""


class ClaudeClient:
    def __init__(self):
        api_key = os.getenv('ANTHROPIC_API_KEY', '').strip()
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY non configurée.")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model  = os.getenv('CLAUDE_MODEL', 'claude-haiku-4-5-20251001')

    def chat(self, user_message: str, historique: list, user=None) -> str:
        """
        Génère une réponse contextuelle avec les données réelles.
        historique : liste de dict [{role: 'user'|'assistant', content: str}]
        """
        context = _build_context(user) if user else ""

        system = SYSTEM_PROMPT
        if context:
            system += f"\n\n--- Données budgétaires actuelles ---\n{context}"

        # Construire les messages (limiter l'historique à 10 derniers)
        messages = []
        for msg in historique[-10:]:
            role    = 'user' if msg.get('role') == 'user' else 'assistant'
            contenu = msg.get('contenu') or msg.get('content') or ''
            if contenu:
                messages.append({'role': role, 'content': contenu})

        # Ajouter le message actuel
        messages.append({'role': 'user', 'content': user_message})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system,
            messages=messages,
        )
        return response.content[0].text

    def complete(self, prompt: str) -> object:
        """Compatibilité avec l'ancien code (génération de rapports narratifs)."""
        class _Resp:
            def __init__(self, text):
                self.content = text

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return _Resp(response.content[0].text)
