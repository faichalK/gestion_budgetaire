"""
Tests unitaires — common/formatters.py
"""
import unittest
from datetime import date, datetime
from decimal import Decimal

from common.formatters import (
    formater_montant,
    formater_montant_compact,
    formater_ecart,
    formater_taux,
    get_couleur_execution,
    formater_date,
    formater_date_relative,
    formater_duree,
    formater_periode,
    calculer_delai_traitement,
    get_statut_config,
    formater_reference,
    generer_reference_budget,
    generer_reference_depense,
    formater_pourcentage,
    calculer_taux_execution,
    STATUT_BUDGET_CONFIG,
    STATUT_DEPENSE_CONFIG,
)

_NNBS = '\u202f'  # narrow no-break space


# ═══════════════════════════════════════════════════════════════════════════════
# 1. formater_montant
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterMontant(unittest.TestCase):
    def test_entier_simple(self):
        assert formater_montant(1000) == f"1{_NNBS}000 FCFA"

    def test_millions(self):
        assert formater_montant(1_500_000) == f"1{_NNBS}500{_NNBS}000 FCFA"

    def test_sans_devise(self):
        assert formater_montant(1_500_000, avec_devise=False) == f"1{_NNBS}500{_NNBS}000"

    def test_zero(self):
        assert formater_montant(0) == f"0 FCFA"

    def test_none(self):
        assert formater_montant(None) == '—'

    def test_chaine_vide(self):
        assert formater_montant('') == '—'

    def test_decimal(self):
        result = formater_montant(Decimal('750000.50'), decimales=2)
        assert '750' in result and 'FCFA' in result

    def test_negatif(self):
        result = formater_montant(-500_000)
        assert result.startswith('-')

    def test_string_numerique(self):
        assert formater_montant('2000000') == f"2{_NNBS}000{_NNBS}000 FCFA"

    def test_vide_custom(self):
        assert formater_montant(None, vide='N/A') == 'N/A'


# ═══════════════════════════════════════════════════════════════════════════════
# 2. formater_montant_compact
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterMontantCompact(unittest.TestCase):
    def test_milliers(self):
        assert formater_montant_compact(750_000) == '750K FCFA'

    def test_millions(self):
        result = formater_montant_compact(1_500_000)
        assert '1,5M' in result and 'FCFA' in result

    def test_milliards(self):
        result = formater_montant_compact(2_500_000_000)
        assert '2,5Md' in result

    def test_sous_mille(self):
        # Pas de compaction sous 1 000
        result = formater_montant_compact(500)
        assert 'K' not in result and 'M' not in result

    def test_sans_devise(self):
        result = formater_montant_compact(1_000_000, avec_devise=False)
        assert 'FCFA' not in result
        assert '1' in result and 'M' in result

    def test_none(self):
        assert formater_montant_compact(None) == '—'


# ═══════════════════════════════════════════════════════════════════════════════
# 3. formater_ecart
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterEcart(unittest.TestCase):
    def test_normal(self):
        result = formater_ecart(700_000, 1_000_000)
        assert result['statut'] == 'normal'
        assert result['couleur'] == '#22C55E'
        # Écart relatif : (700k-1M)/1M×100 = -30 %
        assert result['pourcentage'] == '-30,0 %'

    def test_sous_consomme(self):
        result = formater_ecart(200_000, 1_000_000)
        assert result['statut'] == 'sous_consomme'
        assert result['couleur'] == '#3B82F6'
        # Écart relatif : -80 %
        assert result['pourcentage'] == '-80,0 %'

    def test_sur_consomme(self):
        result = formater_ecart(850_000, 1_000_000)
        assert result['statut'] == 'sur_consomme'
        assert result['couleur'] == '#F59E0B'
        # Écart relatif : -15 %
        assert result['pourcentage'] == '-15,0 %'

    def test_depasse(self):
        result = formater_ecart(1_000_000, 1_000_000)
        assert result['statut'] == 'depasse'
        assert result['couleur'] == '#EF4444'
        # Écart relatif : 0 % (exactement au budget)
        assert result['pourcentage'] == '0,0 %'

    def test_depassement_reel(self):
        result = formater_ecart(1_200_000, 1_000_000)
        # Écart relatif : +20 %
        assert result['pourcentage'] == '+20,0 %'
        assert result['statut'] == 'depasse'

    def test_denominateur_zero(self):
        result = formater_ecart(500, 0)
        # Variance = 0 (division impossible) → sous_consomme
        assert result['statut'] == 'sous_consomme'

    def test_none(self):
        result = formater_ecart(None, None)
        assert result['montant'] is not None


