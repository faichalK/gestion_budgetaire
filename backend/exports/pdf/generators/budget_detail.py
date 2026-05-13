"""
Atlas Finance PDF — Générateur : Détail budget (lignes budgétaires)
GET /api/budget/<pk>/export/budget-pdf/
"""
from reportlab.platypus import (
    Table, TableStyle, Paragraph, Spacer, HRFlowable,
)
from reportlab.lib.units import cm
from reportlab.lib import colors as C

from ..base import AtlasPDFDocument
from ..styles import (
    NAVY, NAVY_LIGHT, GOLD, GOLD_LIGHT,
    GRAY_LIGHT, GRAY_MED, GRAY_DARK,
    GREEN, GREEN_LIGHT, RED, RED_LIGHT, WHITE,
    get_para_styles,
)
from ..helpers import format_fcfa, format_date_fr, format_periode, format_taux
from ..components import (
    build_cover_page, build_kpi_row, build_section_separator,
)


def generate_budget_detail_pdf(budget, user_name: str):
    """
    Génère un PDF de détail budget complet (lignes budgétaires).

    Args:
        budget   : instance Budget avec select_related chargé
        user_name: nom affiché dans le footer et la page de garde

    Returns:
        AtlasPDFDocument instance prêt pour .as_response() ou .build()
    """
    gest = (
        f"{budget.gestionnaire.prenom} {budget.gestionnaire.nom}"
        if budget.gestionnaire else "—"
    )
    dept = budget.departement.nom if budget.departement else "—"

    doc = AtlasPDFDocument(
        title=budget.nom,
        doc_type='budget_detail',
        user_name=user_name,
        reference=budget.code,
        use_landscape=True,
    )

    st  = get_para_styles()
    uw  = doc.usable_width
    elements = []

    # ── Page de garde ──────────────────────────────────────────────────────────
    montant_global     = float(budget.montant_global    or 0)
    montant_consomme   = float(budget.montant_consomme  or 0)
    montant_disponible = float(budget.montant_disponible or 0)
    taux               = budget.calculer_taux_consommation()

    elements += build_cover_page(
        title=budget.nom,
        subtitle=f"Détail des lignes budgétaires — {dept}",
        info_rows=[
            ("Code budget",   budget.code),
            ("Département",   dept),
            ("Période",       format_periode(budget.date_debut, budget.date_fin)),
            ("Gestionnaire",  gest),
            ("Statut",        budget.get_statut_display()),
            ("Budget global", format_fcfa(montant_global)),
        ],
        user_name=user_name,
        statut=budget.statut,
        usable_width=uw,
    )

    # ── KPI cards ──────────────────────────────────────────────────────────────
    dispo_up = montant_disponible >= 0
    taux_ok  = taux <= 75

    kpis = [
        {
            'label': 'Budget global',
            'value': format_fcfa(montant_global),
            'bg':    NAVY_LIGHT,
        },
        {
            'label': 'Total consommé',
            'value': format_fcfa(montant_consomme),
            'bg':    GRAY_LIGHT,
        },
        {
            'label': 'Disponible',
            'value': format_fcfa(montant_disponible),
            'bg':    GREEN_LIGHT if dispo_up else RED_LIGHT,
        },
        {
            'label': "Taux d'exécution",
            'value': format_taux(taux),
            'bg':    GOLD_LIGHT if taux_ok else RED_LIGHT,
        },
    ]
    elements.append(build_kpi_row(kpis, uw))
    elements.append(Spacer(1, 0.5 * cm))

    # ── Tableau des lignes ──────────────────────────────────────────────────────
    _build_lines_table(budget, elements, uw, st)

    return doc, elements


