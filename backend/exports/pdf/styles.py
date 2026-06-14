"""
Atlas Finance PDF — Design tokens centralisés
Couleurs, enregistrement des polices, ParagraphStyles.
Aucun style inline dans les générateurs — tout passe par ce module.
"""
from pathlib import Path

from reportlab.lib import colors as C
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Répertoire des polices ────────────────────────────────────────────────────
_FONTS_DIR = Path(__file__).parent / 'fonts'

# ── Palette Atlas Finance ─────────────────────────────────────────────────────
NAVY        = C.HexColor('#0F1B3D')   # en-têtes, titres, lignes principales
NAVY_LIGHT  = C.HexColor('#E8EEF5')   # fonds subtils navy
GREEN       = C.HexColor('#1F5F3F')   # APPROUVÉ, accents positifs
GREEN_LIGHT = C.HexColor('#D4EDDA')   # fond badge approuvé
GOLD        = C.HexColor('#C9A24B')   # accents secondaires, totaux
GOLD_LIGHT  = C.HexColor('#FBF4E5')   # fond ligne total
GRAY_LIGHT  = C.HexColor('#F5F5F5')   # lignes alternées
GRAY_MED    = C.HexColor('#9CA3AF')   # texte atténué
GRAY_DARK   = C.HexColor('#374151')   # texte secondaire
GRAY_DRAFT  = C.HexColor('#6B7280')   # statut BROUILLON
ORANGE      = C.HexColor('#D97706')   # statut SOUMIS
ORANGE_LIGHT = C.HexColor('#FEF3C7')
RED         = C.HexColor('#B91C1C')   # statut REJETÉ
RED_LIGHT   = C.HexColor('#FEE2E2')
WHITE       = C.white
BLACK       = C.black

# ── Couleurs et labels des statuts ────────────────────────────────────────────
STATUT_COLORS = {
    'BROUILLON': (GRAY_DRAFT,  WHITE),
    'SOUMIS':    (ORANGE,      WHITE),
    'APPROUVE':  (GREEN,       WHITE),
    'APPROUVÉ':  (GREEN,       WHITE),
    'REJETE':    (RED,         WHITE),
    'REJETÉ':    (RED,         WHITE),
    'CLOTURE':   (NAVY,        WHITE),
    'CLÔTURÉ':   (NAVY,        WHITE),
    'VALIDEE':   (GREEN,       WHITE),
    'VALIDÉE':   (GREEN,       WHITE),
    'REJETEE':   (RED,         WHITE),
    'REJETÉE':   (RED,         WHITE),
    'SAISIE':    (ORANGE,      WHITE),
    'EN ATTENTE': (ORANGE,     WHITE),
}

STATUT_LABELS = {
    'BROUILLON': 'BROUILLON',
    'SOUMIS':    'SOUMIS',
    'APPROUVE':  'APPROUVÉ',
    'APPROUVÉ':  'APPROUVÉ',
    'REJETE':    'REJETÉ',
    'REJETÉ':    'REJETÉ',
    'CLOTURE':   'CLÔTURÉ',
    'CLÔTURÉ':   'CLÔTURÉ',
    'VALIDEE':   'VALIDÉE',
    'VALIDÉE':   'VALIDÉE',
    'REJETEE':   'REJETÉE',
    'REJETÉE':   'REJETÉE',
    'SAISIE':    'EN ATTENTE',
}

# ── Noms de polices (mis à jour par register_fonts) ───────────────────────────
_FONT_NAMES = {
    'regular':   'Helvetica',
    'medium':    'Helvetica',
    'bold':      'Helvetica-Bold',
    'italic':    'Helvetica-Oblique',
    'mono':      'Courier',
    'mono_bold': 'Courier-Bold',
}
_fonts_registered = False


def register_fonts() -> bool:
    """
    Tente d'enregistrer IBM Plex Sans et Mono depuis le dossier fonts/.
    Retourne True si les polices IBM Plex ont été chargées, False si fallback Helvetica.
    Met à jour _FONT_NAMES en conséquence.
    """
    global _fonts_registered
    if _fonts_registered:
        return _FONT_NAMES['regular'] == 'IBMPlexSans'

    ibm_ttfs = {
        'regular':   'IBMPlexSans-Regular.ttf',
        'medium':    'IBMPlexSans-Medium.ttf',
        'bold':      'IBMPlexSans-Bold.ttf',
        'italic':    'IBMPlexSans-Italic.ttf',
        'mono':      'IBMPlexMono-Regular.ttf',
        'mono_bold': 'IBMPlexMono-Bold.ttf',
    }
    ibm_names = {
        'regular':   'IBMPlexSans',
        'medium':    'IBMPlexSans-Medium',
        'bold':      'IBMPlexSans-Bold',
        'italic':    'IBMPlexSans-Italic',
        'mono':      'IBMPlexMono',
        'mono_bold': 'IBMPlexMono-Bold',
    }

    all_ok = True
    for key, filename in ibm_ttfs.items():
        path = _FONTS_DIR / filename
        if path.exists():
            try:
                pdfmetrics.registerFont(TTFont(ibm_names[key], str(path)))
            except Exception:
                all_ok = False
                break
        else:
            all_ok = False
            break

    if all_ok:
        _FONT_NAMES.update(ibm_names)

    _fonts_registered = True
    return all_ok


