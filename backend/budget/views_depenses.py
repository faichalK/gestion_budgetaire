"""
Atlas Finance — Vues Dépenses
==============================
Toutes les opérations portent sur le modèle Depense (entité parente).
Les ConsommationLigne sont les lignes enfants.

GET    /api/v1/depenses/                   liste
GET    /api/v1/depenses/<pk>/              détail (Depense + ses lignes)
POST   /api/v1/depenses/<pk>/valider/      valider (comptable/admin)
POST   /api/v1/depenses/<pk>/rejeter/      rejeter (comptable/admin)
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings

from .models import Depense, ConsommationLigne, StatutDepense, creer_notification
from accounts.views import IsComptableOrAdmin
from audit.models import ActionAudit, LogAudit
from .views_pieces import _serialiser_piece

APP_NAME = 'Atlas Finance'


def _envoyer_email(destinataire, sujet, corps):
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
    except Exception:
        pass


def _serialiser_ligne(cl, request=None):
    ligne    = cl.ligne
    sous_cat = ligne.sous_categorie if ligne and ligne.sous_categorie_id else None
    cat      = sous_cat.categorie   if sous_cat and sous_cat.categorie_id  else None
    return {
        'id':              str(cl.id),
        'reference':       cl.reference or str(cl.id)[:8].upper(),
        'montant':         str(cl.montant),
        'note':            cl.note,
        'statut':          cl.statut,
        'motif_rejet':     cl.motif_rejet,
        'ligne_id':        str(ligne.id)   if ligne else None,
        'ligne_libelle':   ligne.libelle   if ligne else '—',
        'ligne_code':      ligne.code      if ligne else '—',
        'sous_cat_code':   sous_cat.code   if sous_cat else '—',
        'sous_cat_libelle':sous_cat.libelle if sous_cat else '—',
        'cat_code':        cat.code        if cat else '—',
        'cat_libelle':     cat.libelle     if cat else '—',
        'date':            cl.date.isoformat() if cl.date else None,
    }


def _serialiser_depense(depense, request=None):
    lignes = list(
        depense.lignes.select_related(
            'ligne__sous_categorie__categorie'
        ).all()
    )
    pieces = list(depense.pieces_justificatives.select_related('uploaded_by').all())

    budget = depense.budget
    return {
        'id':             str(depense.id),
        'statut':         depense.statut,
        'fournisseur':    depense.fournisseur,
        'note':           depense.note,
        'motif_rejet':    depense.motif_rejet,
        'montant_total':  str(depense.montant_total),
        'nombre_pieces':  len(pieces),
        'date':           depense.date.isoformat() if depense.date else None,
        'budget_id':      str(budget.id)   if budget else None,
        'budget_code':    budget.code      if budget else '—',
        'budget_nom':     budget.nom       if budget else '—',
        'enregistre_par': (
            f"{depense.enregistre_par.prenom} {depense.enregistre_par.nom}"
            if depense.enregistre_par else '—'
        ),
        'validateur_nom': (
            f"{depense.validateur.prenom} {depense.validateur.nom}"
            if depense.validateur else None
        ),
        'lignes':  [_serialiser_ligne(cl, request) for cl in lignes],
        'pieces':  [_serialiser_piece(p, request)  for p  in pieces],
    }


def _depenses_qs():
    return Depense.objects.select_related(
        'budget', 'enregistre_par', 'validateur'
    ).prefetch_related(
        'lignes__ligne__sous_categorie__categorie',
        'pieces_justificatives__uploaded_by',
    )


def _depenses_qs_for_user(user):
    qs = _depenses_qs()
    if getattr(user, 'is_gestionnaire', False):
        qs = qs.filter(enregistre_par=user)
    return qs


# ── Liste ──────────────────────────────────────────────────────────────────────

class DepenseListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = _depenses_qs_for_user(request.user).order_by('-date')

        statut    = request.query_params.get('statut')
        search    = request.query_params.get('search', '')
        budget_id = request.query_params.get('budget')

        if statut:
            qs = qs.filter(statut=statut)
        if search:
            qs = qs.filter(
                Q(fournisseur__icontains=search) |
                Q(note__icontains=search)
            )
        if budget_id:
            qs = qs.filter(budget_id=budget_id)

        data = [_serialiser_depense(d, request) for d in qs]
        return Response({'data': data})


# ── Détail ─────────────────────────────────────────────────────────────────────

class DepenseDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            depense = _depenses_qs_for_user(request.user).get(pk=pk)
        except Depense.DoesNotExist:
            # Backward compat : pk est peut-être un ConsommationLigne.id
            try:
                cl = ConsommationLigne.objects.select_related('depense').get(pk=pk)
                if cl.depense:
                    depense = _depenses_qs().get(pk=cl.depense_id)
                else:
                    return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)
            except ConsommationLigne.DoesNotExist:
                return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'data': _serialiser_depense(depense, request)})


# ── Validation ─────────────────────────────────────────────────────────────────

class ValiderDepenseView(APIView):
    permission_classes = [IsComptableOrAdmin]

    def post(self, request, pk):
        try:
            depense = _depenses_qs().get(pk=pk)
        except Depense.DoesNotExist:
            # Backward compat : pk = ConsommationLigne.id
            try:
                cl = ConsommationLigne.objects.select_related('depense').get(pk=pk)
                depense = cl.depense
                if not depense:
                    return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)
                depense = _depenses_qs().get(pk=depense.pk)
            except ConsommationLigne.DoesNotExist:
                return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if depense.statut != StatutDepense.SAISIE:
            return Response(
                {'detail': f'Impossible de valider une dépense au statut {depense.statut}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Au moins une pièce justificative obligatoire pour valider
        if depense.pieces_justificatives.count() == 0:
            return Response(
                {'detail': 'Impossible de valider : aucune pièce justificative jointe.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        depense.valider(request.user)

        LogAudit.enregistrer(
            utilisateur=request.user,
            table='depense',
            enregistrement_id=str(depense.id),
            action=ActionAudit.APPROVE,
            valeur_apres=f"Dépense {depense.id} validée — {depense.montant_total} FCFA",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        if depense.enregistre_par:
            creer_notification(
                destinataire=depense.enregistre_par,
                type_notif='DEPENSE_VALIDEE',
                message=(
                    f"Votre dépense de {depense.montant_total:,.0f} FCFA "
                    f"sur le budget {depense.budget.code} a été validée."
                ),
                lien='/mes-depenses',
            )
            _envoyer_email(
                depense.enregistre_par,
                f"Dépense validée — {depense.budget.code}",
                (
                    f"Bonjour {depense.enregistre_par.prenom} {depense.enregistre_par.nom},\n\n"
                    f"Votre dépense de {depense.montant_total:,.0f} FCFA sur le budget "
                    f"{depense.budget.code} – {depense.budget.nom} a été validée par "
                    f"{request.user.prenom} {request.user.nom}."
                ),
            )

        depense.refresh_from_db()
        return Response({'detail': 'Dépense validée.', 'data': _serialiser_depense(depense, request)})


# ── Rejet ──────────────────────────────────────────────────────────────────────

class RejeterDepenseView(APIView):
    permission_classes = [IsComptableOrAdmin]

    def post(self, request, pk):
        try:
            depense = _depenses_qs().get(pk=pk)
        except Depense.DoesNotExist:
            # Backward compat : pk = ConsommationLigne.id
            try:
                cl = ConsommationLigne.objects.select_related('depense').get(pk=pk)
                depense = cl.depense
                if not depense:
                    return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)
                depense = _depenses_qs().get(pk=depense.pk)
            except ConsommationLigne.DoesNotExist:
                return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if depense.statut != StatutDepense.SAISIE:
            return Response(
                {'detail': f'Impossible de rejeter une dépense au statut {depense.statut}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        motif = request.data.get('motif', '')
        if len(motif.strip()) < 10:
            return Response(
                {'detail': 'Motif trop court (minimum 10 caractères).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        depense.rejeter(request.user, motif)

        LogAudit.enregistrer(
            utilisateur=request.user,
            table='depense',
            enregistrement_id=str(depense.id),
            action=ActionAudit.REJECT,
            valeur_apres=f"Dépense {depense.id} rejetée — motif: {motif[:60]}",
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        if depense.enregistre_par:
            creer_notification(
                destinataire=depense.enregistre_par,
                type_notif='DEPENSE_REJETEE',
                message=(
                    f"Votre dépense de {depense.montant_total:,.0f} FCFA "
                    f"sur le budget {depense.budget.code} a été rejetée. Motif : {motif[:100]}"
                ),
                lien='/mes-depenses',
            )
            _envoyer_email(
                depense.enregistre_par,
                f"Dépense rejetée — {depense.budget.code}",
                (
                    f"Bonjour {depense.enregistre_par.prenom} {depense.enregistre_par.nom},\n\n"
                    f"Votre dépense de {depense.montant_total:,.0f} FCFA sur le budget "
                    f"{depense.budget.code} – {depense.budget.nom} a été rejetée par "
                    f"{request.user.prenom} {request.user.nom}.\n\nMotif : {motif}"
                ),
            )

        depense.refresh_from_db()
        return Response({'detail': 'Dépense rejetée.', 'data': _serialiser_depense(depense, request)})
