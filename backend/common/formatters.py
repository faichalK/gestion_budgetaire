"""
BudgetFlow — Formateurs communs
Fonctions de formatage pour les montants FCFA, les dates, les statuts et les références.
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, datetime, timedelta
from typing import Optional, Union


# ─── Séparateurs FCFA ────────────────────────────────────────────────────────
_ESPACE_INSECABLE = '\u202f'   # narrow no-break space


# ═══════════════════════════════════════════════════════════════════════════════
# 1. MONTANTS FCFA
# ═══════════════════════════════════════════════════════════════════════════════

def formater_montant(
    montant: Union[int, float, Decimal, str, None],
    *,
    decimales: int = 0,
    avec_devise: bool = True,
    vide: str = '—',
) -> str:
    """
    Formate un montant en FCFA avec espace insécable comme séparateur de milliers.

    >>> formater_montant(1500000)
    '1\u202f500\u202f000 FCFA'
    >>> formater_montant(1500000, avec_devise=False)
    '1\u202f500\u202f000'
    >>> formater_montant(None)
    '—'
    """
    if montant is None or montant == '':
        return vide
    try:
        valeur = Decimal(str(montant)).quantize(
            Decimal('1') if decimales == 0 else Decimal('0.' + '0' * decimales),
            rounding=ROUND_HALF_UP,
        )
    except Exception:
        return vide

    # Partie entière avec séparateurs
    parties = format(abs(int(valeur)), ',').replace(',', _ESPACE_INSECABLE)

    if decimales > 0:
        # Partie décimale avec virgule
        partie_dec = str(abs(valeur) % 1)[2:2 + decimales].ljust(decimales, '0')
        result = f"{parties},{partie_dec}"
    else:
        result = parties

    if valeur < 0:
        result = f'-{result}'

    return f"{result} FCFA" if avec_devise else result


def formater_montant_compact(
    montant: Union[int, float, Decimal, str, None],
    *,
    decimales: int = 1,
    avec_devise: bool = True,
    vide: str = '—',
) -> str:
    """
    Formate un montant de façon compacte (K / M / Md).

    >>> formater_montant_compact(1500000)
    '1,5M FCFA'
    >>> formater_montant_compact(750000)
    '750K FCFA'
    >>> formater_montant_compact(2500000000)
    '2,5Md FCFA'
    """
    if montant is None or montant == '':
        return vide
    try:
        valeur = float(montant)
    except (ValueError, TypeError):
        return vide

    signe = '-' if valeur < 0 else ''
    abs_val = abs(valeur)

    if abs_val >= 1_000_000_000:
        n = abs_val / 1_000_000_000
        suffixe = 'Md'
    elif abs_val >= 1_000_000:
        n = abs_val / 1_000_000
        suffixe = 'M'
    elif abs_val >= 1_000:
        n = abs_val / 1_000
        suffixe = 'K'
    else:
        # Pas de compaction sous 1 000
        return formater_montant(montant, decimales=0, avec_devise=avec_devise, vide=vide)

    # Arrondi et formatage
    n_arrondi = round(n, decimales)
    if decimales == 0 or n_arrondi == int(n_arrondi):
        texte = f"{signe}{int(n_arrondi)}{suffixe}"
    else:
        texte = f"{signe}{str(n_arrondi).replace('.', ',')}{suffixe}"

    return f"{texte} FCFA" if avec_devise else texte


def formater_ecart(
    montant_reel: Union[int, float, Decimal, str, None],
    montant_prevu: Union[int, float, Decimal, str, None],
) -> dict:
    """
    Calcule et formate l'écart entre réalisé et prévu.

    Retourne un dict :
    {
        'montant':     str   — écart absolu formaté avec signe (+/-)
        'pourcentage': str   — pourcentage d'écart (ex: '+12,3 %')
        'statut':      str   — 'sous_consomme' | 'normal' | 'sur_consomme' | 'depasse'
        'couleur':     str   — code couleur CSS selon statut
    }
    """
    try:
        reel  = Decimal(str(montant_reel  or 0))
        prevu = Decimal(str(montant_prevu or 0))
    except Exception:
        return {'montant': '—', 'pourcentage': '—', 'statut': 'inconnu', 'couleur': '#6B7280'}

    ecart = reel - prevu
    taux_realisation = (reel / prevu * 100) if prevu != 0 else Decimal('0')
    variance_pct     = ((reel - prevu) / prevu * 100) if prevu != 0 else Decimal('0')

    # Formatage signé du montant
    signe = '+' if ecart >= 0 else ''
    montant_fmt = f"{signe}{formater_montant(ecart, avec_devise=True)}"

    # Formatage signé de l'écart relatif (variance, pas taux de réalisation)
    variance_arrondie = float(variance_pct.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
    signe_var = '+' if variance_arrondie > 0 else ''
    pct_fmt = f"{signe_var}{str(variance_arrondie).replace('.', ',')} %"

    # Statut basé sur le taux de réalisation (reel/prevu × 100)
    t = float(taux_realisation)
    if t < 50:
        statut, couleur = 'sous_consomme', '#3B82F6'
    elif t <= 80:
        statut, couleur = 'normal', '#22C55E'
    elif t <= 95:
        statut, couleur = 'sur_consomme', '#F59E0B'
    else:
        statut, couleur = 'depasse', '#EF4444'

    return {
        'montant':     montant_fmt,
        'pourcentage': pct_fmt,
        'statut':      statut,
        'couleur':     couleur,
    }


def formater_taux(
    numerateur: Union[int, float, Decimal, str, None],
    denominateur: Union[int, float, Decimal, str, None],
    *,
    decimales: int = 1,
    vide: str = '—',
) -> str:
    """
    Calcule et formate un taux en pourcentage.

    >>> formater_taux(750000, 1000000)
    '75,0 %'
    """
    if numerateur is None or numerateur == '' or denominateur is None or denominateur == '':
        return vide
    try:
        num = float(numerateur)
        den = float(denominateur)
    except (ValueError, TypeError):
        return vide
    if den == 0:
        return vide
    taux = num / den * 100
    return f"{round(taux, decimales):.{decimales}f}".replace('.', ',') + ' %'


def get_couleur_execution(taux: Union[int, float, None]) -> str:
    """
    Retourne la couleur CSS selon le taux d'exécution.
    0–50 % → bleu, 50–80 % → vert, 80–95 % → orange, >95 % → rouge.
    """
    if taux is None:
        return '#6B7280'
    t = float(taux)
    if t < 50:
        return '#3B82F6'
    if t < 80:
        return '#22C55E'
    if t < 95:
        return '#F59E0B'
    return '#EF4444'


# ═══════════════════════════════════════════════════════════════════════════════
# 2. DATES
# ═══════════════════════════════════════════════════════════════════════════════

_MOIS_COURT = [
    '', 'jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.',
]
_MOIS_LONG = [
    '', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]


def formater_date(
    valeur: Union[date, datetime, str, None],
    *,
    format: str = 'simple',
    vide: str = '—',
) -> str:
    """
    Formate une date en français.

    Formats disponibles :
    - 'simple'   → '15/03/2025'
    - 'long'     → '15 mars 2025'
    - 'court'    → '15 mar. 2025'
    - 'datetime' → '15/03/2025 à 14:30'
    - 'mois_an'  → 'mars 2025'
    """
    if valeur is None or valeur == '':
        return vide

    if isinstance(valeur, str):
        # Accepte ISO 8601 : 2025-03-15 ou 2025-03-15T14:30:00
        try:
            if 'T' in valeur or ' ' in valeur:
                valeur = datetime.fromisoformat(valeur.replace('Z', '+00:00'))
            else:
                valeur = date.fromisoformat(valeur)
        except ValueError:
            return vide

    if isinstance(valeur, datetime):
        d = valeur
        is_dt = True
    else:
        d = valeur
        is_dt = False

    j = d.day
    m = d.month
    a = d.year

    if format == 'simple':
        return f"{j:02d}/{m:02d}/{a}"
    if format == 'long':
        return f"{j} {_MOIS_LONG[m]} {a}"
    if format == 'court':
        return f"{j} {_MOIS_COURT[m]} {a}"
    if format == 'datetime' and is_dt:
        return f"{j:02d}/{m:02d}/{a} à {d.hour:02d}:{d.minute:02d}"
    if format == 'datetime':
        return f"{j:02d}/{m:02d}/{a}"
    if format == 'mois_an':
        return f"{_MOIS_LONG[m]} {a}"
    return f"{j:02d}/{m:02d}/{a}"


def formater_date_relative(
    valeur: Union[date, datetime, str, None],
    *,
    maintenant: Optional[datetime] = None,
    vide: str = '—',
) -> str:
    """
    Formate une date de façon relative au moment présent.

    Exemples : 'il y a 3 heures', 'hier', 'il y a 5 jours', '15/03/2025'
    """
    if valeur is None or valeur == '':
        return vide

    if isinstance(valeur, str):
        try:
            if 'T' in valeur or ' ' in valeur:
                valeur = datetime.fromisoformat(valeur.replace('Z', '+00:00'))
            else:
                valeur = datetime.combine(date.fromisoformat(valeur), datetime.min.time())
        except ValueError:
            return vide

    if isinstance(valeur, date) and not isinstance(valeur, datetime):
        valeur = datetime.combine(valeur, datetime.min.time())

    now = maintenant or datetime.now()
    # Rendre les deux naïfs pour la comparaison
    if valeur.tzinfo is not None:
        valeur = valeur.replace(tzinfo=None)
    delta = now - valeur
    secondes = int(delta.total_seconds())

    if secondes < 0:
        return formater_date(valeur, format='simple')
    if secondes < 60:
        return "à l'instant"
    if secondes < 3600:
        m = secondes // 60
        return f"il y a {m} minute{'s' if m > 1 else ''}"
    if secondes < 86400:
        h = secondes // 3600
        return f"il y a {h} heure{'s' if h > 1 else ''}"
    if secondes < 172800:
        return "hier"
    if secondes < 604800:
        j = secondes // 86400
        return f"il y a {j} jours"
    # Au-delà d'une semaine : date complète
    return formater_date(valeur, format='simple')


def formater_duree(jours: Union[int, float, None], *, vide: str = '—') -> str:
    """
    Formate une durée en jours en texte lisible.

    >>> formater_duree(1)
    '1 jour'
    >>> formater_duree(45)
    '1 mois et 15 jours'
    >>> formater_duree(400)
    '1 an et 35 jours'
    """
    if jours is None:
        return vide
    j = int(round(float(jours)))
    if j < 0:
        return vide
    if j == 0:
        return "0 jour"
    if j == 1:
        return "1 jour"
    if j < 30:
        return f"{j} jours"
    if j < 365:
        mois = j // 30
        reste = j % 30
        texte = f"{mois} mois"
        if reste > 0:
            texte += f" et {reste} jour{'s' if reste > 1 else ''}"
        return texte
    ans = j // 365
    reste = j % 365
    texte = f"{ans} an{'s' if ans > 1 else ''}"
    if reste > 0:
        texte += f" et {reste} jour{'s' if reste > 1 else ''}"
    return texte


def formater_periode(
    date_debut: Union[date, datetime, str, None],
    date_fin:   Union[date, datetime, str, None],
    *,
    vide: str = '—',
) -> str:
    """
    Formate une période de début à fin.

    Exemple : 'du 1 janvier 2025 au 31 décembre 2025'
    """
    if not date_debut and not date_fin:
        return vide
    debut = formater_date(date_debut, format='long', vide='?')
    fin   = formater_date(date_fin,   format='long', vide='?')
    return f"du {debut} au {fin}"


def calculer_delai_traitement(
    date_creation: Union[date, datetime, str, None],
    date_fin:      Union[date, datetime, str, None] = None,
) -> dict:
    """
    Calcule le délai de traitement entre création et fin (ou aujourd'hui).

    Retourne : { 'jours': int, 'texte': str, 'en_cours': bool }
    """
    if not date_creation:
        return {'jours': 0, 'texte': '—', 'en_cours': False}

    def _to_date(v):
        if isinstance(v, datetime):
            return v.date()
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            try:
                return date.fromisoformat(v.split('T')[0])
            except ValueError:
                return None
        return None

    d_debut = _to_date(date_creation)
    d_fin   = _to_date(date_fin) if date_fin else date.today()

    if not d_debut:
        return {'jours': 0, 'texte': '—', 'en_cours': False}

    jours = (d_fin - d_debut).days
    en_cours = date_fin is None

    return {
        'jours':    jours,
        'texte':    formater_duree(jours),
        'en_cours': en_cours,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 3. CONFIGURATIONS DE STATUTS
# ═══════════════════════════════════════════════════════════════════════════════

STATUT_BUDGET_CONFIG = {
    'BROUILLON': {
        'label':      'Brouillon',
        'label_court': 'Brouillon',
        'couleur':    '#6B7280',
        'bg':         '#F9FAFB',
        'border':     '#E5E7EB',
        'icone':      'FileText',
        'description': 'En cours de rédaction, non soumis.',
    },
    'SOUMIS': {
        'label':      'Soumis',
        'label_court': 'Soumis',
        'couleur':    '#D97706',
        'bg':         '#FFFBEB',
        'border':     '#FDE68A',
        'icone':      'Clock',
        'description': 'Soumis à validation, en attente de décision.',
    },
    'APPROUVE': {
        'label':      'Approuvé',
        'label_court': 'Approuvé',
        'couleur':    '#059669',
        'bg':         '#ECFDF5',
        'border':     '#6EE7B7',
        'icone':      'CheckCircle2',
        'description': 'Approuvé par le comptable, dépenses autorisées.',
    },
    'REJETE': {
        'label':      'Rejeté',
        'label_court': 'Rejeté',
        'couleur':    '#DC2626',
        'bg':         '#FEF2F2',
        'border':     '#FECACA',
        'icone':      'XCircle',
        'description': 'Rejeté — corrections requises.',
    },
    'CLOTURE': {
        'label':      'Clôturé',
        'label_court': 'Clôturé',
        'couleur':    '#7C3AED',
        'bg':         '#F5F3FF',
        'border':     '#DDD6FE',
        'icone':      'Lock',
        'description': 'Exercice terminé, plus de modifications possibles.',
    },
    'ARCHIVE': {
        'label':      'Archivé',
        'label_court': 'Archivé',
        'couleur':    '#9CA3AF',
        'bg':         '#F3F4F6',
        'border':     '#D1D5DB',
        'icone':      'Archive',
        'description': 'Archivé pour consultation historique.',
    },
}

STATUT_DEPENSE_CONFIG = {
    'SAISIE': {
        'label':       'En attente',
        'label_court': 'Attente',
        'couleur':     '#D97706',
        'bg':          '#FFFBEB',
        'border':      '#FDE68A',
        'icone':       'Clock',
        'description': 'Dépense saisie, en attente de validation.',
    },
    'VALIDEE': {
        'label':       'Validée',
        'label_court': 'Validée',
        'couleur':     '#059669',
        'bg':          '#ECFDF5',
        'border':      '#6EE7B7',
        'icone':       'CheckCircle2',
        'description': 'Dépense validée par le comptable.',
    },
    'REJETEE': {
        'label':       'Rejetée',
        'label_court': 'Rejetée',
        'couleur':     '#DC2626',
        'bg':          '#FEF2F2',
        'border':      '#FECACA',
        'icone':       'XCircle',
        'description': 'Dépense rejetée — motif disponible.',
    },
    'REMBOURSEE': {
        'label':       'Remboursée',
        'label_court': 'Remb.',
        'couleur':     '#2563EB',
        'bg':          '#EFF6FF',
        'border':      '#BFDBFE',
        'icone':       'RotateCcw',
        'description': 'Dépense remboursée.',
    },
}

PRIORITE_CONFIG = {
    'HAUTE': {
        'label':   'Haute',
        'couleur': '#DC2626',
        'bg':      '#FEF2F2',
        'icone':   'AlertTriangle',
    },
    'NORMALE': {
        'label':   'Normale',
        'couleur': '#D97706',
        'bg':      '#FFFBEB',
        'icone':   'Minus',
    },
    'BASSE': {
        'label':   'Basse',
        'couleur': '#059669',
        'bg':      '#ECFDF5',
        'icone':   'ArrowDown',
    },
}

ROLE_CONFIG = {
    'ADMINISTRATEUR': {
        'label':   'Administrateur',
        'couleur': '#7C3AED',
        'bg':      '#F5F3FF',
        'icone':   'ShieldCheck',
    },
    'GESTIONNAIRE': {
        'label':   'Gestionnaire',
        'couleur': '#2563EB',
        'bg':      '#EFF6FF',
        'icone':   'Briefcase',
    },
    'COMPTABLE': {
        'label':   'Comptable',
        'couleur': '#059669',
        'bg':      '#ECFDF5',
        'icone':   'Calculator',
    },
}

CATEGORIE_CONFIG = {
    'PERSONNEL':       {'label': 'Personnel',        'icone': 'Users'},
    'EQUIPEMENT':      {'label': 'Équipement',       'icone': 'Monitor'},
    'FONCTIONNEMENT':  {'label': 'Fonctionnement',   'icone': 'Settings'},
    'INVESTISSEMENT':  {'label': 'Investissement',   'icone': 'TrendingUp'},
    'FORMATION':       {'label': 'Formation',        'icone': 'BookOpen'},
    'DEPLACEMENT':     {'label': 'Déplacement',      'icone': 'MapPin'},
    'COMMUNICATION':   {'label': 'Communication',    'icone': 'MessageSquare'},
    'SOUS_TRAITANCE':  {'label': 'Sous-traitance',   'icone': 'ExternalLink'},
    'DIVERS':          {'label': 'Divers',            'icone': 'MoreHorizontal'},
}

MODE_PAIEMENT_CONFIG = {
    'VIREMENT':   {'label': 'Virement bancaire', 'icone': 'ArrowRightLeft'},
    'CHEQUE':     {'label': 'Chèque',            'icone': 'FileCheck'},
    'ESPECES':    {'label': 'Espèces',           'icone': 'Banknote'},
    'CARTE':      {'label': 'Carte bancaire',    'icone': 'CreditCard'},
    'MOBILE':     {'label': 'Mobile money',      'icone': 'Smartphone'},
}


def get_statut_config(statut: str, type_statut: str = 'budget') -> dict:
    """
    Retourne la configuration d'un statut.

    type_statut : 'budget' | 'depense' | 'priorite' | 'role' | 'categorie' | 'paiement'
    """
    _maps = {
        'budget':    STATUT_BUDGET_CONFIG,
        'depense':   STATUT_DEPENSE_CONFIG,
        'priorite':  PRIORITE_CONFIG,
        'role':      ROLE_CONFIG,
        'categorie': CATEGORIE_CONFIG,
        'paiement':  MODE_PAIEMENT_CONFIG,
    }
    config_map = _maps.get(type_statut, STATUT_BUDGET_CONFIG)
    return config_map.get(statut, {
        'label':   statut,
        'couleur': '#6B7280',
        'bg':      '#F9FAFB',
        'icone':   'HelpCircle',
    })


# ═══════════════════════════════════════════════════════════════════════════════
# 4. RÉFÉRENCES
# ═══════════════════════════════════════════════════════════════════════════════

def formater_reference(reference: Union[str, None], *, vide: str = '—') -> str:
    """
    Normalise une référence en majuscules.
    Retourne vide si la référence est absente.
    """
    if not reference:
        return vide
    return str(reference).strip().upper()


def generer_reference_budget(
    annee: int,
    code_departement: str,
    sequence: int,
    *,
    prefixe: str = 'BUD',
) -> str:
    """
    Génère une référence unique pour un budget.

    Format : BUD-2025-DEPT-00042

    >>> generer_reference_budget(2025, 'COMPTA', 42)
    'BUD-2025-COMPTA-00042'
    """
    dept = code_departement.strip().upper()[:10]
    return f"{prefixe}-{annee}-{dept}-{sequence:05d}"


def generer_reference_depense(
    annee: int,
    code_departement: str,
    sequence: int,
    *,
    prefixe: str = 'DEP',
) -> str:
    """
    Génère une référence unique pour une dépense.

    Format : DEP-2025-DEPT-00001

    >>> generer_reference_depense(2025, 'COMPTA', 1)
    'DEP-2025-COMPTA-00001'
    """
    dept = code_departement.strip().upper()[:10]
    return f"{prefixe}-{annee}-{dept}-{sequence:05d}"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. POURCENTAGES ET JAUGES
# ═══════════════════════════════════════════════════════════════════════════════

def formater_pourcentage(
    valeur: Union[int, float, None],
    *,
    decimales: int = 1,
    vide: str = '—',
) -> str:
    """
    Formate un nombre en pourcentage avec virgule française.

    >>> formater_pourcentage(75.5)
    '75,5 %'
    """
    if valeur is None:
        return vide
    try:
        v = float(valeur)
    except (ValueError, TypeError):
        return vide
    return f"{v:.{decimales}f}".replace('.', ',') + ' \u202f%'


def calculer_taux_execution(
    consomme: Union[int, float, Decimal, None],
    alloue:   Union[int, float, Decimal, None],
) -> float:
    """
    Calcule le taux d'exécution (0–100+).

    Retourne 0.0 si le montant alloué est nul ou absent.
    """
    try:
        c = float(consomme or 0)
        a = float(alloue  or 0)
    except (ValueError, TypeError):
        return 0.0
    if a == 0:
        return 0.0
    return round(c / a * 100, 2)
