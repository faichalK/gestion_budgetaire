"""
Fixtures globales pytest pour Atlas Finance.
Basées sur les apps actives : accounts, budget, audit.
"""
import datetime
import pytest
from decimal import Decimal


# ── Utilisateurs ──────────────────────────────────────────────────────────────

@pytest.fixture
def departement(db):
    from accounts.models import Departement
    return Departement.objects.create(nom="Direction Financière", code="DF")


@pytest.fixture
def admin(db):
    from accounts.models import Utilisateur, Role
    return Utilisateur.objects.create_superuser(
        email="admin_test@atlasfinance.ci",
        password="Admin2026!",
        nom="Admin",
        prenom="Test",
        matricule="ADM-TEST",
        role=Role.ADMINISTRATEUR,
    )


@pytest.fixture
def comptable(db, departement):
    from accounts.models import Utilisateur, Role
    return Utilisateur.objects.create_user(
        email="comptable_test@atlasfinance.ci",
        password="Comptable2026!",
        nom="Comptable",
        prenom="Test",
        matricule="CPT-TEST",
        role=Role.COMPTABLE,
        departement=departement,
    )


@pytest.fixture
def gestionnaire(db, departement):
    from accounts.models import Utilisateur, Role
    return Utilisateur.objects.create_user(
        email="gestionnaire_test@atlasfinance.ci",
        password="Gestionnaire2026!",
        nom="Gestionnaire",
        prenom="Test",
        matricule="GST-TEST",
        role=Role.GESTIONNAIRE,
        departement=departement,
    )


# ── Budget annuel & allocation ────────────────────────────────────────────────

@pytest.fixture
def budget_annuel(db):
    from budget.models import BudgetAnnuel
    return BudgetAnnuel.objects.create(
        annee=2026,
        montant_global=Decimal("10000000.00"),
        description="Budget exercice 2026",
    )


@pytest.fixture
def allocation(db, budget_annuel, departement):
    from budget.models import AllocationDepartementale
    return AllocationDepartementale.objects.create(
        budget_annuel=budget_annuel,
        departement=departement,
        montant_alloue=Decimal("500000.00"),
    )


# ── Budgets ───────────────────────────────────────────────────────────────────

@pytest.fixture
def budget_brouillon(db, gestionnaire, departement, allocation):
    from budget.models import Budget
    b = Budget.objects.create(
        gestionnaire=gestionnaire,
        departement=departement,
        allocation=allocation,
        budget_annuel=allocation.budget_annuel,
        nom="Budget Test",
        date_debut=datetime.date(2026, 1, 1),
        date_fin=datetime.date(2026, 12, 31),
    )
    return b


@pytest.fixture
def budget_soumis(db, budget_brouillon):
    from budget.models import LigneBudgetaire
    LigneBudgetaire.objects.create(
        budget=budget_brouillon,
        libelle="Fournitures de bureau",
        quantite=Decimal("10"),
        prix_unitaire=Decimal("500.00"),
    )
    budget_brouillon.refresh_from_db()
    budget_brouillon.soumettre_budget()
    return budget_brouillon


@pytest.fixture
def budget_approuve(db, budget_soumis, comptable):
    budget_soumis.approuver_budget(comptable)
    return budget_soumis


# ── Dépenses ──────────────────────────────────────────────────────────────────

@pytest.fixture
def depense_saisie(db, budget_approuve, gestionnaire):
    from budget.models import ConsommationLigne
    ligne = budget_approuve.lignes.first()
    return ConsommationLigne.objects.create(
        ligne=ligne,
        fournisseur="Papeterie Centrale",
        montant=Decimal("2500.00"),
        note="Achat fournitures Q1 2026",
        enregistre_par=gestionnaire,
    )
