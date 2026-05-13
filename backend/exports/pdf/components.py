"""
Atlas Finance PDF — Composants réutilisables
Tous les composants visuels partagés entre les générateurs :
  - draw_page_header / draw_page_footer   (fonctions canvas)
  - draw_status_badge                     (fonction canvas)
  - build_cover_page                      (→ list[Flowable])
  - build_kpi_row                         (→ Flowable)
  - build_info_table                      (→ Flowable)
  - build_section_separator               (→ Flowable)
"""
from pathlib import Path
from datetime import datetime

from reportlab.platypus import (
    Table, TableStyle, Paragraph, Spacer, HRFlowable, PageBreak, Image,
)
from reportlab.lib.units import cm
from reportlab.lib import colors as C

from .styles import (
    NAVY, NAVY_LIGHT, GOLD, GOLD_LIGHT, GRAY_LIGHT, GRAY_MED, GRAY_DARK,
    WHITE, GREEN, GREEN_LIGHT, RED, RED_LIGHT, ORANGE, ORANGE_LIGHT,
    STATUT_COLORS, STATUT_LABELS,
    MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
    HEADER_LINE_Y, FOOTER_Y, LOGO_WIDTH, LOGO_HEIGHT,
    get_fonts, get_para_styles,
)
from .helpers import format_date_fr, truncate_text

# Chemin vers le logo (budget.jpg au niveau backend/)
_LOGO_PATH = Path(__file__).parent.parent.parent / 'frontend_dist' / 'budget.jpg'


# ── En-tête de page ───────────────────────────────────────────────────────────

def draw_page_header(canvas, doc):
    """
    Dessine l'en-tête sur chaque page :
    - Logo Atlas Finance à gauche (3 cm × 1,2 cm)
    - Nom du document à droite en navy bold 10 pt
    - Ligne de séparation navy 0,5 pt à HEADER_LINE_Y cm du haut
    """
    f = get_fonts()
    w, h = doc.pagesize
    y_line = h - HEADER_LINE_Y * cm

    canvas.saveState()

    # Logo ou repli texte
    logo_x = MARGIN_LEFT * cm
    logo_y = y_line + 4
    logo_w = LOGO_WIDTH * cm
    logo_h = LOGO_HEIGHT * cm

    if _LOGO_PATH.exists():
        try:
            canvas.drawImage(
                str(_LOGO_PATH), logo_x, logo_y,
                width=logo_w, height=logo_h,
                preserveAspectRatio=True, mask='auto',
            )
        except Exception:
            _draw_text_logo(canvas, logo_x, logo_y + logo_h / 2, f)
    else:
        _draw_text_logo(canvas, logo_x, logo_y + logo_h / 2, f)

    # Titre du document à droite
    doc_title = getattr(doc, '_atlas_title', 'Atlas Finance')
    canvas.setFont(f['bold'], 10)
    canvas.setFillColor(NAVY)
    canvas.drawRightString(w - MARGIN_RIGHT * cm, y_line + 8, doc_title)

    # Ligne de séparation
    canvas.setStrokeColor(NAVY)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_LEFT * cm, y_line, w - MARGIN_RIGHT * cm, y_line)

    canvas.restoreState()


def _draw_text_logo(canvas, x, y, fonts):
    """Repli texte si le logo image n'est pas disponible."""
    canvas.setFont(fonts['bold'], 11)
    canvas.setFillColor(NAVY)
    canvas.drawString(x, y - 5, 'Atlas Finance')
    canvas.setFont(fonts['regular'], 7)
    canvas.setFillColor(GRAY_MED)
    canvas.drawString(x, y - 14, 'Gestion budgétaire')


# ── Pied de page ──────────────────────────────────────────────────────────────

def draw_page_footer(canvas, doc):
    """
    Dessine le pied de page sur chaque page.
    Note : 'Page X / Y' est estampillé par NumberedCanvas après la 2e passe.
    """
    f = get_fonts()
    w, _ = doc.pagesize
    y = FOOTER_Y * cm

    canvas.saveState()

    # Ligne de séparation
    canvas.setStrokeColor(GRAY_MED)
    canvas.setLineWidth(0.3)
    canvas.line(MARGIN_LEFT * cm, y + 14, w - MARGIN_RIGHT * cm, y + 14)

    # Gauche : généré par
    user_name = getattr(doc, '_atlas_user', 'Atlas Finance')
    now_str   = datetime.now().strftime('%d/%m/%Y à %H:%M')
    canvas.setFont(f['regular'], 8)
    canvas.setFillColor(GRAY_MED)
    canvas.drawString(MARGIN_LEFT * cm, y + 4, f'Généré le {now_str} par {user_name}')

    # Centre : mention confidentielle
    canvas.setFont(f['italic'], 8)
    canvas.drawCentredString(w / 2, y + 4, 'Atlas Finance — Document confidentiel')

    # Droite : "Page X / Y" → estampillé par NumberedCanvas (espace réservé)
    # Le texte réel est dessiné dans NumberedCanvas._stamp_page_total()

    canvas.restoreState()


