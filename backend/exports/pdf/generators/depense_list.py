"""
Atlas Finance PDF — Générateur : Liste des dépenses d'un budget
GET /api/budget/<pk>/export/depenses-pdf/

Colonnes : Catégorie | Sous-catégorie | Ligne budgétaire | Libellé dépense | Montant
Sections  : KPI résumé → tableau détail → synthèse par catégorie
"""
from reportlab.platypus import Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.units import cm

from ..base import AtlasPDFDocument
from ..styles import (
    NAVY, NAVY_LIGHT,
    GOLD_LIGHT,
    GRAY_LIGHT, GRAY_MED, GRAY_DARK, WHITE,
    GREEN, GREEN_LIGHT, RED, RED_LIGHT, ORANGE, ORANGE_LIGHT,
    STATUT_COLORS, STATUT_LABELS,
    get_para_styles,
)
from ..helpers import format_fcfa, format_periode
from ..components import build_cover_page, build_kpi_row, build_section_separator


def generate_depense_list_pdf(budget, depenses, user_name: str):
    """
    Args:
        budget   : instance Budget
        depenses : QuerySet ConsommationLigne (select_related chargé)
        user_name: affiché dans le footer et la page de garde

    Returns:
        (AtlasPDFDocument, elements)
    """
    gest = (
        f"{budget.gestionnaire.prenom} {budget.gestionnaire.nom}"
        if budget.gestionnaire else "—"
    )
    dept = budget.departement.nom if budget.departement else "—"

    doc = AtlasPDFDocument(
        title=f"Dépenses — {budget.nom}",
        doc_type='depense_list',
        user_name=user_name,
        reference=budget.code,
        use_landscape=False,   # A4 portrait suffit avec 5 colonnes
    )

    st       = get_para_styles()
    uw       = doc.usable_width
    elements = []

    dep_list  = list(depenses)
    nb_valid  = sum(1 for d in dep_list if d.statut == 'VALIDEE')
    nb_wait   = sum(1 for d in dep_list if d.statut == 'SAISIE')
    nb_rej    = sum(1 for d in dep_list if d.statut == 'REJETEE')
    total_val = sum(float(d.montant or 0) for d in dep_list if d.statut == 'VALIDEE')
    grand_tot = sum(float(d.montant or 0) for d in dep_list)

    # ── Page de garde ──────────────────────────────────────────────────────────
    elements += build_cover_page(
        title=f"Dépenses — {budget.nom}",
        subtitle=f"Relevé des dépenses — {dept}",
        info_rows=[
            ("Code budget",   budget.code),
            ("Département",   dept),
            ("Période",       format_periode(budget.date_debut, budget.date_fin)),
            ("Gestionnaire",  gest),
            ("Statut budget", budget.get_statut_display()),
            ("Total dépenses", format_fcfa(grand_tot)),
        ],
        user_name=user_name,
        statut=None,
        usable_width=uw,
    )

    # ── KPI cards ──────────────────────────────────────────────────────────────
    kpis = [
        {'label': 'Total dépenses',        'value': format_fcfa(grand_tot), 'bg': NAVY_LIGHT},
        {'label': f'Validées ({nb_valid})', 'value': format_fcfa(total_val), 'bg': GREEN_LIGHT},
        {'label': f'En attente ({nb_wait})','value': f'{nb_wait} dépense(s)','bg': ORANGE_LIGHT},
        {'label': f'Rejetées ({nb_rej})',   'value': f'{nb_rej} dépense(s)', 'bg': RED_LIGHT},
    ]
    elements.append(build_kpi_row(kpis, uw))
    elements.append(Spacer(1, 0.5 * cm))

    # ── Tableau détail ──────────────────────────────────────────────────────────
    elements += build_section_separator("Détail des dépenses", uw)
    _build_detail_table(dep_list, grand_tot, elements, uw, st)

    # ── Synthèse par catégorie ─────────────────────────────────────────────────
    elements.append(Spacer(1, 0.6 * cm))
    elements += build_section_separator("Synthèse par catégorie", uw)
    _build_synthese(dep_list, grand_tot, elements, uw, st)

    return doc, elements


# ── Tableau détail ─────────────────────────────────────────────────────────────

