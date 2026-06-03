import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.db.models import ProtectedError
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Utilisateur, Departement
from audit.models import LogAudit, ActionAudit

logger = logging.getLogger('accounts')
from .serializers import (
    UtilisateurSerializer,
    CreerUtilisateurSerializer,
    ModifierUtilisateurSerializer,
    ModifierMotDePasseSerializer,
    AdminResetPasswordSerializer,
    DepartementSerializer,
)


# ── JWT personnalisé ─────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['role']             = self.user.role
        data['email']            = self.user.email
        data['matricule']        = self.user.matricule
        data['nom']              = self.user.nom
        data['prenom']           = self.user.prenom
        data['is_administrateur'] = self.user.is_administrateur
        return data


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        email = (request.data.get('email') or '').strip().lower()

        # ── Vérification pré-auth : compte bloqué ? ──────────────────────────
        try:
            candidate = Utilisateur.objects.get(email__iexact=email)
            if candidate.bloque:
                logger.warning("LOGIN_BLOQUE | %s", email)
                return Response(
                    {'detail': 'Compte bloqué après 3 tentatives incorrectes. Contactez votre administrateur pour débloquer votre accès.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except Utilisateur.DoesNotExist:
            pass  # l'erreur générique 401 sera retournée par simplejwt

        response = super().post(request, *args, **kwargs)

        # ── Connexion réussie ─────────────────────────────────────────────────
        if response.status_code == 200:
            try:
                user = Utilisateur.objects.get(email__iexact=email)
                user.se_connecter()   # reset tentatives + màj derniere_connexion
                LogAudit.enregistrer(
                    utilisateur=user,
                    table='utilisateur',
                    enregistrement_id=str(user.id),
                    action=ActionAudit.LOGIN,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
                logger.info("CONNEXION | %s | %s %s (%s)", user.email, user.prenom, user.nom, user.role)
            except Utilisateur.DoesNotExist:
                pass

        # ── Échec d'authentification ──────────────────────────────────────────
        elif response.status_code == 401:
            try:
                user = Utilisateur.objects.get(email__iexact=email)
                user.incrementer_tentatives()
                restant = max(0, user.MAX_TENTATIVES - user.tentatives_connexion)
                if user.bloque:
                    logger.warning("COMPTE_BLOQUE | %s après %d tentatives", email, user.tentatives_connexion)
                else:
                    logger.warning("ECHEC_LOGIN | %s | tentatives=%d restant=%d", email, user.tentatives_connexion, restant)
                # Enrichir le message de réponse
                if user.bloque:
                    return Response(
                        {'detail': 'Compte bloqué après 3 tentatives incorrectes. Contactez votre administrateur pour débloquer votre accès.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                response.data['detail'] = (
                    f"Email ou mot de passe incorrect. "
                    f"{'1 tentative restante avant blocage.' if restant == 1 else f'{restant} tentatives restantes avant blocage.'}"
                )
            except Utilisateur.DoesNotExist:
                logger.warning("ECHEC_LOGIN | email inconnu: %s", email)

        return response


# ── Profil utilisateur connecté ──────────────────────────────────────────────

class MeView(generics.RetrieveUpdateAPIView):
    serializer_class   = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ModifierMotDePasseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ModifierMotDePasseSerializer(
            data=request.data,
            context={'request': request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response({'detail': 'Mot de passe modifié avec succès.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Permissions personnalisées ────────────────────────────────────────────────

class IsAdministrateur(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_administrateur


class IsComptableOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_comptable or request.user.is_administrateur
        )


class IsGestionnaireOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_gestionnaire or request.user.is_administrateur
        )


class IsGestionnaire(permissions.BasePermission):
    """Réservé au Gestionnaire uniquement — l'Admin ne crée/modifie pas de budget."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_gestionnaire


class IsComptable(permissions.BasePermission):
    """Réservé au Comptable uniquement — l'Admin ne valide/rejette pas."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_comptable


# ── Gestion des utilisateurs (admin) ─────────────────────────────────────────

class UtilisateurListCreateView(generics.ListCreateAPIView):
    queryset           = Utilisateur.objects.select_related('departement').all()
    permission_classes = [IsAdministrateur]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreerUtilisateurSerializer
        return UtilisateurSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='utilisateur',
            enregistrement_id=str(instance.id),
            action=ActionAudit.CREATE,
            valeur_apres=f"{instance.matricule} – {instance.nom} {instance.prenom} ({instance.role})",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )


class UtilisateurDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Utilisateur.objects.select_related('departement').all()
    permission_classes = [IsAdministrateur]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ModifierUtilisateurSerializer
        return UtilisateurSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='utilisateur',
            enregistrement_id=str(instance.id),
            action=ActionAudit.UPDATE,
            valeur_apres=str(self.request.data),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def perform_destroy(self, instance):
        try:
            LogAudit.enregistrer(
                utilisateur=self.request.user,
                table='utilisateur',
                enregistrement_id=str(instance.id),
                action=ActionAudit.DELETE,
                valeur_avant=f"{instance.matricule} – {instance.nom} {instance.prenom}",
                user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            )
            instance.delete()
        except ProtectedError:
            nb_budgets = instance.budgets_crees.count()
            raise serializers.ValidationError(
                f"Impossible de supprimer {instance.prenom} {instance.nom} : "
                f"cet utilisateur est lié à {nb_budgets} budget(s). "
                "Réaffectez ou supprimez ses budgets d'abord."
            )


# ── Gestion des départements (admin) ─────────────────────────────────────────

class AdminResetPasswordView(APIView):
    permission_classes = [IsAdministrateur]

    def post(self, request, pk):
        try:
            user = Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user)
            LogAudit.enregistrer(
                utilisateur=request.user,
                table='utilisateur',
                enregistrement_id=str(user.id),
                action=ActionAudit.UPDATE,
                valeur_apres=f"Mot de passe réinitialisé pour {user.matricule}",
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
            return Response({'detail': 'Mot de passe réinitialisé avec succès.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DebloquerUtilisateurView(APIView):
    """Déblocage d'un compte verrouillé — réservé à l'administrateur."""
    permission_classes = [IsAdministrateur]

    def post(self, request, pk):
        try:
            user = Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not user.bloque:
            return Response({'detail': 'Ce compte n\'est pas bloqué.'}, status=status.HTTP_400_BAD_REQUEST)

        user.debloquer()
        LogAudit.enregistrer(
            utilisateur=request.user,
            table='utilisateur',
            enregistrement_id=str(user.id),
            action=ActionAudit.UPDATE,
            valeur_apres=f"Compte débloqué pour {user.matricule} – {user.prenom} {user.nom}",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        logger.info("DEBLOCAGE | %s débloqué par %s", user.email, request.user.email)
        return Response({'detail': f'Compte de {user.prenom} {user.nom} débloqué avec succès.'})


class DepartementListCreateView(generics.ListCreateAPIView):
    queryset           = Departement.objects.all()
    serializer_class   = DepartementSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdministrateur()]

    def perform_create(self, serializer):
        instance = serializer.save()
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='departement',
            enregistrement_id=str(instance.id),
            action=ActionAudit.CREATE,
            valeur_apres=f"{instance.code} – {instance.nom}",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )


class DepartementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Departement.objects.all()
    serializer_class   = DepartementSerializer
    permission_classes = [IsAdministrateur]

    def perform_update(self, serializer):
        instance = serializer.save()
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='departement',
            enregistrement_id=str(instance.id),
            action=ActionAudit.UPDATE,
            valeur_apres=str(self.request.data),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def perform_destroy(self, instance):
        LogAudit.enregistrer(
            utilisateur=self.request.user,
            table='departement',
            enregistrement_id=str(instance.id),
            action=ActionAudit.DELETE,
            valeur_avant=f"{instance.code} – {instance.nom}",
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )
        instance.delete()


# ── Activité d'un utilisateur (admin) ────────────────────────────────────────

class UtilisateurActiviteView(APIView):
    permission_classes = [IsAdministrateur]

    def get(self, request, pk):
        try:
            user = Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=404)

        from budget.models import Budget, ConsommationLigne

        data = {
            'role': user.role,
            'budgets_crees': [],
            'depenses_enregistrees': [],
            'depenses_validees': [],
        }

        # Budgets créés (gestionnaire)
        budgets = Budget.objects.filter(gestionnaire=user).order_by('-date_creation')
        data['budgets_crees'] = [
            {
                'id': str(b.id),
                'code': b.code,
                'nom': b.nom,
                'montant_global': str(b.montant_global),
                'statut': b.statut,
                'date_creation': b.date_creation.isoformat() if b.date_creation else None,
            }
            for b in budgets
        ]

        # Dépenses enregistrées par cet utilisateur
        dep_enreg = ConsommationLigne.objects.select_related(
            'ligne__budget', 'validateur'
        ).filter(enregistre_par=user).order_by('-date')
        data['depenses_enregistrees'] = [
            {
                'id': str(d.id),
                'reference': d.reference or str(d.id)[:8].upper(),
                'montant': str(d.montant),
                'budget_code': d.ligne.budget.code if d.ligne and d.ligne.budget_id else '—',
                'budget_nom': d.ligne.budget.nom if d.ligne and d.ligne.budget_id else '—',
                'ligne_designation': d.ligne.libelle if d.ligne else '—',
                'statut': d.statut,
                'date': d.date.isoformat() if d.date else None,
            }
            for d in dep_enreg
        ]

        # Dépenses validées/rejetées par cet utilisateur (comptable)
        dep_val = ConsommationLigne.objects.select_related(
            'ligne__budget', 'enregistre_par'
        ).filter(validateur=user).order_by('-date')
        data['depenses_validees'] = [
            {
                'id': str(d.id),
                'reference': d.reference or str(d.id)[:8].upper(),
                'montant': str(d.montant),
                'budget_code': d.ligne.budget.code if d.ligne and d.ligne.budget_id else '—',
                'budget_nom': d.ligne.budget.nom if d.ligne and d.ligne.budget_id else '—',
                'ligne_designation': d.ligne.libelle if d.ligne else '—',
                'statut': d.statut,
                'enregistre_par': f"{d.enregistre_par.prenom} {d.enregistre_par.nom}" if d.enregistre_par else '—',
                'date': d.date.isoformat() if d.date else None,
            }
            for d in dep_val
        ]

        return Response(data)


# ── Mot de passe oublié — envoi du lien par email ─────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = Utilisateur.objects.get(email__iexact=email)
        except Utilisateur.DoesNotExist:
            # Réponse identique pour ne pas révéler les comptes existants
            return Response({'detail': 'Si cet email existe, un lien a été envoyé.'})

        try:
            uid   = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

            try:
                html_body = render_to_string('emails/reset_password.html', {
                    'prenom':    user.prenom,
                    'nom':       user.nom,
                    'reset_url': reset_url,
                })
            except Exception as tmpl_err:
                logger.error("RESET_PASSWORD | Erreur template pour %s : %s", user.email, tmpl_err)
                html_body = None

            plain_body = (
                f"Bonjour {user.prenom} {user.nom},\n\n"
                f"Cliquez sur ce lien pour réinitialiser votre mot de passe :\n{reset_url}\n\n"
                "Ce lien est valable 24 heures.\n\n— Atlas Finance"
            )

            send_mail(
                subject='Réinitialisation de votre mot de passe — Atlas Finance',
                message=plain_body,
                html_message=html_body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@budgetflow.bf'),
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info("RESET_PASSWORD | Email envoyé avec succes a %s", user.email)

        except Exception as e:
            # SMTP indisponible — on logue le lien pour usage manuel
            logger.warning(
                "RESET_PASSWORD | SMTP echec pour %s (%s) — "
                "Lien de reinitialisation : %s",
                user.email, e, reset_url,
            )

        return Response({'detail': 'Si cet email existe, un lien a été envoyé.'})


# ── Réinitialisation du mot de passe via token ───────────────────────────────

class ResetPasswordConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid          = request.data.get('uid', '')
        token        = request.data.get('token', '')
        new_password = request.data.get('new_password', '')

        if not all([uid, token, new_password]):
            return Response({'detail': 'Paramètres manquants.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 4:
            return Response({'detail': 'Le mot de passe doit contenir au moins 4 caractères.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pk   = force_str(urlsafe_base64_decode(uid))
            user = Utilisateur.objects.get(pk=pk)
        except (Utilisateur.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Lien invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response(
                {'detail': 'Lien expiré ou invalide. Faites une nouvelle demande.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        logger.info("RESET_PASSWORD | Mot de passe réinitialisé pour %s", user.email)

        return Response({'detail': 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.'})
