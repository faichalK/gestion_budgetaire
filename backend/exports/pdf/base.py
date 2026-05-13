"""
Atlas Finance PDF — Classe de base AtlasPDFDocument
Encapsule SimpleDocTemplate avec :
  - Header / footer automatiques sur toutes les pages
  - Numérotation 'Page X / Y' via 2 passes (NumberedCanvas)
  - Filigrane CONFIDENTIEL pour les brouillons
  - Métadonnées PDF (title, author, subject, creator)
  - as_response() → HttpResponse Django
  - Logging des exports
"""
import io
import logging
from datetime import datetime

from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import SimpleDocTemplate
from reportlab.lib.pagesizes import A4, landscape as rl_landscape
from reportlab.lib.units import cm
from django.http import HttpResponse

from .styles import (
    MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
    FOOTER_Y, GRAY_MED, NAVY,
    get_fonts, register_fonts,
)
from .components import draw_header_and_footer

logger = logging.getLogger('atlas.exports.pdf')


# ── Canvas avec numérotation 2 passes ────────────────────────────────────────

class NumberedCanvas(rl_canvas.Canvas):
    """
    Canvas qui diffère showPage() pour permettre d'estampiller
    le nombre total de pages une fois celui-ci connu.
    """

    def __init__(self, *args, **kwargs):
        self._atlas_meta = kwargs.pop('_atlas_meta', {})
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict] = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._stamp_page_total(num_pages)
            rl_canvas.Canvas.showPage(self)
        rl_canvas.Canvas.save(self)

    def _stamp_page_total(self, total: int):
        """Imprime 'Page X / Y' dans le coin inférieur droit."""
        f = get_fonts()
        w, _ = self._pagesize
        x = w - MARGIN_RIGHT * cm
        y = FOOTER_Y * cm + 4

        self.saveState()
        self.setFont(f['regular'], 8)
        self.setFillColor(GRAY_MED)
        self.drawRightString(x, y, f'Page {self._pageNumber} / {total}')
        self.restoreState()


# ── Filigrane ─────────────────────────────────────────────────────────────────

def _draw_watermark(canvas, doc):
    """Filigrane diagonal CONFIDENTIEL pour les brouillons."""
    f = get_fonts()
    w, h = doc.pagesize
    canvas.saveState()
    canvas.setFont(f['bold'], 52)
    canvas.setFillColorRGB(0.85, 0.85, 0.85, alpha=0.35)
    canvas.translate(w / 2, h / 2)
    canvas.rotate(45)
    canvas.drawCentredString(0, 0, 'CONFIDENTIEL')
    canvas.restoreState()


# ── Document de base ──────────────────────────────────────────────────────────

class AtlasPDFDocument:
    """
    Template de base pour tous les documents PDF Atlas Finance.

    Usage :
        doc = AtlasPDFDocument(
            title='Détail Budget BDG-2026-006',
            doc_type='budget_detail',
            user_name='Jean KOUAKOU',
            reference='BDG-2026-006',
        )
        elements = [...]
        return doc.as_response(elements, filename='atlas_finance_budget_BDG-2026-006_20260512.pdf')
    """

    def __init__(
        self,
        title: str,
        doc_type: str,
        user_name: str,
        reference: str = '',
        use_landscape: bool = False,
        is_draft: bool = False,
    ):
        register_fonts()

        self.title        = title
        self.doc_type     = doc_type
        self.user_name    = user_name
        self.reference    = reference
        self.use_landscape = use_landscape
        self.is_draft     = is_draft

        pagesize = rl_landscape(A4) if use_landscape else A4
        w, h = pagesize

        self._usable_width  = w - (MARGIN_LEFT + MARGIN_RIGHT) * cm
        self._usable_height = h - (MARGIN_TOP  + MARGIN_BOTTOM) * cm

        self._doc = SimpleDocTemplate(
            None,               # sera remplacé par un BytesIO au build
            pagesize=pagesize,
            leftMargin=MARGIN_LEFT   * cm,
            rightMargin=MARGIN_RIGHT * cm,
            topMargin=MARGIN_TOP     * cm,
            bottomMargin=MARGIN_BOTTOM * cm,
            title=title,
            author='Atlas Finance',
            subject=doc_type,
            creator='Atlas Finance — Gestion Budgétaire v2',
        )
        # Stocker les métadonnées sur le doc pour que les callbacks y accèdent
        self._doc._atlas_title = title
        self._doc._atlas_user  = user_name

    @property
    def usable_width(self) -> float:
        """Largeur utile en points (pour dimensionner les tableaux)."""
        return self._usable_width

    @property
    def usable_height(self) -> float:
        """Hauteur utile en points."""
        return self._usable_height

    def _make_canvas_factory(self):
        """Retourne une factory pour NumberedCanvas transmettant les métadonnées."""
        meta = {'title': self.title, 'user': self.user_name}

        def factory(*args, **kwargs):
            return NumberedCanvas(*args, _atlas_meta=meta, **kwargs)

        return factory

    def _page_callback(self, canvas, doc):
        """Callback pour toutes les pages : header + footer [+ filigrane]."""
        if self.is_draft:
            _draw_watermark(canvas, doc)
        draw_header_and_footer(canvas, doc)

    def build(self, elements: list) -> io.BytesIO:
        """
        Construit le PDF en mémoire et retourne un BytesIO positionné au début.
        """
        buf = io.BytesIO()
        # Patch: SimpleDocTemplate n'accepte pas None → on réinstancie avec le buf
        pagesize = rl_landscape(A4) if self.use_landscape else A4
        doc = SimpleDocTemplate(
            buf,
            pagesize=pagesize,
            leftMargin=MARGIN_LEFT   * cm,
            rightMargin=MARGIN_RIGHT * cm,
            topMargin=MARGIN_TOP     * cm,
            bottomMargin=MARGIN_BOTTOM * cm,
            title=self.title,
            author='Atlas Finance',
            subject=self.doc_type,
            creator='Atlas Finance — Gestion Budgétaire v2',
        )
        doc._atlas_title = self.title
        doc._atlas_user  = self.user_name

        doc.build(
            elements,
            onFirstPage=self._page_callback,
            onLaterPages=self._page_callback,
            canvasmaker=self._make_canvas_factory(),
        )

        buf.seek(0)
        return buf

    def as_response(self, elements: list, filename: str) -> HttpResponse:
        """
        Construit le PDF et retourne un HttpResponse Django prêt à envoyer.

        Args:
            elements : liste de Flowables ReportLab
            filename : nom du fichier téléchargé (sans chemin)
        """
        buf = self.build(elements)
        content = buf.getvalue()

        # Nom de fichier sécurisé
        safe_name = filename.replace(' ', '_').replace('/', '-')

        response = HttpResponse(content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{safe_name}"'
        response['Content-Length'] = len(content)

        # Logging
        size_kb = len(content) / 1024
        logger.info(
            'PDF export | type=%s | ref=%s | user=%s | pages≈ | size=%.1f KB',
            self.doc_type, self.reference, self.user_name, size_kb,
        )

        return response

    @staticmethod
    def make_filename(doc_type: str, reference: str = '') -> str:
        """
        Génère un nom de fichier normalisé :
        atlas_finance_<type>_<reference>_<YYYYMMDD>.pdf
        """
        today = datetime.now().strftime('%Y%m%d')
        parts = ['atlas_finance', doc_type]
        if reference:
            parts.append(reference.replace('/', '-').replace(' ', '_'))
        parts.append(today)
        return '_'.join(parts) + '.pdf'