def draw_header_and_footer(canvas, doc):
    """Callback unique pour onFirstPage et onLaterPages."""
    draw_page_header(canvas, doc)
    draw_page_footer(canvas, doc)


# ── Badge statut ──────────────────────────────────────────────────────────────

def draw_status_badge(canvas, x, y, statut: str,
                      badge_width: float = 2.2 * cm,
                      badge_height: float = 0.55 * cm):
    """
    Dessine un rectangle arrondi coloré selon le statut, texte blanc bold.

    Args:
        canvas : le canvas ReportLab courant
        x, y   : coin inférieur gauche du badge (en points)
        statut : clé de statut (BROUILLON, SOUMIS, APPROUVE, etc.)
    """
    f = get_fonts()
    key = (statut or '').upper()
    bg, fg = STATUT_COLORS.get(key, (GRAY_MED, WHITE))
    label  = STATUT_LABELS.get(key, key)

    canvas.saveState()
    canvas.setFillColor(bg)
    canvas.roundRect(x, y, badge_width, badge_height, radius=3, stroke=0, fill=1)
    canvas.setFillColor(fg)
    canvas.setFont(f['bold'], 7)
    canvas.drawCentredString(x + badge_width / 2, y + badge_height / 2 - 3, label)
    canvas.restoreState()


# ── Page de garde ─────────────────────────────────────────────────────────────

def build_cover_page(
    title: str,
    subtitle: str,
    info_rows: list,          # [(key, value), ...]
    user_name: str,
    statut: str | None = None,
    usable_width: float = 17 * cm,
) -> list:
    """
    Retourne une liste de Flowables constituant la page de garde.
    Un PageBreak() terminal sépare la garde du contenu.

    Args:
        info_rows  : paires (label, valeur) affichées dans le bloc d'informations
        usable_width : largeur utile de la page en points
    """
    st = get_para_styles()
    elements = []

    # ── Logo centré ──
    elements.append(Spacer(1, 2 * cm))
    if _LOGO_PATH.exists():
        try:
            img = Image(str(_LOGO_PATH), width=LOGO_WIDTH * cm * 1.5,
                        height=LOGO_HEIGHT * cm * 1.5)
            img.hAlign = 'CENTER'
            elements.append(img)
        except Exception:
            elements.append(Paragraph('ATLAS FINANCE', st['cover_title']))
    else:
        elements.append(Paragraph('ATLAS FINANCE', st['cover_title']))

    elements.append(Spacer(1, 1.5 * cm))

    # ── Titre ──
    elements.append(Paragraph(title, st['cover_title']))
    elements.append(Spacer(1, 0.4 * cm))
    if subtitle:
        elements.append(Paragraph(subtitle, st['cover_subtitle']))
    elements.append(Spacer(1, 1.5 * cm))

    # ── Badge statut ──
    if statut:
        key = statut.upper()
        bg, fg = STATUT_COLORS.get(key, (GRAY_MED, WHITE))
        label  = STATUT_LABELS.get(key, key)
        badge_data = [[Paragraph(
            f'<font color="white"><b>{label}</b></font>',
            get_para_styles()['table_header'],
        )]]
        badge_tbl = Table(badge_data, colWidths=[3 * cm])
        badge_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg),
            ('ALIGN',      (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',    (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))
        badge_tbl.hAlign = 'CENTER'
        elements.append(badge_tbl)
        elements.append(Spacer(1, 1 * cm))

    # ── Bloc d'informations ──
    if info_rows:
        col_key = usable_width * 0.35
        col_val = usable_width * 0.65
        rows = []
        for key, val in info_rows:
            rows.append([
                Paragraph(str(key), st['info_key']),
                Paragraph(str(val) if val is not None else '—', st['info_val']),
            ])

        info_tbl = Table(rows, colWidths=[col_key, col_val])
        info_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), NAVY_LIGHT),
            ('GRID',       (0, 0), (-1, -1), 0.3, GRAY_MED),
            ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',    (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ]))
        elements.append(info_tbl)
        elements.append(Spacer(1, 1.5 * cm))

    # ── Pied de page de garde ──
    elements.append(HRFlowable(width='100%', thickness=0.5, color=NAVY))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph(
        f'Document officiel — Atlas Finance · Généré le '
        f'{datetime.now().strftime("%d/%m/%Y à %H:%M")} par {user_name}',
        st['caption'],
    ))

    elements.append(PageBreak())
    return elements


