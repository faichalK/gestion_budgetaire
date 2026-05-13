"""
Atlas Finance — Module d'export PDF
Package exports/pdf/

API publique :
    from exports.pdf import AtlasPDFDocument, format_fcfa, format_date_fr
"""
from .base import AtlasPDFDocument, NumberedCanvas
from .helpers import format_fcfa, format_date_fr, format_periode, truncate_text, format_taux
from .styles import (
    register_fonts, get_fonts, get_para_styles,
    NAVY, GOLD, GREEN, RED, ORANGE, GRAY_LIGHT, WHITE,
    STATUT_COLORS, STATUT_LABELS,
)
from .components import (
    draw_page_header, draw_page_footer, draw_header_and_footer,
    draw_status_badge,
    build_cover_page, build_kpi_row, build_info_table, build_section_separator,
)

__all__ = [
    'AtlasPDFDocument', 'NumberedCanvas',
    'format_fcfa', 'format_date_fr', 'format_periode', 'truncate_text', 'format_taux',
    'register_fonts', 'get_fonts', 'get_para_styles',
    'NAVY', 'GOLD', 'GREEN', 'RED', 'ORANGE', 'GRAY_LIGHT', 'WHITE',
    'STATUT_COLORS', 'STATUT_LABELS',
    'draw_page_header', 'draw_page_footer', 'draw_header_and_footer',
    'draw_status_badge',
    'build_cover_page', 'build_kpi_row', 'build_info_table', 'build_section_separator',
]
