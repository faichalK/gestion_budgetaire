"""
Atlas Finance PDF — Helpers
Fonctions pures sans dépendance ReportLab.
"""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

_MOIS_FR = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

NBSP = ' '   # espace insécable


def format_fcfa(amount) -> str:
    """
    Formate un montant en FCFA avec espace insécable comme séparateur de milliers
    et avant 'FCFA'.
    Exemples : 1 250 000 FCFA  |  0 FCFA  |  -500 FCFA
    """
    try:
        v = float(amount or 0)
    except (TypeError, ValueError, InvalidOperation):
        return f'0{NBSP}FCFA'

    # Formatage avec virgule comme séparateur, puis remplacement
    formatted = f'{v:,.0f}'.replace(',', NBSP)
    return f'{formatted}{NBSP}FCFA'


def _to_date(d):
    """Convertit date/datetime/str ISO en date. Retourne None si impossible."""
    if d is None:
        return None
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y-%m-%dT%H:%M:%S'):
            try:
                return datetime.strptime(d[:len(fmt)], fmt).date()
            except ValueError:
                continue
    return None


def format_date_fr(d) -> str:
    """
    Formate une date en français.
    Exemple : date(2026, 5, 12) → '12 mai 2026'
    """
    parsed = _to_date(d)
    if parsed is None:
        return '—'
    return f'{parsed.day} {_MOIS_FR[parsed.month - 1]} {parsed.year}'


def format_periode(debut, fin) -> str:
    """
    Formate une période sous la forme 'Du 1er janvier au 31 décembre 2026'.
    Gère le suffixe 'er' pour le premier du mois.
    """
    d = _to_date(debut)
    f = _to_date(fin)
    if not d or not f:
        return '—'

    def _day(day: int, month: int, year: int) -> str:
        suffix = 'er' if day == 1 else ''
        return f'{day}{suffix} {_MOIS_FR[month - 1]} {year}'

    return f'Du {_day(d.day, d.month, d.year)} au {_day(f.day, f.month, f.year)}'


def truncate_text(text, max_length: int = 40) -> str:
    """
    Tronque un texte avec '…' (U+2026) si trop long.
    Retourne '—' pour les valeurs vides/None.
    """
    if not text:
        return '—'
    s = str(text).strip()
    if len(s) > max_length:
        return s[:max_length - 1] + '…'
    return s


def format_taux(taux) -> str:
    """Formate un taux : 68.4 → '68,4 %'."""
    try:
        return f'{float(taux or 0):.1f}{NBSP}%'.replace('.', ',')
    except (TypeError, ValueError):
        return f'0,0{NBSP}%'
