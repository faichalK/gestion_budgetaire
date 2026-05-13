"""
Atlas Finance — Gestion des pièces justificatives
==================================================
POST   /api/v1/depenses/<uuid:depense_id>/pieces/          upload
GET    /api/v1/depenses/<uuid:depense_id>/pieces/          liste
DELETE /api/v1/depenses/<uuid:depense_id>/pieces/<uuid:pk>/ suppression
GET    /api/v1/pieces/<uuid:pk>/download/                  téléchargement sécurisé
"""
import hashlib
import logging
import mimetypes
import os

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse, Http404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Depense, PieceJustificative, StatutDepense,
    PIECE_FORMATS_AUTORISES, PIECE_TAILLE_MAX, PIECE_TAILLE_TOTALE_MAX,
)
from accounts.views import IsGestionnaire, IsComptableOrAdmin

logger = logging.getLogger('atlas.pieces')

FORMATS_EXTENSIONS = {
    'application/pdf': '.pdf',
    'image/jpeg':      '.jpg',
    'image/jpg':       '.jpg',
    'image/png':       '.png',
    'image/webp':      '.webp',
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_depense_or_404(pk, user):
    """Retourne la Depense si accessible, sinon 404."""
    try:
        qs = Depense.objects.select_related('budget__gestionnaire', 'enregistre_par')
        if getattr(user, 'is_gestionnaire', False):
            return qs.get(pk=pk, enregistre_par=user)
        return qs.get(pk=pk)
    except Depense.DoesNotExist:
        return None


def _peut_modifier_pieces(depense, user):
    """Gestionnaire propriétaire si SAISIE, Admin si SAISIE ou VALIDEE."""
    if depense.statut == StatutDepense.REJETEE:
        return False, "Impossible de modifier les pièces d'une dépense rejetée."
    if depense.statut == StatutDepense.VALIDEE and not getattr(user, 'is_administrateur', False):
        return False, "Seul un administrateur peut modifier les pièces d'une dépense validée."
    if getattr(user, 'is_gestionnaire', False) and str(depense.enregistre_par_id) != str(user.id):
        return False, "Accès non autorisé."
    return True, None


def _valider_fichier(fichier):
    """Valide format, taille et type MIME d'un fichier uploadé."""
    if fichier.size > PIECE_TAILLE_MAX:
        raise DjangoValidationError(
            f"Fichier trop volumineux ({fichier.size // 1024} Ko). Maximum : {PIECE_TAILLE_MAX // 1024 // 1024} Mo."
        )

    # Type MIME via mimetypes (fallback si python-magic absent)
    guessed, _ = mimetypes.guess_type(fichier.name)
    type_mime  = guessed or 'application/octet-stream'

    # Tentative avec python-magic pour validation plus fiable
    try:
        import magic
        raw = fichier.read(2048)
        fichier.seek(0)
        type_mime = magic.from_buffer(raw, mime=True)
    except (ImportError, Exception):
        pass

    if type_mime not in PIECE_FORMATS_AUTORISES:
        raise DjangoValidationError(
            f"Format non autorisé ({type_mime}). Formats acceptés : PDF, JPG, PNG, WEBP."
        )
    return type_mime


def _md5(fichier) -> str:
    fichier.seek(0)
    h = hashlib.md5()
    for chunk in iter(lambda: fichier.read(8192), b''):
        h.update(chunk)
    fichier.seek(0)
    return h.hexdigest()


def _serialiser_piece(piece, request=None):
    try:
        url = request.build_absolute_uri(piece.fichier.url) if request else piece.fichier.url
    except Exception:
        url = None
    return {
        'id':           str(piece.id),
        'nom_original': piece.nom_original,
        'taille':       piece.taille,
        'taille_lisible': piece.taille_lisible,
        'type_mime':    piece.type_mime,
        'description':  piece.description,
        'uploaded_at':  piece.uploaded_at.isoformat(),
        'uploaded_by':  (
            f"{piece.uploaded_by.prenom} {piece.uploaded_by.nom}"
            if piece.uploaded_by else '—'
        ),
        'url_download': (
            request.build_absolute_uri(f'/api/v1/pieces/{piece.id}/download/')
            if request else None
        ),
    }


# ── Vues ───────────────────────────────────────────────────────────────────────

class DepensePiecesView(APIView):
    """
    GET  /api/v1/depenses/<depense_id>/pieces/  → liste des pièces
    POST /api/v1/depenses/<depense_id>/pieces/  → upload une ou plusieurs pièces
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, depense_id):
        depense = _get_depense_or_404(depense_id, request.user)
        if depense is None:
            return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        pieces = depense.pieces_justificatives.select_related('uploaded_by').all()
        return Response({
            'data':         [_serialiser_piece(p, request) for p in pieces],
            'nombre_pieces': pieces.count(),
        })

    def post(self, request, depense_id):
        depense = _get_depense_or_404(depense_id, request.user)
        if depense is None:
            return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        ok, err = _peut_modifier_pieces(depense, request.user)
        if not ok:
            return Response({'detail': err}, status=status.HTTP_403_FORBIDDEN)

        fichiers = request.FILES.getlist('pieces') or (
            [request.FILES['piece']] if 'piece' in request.FILES else []
        )
        if not fichiers:
            return Response(
                {'detail': 'Aucun fichier fourni. Utilisez le champ "pieces" (multipart).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier quota total
        taille_existante = sum(
            p.taille for p in depense.pieces_justificatives.all()
        )
        taille_nouvelle = sum(f.size for f in fichiers)
        if taille_existante + taille_nouvelle > PIECE_TAILLE_TOTALE_MAX:
            return Response(
                {
                    'detail': (
                        f"Quota dépassé. Total actuel : {taille_existante // 1024} Ko. "
                        f"Ajout : {taille_nouvelle // 1024} Ko. "
                        f"Maximum : {PIECE_TAILLE_TOTALE_MAX // 1024 // 1024} Mo."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        creees = []
        erreurs = []

        for fichier in fichiers:
            try:
                type_mime = _valider_fichier(fichier)
            except DjangoValidationError as e:
                erreurs.append({'fichier': fichier.name, 'erreur': str(e)})
                continue

            md5 = _md5(fichier)

            # Dédoublonnage : même MD5 déjà présent sur cette dépense → ignorer
            if depense.pieces_justificatives.filter(md5_hash=md5).exists():
                erreurs.append({'fichier': fichier.name, 'erreur': 'Fichier identique déjà joint.'})
                continue

            # Nom sanitisé
            nom_safe = (
                os.path.splitext(fichier.name)[0]
                  .replace(' ', '_')
                  .replace('/', '-')
                  [:200]
                + (FORMATS_EXTENSIONS.get(type_mime, ''))
            )

            piece = PieceJustificative.objects.create(
                depense=depense,
                fichier=fichier,
                nom_original=fichier.name[:255],
                taille=fichier.size,
                type_mime=type_mime,
                description=request.data.get('description', ''),
                md5_hash=md5,
                uploaded_by=request.user,
            )
            creees.append(piece)
            logger.info('PJ uploadée | depense=%s | fichier=%s | user=%s | %d Ko',
                        depense_id, fichier.name, request.user.email, fichier.size // 1024)

        if erreurs and not creees:
            return Response({'detail': 'Aucun fichier uploadé.', 'erreurs': erreurs},
                            status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'pieces':  [_serialiser_piece(p, request) for p in creees],
                'erreurs': erreurs,
                'nombre_pieces': depense.pieces_justificatives.count(),
            },
            status=status.HTTP_201_CREATED,
        )


class DepensePieceDeleteView(APIView):
    """DELETE /api/v1/depenses/<depense_id>/pieces/<pk>/"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, depense_id, pk):
        depense = _get_depense_or_404(depense_id, request.user)
        if depense is None:
            return Response({'detail': 'Dépense introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        ok, err = _peut_modifier_pieces(depense, request.user)
        if not ok:
            return Response({'detail': err}, status=status.HTTP_403_FORBIDDEN)

        try:
            piece = depense.pieces_justificatives.get(pk=pk)
        except PieceJustificative.DoesNotExist:
            return Response({'detail': 'Pièce introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        nom = piece.nom_original
        piece.fichier.delete(save=False)
        piece.delete()
        logger.info('PJ supprimée | depense=%s | fichier=%s | user=%s',
                    depense_id, nom, request.user.email)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PieceDownloadView(APIView):
    """GET /api/v1/pieces/<pk>/download/ — téléchargement sécurisé."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            piece = PieceJustificative.objects.select_related(
                'depense__enregistre_par', 'depense__budget__gestionnaire'
            ).get(pk=pk)
        except PieceJustificative.DoesNotExist:
            raise Http404

        # Vérifier accès
        user = request.user
        depense = piece.depense
        if getattr(user, 'is_gestionnaire', False):
            if str(depense.enregistre_par_id) != str(user.id):
                return Response({'detail': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            response = FileResponse(
                piece.fichier.open('rb'),
                content_type=piece.type_mime or 'application/octet-stream',
            )
            response['Content-Disposition'] = f'attachment; filename="{piece.nom_original}"'
            response['Content-Length']      = piece.taille
            response['X-Content-Type-Options'] = 'nosniff'
            return response
        except (FileNotFoundError, ValueError):
            raise Http404