# ═══════════════════════════════════════════════════════════════════════════════
# 4. formater_taux
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterTaux(unittest.TestCase):
    def test_basique(self):
        assert formater_taux(75, 100) == '75,0 %'

    def test_arrondi(self):
        result = formater_taux(1, 3)
        assert ',' in result and '%' in result

    def test_zero_denominateur(self):
        assert formater_taux(100, 0) == '—'

    def test_none(self):
        assert formater_taux(None, 100) == '—'


# ═══════════════════════════════════════════════════════════════════════════════
# 5. get_couleur_execution
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetCouleurExecution(unittest.TestCase):
    def test_bleu(self):
        assert get_couleur_execution(30) == '#3B82F6'

    def test_vert(self):
        assert get_couleur_execution(65) == '#22C55E'

    def test_orange(self):
        assert get_couleur_execution(85) == '#F59E0B'

    def test_rouge(self):
        assert get_couleur_execution(98) == '#EF4444'

    def test_none(self):
        assert get_couleur_execution(None) == '#6B7280'

    def test_limite_exacte_50(self):
        assert get_couleur_execution(50) == '#22C55E'

    def test_limite_exacte_80(self):
        assert get_couleur_execution(80) == '#F59E0B'

    def test_limite_exacte_95(self):
        assert get_couleur_execution(95) == '#EF4444'


# ═══════════════════════════════════════════════════════════════════════════════
# 6. formater_date
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterDate(unittest.TestCase):
    def test_simple(self):
        assert formater_date(date(2025, 3, 15)) == '15/03/2025'

    def test_long(self):
        assert formater_date(date(2025, 3, 15), format='long') == '15 mars 2025'

    def test_court(self):
        result = formater_date(date(2025, 8, 15), format='court')
        assert 'août' in result

    def test_mois_an(self):
        assert formater_date(date(2025, 1, 1), format='mois_an') == 'janvier 2025'

    def test_string_iso(self):
        assert formater_date('2025-03-15') == '15/03/2025'

    def test_datetime_iso(self):
        assert formater_date('2025-03-15T14:30:00') == '15/03/2025'

    def test_datetime_format(self):
        result = formater_date(datetime(2025, 3, 15, 14, 30), format='datetime')
        assert '14:30' in result

    def test_none(self):
        assert formater_date(None) == '—'

    def test_chaine_vide(self):
        assert formater_date('') == '—'

    def test_mois_decembre(self):
        assert formater_date(date(2025, 12, 25), format='long') == '25 décembre 2025'


# ═══════════════════════════════════════════════════════════════════════════════
# 7. formater_date_relative
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterDateRelative(unittest.TestCase):
    def test_instant(self):
        maintenant = datetime(2025, 3, 15, 10, 0, 0)
        result = formater_date_relative(
            datetime(2025, 3, 15, 9, 59, 45),
            maintenant=maintenant
        )
        assert result == "à l'instant"

    def test_minutes(self):
        maintenant = datetime(2025, 3, 15, 10, 0, 0)
        result = formater_date_relative(
            datetime(2025, 3, 15, 9, 55, 0),
            maintenant=maintenant
        )
        assert 'minute' in result

    def test_heures(self):
        maintenant = datetime(2025, 3, 15, 10, 0, 0)
        result = formater_date_relative(
            datetime(2025, 3, 15, 7, 0, 0),
            maintenant=maintenant
        )
        assert 'heure' in result

    def test_hier(self):
        maintenant = datetime(2025, 3, 15, 10, 0, 0)
        result = formater_date_relative(
            datetime(2025, 3, 14, 10, 0, 0),
            maintenant=maintenant
        )
        assert result == 'hier'

    def test_jours(self):
        maintenant = datetime(2025, 3, 15, 10, 0, 0)
        result = formater_date_relative(
            datetime(2025, 3, 10, 10, 0, 0),
            maintenant=maintenant
        )
        assert 'jours' in result

    def test_vieille_date(self):
        maintenant = datetime(2025, 3, 15, 10, 0, 0)
        result = formater_date_relative(
            datetime(2024, 1, 1, 0, 0, 0),
            maintenant=maintenant
        )
        # Plus d'une semaine → date complète
        assert '/' in result

    def test_none(self):
        assert formater_date_relative(None) == '—'


# ═══════════════════════════════════════════════════════════════════════════════
# 8. formater_duree
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterDuree(unittest.TestCase):
    def test_zero(self):
        assert formater_duree(0) == '0 jour'

    def test_un_jour(self):
        assert formater_duree(1) == '1 jour'

    def test_plusieurs_jours(self):
        assert formater_duree(15) == '15 jours'

    def test_mois(self):
        result = formater_duree(45)
        assert 'mois' in result

    def test_annees(self):
        result = formater_duree(400)
        assert 'an' in result

    def test_none(self):
        assert formater_duree(None) == '—'


