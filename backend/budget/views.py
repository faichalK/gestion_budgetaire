import logging
from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger('budget')

APP_NAME = 'Atlas Finance'


def _envoyer_email(destinataire, sujet, corps):
    """Envoie un email de notification — silencieux en cas d'échec."""
    if not getattr(destinataire, 'email', None):
        return
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', f'{APP_NAME} <noreply@gestion-budgetaire.bf>')
        send_mail(
            subject=f'{sujet} — {APP_NAME}',
            message=corps,
            from_email=from_email,
            recipient_list=[destinataire.email],
            fail_silently=True,
        )
    except Exception as exc:
        logger.warning("Email non envoyé à %s : %s", destinataire.email, exc)

from .models import (
    BudgetAnnuel, AllocationDepartementale,
    Budget, LigneBudgetaire, ConsommationLigne,
    Depense, StatutDepense,
    StatutBudget, NiveauAlerte,
    CategoriePrincipale, SousCategorie,
    Notification, creer_notification,
    PieceJustificative,
    PIECE_FORMATS_AUTORISES, PIECE_TAILLE_MAX, PIECE_TAILLE_TOTALE_MAX,
)
from .serializers import (
    BudgetAnnuelSerializer,
    AllocationDepartementaleSerializer,
    AllocationCreateSerializer,
    BudgetListSerializer,
    BudgetDetailSerializer,
    BudgetCreateSerializer,
    BudgetUpdateSerializer,
    LigneBudgetaireSerializer,
    LigneBudgetaireCreateSerializer,
    CategoriePrincipaleSerializer,
    SousCategorieSerializer,
    LigneBudgetaireHierarchieSerializer,
)
from accounts.views import IsAdministrateur, IsGestionnaireOrAdmin, IsComptableOrAdmin, IsGestionnaire, IsComptable
from audit.models import LogAudit, ActionAudit


# ── Budget annuel ─────────────────────────────────────────────────────────────

def _budget_queryset(with_lignes=False):
    queryset = Budget.objects.select_related(
        'departement', 'gestionnaire', 'comptable', 'allocation__budget_annuel'
    )
    if with_lignes:
        queryset = queryset.prefetch_related('lignes')
    return queryset


def _accessible_budgets(user, with_lignes=False):
    queryset = _budget_queryset(with_lignes=with_lignes)
    if getattr(user, 'is_gestionnaire', False):
        return queryset.filter(gestionnaire=user)
    if getattr(user, 'is_comptable', False) and not getattr(user, 'is_administrateur', False):
        return queryset.exclude(statut=StatutBudget.BROUILLON)
    return queryset


def _get_budget_or_404(user, pk, with_lignes=False):
    try:
        return _accessible_budgets(user, with_lignes=with_lignes).get(pk=pk)
    except Budget.DoesNotExist as exc:
        raise NotFound('Budget introuvable.') from exc


def _assert_budget_access(user, budget):
    if getattr(user, 'is_gestionnaire', False) and budget.gestionnaire_id != user.id:
        raise NotFound('Budget introuvable.')
    if getattr(user, 'is_comptable', False) and not getattr(user, 'is_administrateur', False):
        if budget.statut == StatutBudget.BROUILLON:
            raise NotFound('Budget introuvable.')


def _budget_is_mutable(budget):
    return budget.statut in (StatutBudget.BROUILLON, StatutBudget.REJETE)


class BudgetAnnuelListCreateView(generics.ListCreateAPIView):
    serializer_class = BudgetAnnuelSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdministrateur()]

    def get_queryset(self):
        return BudgetAnnuel.objects.prefetch_related('allocations__departement').all()

    def perform_create(self, serializer):
        instance = serializer.save(est_cloture=False)
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='budget_annuel',
            enregistrement_id=str(instance.id),
            action=ActionAudit.CREATE,
            valeur_apres=f"Budget annuel {instance.annee} – global: {instance.montant_global}",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )


class BudgetAnnuelDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = BudgetAnnuel.objects.prefetch_related('allocations__departement').all()
    serializer_class = BudgetAnnuelSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdministrateur()]

    def perform_update(self, serializer):
        instance = serializer.save()
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='budget_annuel',
            enregistrement_id=str(instance.id),
            action=ActionAudit.UPDATE,
            valeur_apres=str(self.request.data),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def perform_destroy(self, instance):
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='budget_annuel',
            enregistrement_id=str(instance.id),
            action=ActionAudit.DELETE,
            valeur_avant=str(instance),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
        instance.delete()


# ── Allocations départementales ───────────────────────────────────────────────

class AllocationListCreateView(generics.ListCreateAPIView):
    """Allocations d'un budget annuel donné."""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdministrateur()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AllocationCreateSerializer
        return AllocationDepartementaleSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['budget_annuel'] = self._get_budget_annuel()
        return ctx

    def _get_budget_annuel(self):
        try:
            return BudgetAnnuel.objects.get(pk=self.kwargs['budget_annuel_pk'])
        except BudgetAnnuel.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Budget annuel introuvable.')

    def get_queryset(self):
        return AllocationDepartementale.objects.select_related('departement').filter(
            budget_annuel_id=self.kwargs['budget_annuel_pk']
        )

    def perform_create(self, serializer):
        budget_annuel = self._get_budget_annuel()
        instance = serializer.save(budget_annuel=budget_annuel)
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='allocation_departementale',
            enregistrement_id=str(instance.id),
            action=ActionAudit.CREATE,
            valeur_apres=f"{instance} – alloué: {instance.montant_alloue}",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )


class AllocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdministrateur()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AllocationCreateSerializer
        return AllocationDepartementaleSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        try:
            ctx['budget_annuel'] = BudgetAnnuel.objects.get(pk=self.kwargs['budget_annuel_pk'])
        except BudgetAnnuel.DoesNotExist:
            ctx['budget_annuel'] = None
        return ctx

    def get_queryset(self):
        return AllocationDepartementale.objects.select_related('departement').filter(
            budget_annuel_id=self.kwargs['budget_annuel_pk']
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='allocation_departementale',
            enregistrement_id=str(instance.id),
            action=ActionAudit.UPDATE,
            valeur_apres=str(self.request.data),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def perform_destroy(self, instance):
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='allocation_departementale',
            enregistrement_id=str(instance.id),
            action=ActionAudit.DELETE,
            valeur_avant=str(instance),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
        instance.delete()


# ── Budget ────────────────────────────────────────────────────────────────────

class BudgetListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        # Seul le Gestionnaire peut créer un budget (pas l'Admin)
        return [IsGestionnaire()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BudgetCreateSerializer
        return BudgetListSerializer

    def get_queryset(self):
        user   = self.request.user
        qs     = _accessible_budgets(user)
        statut = self.request.query_params.get('statut')
        dept   = self.request.query_params.get('departement')
        if statut: qs = qs.filter(statut=statut)
        if dept:   qs = qs.filter(departement=dept)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='budget',
            enregistrement_id=str(instance.id),
            action=ActionAudit.CREATE,
            valeur_apres=f"{instance.code} – {instance.nom}",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
        # Notifier les comptables qu'un nouveau budget a été créé
        from accounts.models import Utilisateur
        gestionnaire = self.request.user
        comptables = Utilisateur.objects.filter(role='COMPTABLE', actif=True)
        for comptable in comptables:
            creer_notification(
                destinataire=comptable,
                type_notif='BUDGET_CREE',
                message=f"{gestionnaire.prenom} {gestionnaire.nom} a créé le budget {instance.code} – {instance.nom}.",
                lien=f"/validation/{instance.id}",
            )
        logger.info("[CREE] %s | par %s | notif -> %d comptable(s)",
                    instance.code, gestionnaire.email, comptables.count())


class BudgetDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsGestionnaire()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return BudgetUpdateSerializer
        return BudgetDetailSerializer

    def get_queryset(self):
        return _accessible_budgets(self.request.user, with_lignes=True)

    def update(self, request, *args, **kwargs):
        budget = self.get_object()
        if budget.statut not in (StatutBudget.BROUILLON, StatutBudget.REJETE):
            return Response(
                {'detail': 'Seul un budget en brouillon ou rejeté peut être modifié.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        instance = serializer.save()
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='budget',
            enregistrement_id=str(instance.id),
            action=ActionAudit.UPDATE,
            valeur_apres=str(self.request.data),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
        # Notifier les comptables d'une modification de budget
        from accounts.models import Utilisateur
        gestionnaire = self.request.user
        comptables = Utilisateur.objects.filter(role='COMPTABLE', actif=True)
        for comptable in comptables:
            creer_notification(
                destinataire=comptable,
                type_notif='BUDGET_SOUMIS',
                message=f"{gestionnaire.prenom} {gestionnaire.nom} a modifié le budget {instance.code} – {instance.nom}.",
                lien=f"/validation/{instance.id}",
            )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'La suppression de budgets est réservée à l\'administrateur système (interface Django Admin).'},
            status=status.HTTP_403_FORBIDDEN,
        )


class ApprouverBudgetView(APIView):
    permission_classes = [IsComptable]

    def post(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)
        try:
            budget.approuver_budget(request.user)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        LogAudit.enregistrer(
            utilisateur=request.user, table='budget',
            enregistrement_id=str(budget.id), action=ActionAudit.APPROVE,
            valeur_apres=f"{budget.code} approuvé",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        # Notification + email au gestionnaire
        if budget.gestionnaire:
            creer_notification(
                destinataire=budget.gestionnaire,
                type_notif='BUDGET_APPROUVE',
                message=f"Votre budget {budget.code} – {budget.nom} a été approuvé.",
                lien=f"/mes-budgets/{budget.id}",
            )
            _envoyer_email(
                budget.gestionnaire,
                f"Budget approuvé : {budget.code}",
                (
                    f"Bonjour {budget.gestionnaire.prenom} {budget.gestionnaire.nom},\n\n"
                    f"Votre budget {budget.code} – {budget.nom} a été approuvé par "
                    f"{request.user.prenom} {request.user.nom}.\n\n"
                    f"Vous pouvez maintenant enregistrer des dépenses sur ce budget."
                ),
            )
            logger.info("[APPROUVE] %s | par %s | notif -> %s",
                        budget.code, request.user.email, budget.gestionnaire.email)
        else:
            logger.warning("[APPROUVE] %s | par %s | gestionnaire=None, notification non envoyee",
                           budget.code, request.user.email)
        return Response(BudgetListSerializer(budget).data)


class RejeterBudgetView(APIView):
    permission_classes = [IsComptable]

    def post(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)
        motif = request.data.get('motif', '')
        if len(motif.strip()) < 10:
            return Response({'detail': 'Motif de rejet trop court (minimum 10 caractères).'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            budget.rejeter_budget(request.user, motif=motif)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        LogAudit.enregistrer(
            utilisateur=request.user, table='budget',
            enregistrement_id=str(budget.id), action=ActionAudit.REJECT,
            valeur_apres=f"{budget.code} rejeté",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        # Notification + email au gestionnaire
        if budget.gestionnaire:
            creer_notification(
                destinataire=budget.gestionnaire,
                type_notif='BUDGET_REJETE',
                message=f"Votre budget {budget.code} – {budget.nom} a été rejeté. Motif : {motif[:100]}",
                lien=f"/mes-budgets/{budget.id}",
            )
            _envoyer_email(
                budget.gestionnaire,
                f"Budget rejeté : {budget.code}",
                (
                    f"Bonjour {budget.gestionnaire.prenom} {budget.gestionnaire.nom},\n\n"
                    f"Votre budget {budget.code} – {budget.nom} a été rejeté par "
                    f"{request.user.prenom} {request.user.nom}.\n\n"
                    f"Motif : {motif}\n\n"
                    f"Veuillez le corriger et le re-soumettre."
                ),
            )
            logger.info("[REJETE] %s | par %s | notif -> %s | motif: %s",
                        budget.code, request.user.email, budget.gestionnaire.email, motif[:60])
        else:
            logger.warning("[REJETE] %s | par %s | gestionnaire=None, notification non envoyee",
                           budget.code, request.user.email)
        return Response(BudgetListSerializer(budget).data)


class CloturerBudgetView(APIView):
    permission_classes = [IsComptable]

    def post(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)
        try:
            budget.cloturer_budget()
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        LogAudit.enregistrer(
            utilisateur=request.user, table='budget',
            enregistrement_id=str(budget.id), action=ActionAudit.UPDATE,
            valeur_avant='APPROUVE', valeur_apres='CLOTURE',
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        logger.info("[CLOTURE] %s | par %s", budget.code, request.user.email)
        return Response(BudgetListSerializer(budget).data)


class ArchiverBudgetView(APIView):
    permission_classes = [IsAdministrateur]

    def post(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)
        try:
            budget.archiver_budget()
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        LogAudit.enregistrer(
            utilisateur=request.user, table='budget',
            enregistrement_id=str(budget.id), action=ActionAudit.UPDATE,
            valeur_avant='CLOTURE', valeur_apres='ARCHIVE',
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        return Response(BudgetListSerializer(budget).data)


class SoumettreView(APIView):
    permission_classes = [IsGestionnaire]

    def post(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)
        try:
            budget.soumettre_budget()
        except ValidationError as e:
            msg = e.message if hasattr(e, 'message') else (e.messages[0] if e.messages else str(e))
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)
        LogAudit.enregistrer(
            utilisateur=request.user, table='budget',
            enregistrement_id=str(budget.id), action=ActionAudit.SUBMIT,
            valeur_avant='BROUILLON', valeur_apres='SOUMIS',
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        # Notifications + emails pour tous les comptables
        from accounts.models import Utilisateur
        comptables = Utilisateur.objects.filter(role='COMPTABLE', actif=True)
        for comptable in comptables:
            creer_notification(
                destinataire=comptable,
                type_notif='BUDGET_SOUMIS',
                message=f"Le budget {budget.code} – {budget.nom} est en attente de validation.",
                lien=f"/validation/{budget.id}",
            )
            _envoyer_email(
                comptable,
                f"Budget à valider : {budget.code}",
                (
                    f"Bonjour {comptable.prenom} {comptable.nom},\n\n"
                    f"Le budget {budget.code} – {budget.nom} vient d'être soumis par "
                    f"{request.user.prenom} {request.user.nom} et attend votre validation.\n\n"
                    f"Connectez-vous pour le consulter."
                ),
            )
        logger.info("[SOUMIS] %s | par %s | notif -> %d comptable(s)",
                    budget.code, request.user.email, comptables.count())
        return Response(BudgetListSerializer(budget).data)


# ── Lignes budgétaires ────────────────────────────────────────────────────────

class LigneBudgetaireListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsGestionnaire()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LigneBudgetaireCreateSerializer
        return LigneBudgetaireSerializer

    def get_queryset(self):
        return LigneBudgetaire.objects.filter(
            budget__in=_accessible_budgets(self.request.user),
            budget_id=self.kwargs['budget_pk'],
        )

    def perform_create(self, serializer):
        try:
            budget = _get_budget_or_404(self.request.user, self.kwargs['budget_pk'])
        except Budget.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Budget introuvable.')
        if not _budget_is_mutable(budget):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Les lignes ne peuvent être modifiées que sur un budget en brouillon ou rejeté.')
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError
        try:
            instance = serializer.save(budget=budget)
        except DjangoValidationError as e:
            raise DRFValidationError({'detail': e.messages[0] if e.messages else str(e)})
        LogAudit.enregistrer(
            utilisateur=self.request.user, table='ligne_budgetaire',
            enregistrement_id=str(instance.id), action=ActionAudit.CREATE,
            valeur_apres=f"{instance.libelle} – {instance.montant_alloue} FCFA (budget {budget.code})",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )


class LigneBudgetaireDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsGestionnaire()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return LigneBudgetaireCreateSerializer
        return LigneBudgetaireSerializer

    def get_queryset(self):
        return LigneBudgetaire.objects.filter(
            budget__in=_accessible_budgets(self.request.user),
            budget_id=self.kwargs['budget_pk'],
        )

    def perform_update(self, serializer):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError
        if not _budget_is_mutable(serializer.instance.budget):
            raise DRFValidationError(
                {'detail': 'Les lignes ne peuvent etre modifiees que sur un budget en brouillon ou rejete.'}
            )
        try:
            instance = serializer.save()
        except DjangoValidationError as e:
            raise DRFValidationError({'detail': e.messages[0] if e.messages else str(e)})
        LogAudit.enregistrer(
            utilisateur=self.request.user, table='ligne_budgetaire',
            enregistrement_id=str(instance.id), action=ActionAudit.UPDATE,
            valeur_apres=str(self.request.data),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        if not _budget_is_mutable(instance.budget):
            raise DRFValidationError(
                {'detail': 'Les lignes ne peuvent etre modifiees que sur un budget en brouillon ou rejete.'}
            )
        LogAudit.enregistrer(
            utilisateur=self.request.user, table='ligne_budgetaire',
            enregistrement_id=str(instance.id), action=ActionAudit.DELETE,
            valeur_avant=f"{instance.libelle} – {instance.montant_alloue} F",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
        instance.delete()


class EnregistrerConsommationView(APIView):
    permission_classes = [IsGestionnaire]

    def post(self, request, budget_pk, pk):
        try:
            ligne = LigneBudgetaire.objects.select_related('budget__allocation').get(
                pk=pk,
                budget_id=budget_pk,
                budget__gestionnaire=request.user,
            )
        except LigneBudgetaire.DoesNotExist:
            return Response({'detail': 'Ligne introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if ligne.budget.statut != StatutBudget.APPROUVE:
            return Response(
                {'detail': 'Les dépenses ne peuvent être enregistrées que sur un budget approuvé.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        montant = request.data.get('montant')
        if montant is None:
            return Response({'detail': 'Le champ montant est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            montant = float(montant)
            if montant <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'detail': 'Montant invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        piece_justificative = request.FILES.get('piece_justificative')
        note = request.data.get('note', '')

        try:
            ligne.enregistrer_consommation(
                montant,
                piece_justificative=piece_justificative,
                note=note,
                enregistre_par=request.user,
            )
        except ValidationError as e:
            msg = e.message if hasattr(e, 'message') else (e.messages[0] if e.messages else str(e))
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)
        montant_avant = float(ligne.montant_consomme) - montant
        LogAudit.enregistrer(
            utilisateur=request.user, table='ligne_budgetaire',
            enregistrement_id=str(ligne.id), action=ActionAudit.UPDATE,
            valeur_avant=f"consommé: {montant_avant:,.0f} FCFA",
            valeur_apres=f"consommé: {float(ligne.montant_consomme):,.0f} FCFA (+{montant:,.0f} FCFA)",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        ligne.refresh_from_db()
        ligne.budget.refresh_from_db()
        return Response({
            'ligne':         LigneBudgetaireSerializer(ligne).data,
            'budget_statut': ligne.budget.statut,
            'niveau_alerte': ligne.budget.niveau_alerte,
            'taux':          ligne.budget.calculer_taux_consommation(),
        })


class BudgetComptableListView(generics.ListAPIView):
    serializer_class   = BudgetListSerializer
    permission_classes = [IsComptableOrAdmin]

    def get_queryset(self):
        # Le Comptable ne voit jamais les brouillons (R-COMPT-01)
        qs = Budget.objects.select_related('departement', 'gestionnaire', 'allocation__budget_annuel').exclude(
            statut=StatutBudget.BROUILLON
        )
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs


# ── Structure hiérarchique ────────────────────────────────────────────────────

class BudgetArbreView(APIView):
    """GET /budget/{id}/arbre/ — Arbre catégories > sous-catégories > lignes"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)
        cats = CategoriePrincipale.objects.filter(budget=budget).prefetch_related(
            'sous_categories__lignes'
        ).order_by('ordre', 'code')
        return Response({'success': True, 'data': CategoriePrincipaleSerializer(cats, many=True).data})


class BudgetCategorieCreateView(APIView):
    """POST /budget/{id}/categories/"""
    permission_classes = [IsGestionnaire]

    def post(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)
        if not _budget_is_mutable(budget):
            return Response({'detail': 'Modification impossible sur ce statut.'}, status=status.HTTP_400_BAD_REQUEST)
        libelle = request.data.get('libelle', '').strip()
        if not libelle:
            return Response({'detail': 'Le libellé est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        from django.core.exceptions import ValidationError as _DjVE
        try:
            cat = CategoriePrincipale(budget=budget, libelle=libelle)
            cat.save()
        except _DjVE as e:
            msg = e.messages[0] if hasattr(e, 'messages') and e.messages else str(e)
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': True, 'data': CategoriePrincipaleSerializer(cat).data}, status=status.HTTP_201_CREATED)


class CategorieDetailView(APIView):
    """DELETE /categories/{id}/"""
    permission_classes = [IsGestionnaire]

    def delete(self, request, pk):
        try:
            cat = CategoriePrincipale.objects.select_related('budget').get(pk=pk)
        except CategoriePrincipale.DoesNotExist:
            return Response({'detail': 'Categorie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        _assert_budget_access(request.user, cat.budget)
        if not _budget_is_mutable(cat.budget):
            return Response({'detail': 'Modification impossible sur ce statut.'}, status=status.HTTP_400_BAD_REQUEST)
        budget = cat.budget
        cat.delete()
        budget.recalculer_montants()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SousCategorieCreateView(APIView):
    """POST /categories/{id}/sous-categories/"""
    permission_classes = [IsGestionnaire]

    def post(self, request, pk):
        try:
            cat = CategoriePrincipale.objects.select_related('budget').get(pk=pk)
        except CategoriePrincipale.DoesNotExist:
            return Response({'detail': 'Categorie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        _assert_budget_access(request.user, cat.budget)
        if not _budget_is_mutable(cat.budget):
            return Response({'detail': 'Modification impossible sur ce statut.'}, status=status.HTTP_400_BAD_REQUEST)
        libelle = request.data.get('libelle', '').strip()
        if not libelle:
            return Response({'detail': 'Le libelle est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        sc = SousCategorie(categorie=cat, libelle=libelle)
        sc.save()
        return Response({'success': True, 'data': SousCategorieSerializer(sc).data}, status=status.HTTP_201_CREATED)


class SousCategorieDetailView(APIView):
    """DELETE /sous-categories/{id}/"""
    permission_classes = [IsGestionnaire]

    def delete(self, request, pk):
        try:
            sc = SousCategorie.objects.select_related('categorie__budget').get(pk=pk)
        except SousCategorie.DoesNotExist:
            return Response({'detail': 'Sous-categorie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        _assert_budget_access(request.user, sc.categorie.budget)
        if not _budget_is_mutable(sc.categorie.budget):
            return Response({'detail': 'Modification impossible sur ce statut.'}, status=status.HTTP_400_BAD_REQUEST)
        budget = sc.categorie.budget
        sc.delete()
        budget.recalculer_montants()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LigneParSousCategorieView(APIView):
    """POST /sous-categories/{id}/lignes/"""
    permission_classes = [IsGestionnaire]

    def post(self, request, pk):
        try:
            sc = SousCategorie.objects.select_related('categorie__budget').get(pk=pk)
        except SousCategorie.DoesNotExist:
            return Response({'detail': 'Sous-categorie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        budget = sc.categorie.budget
        _assert_budget_access(request.user, budget)
        if not _budget_is_mutable(budget):
            return Response({'detail': 'Modification impossible sur ce statut.'}, status=status.HTTP_400_BAD_REQUEST)
        libelle = request.data.get('libelle', '').strip()
        if not libelle:
            return Response({'detail': 'Le libelle est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        from decimal import Decimal as _D
        from django.core.exceptions import ValidationError as _DjVE
        from rest_framework.exceptions import ValidationError as _DRFVE
        try:
            quantite      = _D(str(request.data.get('quantite', 1) or 1))
            montant_prevu = _D(str(request.data.get('montantPrevu', 0) or 0))
            prix_unitaire = (montant_prevu / quantite) if quantite else montant_prevu
            ligne = LigneBudgetaire(
                budget=budget,
                sous_categorie=sc,
                libelle=libelle,
                unite=request.data.get('unite', '') or '',
                quantite=quantite,
                prix_unitaire=prix_unitaire,
            )
            ligne.save()
        except (ValueError, _DjVE) as e:
            msg = e.messages[0] if hasattr(e, 'messages') and e.messages else str(e)
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)
        LogAudit.enregistrer(
            utilisateur=request.user, table='ligne_budgetaire',
            enregistrement_id=str(ligne.id), action=ActionAudit.CREATE,
            valeur_apres=f"{ligne.libelle} - {ligne.montant_alloue} FCFA (budget {budget.code})",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        ligne = LigneBudgetaire.objects.select_related('sous_categorie__categorie').get(pk=ligne.pk)
        return Response({'success': True, 'data': LigneBudgetaireHierarchieSerializer(ligne).data}, status=status.HTTP_201_CREATED)


class LigneHierarchieDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /lignes/{id}/"""
    serializer_class = LigneBudgetaireHierarchieSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsGestionnaire()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return LigneBudgetaire.objects.select_related('sous_categorie__categorie__budget').filter(
            budget__in=_accessible_budgets(self.request.user)
        )

    def perform_update(self, serializer):
        from django.core.exceptions import ValidationError as _DjVE
        from rest_framework.exceptions import ValidationError as _DRFVE
        if not _budget_is_mutable(serializer.instance.budget):
            raise _DRFVE({'detail': 'Modification impossible sur ce statut.'})
        try:
            serializer.save()
        except _DjVE as e:
            raise _DRFVE({'detail': e.messages[0] if e.messages else str(e)})

    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError as _DRFVE
        if not _budget_is_mutable(instance.budget):
            raise _DRFVE({'detail': 'Modification impossible sur ce statut.'})
        LogAudit.enregistrer(
            utilisateur=self.request.user, table='ligne_budgetaire',
            enregistrement_id=str(instance.id), action=ActionAudit.DELETE,
            valeur_avant=f"{instance.libelle} - {instance.montant_alloue} F",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
        instance.delete()


class LignesSelecteurView(APIView):
    """GET /budget/{id}/lignes-selecteur/ — Liste pour saisir une depense"""
    permission_classes = [IsGestionnaire]

    def get(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)
        lignes = LigneBudgetaire.objects.filter(
            budget=budget, sous_categorie__isnull=False
        ).select_related('sous_categorie__categorie').order_by(
            'sous_categorie__categorie__ordre', 'sous_categorie__categorie__code',
            'sous_categorie__ordre', 'sous_categorie__code',
        )
        from common.formatters import formater_montant, calculer_taux_execution
        data = []
        for l in lignes:
            taux = calculer_taux_execution(float(l.montant_consomme), float(l.montant_alloue))
            data.append({
                'ligne_id':                   str(l.id),
                'categorie':                  f"{l.sous_categorie.categorie.code} - {l.sous_categorie.categorie.libelle}",
                'sous_categorie':             f"{l.sous_categorie.code} - {l.sous_categorie.libelle}",
                'libelle':                    l.libelle,
                'montant_prevu':              float(l.montant_alloue),
                'montant_consomme':           float(l.montant_consomme),
                'montant_disponible':         float(l.montant_disponible),
                'montant_disponible_formate': formater_montant(l.montant_disponible),
                'taux_consommation':          taux,
            })
        return Response({'success': True, 'data': data})


# ── Rapport de clôture ────────────────────────────────────────────────────────

class RapportClotureView(APIView):
    """GET /budget/<uuid:pk>/rapport-cloture/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        budget = _get_budget_or_404(request.user, pk, with_lignes=True)

        taux = budget.calculer_taux_consommation()
        lignes_racines = budget.lignes.filter(parent__isnull=True)
        lignes_data = []
        for l in lignes_racines:
            t = float(l.montant_alloue)
            c = float(l.montant_consomme)
            lignes_data.append({
                'libelle':          l.libelle,
                'montant_alloue':   t,
                'montant_consomme': c,
                'disponible':       float(l.montant_disponible),
                'taux':             round(c / t * 100, 2) if t else 0,
            })

        nb_depenses = ConsommationLigne.objects.filter(ligne__budget=budget).count()

        return Response({
            'budget': {
                'nom':              budget.nom,
                'code':             budget.code,
                'statut':           budget.statut,
                'montant_global':   float(budget.montant_global),
                'montant_consomme': float(budget.montant_consomme),
                'taux':             taux,
            },
            'lignes':       lignes_data,
            'nb_depenses':  nb_depenses,
            'date_cloture': budget.date_cloture.isoformat() if budget.date_cloture else None,
        })


# ── Virement de crédits ───────────────────────────────────────────────────────

class VirementCreditsView(APIView):
    """POST /budget/<uuid:pk>/virement/"""
    permission_classes = [IsGestionnaire]

    def post(self, request, pk):
        budget = _get_budget_or_404(request.user, pk)

        ligne_source_id = request.data.get('ligne_source')
        ligne_dest_id   = request.data.get('ligne_destination')
        montant         = request.data.get('montant')
        motif           = request.data.get('motif', '')

        if not ligne_source_id or not ligne_dest_id or montant is None:
            return Response({'detail': 'ligne_source, ligne_destination et montant sont requis.'}, status=status.HTTP_400_BAD_REQUEST)

        if str(ligne_source_id) == str(ligne_dest_id):
            return Response({'detail': 'La ligne source et la ligne destination doivent être différentes.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ligne_src  = LigneBudgetaire.objects.get(pk=ligne_source_id, budget=budget)
            ligne_dest = LigneBudgetaire.objects.get(pk=ligne_dest_id,   budget=budget)
        except LigneBudgetaire.DoesNotExist:
            return Response({'detail': 'Ligne budgétaire introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            ligne_src.effectuer_virement(ligne_dest, montant, motif=motif)
        except ValidationError as e:
            msg = e.message if hasattr(e, 'message') else (e.messages[0] if e.messages else str(e))
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        ligne_src.refresh_from_db()
        ligne_dest.refresh_from_db()

        LogAudit.enregistrer(
            utilisateur=request.user, table='ligne_budgetaire',
            enregistrement_id=str(ligne_src.id), action=ActionAudit.UPDATE,
            valeur_avant=f"virement source: {ligne_src.libelle}",
            valeur_apres=f"virement dest: {ligne_dest.libelle} – montant: {montant}",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        from .serializers import LigneBudgetaireHierarchieSerializer
        return Response({
            'success':     True,
            'ligne_source':      LigneBudgetaireHierarchieSerializer(ligne_src).data,
            'ligne_destination': LigneBudgetaireHierarchieSerializer(ligne_dest).data,
        })


# ── Notifications in-app ──────────────────────────────────────────────────────

class NotificationsListView(APIView):
    """GET /api/v1/notifications/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(destinataire=request.user)
        if request.query_params.get('non_lues') == '1':
            qs = qs.filter(lu=False)
        qs = qs[:50]
        data = [
            {
                'id':         str(n.id),
                'type_notif': n.type_notif,
                'message':    n.message,
                'lien':       n.lien,
                'lu':         n.lu,
                'date':       n.date.isoformat(),
            }
            for n in qs
        ]
        nb_non_lues = Notification.objects.filter(destinataire=request.user, lu=False).count()
        return Response({'data': data, 'nb_non_lues': nb_non_lues})


class MarquerLueView(APIView):
    """PATCH /api/v1/notifications/<uuid:pk>/lire/"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, destinataire=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        notif.lu = True
        notif.save(update_fields=['lu'])
        return Response({'detail': 'Marquée comme lue.'})


class MarquerToutesLuesView(APIView):
    """POST /api/v1/notifications/lire-tout/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(destinataire=request.user, lu=False).update(lu=True)
        return Response({'detail': 'Toutes les notifications marquées comme lues.'})


# ── Enregistrement de consommation avec pièces multiples ────────────────────

class EnregistrerConsommationMultiView(APIView):
    """POST /budget/<uuid:budget_pk>/lignes/<uuid:pk>/consommer/ — dépense sur une seule ligne"""
    permission_classes = [IsGestionnaire]

    def post(self, request, budget_pk, pk):
        try:
            ligne = LigneBudgetaire.objects.select_related('budget__allocation').get(
                pk=pk,
                budget_id=budget_pk,
                budget__gestionnaire=request.user,
            )
        except LigneBudgetaire.DoesNotExist:
            return Response({'detail': 'Ligne introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if ligne.budget.statut != StatutBudget.APPROUVE:
            return Response(
                {'detail': 'Les dépenses ne peuvent être enregistrées que sur un budget approuvé.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        montant = request.data.get('montant')
        if montant is None:
            return Response({'detail': 'Le champ montant est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            montant = float(montant)
            if montant <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'detail': 'Montant invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        fichiers = request.FILES.getlist('pieces') or (
            [request.FILES['piece_justificative']] if 'piece_justificative' in request.FILES else []
        )
        if not fichiers:
            return Response(
                {'detail': 'Une pièce justificative est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        note       = request.data.get('note', '')
        fournisseur = request.data.get('fournisseur', '')

        from decimal import Decimal as _D
        with __import__('django').db.transaction.atomic():
            # Créer la Depense parente
            depense_obj = Depense.objects.create(
                budget=ligne.budget,
                statut=StatutDepense.SAISIE,
                fournisseur=fournisseur,
                note=note,
                enregistre_par=request.user,
                montant_total=_D(str(montant)),
            )
            try:
                ligne.enregistrer_consommation(
                    montant, note=note, fournisseur=fournisseur,
                    enregistre_par=request.user, depense_parent=depense_obj,
                )
            except ValidationError as e:
                msg = e.message if hasattr(e, 'message') else (e.messages[0] if e.messages else str(e))
                return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

            # Attacher les pièces à la Depense
            from .views_pieces import _valider_fichier, _md5, FORMATS_EXTENSIONS
            import os
            for f in fichiers:
                try:
                    type_mime = _valider_fichier(f)
                except Exception:
                    type_mime = f.content_type or 'application/octet-stream'
                md5 = _md5(f)
                PieceJustificative.objects.create(
                    depense=depense_obj,
                    fichier=f,
                    nom_original=f.name[:255],
                    taille=f.size,
                    type_mime=type_mime,
                    md5_hash=md5,
                    uploaded_by=request.user,
                )

        LogAudit.enregistrer(
            utilisateur=request.user, table='depense',
            enregistrement_id=str(depense_obj.id), action=ActionAudit.CREATE,
            valeur_apres=f"Dépense {depense_obj.id} — {montant:,.0f} FCFA",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        ligne.refresh_from_db()
        ligne.budget.refresh_from_db()
        from .serializers import LigneBudgetaireSerializer as _LBS
        return Response({
            'depense_id':    str(depense_obj.id),
            'ligne':         _LBS(ligne).data,
            'budget_statut': ligne.budget.statut,
            'niveau_alerte': ligne.budget.niveau_alerte,
            'taux':          ligne.budget.calculer_taux_consommation(),
        })


class EnregistrerDepenseMultiLigneView(APIView):
    """POST /budget/<uuid:pk>/depense-multi/ — dépense répartie sur plusieurs lignes budgétaires."""
    permission_classes = [IsGestionnaire]

    def post(self, request, pk):
        try:
            budget = Budget.objects.select_related('allocation').get(pk=pk, gestionnaire=request.user)
        except Budget.DoesNotExist:
            return Response({'detail': 'Budget introuvable ou accès refusé.'}, status=status.HTTP_404_NOT_FOUND)

        if budget.statut != StatutBudget.APPROUVE:
            return Response(
                {'detail': 'Les dépenses ne peuvent être enregistrées que sur un budget approuvé.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import json as _json
        from decimal import Decimal as _D

        lignes_raw = request.data.get('lignes') or request.data.get('lignes_json')
        if isinstance(lignes_raw, str):
            try:
                lignes_data = _json.loads(lignes_raw)
            except Exception:
                lignes_data = []
        elif isinstance(lignes_raw, list):
            lignes_data = lignes_raw
        else:
            lignes_data = []
        if not lignes_data:
            return Response({'detail': 'Fournissez une liste "lignes" avec au moins une entrée.'}, status=status.HTTP_400_BAD_REQUEST)

        fichiers = request.FILES.getlist('pieces') or (
            [request.FILES['piece_justificative']] if 'piece_justificative' in request.FILES else []
        )
        if not fichiers:
            return Response(
                {'detail': 'Une pièce justificative est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        note        = request.data.get('note', '')
        fournisseur = request.data.get('fournisseur', '')

        # Valider les lignes d'abord
        items_valides = []
        erreurs_validation = []
        for item in lignes_data:
            ligne_id = item.get('ligne_id')
            montant  = item.get('montant')
            if not ligne_id or montant is None:
                erreurs_validation.append(f"Entrée invalide : {item}")
                continue
            try:
                montant_f = float(montant)
                if montant_f <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                erreurs_validation.append(f"Montant invalide pour la ligne {ligne_id}")
                continue
            try:
                ligne = LigneBudgetaire.objects.select_related('budget').get(pk=ligne_id, budget=budget)
            except LigneBudgetaire.DoesNotExist:
                erreurs_validation.append(f"Ligne {ligne_id} introuvable dans ce budget.")
                continue
            items_valides.append((ligne, montant_f, item.get('note', note)))

        if not items_valides:
            return Response(
                {'detail': 'Aucune ligne valide.', 'erreurs': erreurs_validation},
                status=status.HTTP_400_BAD_REQUEST,
            )

        montant_total = sum(m for _, m, _ in items_valides)

        from .views_pieces import _valider_fichier, _md5
        import django.db.transaction as _tx

        resultats = []
        erreurs   = list(erreurs_validation)

        with _tx.atomic():
            # Créer UNE Depense parente pour toutes les lignes
            depense_obj = Depense.objects.create(
                budget=budget,
                statut=StatutDepense.SAISIE,
                fournisseur=fournisseur,
                note=note,
                enregistre_par=request.user,
                montant_total=_D(str(montant_total)),
            )

            for ligne, montant_f, note_ligne in items_valides:
                try:
                    ligne.enregistrer_consommation(
                        montant_f,
                        note=note_ligne,
                        fournisseur=fournisseur,
                        enregistre_par=request.user,
                        depense_parent=depense_obj,
                    )
                except ValidationError as e:
                    msg = e.message if hasattr(e, 'message') else (e.messages[0] if e.messages else str(e))
                    erreurs.append(f"{ligne.libelle} : {msg}")
                    continue

                LogAudit.enregistrer(
                    utilisateur=request.user, table='ligne_budgetaire',
                    enregistrement_id=str(ligne.id), action=ActionAudit.UPDATE,
                    valeur_avant='—',
                    valeur_apres=f"+{montant_f:,.0f} FCFA consommé",
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
                ligne.refresh_from_db()
                resultats.append({
                    'ligne_id': str(ligne.id),
                    'libelle':  ligne.libelle,
                    'montant':  montant_f,
                })

            if not resultats:
                raise ValidationError("Aucune dépense enregistrée.")  # rollback

            # Attacher les pièces à la Depense
            for f in fichiers:
                try:
                    type_mime = _valider_fichier(f)
                except Exception:
                    type_mime = f.content_type or 'application/octet-stream'
                md5 = _md5(f)
                PieceJustificative.objects.create(
                    depense=depense_obj,
                    fichier=f,
                    nom_original=f.name[:255],
                    taille=f.size,
                    type_mime=type_mime,
                    md5_hash=md5,
                    uploaded_by=request.user,
                )

        budget.refresh_from_db()

        # Notifier les comptables
        from accounts.models import Utilisateur
        gest = request.user
        comptables = Utilisateur.objects.filter(role='COMPTABLE', actif=True)
        for comptable in comptables:
            creer_notification(
                destinataire=comptable,
                type_notif='DEPENSE_SAISIE',
                message=(
                    f"{gest.prenom} {gest.nom} a enregistré une dépense "
                    f"de {montant_total:,.0f} FCFA sur {len(resultats)} ligne(s) "
                    f"du budget {budget.code} – {budget.nom}."
                ),
                lien='/depenses',
            )

        return Response({
            'depense_id':      str(depense_obj.id),
            'enregistrements': resultats,
            'erreurs':         erreurs,
            'budget_statut':   budget.statut,
            'taux':            budget.calculer_taux_consommation(),
        }, status=status.HTTP_201_CREATED)