def _build_detail_table(dep_list, grand_tot, elements, uw, st):
    """
    Colonnes : Catégorie | Sous-catégorie | Ligne budgétaire | Libellé | Montant (FCFA)
    """
    # Largeurs (portrait A4, uw ≈ 17 cm)
    c_cat  = uw * 0.17
    c_sc   = uw * 0.17
    c_lg   = uw * 0.22
    c_lib  = uw * 0.29
    c_mt   = uw * 0.15
    col_widths = [c_cat, c_sc, c_lg, c_lib, c_mt]

    HEADER = ["Catégorie", "Sous-catégorie", "Ligne budgétaire", "Libellé", "Montant (FCFA)"]
    data   = [HEADER]

    for i, d in enumerate(dep_list):
        sc  = d.ligne.sous_categorie if (d.ligne and d.ligne.sous_categorie_id) else None
        cat = sc.categorie           if (sc and sc.categorie_id)                 else None

        dep_parent = d.depense if d.depense_id else None
        libelle = (
            d.note
            or d.fournisseur
            or (dep_parent.note      if dep_parent else '')
            or (dep_parent.fournisseur if dep_parent else '')
            or "—"
        ).strip() or "—"
        montant = float(d.montant or 0)
        alt_bg  = GRAY_LIGHT if i % 2 == 0 else WHITE

        data.append([
            Paragraph(f"{cat.code} — {cat.libelle}" if cat else "—", st['table_cell']),
            Paragraph(f"{sc.code} — {sc.libelle}"   if sc  else "—", st['table_cell']),
            Paragraph(d.ligne.libelle if d.ligne else "—",             st['table_cell']),
            Paragraph(libelle,                                          st['table_cell']),
            Paragraph(f"{montant:,.0f}",                               st['table_total']),
        ])

    # Ligne total général
    gi = len(data)
    data.append([
        Paragraph("TOTAL GÉNÉRAL", st['table_header']),
        "", "", "",
        Paragraph(f"{grand_tot:,.0f}", st['table_total']),
    ])

    ts = [
        # En-tête
        ('BACKGROUND',    (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR',     (0, 0), (-1, 0), WHITE),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 8),
        ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
        # Corps
        ('FONTSIZE',      (0, 1), (-1, -1), 8),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',          (0, 0), (-1, -1), 0.3, GRAY_MED),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ALIGN',         (4, 1), (4, -1), 'RIGHT'),
        # Total général
        ('SPAN',          (0, gi), (3, gi)),
        ('BACKGROUND',    (0, gi), (-1, gi), NAVY_LIGHT),
        ('TEXTCOLOR',     (0, gi), (-1, gi), NAVY),
        ('FONTNAME',      (0, gi), (-1, gi), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, gi), (-1, gi), 9),
        ('ALIGN',         (0, gi), (3, gi),  'LEFT'),
        ('ALIGN',         (4, gi), (4, gi),  'RIGHT'),
    ]

    # Fonds alternés (hors en-tête et total)
    for i in range(1, gi):
        bg = GRAY_LIGHT if (i - 1) % 2 == 0 else WHITE
        ts.append(('BACKGROUND', (0, i), (-1, i), bg))

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle(ts))
    elements.append(table)


# ── Synthèse par catégorie ─────────────────────────────────────────────────────

def _build_synthese(dep_list, grand_tot, elements, uw, st):
    """Tableau récapitulatif : une ligne par catégorie avec total FCFA et %."""
    from collections import defaultdict

    cat_totals = defaultdict(float)
    cat_labels = {}

    for d in dep_list:
        sc  = d.ligne.sous_categorie if (d.ligne and d.ligne.sous_categorie_id) else None
        cat = sc.categorie           if (sc and sc.categorie_id)                 else None
        key = cat.code if cat else "—"
        cat_totals[key] += float(d.montant or 0)
        if key not in cat_labels:
            cat_labels[key] = f"{cat.code} — {cat.libelle}" if cat else "—"

    col_widths = [uw * 0.60, uw * 0.25, uw * 0.15]
    HEADER = ["Catégorie", "Montant (FCFA)", "Part (%)"]
    data   = [HEADER]

    for i, (key, total) in enumerate(sorted(cat_totals.items())):
        part   = (total / grand_tot * 100) if grand_tot else 0
        alt_bg = GRAY_LIGHT if i % 2 == 0 else WHITE
        data.append([
            Paragraph(cat_labels[key], st['table_cell']),
            Paragraph(f"{total:,.0f}",  st['table_total']),
            Paragraph(f"{part:.1f} %",  st['table_cell_right']),
        ])

    # Total
    gi = len(data)
    data.append([
        Paragraph("TOTAL GÉNÉRAL", st['table_header']),
        Paragraph(f"{grand_tot:,.0f}", st['table_total']),
        Paragraph("100,0 %",           st['table_cell_right']),
    ])

    ts = [
        ('BACKGROUND',    (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR',     (0, 0), (-1, 0), WHITE),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 8),
        ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
        ('FONTSIZE',      (0, 1), (-1, -1), 8),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',          (0, 0), (-1, -1), 0.3, GRAY_MED),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN',         (1, 1), (2, -1), 'RIGHT'),
        # Total
        ('BACKGROUND',    (0, gi), (-1, gi), GOLD_LIGHT),
        ('TEXTCOLOR',     (0, gi), (-1, gi), NAVY),
        ('FONTNAME',      (0, gi), (-1, gi), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, gi), (-1, gi), 9),
    ]

    for i in range(1, gi):
        bg = GRAY_LIGHT if (i - 1) % 2 == 0 else WHITE
        ts.append(('BACKGROUND', (0, i), (-1, i), bg))

    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle(ts))
    elements.append(table)
