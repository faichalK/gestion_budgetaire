"""
Commande Django : python manage.py seed_burkina
Vide toutes les tables et injecte le jeu de données Atlas Finance complet.
"""
import datetime
import uuid
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = "Vide la base et crée le jeu de données Atlas Finance complet (11 users, 7 depts, 15M FCFA)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Suppression de toutes les donnees existantes..."))
        self._purger()
        self.stdout.write(self.style.SUCCESS("Base videe"))

        with transaction.atomic():
            depts       = self._creer_departements()
            users       = self._creer_utilisateurs(depts)
            ba, allocs  = self._creer_budget_annuel(depts)
            self._creer_budgets(users, depts, ba, allocs)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write(self.style.SUCCESS("  Jeu de donnees Atlas Finance cree avec succes !"))
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write("")
        self.stdout.write("  ADMINISTRATEURS")
        self.stdout.write("  stanislas.konate@atlasfinance.org   / Admin@2025!")
        self.stdout.write("  marie.ouedraogo@atlasfinance.org    / Admin@2025!")
        self.stdout.write("  paul.sawadogo@atlasfinance.org      / Admin@2025!")
        self.stdout.write("")
        self.stdout.write("  GESTIONNAIRES")
        self.stdout.write("  jean.kouakou@atlasfinance.org       / Gest@2025!  (INFO)")
        self.stdout.write("  fatima.diallo@atlasfinance.org      / Gest@2025!  (RH)")
        self.stdout.write("  andre.traore@atlasfinance.org       / Gest@2025!  (LOG)")
        self.stdout.write("  sophie.zongo@atlasfinance.org       / Gest@2025!  (COM)")
        self.stdout.write("  ibrahim.sanogo@atlasfinance.org     / Gest@2025!  (PROJ - inactif)")
        self.stdout.write("")
        self.stdout.write("  COMPTABLES")
        self.stdout.write("  alice.kabore@atlasfinance.org       / Compta@2025!")
        self.stdout.write("  bernard.yameogo@atlasfinance.org    / Compta@2025!")
        self.stdout.write("  claire.ouattara@atlasfinance.org    / Compta@2025!")
        self.stdout.write("")

    # ── Purge ─────────────────────────────────────────────────────────────────

    def _purger(self):
        from budget.models import (
            ConsommationLigne, LigneBudgetaire, SousCategorie,
            CategoriePrincipale, Budget, AllocationDepartementale, BudgetAnnuel,
        )
        from accounts.models import Utilisateur, Departement

        ConsommationLigne.objects.all().delete()
        LigneBudgetaire.objects.all().delete()
        SousCategorie.objects.all().delete()
        CategoriePrincipale.objects.all().delete()
        Budget.objects.all().delete()
        AllocationDepartementale.objects.all().delete()
        BudgetAnnuel.objects.all().delete()
        Utilisateur.objects.all().delete()
        Departement.objects.all().delete()

    # ── Départements ──────────────────────────────────────────────────────────

    def _creer_departements(self):
        from accounts.models import Departement

        data = [
            ("INFO",  "Informatique et Systèmes d'Information",
             "Gestion infrastructure IT, développement, support technique."),
            ("RH",    "Ressources Humaines",
             "Recrutement, formation, gestion du personnel, paie."),
            ("LOG",   "Logistique et Approvisionnement",
             "Achats, stocks, transport, maintenance."),
            ("COM",   "Communication et Relations Publiques",
             "Communication interne/externe, événements, médias."),
            ("FIN",   "Finance et Comptabilité",
             "Comptabilité générale, trésorerie, contrôle de gestion."),
            ("PROJ",  "Gestion de Projets",
             "Planification, suivi et évaluation des projets de développement."),
            ("ADM",   "Administration Générale",
             "Direction générale, secrétariat, services généraux."),
        ]
        depts = {}
        for code, nom, desc in data:
            d = Departement.objects.create(code=code, nom=nom, description=desc)
            depts[code] = d
            self.stdout.write(f"  + Département : {code} — {nom}")
        return depts

    # ── Utilisateurs ──────────────────────────────────────────────────────────

    def _creer_utilisateurs(self, depts):
        from accounts.models import Utilisateur, Role

        specs = [
            # matricule, email, nom, prenom, role, dept_code, password, actif
            ("ADM-001", "stanislas.konate@atlasfinance.org",  "KONATÉ",    "Stanislas", Role.ADMINISTRATEUR, None,   "Admin@2025!",  True),
            ("ADM-002", "marie.ouedraogo@atlasfinance.org",   "OUEDRAOGO", "Marie",     Role.ADMINISTRATEUR, None,   "Admin@2025!",  True),
            ("ADM-003", "paul.sawadogo@atlasfinance.org",     "SAWADOGO",  "Paul",      Role.ADMINISTRATEUR, None,   "Admin@2025!",  True),
            ("GES-001", "jean.kouakou@atlasfinance.org",      "KOUAKOU",   "Jean",      Role.GESTIONNAIRE,   "INFO", "Gest@2025!",   True),
            ("GES-002", "fatima.diallo@atlasfinance.org",     "DIALLO",    "Fatima",    Role.GESTIONNAIRE,   "RH",   "Gest@2025!",   True),
            ("GES-003", "andre.traore@atlasfinance.org",      "TRAORÉ",    "André",     Role.GESTIONNAIRE,   "LOG",  "Gest@2025!",   True),
            ("GES-004", "sophie.zongo@atlasfinance.org",      "ZONGO",     "Sophie",    Role.GESTIONNAIRE,   "COM",  "Gest@2025!",   True),
            ("GES-005", "ibrahim.sanogo@atlasfinance.org",    "SANOGO",    "Ibrahim",   Role.GESTIONNAIRE,   "PROJ", "Gest@2025!",   False),
            ("CPT-001", "alice.kabore@atlasfinance.org",      "KABORÉ",    "Alice",     Role.COMPTABLE,      "FIN",  "Compta@2025!", True),
            ("CPT-002", "bernard.yameogo@atlasfinance.org",   "YAMEOGO",   "Bernard",   Role.COMPTABLE,      "FIN",  "Compta@2025!", True),
            ("CPT-003", "claire.ouattara@atlasfinance.org",   "OUATTARA",  "Claire",    Role.COMPTABLE,      "FIN",  "Compta@2025!", True),
        ]

        users = {}
        for matricule, email, nom, prenom, role, dept_code, pwd, actif in specs:
            u = Utilisateur.objects.create_user(
                email=email,
                password=pwd,
                matricule=matricule,
                nom=nom,
                prenom=prenom,
                role=role,
                departement=depts[dept_code] if dept_code else None,
                actif=actif,
                is_staff=(role == "ADMINISTRATEUR"),
                is_superuser=(role == "ADMINISTRATEUR"),
            )
            users[matricule] = u
            statut = "" if actif else " [INACTIF]"
            self.stdout.write(f"  + Utilisateur : {email} [{role}]{statut}")
        return users

    # ── Budget annuel + allocations ───────────────────────────────────────────

    def _creer_budget_annuel(self, depts):
        from budget.models import BudgetAnnuel, AllocationDepartementale

        ba = BudgetAnnuel.objects.create(
            annee=2025,
            annee_fin=2025,
            montant_global=Decimal("15000000"),
            description="Budget global annuel 2025 de l'organisation Atlas Finance.",
        )
        self.stdout.write(f"  + Budget annuel 2025 : 15 000 000 FCFA")

        alloc_data = [
            ("INFO", Decimal("3000000"),  "Enveloppe Informatique 2025 — Infrastructure et licences"),
            ("RH",   Decimal("2500000"),  "Enveloppe RH 2025 — Formation et recrutement"),
            ("LOG",  Decimal("2000000"),  "Enveloppe Logistique 2025 — Achats et transport"),
            ("COM",  Decimal("1500000"),  "Enveloppe Communication 2025 — Campagnes et événements"),
            ("FIN",  Decimal("1200000"),  "Enveloppe Finance 2025 — Logiciels comptables"),
            ("PROJ", Decimal("2500000"),  "Enveloppe Projets 2025 — Études et missions terrain"),
            ("ADM",  Decimal("2300000"),  "Enveloppe Administration 2025 — Fonctionnement général"),
        ]
        allocs = {}
        for code, montant, desc in alloc_data:
            a = AllocationDepartementale.objects.create(
                budget_annuel=ba,
                departement=depts[code],
                montant_alloue=montant,
            )
            allocs[code] = a
            self.stdout.write(f"  + Allocation : {code} -> {montant:,.0f} FCFA")
        return ba, allocs

    # ── Budgets ───────────────────────────────────────────────────────────────

    def _creer_budgets(self, users, depts, ba, allocs):
        from budget.models import Budget

        adm    = users["ADM-001"]
        cpt1   = users["CPT-001"]
        cpt2   = users["CPT-002"]
        cpt3   = users["CPT-003"]
        g_info = users["GES-001"]   # Jean KOUAKOU — INFO
        g_rh   = users["GES-002"]   # Fatima DIALLO — RH
        g_log  = users["GES-003"]   # André TRAORÉ — LOG
        g_com  = users["GES-004"]   # Sophie ZONGO — COM

        # (code, nom, description, gestionnaire, dept_code, statut, date_debut, date_fin,
        #  comptable, motif_rejet, lignes)
        specs = [
            # ── BROUILLON ────────────────────────────────────────────────────
            (
                "BDG-2025-001",
                "Infrastructure Réseau Q1 2025",
                "Mise à niveau infrastructure réseau et wifi du siège",
                g_info, "INFO", "BROUILLON", "2025-02-01", "2025-12-31",
                None, "",
                [
                    ("Switchs réseau",      "unité",  2, Decimal("175000")),
                    ("Points d'accès WiFi", "unité",  6, Decimal("50000")),
                    ("Câblage structuré",   "forfait",1, Decimal("150000")),
                ],
            ),
            (
                "BDG-2025-002",
                "Campagne Sensibilisation Q1",
                "Campagne médias sur nouveau projet eau potable",
                g_com, "COM", "BROUILLON", "2025-02-05", "2025-12-31",
                None, "",
                [
                    ("Spots radio/TV",    "semaine", 4, Decimal("62500")),
                    ("Affiches et flyers","lot",      5, Decimal("30000")),
                    ("Réseaux sociaux",   "forfait",  1, Decimal("200000")),
                ],
            ),
            # ── SOUMIS ───────────────────────────────────────────────────────
            (
                "BDG-2025-003",
                "Formation Personnel RH Trimestre 1",
                "Formations management et logiciels RH",
                g_rh, "RH", "SOUMIS", "2025-01-20", "2025-12-31",
                None, "",
                [
                    ("Formation management (15 personnes)", "personne", 15, Decimal("16667")),
                    ("Formation logiciel paie",             "forfait",   1, Decimal("120000")),
                    ("Supports pédagogiques",               "kit",      15, Decimal("5333")),
                ],
            ),
            (
                "BDG-2025-004",
                "Achats Véhicules Logistique",
                "Acquisition 2 véhicules pick-up pour missions terrain",
                g_log, "LOG", "SOUMIS", "2025-01-22", "2025-12-31",
                None, "",
                [
                    ("Véhicule pick-up 4x4",        "unité", 2, Decimal("500000")),
                    ("Équipements et accessoires",  "forfait",1, Decimal("150000")),
                    ("Assurance 1ère année",        "forfait",1, Decimal("50000")),
                ],
            ),
            (
                "BDG-2025-005",
                "Logiciels Comptables et ERP",
                "Licences annuelles logiciels comptabilité et gestion",
                g_info, "FIN", "SOUMIS", "2025-01-25", "2025-12-31",
                None, "",
                [
                    ("ERP Odoo Enterprise (20 users)", "an",     1, Decimal("200000")),
                    ("Module comptabilité avancée",    "an",     1, Decimal("100000")),
                    ("Support et maintenance",         "forfait",1, Decimal("50000")),
                ],
            ),
            # ── APPROUVÉ ─────────────────────────────────────────────────────
            (
                "BDG-2025-006",
                "Licences Microsoft 365 Annuelles",
                "Licences Microsoft 365 pour 50 utilisateurs",
                g_info, "INFO", "APPROUVE", "2025-01-10", "2025-12-31",
                cpt1, "",
                [
                    ("Licences M365 Business Premium", "unité", 30, Decimal("10000")),
                    ("Licences M365 E3 (direction)",   "unité", 10, Decimal("15000")),
                    ("Support technique Microsoft",    "an",     1, Decimal("100000")),
                ],
            ),
            (
                "BDG-2025-007",
                "Recrutement Personnel RH Q1",
                "Frais recrutement 5 postes clés",
                g_rh, "RH", "APPROUVE", "2025-01-08", "2025-12-31",
                cpt2, "",
                [
                    ("Annonces et publications",   "forfait", 1, Decimal("150000")),
                    ("Tests et entretiens",         "forfait", 1, Decimal("200000")),
                    ("Vérifications références",   "forfait", 1, Decimal("150000")),
                ],
            ),
            (
                "BDG-2025-008",
                "Carburant et Entretien Flotte Q1",
                "Carburant et maintenance véhicules logistique",
                g_log, "LOG", "APPROUVE", "2025-01-05", "2025-12-31",
                cpt1, "",
                [
                    ("Carburant diesel",      "litre", 2500, Decimal("100")),
                    ("Entretiens préventifs", "forfait",  1, Decimal("100000")),
                    ("Pièces détachées",      "forfait",  1, Decimal("50000")),
                ],
            ),
            # ── REJETÉ ───────────────────────────────────────────────────────
            (
                "BDG-2025-009",
                "Événement Gala de Fin d'Année",
                "Organisation gala annuel pour 300 personnes",
                g_com, "COM", "REJETE", "2025-01-18", "2025-12-31",
                cpt3,
                "Budget non prioritaire pour Q1. Montant trop élevé par rapport à l'enveloppe restante. "
                "Veuillez réviser à la baisse ou reporter au Q4.",
                [
                    ("Location salle et décoration", "forfait", 1, Decimal("350000")),
                    ("Traiteur et boissons",          "personne",300, Decimal("1000")),
                    ("Animation et sono",             "forfait", 1, Decimal("150000")),
                ],
            ),
            (
                "BDG-2025-010",
                "Mobilier Bureau Direction",
                "Renouvellement mobilier bureaux direction",
                g_rh, "ADM", "REJETE", "2025-01-16", "2025-12-31",
                cpt1,
                "Pièces justificatives manquantes (devis fournisseurs). Montant surévalué de 40% "
                "par rapport au marché. Veuillez fournir 3 devis comparatifs.",
                [
                    ("Bureaux direction (x5)",    "unité", 5, Decimal("100000")),
                    ("Fauteuils ergonomiques",     "unité", 5, Decimal("60000")),
                    ("Armoires et rangements",     "unité", 5, Decimal("30000")),
                ],
            ),
        ]

        for (code, nom, _desc, gestionnaire, dept_code, statut,
             date_debut, date_fin, comptable, motif_rejet, lignes_data) in specs:

            b = Budget(
                code=code,
                nom=nom,
                gestionnaire=gestionnaire,
                departement=depts[dept_code],
                allocation=allocs[dept_code],
                budget_annuel=ba,
                technique_estimation="ASCENDANTE",
                statut="BROUILLON",
                date_debut=datetime.date.fromisoformat(date_debut),
                date_fin=datetime.date.fromisoformat(date_fin),
            )
            b.save()

            # Créer les lignes budgétaires
            self._creer_lignes(b, lignes_data)

            # Faire progresser le statut
            if statut in ("SOUMIS", "APPROUVE", "REJETE"):
                b.statut = "SOUMIS"
                b.date_soumission = timezone.now()
                b.save(update_fields=["statut", "date_soumission"])

            if statut == "APPROUVE":
                b.statut = "APPROUVE"
                b.comptable = comptable
                b.save(update_fields=["statut", "comptable"])
                self._creer_depenses(b, gestionnaire, dept_code)

            elif statut == "REJETE":
                b.statut = "REJETE"
                b.comptable = comptable
                if motif_rejet:
                    b.motif_rejet = motif_rejet
                b.save(update_fields=["statut", "comptable", "motif_rejet"])

            self.stdout.write(f"  + Budget : {code} — {nom[:45]} [{statut}]")

    # ── Lignes budgétaires ─────────────────────────────────────────────────────

    def _creer_lignes(self, budget, lignes_data):
        from budget.models import CategoriePrincipale, SousCategorie, LigneBudgetaire

        cat = CategoriePrincipale.objects.create(
            budget=budget,
            code="A",
            libelle="Dépenses",
        )
        sc = SousCategorie.objects.create(
            categorie=cat,
            code="A.1",
            libelle="Lignes budgétaires",
        )
        for libelle, unite, quantite, prix_unitaire in lignes_data:
            LigneBudgetaire.objects.create(
                budget=budget,
                sous_categorie=sc,
                libelle=libelle,
                unite=unite,
                quantite=Decimal(str(quantite)),
                prix_unitaire=prix_unitaire,
                section="DEPENSE",
            )

    # ── Dépenses ──────────────────────────────────────────────────────────────

    def _creer_depenses(self, budget, gestionnaire, dept_code):
        from budget.models import ConsommationLigne, LigneBudgetaire

        DEPENSES_PAR_BUDGET = {
            "BDG-2025-006": [  # Licences Microsoft — 450k consommés
                ("Licences M365 Business Premium", Decimal("150000"), "Achat 30 licences M365 Business Premium",                  "ENTREPRISE TECHNO BURKINA SARL",  "VALIDEE"),
                ("Licences M365 Business Premium", Decimal("150000"), "Achat 20 licences M365 Business Premium supplémentaires",  "ENTREPRISE TECHNO BURKINA SARL",  "VALIDEE"),
                ("Licences M365 E3 (direction)",   Decimal("150000"), "10 licences M365 E3 pour direction et managers",           "MICROSOFT AFRIQUE DISTRIBUTEUR",  "VALIDEE"),
            ],
            "BDG-2025-007": [  # Recrutement RH — 380k consommés
                ("Annonces et publications",   Decimal("80000"),  "Publication annonces sur portails emploi (3 sites)",   "JOBAFRIQUE SARL",           "VALIDEE"),
                ("Annonces et publications",   Decimal("70000"),  "Annonces presse locale (2 journaux)",                  "PRESSE OUAGA MEDIA",        "VALIDEE"),
                ("Tests et entretiens",        Decimal("120000"), "Tests psychotechniques et entretiens candidats",       "CABINET RH CONSEIL BF",     "VALIDEE"),
                ("Tests et entretiens",        Decimal("60000"),  "Entretiens techniques candidats IT",                   "CABINET RH CONSEIL BF",     "VALIDEE"),
                ("Vérifications références",   Decimal("50000"),  "Vérifications antécédents et diplômes",               "INVESTIGATIONS SECURITE BF","VALIDEE"),
            ],
            "BDG-2025-008": [  # Carburant Logistique — 280k consommés
                ("Carburant diesel", Decimal("45000"), "Carburant semaine 1-2 janvier",        "TOTAL ENERGIE BURKINA",     "VALIDEE"),
                ("Carburant diesel", Decimal("40000"), "Carburant semaine 3-4 janvier",        "TOTAL ENERGIE BURKINA",     "VALIDEE"),
                ("Carburant diesel", Decimal("55000"), "Carburant semaine 1-2 février",        "SHELL BURKINA FASO",        "VALIDEE"),
                ("Carburant diesel", Decimal("60000"), "Carburant semaine 3-4 février",        "SHELL BURKINA FASO",        "VALIDEE"),
                ("Entretiens préventifs", Decimal("80000"), "Vidanges et révisions 4 véhicules", "GARAGE OUEDRAOGO & FILS", "VALIDEE"),
            ],
        }

        depenses = DEPENSES_PAR_BUDGET.get(budget.code, [])
        if not depenses:
            return

        for libelle_ligne, montant, note, fournisseur, statut in depenses:
            ligne = LigneBudgetaire.objects.filter(budget=budget, libelle=libelle_ligne).first()
            if not ligne:
                continue
            if montant > ligne.montant_disponible:
                montant = ligne.montant_disponible

            c = ConsommationLigne(
                ligne=ligne,
                montant=montant,
                note=note,
                fournisseur=fournisseur,
                enregistre_par=gestionnaire,
                statut=statut,
            )
            c.reference = f"DEP-2025-{str(uuid.uuid4())[:6].upper()}"
            c.save()

            if statut == "VALIDEE":
                LigneBudgetaire.objects.filter(pk=ligne.pk).update(
                    montant_consomme=ligne.montant_consomme + montant,
                    montant_disponible=ligne.montant_disponible - montant,
                )
                ligne.refresh_from_db()
                budget.recalculer_montants()