# ── Rangée de KPI cards ────────────────────────────────────────────────────────

def build_kpi_row(kpis: list, usable_width: float) -> Table:
    """
    Construit une rangée de 3-4 cartes KPI côte à côte.

    Args:
        kpis : liste de dicts {'label': str, 'value': str, 'delta': str|None,
                               'delta_up': bool|None, 'bg': Color|None}
        usable_width : largeur totale disponible en points
    Returns:
        Un Table flowable.
    """
    st = get_para_styles()
    n  = len(kpis)
    if n == 0:
        return Spacer(1, 0)

    col_w = usable_width / n

    # Deux rangées : label | valeur
    row_labels = []
    row_values = []

    for k in kpis:
        row_labels.append(Paragraph(k.get('label', ''), st['kpi_label']))
        row_values.append(Paragraph(k.get('value', '—'), st['kpi_value']))

    data = [row_labels, row_values]

    # Rangée delta optionnelle
    has_delta = any(k.get('delta') for k in kpis)
    if has_delta:
        row_deltas = []
        for k in kpis:
            delta = k.get('delta', '')
            up    = k.get('delta_up')
            color = GREEN if up else (RED if up is False else GRAY_MED)
            prefix = '▲ ' if up else ('▼ ' if up is False else '')
            style = ParagraphStyle(
                'kpi_delta_dyn',
                parent=st['kpi_delta'],
                textColor=color,
            )
            row_deltas.append(Paragraph(f'{prefix}{delta}', style))
        data.append(row_deltas)

    tbl = Table(data, colWidths=[col_w] * n)

    ts = [
        ('GRID',     (0, 0), (-1, -1), 0.5, WHITE),
        ('BOX',      (0, 0), (-1, -1), 0.5, GRAY_MED),
        ('INNERGRID',(0, 0), (-1, -1), 0.5, GRAY_MED),
        ('VALIGN',   (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',    (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING',    (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING',    (0, 1), (-1, 1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
    ]

    # Fond par carte
    for i, k in enumerate(kpis):
        bg = k.get('bg', GRAY_LIGHT)
        ts.append(('BACKGROUND', (i, 0), (i, -1), bg))

    tbl.setStyle(TableStyle(ts))
    return tbl


# ── Tableau de style "info sheet" ─────────────────────────────────────────────

def build_info_table(rows: list, col_widths: list | None = None,
                     usable_width: float = 17 * cm) -> Table:
    """
    Tableau informatif 2 colonnes (clé / valeur) ou 4 colonnes (2 paires).

    Args:
        rows : [(key, val)] ou [(k1, v1, k2, v2)]
    """
    st  = get_para_styles()
    n   = len(rows[0]) if rows else 2

    if col_widths is None:
        if n == 2:
            col_widths = [usable_width * 0.33, usable_width * 0.67]
        else:
            col_widths = [usable_width * 0.18, usable_width * 0.32,
                          usable_width * 0.18, usable_width * 0.32]

    data = []
    for row in rows:
        formatted = []
        for j, cell in enumerate(row):
            style = st['info_key'] if j % 2 == 0 else st['info_val']
            formatted.append(Paragraph(str(cell) if cell else '—', style))
        data.append(formatted)

    tbl = Table(data, colWidths=col_widths)
    ts_rules = [
        ('GRID',       (0, 0), (-1, -1), 0.3, GRAY_MED),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
    ]
    # Fond bleu clair sur les colonnes clé
    for j in range(0, n, 2):
        ts_rules.append(('BACKGROUND', (j, 0), (j, -1), NAVY_LIGHT))

    tbl.setStyle(TableStyle(ts_rules))
    return tbl


# ── Séparateur de section ─────────────────────────────────────────────────────

def build_section_separator(label: str, usable_width: float = 17 * cm) -> list:
    """Retourne [Spacer, Table(titre section navy), Spacer]."""
    st = get_para_styles()
    tbl = Table(
        [[Paragraph(label.upper(), st['table_header'])]],
        colWidths=[usable_width],
    )
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), NAVY),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
    ]))
    return [Spacer(1, 0.4 * cm), tbl, Spacer(1, 0.2 * cm)]