# ═══════════════════════════════════════════════════════════════════════════════
# 9. formater_periode
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterPeriode(unittest.TestCase):
    def test_basique(self):
        result = formater_periode(date(2025, 1, 1), date(2025, 12, 31))
        assert 'janvier 2025' in result
        assert 'décembre 2025' in result
        assert 'du' in result and 'au' in result

    def test_none(self):
        assert formater_periode(None, None) == '—'


# ═══════════════════════════════════════════════════════════════════════════════
# 10. calculer_delai_traitement
# ═══════════════════════════════════════════════════════════════════════════════

class TestCalculerDelaiTraitement(unittest.TestCase):
    def test_avec_fin(self):
        result = calculer_delai_traitement('2025-01-01', '2025-01-31')
        assert result['jours'] == 30
        assert result['en_cours'] is False

    def test_sans_fin(self):
        result = calculer_delai_traitement('2020-01-01')
        assert result['jours'] > 0
        assert result['en_cours'] is True

    def test_none(self):
        result = calculer_delai_traitement(None)
        assert result['jours'] == 0


# ═══════════════════════════════════════════════════════════════════════════════
# 11. get_statut_config
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetStatutConfig(unittest.TestCase):
    def test_budget_approuve(self):
        cfg = get_statut_config('APPROUVE', 'budget')
        assert cfg['label'] == 'Approuvé'
        assert 'couleur' in cfg
        assert 'bg' in cfg

    def test_depense_validee(self):
        cfg = get_statut_config('VALIDEE', 'depense')
        assert cfg['label'] == 'Validée'

    def test_statut_inconnu(self):
        cfg = get_statut_config('INEXISTANT', 'budget')
        assert cfg['label'] == 'INEXISTANT'
        assert cfg['couleur'] == '#6B7280'

    def test_tous_statuts_budget(self):
        for statut in STATUT_BUDGET_CONFIG:
            cfg = get_statut_config(statut, 'budget')
            assert 'label' in cfg
            assert 'couleur' in cfg

    def test_tous_statuts_depense(self):
        for statut in STATUT_DEPENSE_CONFIG:
            cfg = get_statut_config(statut, 'depense')
            assert 'label' in cfg


# ═══════════════════════════════════════════════════════════════════════════════
# 12. Références
# ═══════════════════════════════════════════════════════════════════════════════

class TestReferences(unittest.TestCase):
    def test_generer_reference_budget(self):
        ref = generer_reference_budget(2025, 'COMPTA', 42)
        assert ref == 'BUD-2025-COMPTA-00042'

    def test_generer_reference_depense(self):
        ref = generer_reference_depense(2025, 'RH', 1)
        assert ref == 'DEP-2025-RH-00001'

    def test_prefixe_custom(self):
        ref = generer_reference_budget(2025, 'DEPT', 1, prefixe='PRJ')
        assert ref.startswith('PRJ-')

    def test_dept_majuscule(self):
        ref = generer_reference_budget(2025, 'compta', 1)
        assert 'COMPTA' in ref

    def test_dept_tronque(self):
        ref = generer_reference_budget(2025, 'DEPARTEMENTLONGNOMICI', 1)
        # Tronqué à 10 caractères
        parts = ref.split('-')
        assert len(parts[2]) <= 10

    def test_formater_reference(self):
        assert formater_reference('bud-2025-rh-00001') == 'BUD-2025-RH-00001'

    def test_formater_reference_none(self):
        assert formater_reference(None) == '—'


# ═══════════════════════════════════════════════════════════════════════════════
# 13. formater_pourcentage
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormaterPourcentage(unittest.TestCase):
    def test_basique(self):
        result = formater_pourcentage(75.5)
        assert '75,5' in result and '%' in result

    def test_entier(self):
        result = formater_pourcentage(100)
        assert '100,0' in result

    def test_none(self):
        assert formater_pourcentage(None) == '—'


# ═══════════════════════════════════════════════════════════════════════════════
# 14. calculer_taux_execution
# ═══════════════════════════════════════════════════════════════════════════════

class TestCalculerTauxExecution(unittest.TestCase):
    def test_basique(self):
        assert calculer_taux_execution(750_000, 1_000_000) == 75.0

    def test_zero_alloue(self):
        assert calculer_taux_execution(500, 0) == 0.0

    def test_none(self):
        assert calculer_taux_execution(None, None) == 0.0

    def test_depasse_100(self):
        result = calculer_taux_execution(1_200_000, 1_000_000)
        assert result == 120.0
