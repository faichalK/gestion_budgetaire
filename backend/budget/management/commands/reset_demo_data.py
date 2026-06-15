"""
python manage.py reset_demo_data

Supprime toutes les données sauf le super-admin stanislaskonate@gmail.com,
puis crée un jeu de démo complet pour 2026.
"""
import datetime
import uuid
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


SUPER_ADMIN_EMAIL = "stanislaskonate@gmail.com"


class Command(BaseCommand):
    help = "Resets demo data (keeps super-admin) and seeds fresh 2026 data."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Suppression des données existantes (super-admin conservé)..."))
        self._purger()
        self.stdout.write(self.style.SUCCESS("Base vidée."))

        with transaction.atomic():
            depts      = self._creer_departements()
            users      = self._creer_utilisateurs(depts)
            ba, allocs = self._creer_budget_annuel(depts)
            self._creer_budgets(users, depts, ba, allocs)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  Jeu de données 2026 créé avec succès !"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("")
        self.stdout.write("  SUPER-ADMIN conservé")
        self.stdout.write(f"  {SUPER_ADMIN_EMAIL}  (mot de passe inchangé)")
        self.stdout.write("")
        self.stdout.write("  ADMINISTRATEURS")
        self.stdout.write("  marie.ouedraogo@atlasfinance.org   / Admin@2026!")
        self.stdout.write("")
        self.stdout.write("  GESTIONNAIRES")
        self.stdout.write("  jean.kouakou@atlasfinance.org      / Gest@2026!  (INFO)")
        self.stdout.write("  fatima.diallo@atlasfinance.org     / Gest@2026!  (RH)")
        self.stdout.write("  andre.traore@atlasfinance.org      / Gest@2026!  (LOG)")
        self.stdout.write("  sophie.zongo@atlasfinance.org      / Gest@2026!  (COM)")
        self.stdout.write("")
        self.stdout.write("  COMPTABLES")
        self.stdout.write("  alice.kabore@atlasfinance.org      / Compta@2026!")
        self.stdout.write("  bernard.yameogo@atlasfinance.org   / Compta@2026!")
        self.stdout.write("")

    # ── Purge ─────────────────────────────────────────────────────────────────

    def _purger(self):
        from budget.models import (
            ConsommationLigne, LigneBudgetaire, SousCategorie,
            CategoriePrincipale, Budget, AllocationDepartementale,
            BudgetAnnuel, Notification,
        )
        from accounts.models import Utilisateur, Departement

        Notification.objects.all().delete()
        ConsommationLigne.objects.all().delete()
        LigneBudgetaire.objects.all().delete()
        SousCategorie.objects.all().delete()
        CategoriePrincipale.objects.all().delete()
        Budget.objects.all().delete()
        AllocationDepartementale.objects.all().delete()
        BudgetAnnuel.objects.all().delete()
        Utilisateur.objects.exclude(email=SUPER_ADMIN_EMAIL).delete()
        Departement.objects.all().delete()

    # ── Départements ──────────────────────────────────────────────────────────

    def _creer_departements(self):
        from accounts.models import Departement

        data = [
            ("INFO", "Informatique et Systèmes d'Information",
             "Gestion infrastructure IT, développement logiciel, support technique."),
            ("RH",   "Ressources Humaines",
             "Recrutement, formation, gestion du personnel et de la paie."),
            ("LOG",  "Logistique et Approvisionnement",
             "Achats, stocks, transport et maintenance du matériel."),
            ("COM",  "Communication et Relations Publiques",
             "Communication interne et externe, événements, médias sociaux."),
            ("FIN",  "Finance et Comptabilité",
             "Comptabilité générale, trésorerie et contrôle de gestion."),
            ("PROJ", "Gestion de Projets",
             "Planification, suivi et évaluation des projets stratégiques."),
            ("ADM",  "Administration Générale",
             "Direction générale, secrétariat de direction, services généraux."),
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
            # matricule, email, nom, prenom, role, dept_code, password, actif, is_staff, is_su
            ("ADM-001", "marie.ouedraogo@atlasfinance.org",  "OUEDRAOGO", "Marie",    Role.ADMINISTRATEUR, None,   "Admin@2026!",  True,  True,  True),
            ("GES-001", "jean.kouakou@atlasfinance.org",     "KOUAKOU",   "Jean",     Role.GESTIONNAIRE,   "INFO", "Gest@2026!",   True,  False, False),
            ("GES-002", "fatima.diallo@atlasfinance.org",    "DIALLO",    "Fatima",   Role.GESTIONNAIRE,   "RH",   "Gest@2026!",   True,  False, False),
            ("GES-003", "andre.traore@atlasfinance.org",     "TRAORÉ",    "André",    Role.GESTIONNAIRE,   "LOG",  "Gest@2026!",   True,  False, False),
            ("GES-004", "sophie.zongo@atlasfinance.org",     "ZONGO",     "Sophie",   Role.GESTIONNAIRE,   "COM",  "Gest@2026!",   True,  False, False),
            ("GES-005", "ibrahim.sanogo@atlasfinance.org",   "SANOGO",    "Ibrahim",  Role.GESTIONNAIRE,   "PROJ", "Gest@2026!",   False, False, False),
            ("CPT-001", "alice.kabore@atlasfinance.org",     "KABORÉ",    "Alice",    Role.COMPTABLE,      "FIN",  "Compta@2026!", True,  False, False),
            ("CPT-002", "bernard.yameogo@atlasfinance.org",  "YAMEOGO",   "Bernard",  Role.COMPTABLE,      "FIN",  "Compta@2026!", True,  False, False),
        ]

        users = {}
        for matricule, email, nom, prenom, role, dept_code, pwd, actif, is_staff, is_su in specs:
            u = Utilisateur.objects.create_user(
                email=email,
                password=pwd,
                matricule=matricule,
                nom=nom,
                prenom=prenom,
                role=role,
                departement=depts[dept_code] if dept_code else None,
                actif=actif,
                is_staff=is_staff,
                is_superuser=is_su,
            )
            users[matricule] = u
            flag = "" if actif else " [INACTIF]"
            self.stdout.write(f"  + Utilisateur : {email} [{role}]{flag}")
        return users

    # ── Budget annuel + allocations ───────────────────────────────────────────

    def _creer_budget_annuel(self, depts):
        from budget.models import BudgetAnnuel, AllocationDepartementale

        ba = BudgetAnnuel.objects.create(
            annee=2026,
            annee_fin=2026,
            montant_global=Decimal("500000000"),
            description="Budget global annuel 2026 — Atlas Finance.",
        )
        self.stdout.write("  + Budget annuel 2026 : 500 000 000 FCFA")

        alloc_data = [
            ("INFO", Decimal("85000000"),  "Enveloppe Informatique 2026 — Infrastructure et licences"),
            ("RH",   Decimal("70000000"),  "Enveloppe RH 2026 — Recrutement, formation et paie"),
            ("LOG",  Decimal("65000000"),  "Enveloppe Logistique 2026 — Achats et transport"),
            ("COM",  Decimal("45000000"),  "Enveloppe Communication 2026 — Campagnes et événements"),
            ("FIN",  Decimal("50000000"),  "Enveloppe Finance 2026 — Outils et contrôle de gestion"),
            ("PROJ", Decimal("110000000"), "Enveloppe Projets 2026 — Études et missions stratégiques"),
            ("ADM",  Decimal("75000000"),  "Enveloppe Administration 2026 — Fonctionnement général"),
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
        g_info = users["GES-001"]
        g_rh   = users["GES-002"]
        g_log  = users["GES-003"]
        g_com  = users["GES-004"]
        cpt1   = users["CPT-001"]
        cpt2   = users["CPT-002"]

        # (code, nom, gestionnaire, dept_code, statut, date_debut, date_fin, comptable, motif_rejet, lignes)
        specs = [
            # ── BROUILLON ────────────────────────────────────────────────────
            (
                "BDG-2026-001",
                "Renouvellement Parc Informatique Q1",
                g_info, "INFO", "BROUILLON", "2026-01-10", "2026-06-30",
                None, "",
                [
                    ("Ordinateurs portables (x20)",  "unité",  20, Decimal("850000")),
                    ("Écrans 27 pouces (x20)",        "unité",  20, Decimal("280000")),
                    ("Accessoires et périphériques",  "forfait",  1, Decimal("1500000")),
                ],
            ),
            (
                "BDG-2026-002",
                "Campagne Digitale Semestre 1",
                g_com, "COM", "BROUILLON", "2026-01-15", "2026-06-30",
                None, "",
                [
                    ("Publicité réseaux sociaux",  "forfait", 1, Decimal("4500000")),
                    ("Production de contenu vidéo","forfait", 1, Decimal("3200000")),
                    ("Référencement SEO/SEA",       "mois",   6, Decimal("800000")),
                ],
            ),
            # ── SOUMIS ───────────────────────────────────────────────────────
            (
                "BDG-2026-003",
                "Formation Management et Leadership",
                g_rh, "RH", "SOUMIS", "2026-01-20", "2026-12-31",
                None, "",
                [
                    ("Formation leadership (20 cadres)",   "personne", 20, Decimal("550000")),
                    ("Coaching individuel direction",       "séance",   12, Decimal("350000")),
                    ("Certification PMP (5 chefs projet)", "personne",  5, Decimal("800000")),
                ],
            ),
            (
                "BDG-2026-004",
                "Acquisition Véhicules Logistique 2026",
                g_log, "LOG", "SOUMIS", "2026-01-22", "2026-09-30",
                None, "",
                [
                    ("Véhicule utilitaire 4x4 (x3)",  "unité",   3, Decimal("8500000")),
                    ("Équipements terrain",            "forfait", 1, Decimal("2800000")),
                    ("Assurance flotte 1 an",          "forfait", 1, Decimal("1200000")),
                ],
            ),
            (
                "BDG-2026-005",
                "Déploiement ERP Financier 2026",
                g_info, "FIN", "SOUMIS", "2026-02-01", "2026-12-31",
                None, "",
                [
                    ("Licence ERP Odoo Enterprise (30 users)", "an",      1, Decimal("6500000")),
                    ("Paramétrage et déploiement",             "forfait", 1, Decimal("4500000")),
                    ("Formation utilisateurs",                 "forfait", 1, Decimal("1800000")),
                    ("Support annuel",                         "an",      1, Decimal("2200000")),
                ],
            ),
            # ── APPROUVÉ ─────────────────────────────────────────────────────
            (
                "BDG-2026-006",
                "Licences Microsoft 365 — Exercice 2026",
                g_info, "INFO", "APPROUVE", "2026-01-05", "2026-12-31",
                cpt1, "",
                [
                    ("Licences M365 Business Premium (40u)", "unité",  40, Decimal("420000")),
                    ("Licences M365 E3 — Direction (10u)",   "unité",  10, Decimal("650000")),
                    ("Support Microsoft Premier",             "an",      1, Decimal("2500000")),
                ],
            ),
            (
                "BDG-2026-007",
                "Recrutement Ingénieurs et Techniciens Q1",
                g_rh, "RH", "APPROUVE", "2026-01-08", "2026-06-30",
                cpt2, "",
                [
                    ("Annonces et diffusion offres",   "forfait", 1, Decimal("2200000")),
                    ("Tests techniques et entretiens", "forfait", 1, Decimal("3500000")),
                    ("Honoraires cabinet de recrutement","forfait",1, Decimal("5800000")),
                ],
            ),
            (
                "BDG-2026-008",
                "Carburant et Entretien Flotte — S1 2026",
                g_log, "LOG", "APPROUVE", "2026-01-05", "2026-06-30",
                cpt1, "",
                [
                    ("Carburant diesel (6 mois)",   "litre",    15000, Decimal("650")),
                    ("Révisions et entretiens",      "forfait",      1, Decimal("3200000")),
                    ("Pièces détachées urgentes",    "forfait",      1, Decimal("1500000")),
                ],
            ),
            # ── REJETÉ ───────────────────────────────────────────────────────
            (
                "BDG-2026-009",
                "Séminaire Stratégique Direction 2026",
                g_com, "COM", "REJETE", "2026-01-18", "2026-12-31",
                cpt2,
                "Montant excessif au regard de l'enveloppe disponible (COM). Veuillez réviser "
                "le poste hébergement à la baisse et fournir 3 devis comparatifs pour la salle.",
                [
                    ("Location resort 3 jours (50 personnes)", "forfait", 1, Decimal("12000000")),
                    ("Traiteur et restauration",                "personne",50, Decimal("180000")),
                    ("Intervenant conférencier international",  "forfait", 1, Decimal("6500000")),
                ],
            ),
            (
                "BDG-2026-010",
                "Mobilier et Aménagement Espaces Communs",
                g_rh, "ADM", "REJETE", "2026-01-16", "2026-12-31",
                cpt1,
                "Pièces justificatives manquantes : devis fournisseurs non fournis. Montant "
                "surestimé de 35% vs marché actuel. Resoumettez avec 3 devis comparatifs.",
                [
                    ("Mobilier de bureau open space (x30)", "poste", 30, Decimal("450000")),
                    ("Cloisons acoustiques modulaires",     "panneau",20, Decimal("280000")),
                    ("Équipements cuisine et détente",      "forfait", 1, Decimal("1800000")),
                ],
            ),
            # ── CLÔTURÉ ──────────────────────────────────────────────────────
            (
                "BDG-2026-011",
                "Audit Sécurité Informatique — T4 2025",
                g_info, "INFO", "CLOTURE", "2025-10-01", "2025-12-31",
                cpt1, "",
                [
                    ("Audit pentest infrastructure",    "forfait", 1, Decimal("4500000")),
                    ("Audit code applications critiques","forfait", 1, Decimal("3200000")),
                    ("Rapport et recommandations",       "forfait", 1, Decimal("800000")),
                ],
            ),
        ]

        for (code, nom, gestionnaire, dept_code, statut,
             date_debut, date_fin, comptable, motif_rejet, lignes_data) in specs:

            alloc = allocs.get(dept_code)
            b = self._creer_budget(
                code, nom, gestionnaire, depts[dept_code], alloc, ba,
                date_debut, date_fin,
            )
            self._creer_lignes(b, lignes_data)
            self._faire_progresser(b, statut, comptable, motif_rejet)

            if statut == "APPROUVE":
                self._creer_depenses(b, gestionnaire)

            self.stdout.write(f"  + Budget : {code} — {nom[:50]} [{statut}]")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _creer_budget(self, code, nom, gestionnaire, dept, alloc, ba, date_debut, date_fin):
        from budget.models import Budget
        b = Budget(
            code=code,
            nom=nom,
            gestionnaire=gestionnaire,
            departement=dept,
            allocation=alloc,
            budget_annuel=ba,
            technique_estimation="ASCENDANTE",
            statut="BROUILLON",
            date_debut=datetime.date.fromisoformat(date_debut),
            date_fin=datetime.date.fromisoformat(date_fin),
        )
        b.save()
        return b

    def _creer_lignes(self, budget, lignes_data):
        from budget.models import CategoriePrincipale, SousCategorie, LigneBudgetaire
        cat = CategoriePrincipale.objects.create(budget=budget, code="A", libelle="Dépenses")
        sc  = SousCategorie.objects.create(categorie=cat, code="A.1", libelle="Lignes budgétaires")
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

    def _faire_progresser(self, b, statut, comptable, motif_rejet):
        if statut in ("SOUMIS", "APPROUVE", "REJETE", "CLOTURE"):
            b.statut = "SOUMIS"
            b.date_soumission = timezone.now()
            b.save(update_fields=["statut", "date_soumission"])

        if statut in ("APPROUVE", "CLOTURE"):
            b.statut = "APPROUVE"
            b.comptable = comptable
            b.save(update_fields=["statut", "comptable"])

        elif statut == "REJETE":
            b.statut = "REJETE"
            b.comptable = comptable
            if motif_rejet:
                b.motif_rejet = motif_rejet
            b.save(update_fields=["statut", "comptable", "motif_rejet"])

        if statut == "CLOTURE":
            b.statut = "CLOTURE"
            b.save(update_fields=["statut"])

    def _creer_depenses(self, budget, gestionnaire):
        from budget.models import ConsommationLigne, LigneBudgetaire

        DEPENSES = {
            "BDG-2026-006": [
                ("Licences M365 Business Premium (40u)", Decimal("12600000"), "Renouvellement 40 licences Business Premium — jan 2026",  "TECHNO SYSTEMS AFRIQUE SARL",  "VALIDEE"),
                ("Licences M365 E3 — Direction (10u)",   Decimal("5200000"),  "Licences E3 direction et managers — jan 2026",            "MICROSOFT AFRIQUE DIST.",       "VALIDEE"),
                ("Support Microsoft Premier",             Decimal("2500000"),  "Contrat support annuel Microsoft Premier 2026",           "MICROSOFT AFRIQUE DIST.",       "VALIDEE"),
            ],
            "BDG-2026-007": [
                ("Annonces et diffusion offres",    Decimal("1100000"), "Diffusion offres portails emploi africains — T1",   "JOBAFRIQUE SARL",          "VALIDEE"),
                ("Annonces et diffusion offres",    Decimal("900000"),  "Annonces presse nationale et régionale — jan",     "PRESSE OUAGA EDITIONS",    "VALIDEE"),
                ("Tests techniques et entretiens",  Decimal("2000000"), "Tests psychotechniques + entretiens (30 candidats)","CABINET RH CONSEIL",       "VALIDEE"),
                ("Tests techniques et entretiens",  Decimal("1200000"), "Entretiens finaux et simulations pratiques",        "CABINET RH CONSEIL",       "SAISIE"),
                ("Honoraires cabinet de recrutement",Decimal("3500000"),"Honoraires acompte 60% cabinet de recrutement",    "RECRUTPRO AFRIQUE",        "VALIDEE"),
            ],
            "BDG-2026-008": [
                ("Carburant diesel (6 mois)",  Decimal("2800000"), "Carburant flotte janvier-février 2026",            "TOTAL ENERGIES BURKINA",   "VALIDEE"),
                ("Carburant diesel (6 mois)",  Decimal("3100000"), "Carburant flotte mars-avril 2026",                 "SHELL BURKINA FASO",        "VALIDEE"),
                ("Révisions et entretiens",    Decimal("1800000"), "Révisions 50 000 km — 4 véhicules",               "GARAGE CENTRAL OUAGA",     "VALIDEE"),
                ("Pièces détachées urgentes",  Decimal("650000"),  "Remplacement pneus + amortisseurs — urgence",      "AUTO PIÈCES DISTRIBUTION", "SAISIE"),
            ],
            "BDG-2026-011": [
                ("Audit pentest infrastructure",     Decimal("4500000"), "Pentest complet — réseau, serveurs, VPN",         "CYBERSEC AFRIQUE SARL",    "VALIDEE"),
                ("Audit code applications critiques",Decimal("3200000"), "Revue sécurité code Atlas Finance et ERP",           "CYBERSEC AFRIQUE SARL",    "VALIDEE"),
                ("Rapport et recommandations",       Decimal("800000"),  "Rapport exécutif + plan de remédiation 90 jours", "CYBERSEC AFRIQUE SARL",    "VALIDEE"),
            ],
        }

        depenses = DEPENSES.get(budget.code, [])
        for libelle_ligne, montant, note, fournisseur, statut in depenses:
            ligne = LigneBudgetaire.objects.filter(budget=budget, libelle=libelle_ligne).first()
            if not ligne:
                continue
            if montant > ligne.montant_disponible:
                montant = ligne.montant_disponible
            if montant <= 0:
                continue

            c = ConsommationLigne(
                ligne=ligne,
                montant=montant,
                note=note,
                fournisseur=fournisseur,
                enregistre_par=gestionnaire,
                statut=statut,
            )
            c.reference = f"DEP-2026-{str(uuid.uuid4())[:6].upper()}"
            c.save()

            if statut == "VALIDEE":
                LigneBudgetaire.objects.filter(pk=ligne.pk).update(
                    montant_consomme=ligne.montant_consomme + montant,
                    montant_disponible=ligne.montant_disponible - montant,
                )
                ligne.refresh_from_db()
                budget.recalculer_montants()