def _build_lines_table(budget, elements, uw, st):
    """Construit le tableau hiérarchique catégorie / sous-catégorie / lignes."""
    from budget.models import CategoriePrincipale  # import local pour éviter les circulaires

    # Largeurs colonnes (paysage A4, uw ≈ 23.3 cm)
    c_code  = 2.2 * cm
    c_unit  = 1.6 * cm
    c_qty   = 1.4 * cm
    c_pu    = 2.8 * cm
    c_alloc = 3.2 * cm
    c_conso = 3.2 * cm
    c_dispo = 3.2 * cm
    c_des   = uw - c_code - c_unit - c_qty - c_pu - c_alloc - c_conso - c_dispo
    col_widths = [c_code, c_des, c_unit, c_qty, c_pu, c_alloc, c_conso, c_dispo]

    HEADER = ["Code", "Désignation", "Unité", "Qté", "Prix unit.",
              "Alloué (FCFA)", "Consommé (FCFA)", "Disponible (FCFA)"]

    data       = [HEADER]
    row_meta   = []   # (type, extra) pour le style conditionnel
    spans      = []   # (row_idx, col_start, col_end)

    grand_a = grand_c = 0.0

    cats = CategoriePrincipale.objects.filter(budget=budget).prefetch_related(
        'sous_categories__lignes'
    ).order_by('ordre', 'code')

    line_idx = 0

    for cat in cats:
        scs   = list(cat.sous_categories.all().order_by('ordre', 'code'))
        cat_a = sum(float(l.montant_alloue   or 0) for sc in scs for l in sc.lignes.all())
        cat_c = sum(float(l.montant_consomme or 0) for sc in scs for l in sc.lignes.all())
        cat_d = cat_a - cat_c

        # Ligne catégorie
        ri = len(data)
        data.append([
            f"{cat.code}", f"{cat.libelle}", "", "", "",
            _fmt(cat_a), _fmt(cat_c), _fmt(cat_d),
        ])
        spans.append((ri, 0, 1))   # span code + désignation
        row_meta.append(('cat', cat_d))

        for sc in scs:
            lignes = list(sc.lignes.all().order_by('code'))
            sc_a   = sum(float(l.montant_alloue   or 0) for l in lignes)
            sc_c   = sum(float(l.montant_consomme or 0) for l in lignes)
            sc_d   = sc_a - sc_c

            ri = len(data)
            data.append([
                f"  {sc.code}", f"  {sc.libelle}", "", "", "",
                _fmt(sc_a), _fmt(sc_c), _fmt(sc_d),
            ])
            spans.append((ri, 0, 1))
            row_meta.append(('sub', sc_d))

            for ligne in lignes:
                alt = line_idx % 2 == 0
                line_idx += 1
                dispo = float(ligne.montant_disponible or 0)
                data.append([
                    Paragraph(ligne.code or '', st['table_cell']),
                    Paragraph(ligne.libelle or '', st['table_cell']),
                    Paragraph(ligne.unite or '—', st['table_cell']),
                    Paragraph(_flt(ligne.quantite), st['table_cell_right']),
                    Paragraph(_fmt(ligne.prix_unitaire), st['table_cell_right']),
                    Paragraph(_fmt(ligne.montant_alloue), st['table_total']),
                    Paragraph(_fmt(ligne.montant_consomme), st['table_cell_right']),
                    Paragraph(_fmt(dispo), st['table_total']),
                ])
                row_meta.append(('line', (alt, dispo)))

        grand_a += cat_a
        grand_c += cat_c

    # Ligne total général
    ri = len(data)
    grand_d = grand_a - grand_c
    data.append([
        "TOTAL GÉNÉRAL", "", "", "", "",
        _fmt(grand_a), _fmt(grand_c), _fmt(grand_d),
    ])
    spans.append((ri, 0, 4))
    row_meta.append(('total', grand_d))

    # ── Styles ─────────────────────────────────────────────────────────────────
    ts = [
        # En-tête
        ('BACKGROUND',    (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR',     (0, 0), (-1, 0), WHITE),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 8),
        ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
        # Global
        ('FONTSIZE',      (0, 1), (-1, -1), 8),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',          (0, 0), (-1, -1), 0.3, GRAY_MED),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        # Alignements numériques
        ('ALIGN',         (2, 1), (2, -1), 'CENTER'),
        ('ALIGN',         (3, 1), (-1, -1), 'RIGHT'),
    ]

    # Spans
    for ri, cs, ce in spans:
        ts.append(('SPAN', (cs, ri), (ce, ri)))

    # Styles par type de ligne
    for i, (kind, extra) in enumerate(row_meta):
        ri = i + 1   # +1 pour l'en-tête
        if kind == 'cat':
            ts += [
                ('BACKGROUND', (0, ri), (-1, ri), NAVY),
                ('TEXTCOLOR',  (0, ri), (-1, ri), WHITE),
                ('FONTNAME',   (0, ri), (-1, ri), 'Helvetica-Bold'),
                ('FONTSIZE',   (0, ri), (-1, ri), 8),
            ]
        elif kind == 'sub':
            ts += [
                ('BACKGROUND', (0, ri), (-1, ri), NAVY_LIGHT),
                ('TEXTCOLOR',  (0, ri), (-1, ri), NAVY),
                ('FONTNAME',   (0, ri), (-1, ri), 'Helvetica-Bold'),
                ('FONTSIZE',   (0, ri), (-1, ri), 8),
            ]
        elif kind == 'line':
            alt, dispo = extra
            bg = GRAY_LIGHT if alt else WHITE
            ts.append(('BACKGROUND', (0, ri), (6, ri), bg))
            # Colonne disponible : vert si >= 0, rouge si < 0
            dispo_bg = GREEN_LIGHT if dispo >= 0 else RED_LIGHT
            ts.append(('BACKGROUND', (7, ri), (7, ri), dispo_bg))
        elif kind == 'total':
            ts += [
                ('BACKGROUND', (0, ri), (-1, ri), GOLD_LIGHT),
                ('TEXTCOLOR',  (0, ri), (-1, ri), NAVY),
                ('FONTNAME',   (0, ri), (-1, ri), 'Helvetica-Bold'),
                ('FONTSIZE',   (0, ri), (-1, ri), 9),
            ]

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle(ts))
    elements.append(table)


def _fmt(v) -> str:
    try:
        return f"{float(v or 0):,.0f}"
    except (TypeError, ValueError):
        return "0"


def _flt(v) -> str:
    try:
        f = float(v or 0)
        return f"{f:,.2f}".rstrip('0').rstrip('.')
    except (TypeError, ValueError):
        return "0"