def get_fonts() -> dict:
    """Retourne le dictionnaire des noms de polices actifs (IBM Plex ou Helvetica)."""
    register_fonts()
    return _FONT_NAMES


# ── Factory ParagraphStyle ────────────────────────────────────────────────────
def _ps(name, **kwargs) -> ParagraphStyle:
    """Raccourci pour créer un ParagraphStyle."""
    return ParagraphStyle(name, **kwargs)


def get_para_styles() -> dict:
    """
    Retourne un dictionnaire de ParagraphStyle prêts à l'emploi.
    Appelé au moment de la génération pour utiliser les bons noms de polices.
    """
    f = get_fonts()
    return {
        # ── Titres ──
        'cover_title': _ps('cover_title',
            fontName=f['bold'], fontSize=24, leading=30,
            textColor=NAVY, alignment=TA_CENTER, spaceAfter=8),

        'cover_subtitle': _ps('cover_subtitle',
            fontName=f['regular'], fontSize=14, leading=18,
            textColor=GRAY_DARK, alignment=TA_CENTER, spaceAfter=4),

        'section_title': _ps('section_title',
            fontName=f['bold'], fontSize=11, leading=14,
            textColor=NAVY, spaceBefore=12, spaceAfter=6),

        'h2': _ps('h2',
            fontName=f['bold'], fontSize=9, leading=12,
            textColor=NAVY, spaceBefore=8, spaceAfter=4),

        # ── Corps ──
        'body': _ps('body',
            fontName=f['regular'], fontSize=9, leading=13,
            textColor=GRAY_DARK, spaceAfter=4),

        'body_bold': _ps('body_bold',
            fontName=f['bold'], fontSize=9, leading=13,
            textColor=GRAY_DARK),

        'caption': _ps('caption',
            fontName=f['regular'], fontSize=8, leading=11,
            textColor=GRAY_MED),

        # ── Mono (références, codes, montants) ──
        'mono': _ps('mono',
            fontName=f['mono'], fontSize=9, leading=12,
            textColor=GRAY_DARK, alignment=TA_RIGHT),

        'mono_bold': _ps('mono_bold',
            fontName=f['mono_bold'], fontSize=9, leading=12,
            textColor=NAVY, alignment=TA_RIGHT),

        # ── KPI cards ──
        'kpi_label': _ps('kpi_label',
            fontName=f['regular'], fontSize=8, leading=10,
            textColor=GRAY_MED, alignment=TA_CENTER),

        'kpi_value': _ps('kpi_value',
            fontName=f['bold'], fontSize=12, leading=15,
            textColor=NAVY, alignment=TA_CENTER),

        'kpi_delta': _ps('kpi_delta',
            fontName=f['medium'], fontSize=8, leading=10,
            alignment=TA_CENTER),

        # ── Tableau ──
        'table_header': _ps('table_header',
            fontName=f['bold'], fontSize=9, leading=11,
            textColor=WHITE, alignment=TA_CENTER),

        'table_cell': _ps('table_cell',
            fontName=f['regular'], fontSize=9, leading=11,
            textColor=GRAY_DARK),

        'table_cell_right': _ps('table_cell_right',
            fontName=f['mono'], fontSize=9, leading=11,
            textColor=GRAY_DARK, alignment=TA_RIGHT),

        'table_total': _ps('table_total',
            fontName=f['mono_bold'], fontSize=9, leading=11,
            textColor=NAVY, alignment=TA_RIGHT),

        # ── Pied de page / métadonnées ──
        'footer': _ps('footer',
            fontName=f['regular'], fontSize=8, leading=10,
            textColor=GRAY_MED),

        'footer_italic': _ps('footer_italic',
            fontName=f['italic'], fontSize=8, leading=10,
            textColor=GRAY_MED, alignment=TA_CENTER),

        # ── Statut rejet ──
        'reject_reason': _ps('reject_reason',
            fontName=f['italic'], fontSize=9, leading=13,
            textColor=RED, spaceBefore=4),

        # ── Label info ──
        'info_key': _ps('info_key',
            fontName=f['bold'], fontSize=9, leading=12,
            textColor=GRAY_DARK),

        'info_val': _ps('info_val',
            fontName=f['regular'], fontSize=9, leading=12,
            textColor=BLACK),
    }


# ── Constantes de mise en page ────────────────────────────────────────────────
MARGIN_LEFT   = 2.0   # cm
MARGIN_RIGHT  = 2.0   # cm
MARGIN_TOP    = 2.5   # cm
MARGIN_BOTTOM = 2.0   # cm

HEADER_LINE_Y = 1.8   # cm depuis le haut — trait de séparation
FOOTER_Y      = 0.8   # cm depuis le bas  — texte pied de page
LOGO_WIDTH    = 3.0   # cm
LOGO_HEIGHT   = 1.2   # cm
