"""
Atlas Finance — Vues pour la génération de rapports budgétaires.
"""
import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .rapport_service import RapportService
from .rapport_serializer import (
    RapportMensuelSerializer,
    RapportTrimestrielSerializer,
    RapportAnnuelSerializer,
    RapportAdhocSerializer,
)
from .export_service import ExportService


def _int_param(request, key, default=None, required=False):
    val = request.query_params.get(key) or request.data.get(key)
    if val is None:
        if required:
            raise ValueError(f"Paramètre requis : '{key}'")
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        raise ValueError(f"'{key}' doit être un entier.")


def _date_param(request, key, required=False):
    val = request.query_params.get(key) or request.data.get(key)
    if not val:
        if required:
            raise ValueError(f"Paramètre requis : '{key}'")
        return None
    try:
        return datetime.date.fromisoformat(val)
    except ValueError:
        raise ValueError(f"'{key}' doit être au format YYYY-MM-DD.")


def _list_param(request, key):
    """Retourne une liste d'IDs depuis un param CSV ou liste JSON."""
    val = request.query_params.getlist(key) or request.data.get(key, [])
    if isinstance(val, str):
        val = [v.strip() for v in val.split(',') if v.strip()]
    return val or None


# ─── Vues ──────────────────────────────────────────────────────────────────────

class RapportMensuelView(APIView):
    """GET /api/v1/rapports/mensuel/?mois=3&annee=2025"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            mois  = _int_param(request, 'mois',  required=True)
            annee = _int_param(request, 'annee', required=True)
            if not (1 <= mois <= 12):
                return Response({'detail': 'Le mois doit être compris entre 1 et 12.'},
                                status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        rapport    = RapportService.generer_rapport_mensuel(mois, annee)
        serializer = RapportMensuelSerializer(rapport)
        return Response(serializer.data)


class RapportTrimestrielView(APIView):
    """GET /api/v1/rapports/trimestriel/?trimestre=2&annee=2025"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            trimestre = _int_param(request, 'trimestre', required=True)
            annee     = _int_param(request, 'annee',     required=True)
            if not (1 <= trimestre <= 4):
                return Response({'detail': 'Le trimestre doit être compris entre 1 et 4.'},
                                status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        rapport    = RapportService.generer_rapport_trimestriel(trimestre, annee)
        serializer = RapportTrimestrielSerializer(rapport)
        return Response(serializer.data)


class RapportAnnuelView(APIView):
    """GET /api/v1/rapports/annuel/?annee=2025"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            annee = _int_param(request, 'annee', required=True)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        rapport    = RapportService.generer_rapport_annuel(annee)
        serializer = RapportAnnuelSerializer(rapport)
        return Response(serializer.data)


class RapportAdhocView(APIView):
    """
    GET  /api/v1/rapports/adhoc/?date_debut=2025-01-01&date_fin=2025-06-30
         &departements=<uuid>,<uuid>
    POST idem (pour passer de nombreux filtres dans le body)
    """
    permission_classes = [IsAuthenticated]

    def _build(self, request):
        try:
            date_debut = _date_param(request, 'date_debut', required=True)
            date_fin   = _date_param(request, 'date_fin',   required=True)
        except ValueError as e:
            return None, Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if date_debut > date_fin:
            return None, Response(
                {'detail': 'date_debut doit être antérieure à date_fin.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        departements_ids = _list_param(request, 'departements')
        lignes_ids       = _list_param(request, 'lignes')

        rapport = RapportService.generer_rapport_adhoc(
            date_debut, date_fin,
            departements_ids=departements_ids,
            lignes_ids=lignes_ids,
        )
        return rapport, None

    def get(self, request):
        rapport, err = self._build(request)
        if err:
            return err
        return Response(RapportAdhocSerializer(rapport).data)

    def post(self, request):
        rapport, err = self._build(request)
        if err:
            return err
        return Response(RapportAdhocSerializer(rapport).data)


# ─── Export PDF / Excel ────────────────────────────────────────────────────────

class ExportRapportView(APIView):
    """
    POST /api/v1/rapports/export/
    Body: { type, format, params }
      type   : MENSUEL | TRIMESTRIEL | ANNUEL | ADHOC
      format : PDF | EXCEL
      params : { mois?, annee?, trimestre?, date_debut?, date_fin?, departements? }
    """
    permission_classes = [IsAuthenticated]

    _TYPES = {
        'MENSUEL':      (RapportService.generer_rapport_mensuel,      ['mois', 'annee']),
        'TRIMESTRIEL':  (RapportService.generer_rapport_trimestriel,  ['trimestre', 'annee']),
        'ANNUEL':       (RapportService.generer_rapport_annuel,       ['annee']),
        'ADHOC':        (None, None),  # handled separately
    }

    def post(self, request):
        type_rapport = (request.data.get('type') or '').upper()
        fmt          = (request.data.get('format') or 'PDF').upper()
        params       = request.data.get('params', {})

        if type_rapport not in self._TYPES:
            return Response({'detail': f"Type inconnu. Valeurs acceptées : {list(self._TYPES)}."},
                            status=status.HTTP_400_BAD_REQUEST)
        if fmt not in ('PDF', 'EXCEL'):
            return Response({'detail': "Format doit être PDF ou EXCEL."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            if type_rapport == 'MENSUEL':
                rapport = RapportService.generer_rapport_mensuel(
                    int(params['mois']), int(params['annee']))
            elif type_rapport == 'TRIMESTRIEL':
                rapport = RapportService.generer_rapport_trimestriel(
                    int(params['trimestre']), int(params['annee']))
            elif type_rapport == 'ANNUEL':
                rapport = RapportService.generer_rapport_annuel(int(params['annee']))
            else:  # ADHOC
                date_debut = datetime.date.fromisoformat(params['date_debut'])
                date_fin   = datetime.date.fromisoformat(params['date_fin'])
                rapport = RapportService.generer_rapport_adhoc(
                    date_debut, date_fin,
                    departements_ids=params.get('departements') or None,
                )
        except (KeyError, ValueError) as e:
            return Response({'detail': f"Paramètres invalides : {e}"},
                            status=status.HTTP_400_BAD_REQUEST)

        if fmt == 'PDF':
            response = ExportService.export_pdf(rapport)
        else:
            response = ExportService.export_excel(rapport)

        return response
