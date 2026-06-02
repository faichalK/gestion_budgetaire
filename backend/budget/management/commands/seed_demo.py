"""
Commande : python manage.py seed_demo
Peuple la base avec des données de démonstration réalistes pour la soutenance.
Idempotente : safe à relancer (ne crée pas de doublons).
"""

import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import Departement, Utilisateur, Role
from budget.models import (
    BudgetAnnuel, AllocationDepartementale,
    Budget, StatutBudget,
    CategoriePrincipale, SousCategorie, LigneBudgetaire,
    Depense, StatutDepense, ConsommationLigne,
)


PASSWORD = "Atlas2026!"

DEPARTEMENTS = [
    ("FIN",  "Finance & Comptabilité",    "Gestion financière et comptable de l'organisation"),
    ("RH",   "Ressources Humaines",        "Recrutement, formation et gestion des talents"),
    ("INFO", "Informatique & Systèmes",    "Infrastructure IT, développement et cybersécurité"),
    ("LOG",  "Logistique & Achats",        "Approvisionnement, stocks et transport"),
    ("MKT",  "Marketing & Communication",  "Communication institutionnelle et stratégie digitale"),
]

UTILISATEURS = [
    # (matricule, prenom, nom, email, role, dept_code)
    ("GST-001", "Aminata",  "COULIBALY",  "aminata.coulibaly@atlasfinance.org",  Role.GESTIONNAIRE, "FIN"),
    ("GST-002", "Ibrahim",  "TRAORE",     "ibrahim.traore@atlasfinance.org",     Role.GESTIONNAIRE, "RH"),
    ("GST-003", "Fatou",    "DIALLO",     "fatou.diallo@atlasfinance.org",       Role.GESTIONNAIRE, "INFO"),
    ("GST-004", "Moussa",   "OUATTARA",   "moussa.ouattara@atlasfinance.org",    Role.GESTIONNAIRE, "LOG"),
    ("CPT-001", "Nathalie", "KONE",       "nathalie.kone@atlasfinance.org",      Role.COMPTABLE,    "FIN"),
    ("CPT-002", "Seydou",   "BAMBA",      "seydou.bamba@atlasfinance.org",       Role.COMPTABLE,    "FIN"),
]


class Command(BaseCommand):
    help = "Peuple la base avec des données de démonstration (soutenance)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Seed démo Atlas Finance ===\n"))

        depts      = self._seed_departements()
        users      = self._seed_utilisateurs(depts)
        ba         = self._seed_budget_annuel()
        allocs     = self._seed_allocations(ba, depts)
        budgets    = self._seed_budgets(ba, allocs, depts, users)
        self._seed_depenses(budgets, users)

        self.stdout.write(self.style.SUCCESS("\nOK Seed termine avec succes.\n"))

    # ─── Départements ──────────────────────────────────────────────────────────
    def _seed_departements(self):
        self.stdout.write("  >>Départements…")
        depts = {}
        for code, nom, desc in DEPARTEMENTS:
            d, created = Departement.objects.get_or_create(
                code=code,
                defaults={"nom": nom, "description": desc, "actif": True},
            )
            depts[code] = d
            if created:
                self.stdout.write(f"      + {d}")
        return depts

    # ─── Utilisateurs ──────────────────────────────────────────────────────────
    def _seed_utilisateurs(self, depts):
        self.stdout.write("  >>Utilisateurs…")
        users = {}
        for matricule, prenom, nom, email, role, dept_code in UTILISATEURS:
            if Utilisateur.objects.filter(email=email).exists():
                users[matricule] = Utilisateur.objects.get(email=email)
                continue
            u = Utilisateur.objects.create_user(
                email=email,
                password=PASSWORD,
                matricule=matricule,
                prenom=prenom,
                nom=nom,
                role=role,
                departement=depts.get(dept_code),
                actif=True,
                is_staff=False,
            )
            users[matricule] = u
            self.stdout.write(f"      + {u} ({role})")
        return users

    # ─── Budget annuel ─────────────────────────────────────────────────────────
    def _seed_budget_annuel(self):
        self.stdout.write("  >>Budget annuel 2026…")
        ba, created = BudgetAnnuel.objects.get_or_create(
            annee=2026,
            defaults={
                "annee_fin": 2026,
                "montant_global": Decimal("750_000_000"),
                "description": "Exercice budgétaire 2026 – Atlas Finance Côte d'Ivoire",
            },
        )
        if created:
            self.stdout.write(f"      + {ba} — 750 000 000 FCFA")
        return ba

    # ─── Allocations départementales ──────────────────────────────────────────
    def _seed_allocations(self, ba, depts):
        self.stdout.write("  >>Allocations départementales…")
        montants = {
            "FIN":  Decimal("200_000_000"),
            "RH":   Decimal("120_000_000"),
            "INFO": Decimal("180_000_000"),
            "LOG":  Decimal("150_000_000"),
            "MKT":  Decimal("100_000_000"),
        }
        allocs = {}
        for code, montant in montants.items():
            a, created = AllocationDepartementale.objects.get_or_create(
                budget_annuel=ba,
                departement=depts[code],
                defaults={
                    "montant_alloue":     montant,
                    "montant_consomme":   Decimal("0"),
                    "montant_disponible": montant,
                },
            )
            allocs[code] = a
            if created:
                self.stdout.write(f"      + {depts[code].nom} — {montant:,.0f} FCFA")
        return allocs

    # ─── Budgets ───────────────────────────────────────────────────────────────
    def _seed_budgets(self, ba, allocs, depts, users):
        self.stdout.write("  >>Budgets…")

        specs = [
            # (dept, gestionnaire, comptable, nom, statut, lignes)
            (
                "FIN", "GST-001", "CPT-001",
                "Renouvellement Équipements Informatiques Finance",
                StatutBudget.APPROUVE,
                [
                    ("A", "Matériel informatique", [
                        ("Ordinateurs portables Dell", "Unité", 15, 850_000),
                        ("Écrans 27 pouces",           "Unité", 15, 180_000),
                        ("Imprimantes laser couleur",  "Unité",  3, 450_000),
                    ]),
                    ("B", "Logiciels & Licences", [
                        ("Microsoft 365 Business",    "Licence/an", 15, 95_000),
                        ("Antivirus Entreprise",      "Licence/an", 15, 45_000),
                    ]),
                ],
            ),
            (
                "RH", "GST-002", "CPT-001",
                "Plan de Formation & Développement des Compétences 2026",
                StatutBudget.APPROUVE,
                [
                    ("A", "Formations internes", [
                        ("Formation leadership & management", "Session",  4, 1_200_000),
                        ("Formation outils digitaux RH",     "Session",  6,   800_000),
                    ]),
                    ("B", "Formations externes & certifications", [
                        ("Certification PMI-PMP",   "Personne",  3, 1_500_000),
                        ("Formation Excel avancé",  "Session",   5,   350_000),
                    ]),
                ],
            ),
            (
                "INFO", "GST-003", "CPT-002",
                "Infrastructure Réseau & Cybersécurité 2026",
                StatutBudget.SOUMIS,
                [
                    ("A", "Réseau & Serveurs", [
                        ("Switches Cisco Catalyst",  "Unité",  4, 2_800_000),
                        ("Serveur NAS 96 To",        "Unité",  2, 8_500_000),
                        ("Onduleurs 10 kVA",         "Unité",  3,   950_000),
                    ]),
                    ("B", "Cybersécurité", [
                        ("Pare-feu Fortinet",         "Unité",  2, 4_200_000),
                        ("Audit de sécurité externe", "Forfait", 1, 6_000_000),
                    ]),
                ],
            ),
            (
                "LOG", "GST-004", "CPT-002",
                "Flotte Véhicules & Maintenance Logistique",
                StatutBudget.BROUILLON,
                [
                    ("A", "Acquisition véhicules", [
                        ("Véhicule utilitaire Toyota",  "Unité", 2, 18_500_000),
                        ("Moto de liaison",             "Unité", 5,  1_200_000),
                    ]),
                    ("B", "Entretien & Carburant", [
                        ("Contrat entretien flotte",   "Forfait/an", 1, 8_000_000),
                        ("Carburant S1 2026",          "Litre",  24000,   700),
                    ]),
                ],
            ),
            (
                "MKT", "GST-001", "CPT-001",
                "Campagne Communication & Marketing Digital S1 2026",
                StatutBudget.REJETE,
                [
                    ("A", "Digital & Réseaux Sociaux", [
                        ("Campagne LinkedIn Ads",       "Mois",  6,  850_000),
                        ("Production vidéos corporate", "Vidéo", 4, 1_200_000),
                    ]),
                    ("B", "Événementiel", [
                        ("Séminaire clients VIP",    "Événement", 1, 4_500_000),
                        ("Stands foires & salons",   "Stand",     2, 1_800_000),
                    ]),
                ],
            ),
        ]

        budgets = []
        for dept_code, gst_mat, cpt_mat, nom, statut, cats in specs:
            gst = users.get(gst_mat)
            cpt = users.get(cpt_mat)
            if not gst:
                continue
            if Budget.objects.filter(nom=nom).exists():
                budgets.append(Budget.objects.get(nom=nom))
                continue

            b = Budget(
                gestionnaire=gst,
                comptable=cpt if statut in (StatutBudget.APPROUVE, StatutBudget.REJETE) else None,
                budget_annuel=ba,
                allocation=allocs[dept_code],
                departement=depts[dept_code],
                nom=nom,
                statut=StatutBudget.BROUILLON,
                date_debut=datetime.date(2026, 1, 1),
                date_fin=datetime.date(2026, 12, 31),
            )
            b.save()

            # Catégories & lignes
            for cat_code, cat_nom, lignes in cats:
                cat = CategoriePrincipale.objects.create(
                    budget=b, code=cat_code, libelle=cat_nom
                )
                sc = SousCategorie.objects.create(
                    categorie=cat, code=f"{cat_code}1", libelle=cat_nom
                )
                for libelle, unite, qte, pu in lignes:
                    LigneBudgetaire.objects.create(
                        budget=b,
                        sous_categorie=sc,
                        libelle=libelle,
                        unite=unite,
                        quantite=Decimal(str(qte)),
                        prix_unitaire=Decimal(str(pu)),
                        section="DEPENSE",
                    )

            # Changer statut via méthodes métier
            if statut in (StatutBudget.SOUMIS, StatutBudget.APPROUVE, StatutBudget.REJETE):
                b.soumettre_budget()
            if statut == StatutBudget.APPROUVE:
                b.approuver_budget(cpt)
            if statut == StatutBudget.REJETE:
                b.rejeter_budget(cpt, motif="Budget sous-estimé — certains postes nécessitent une révision à la hausse.")

            self.stdout.write(f"      + {b.code} [{statut}]")
            budgets.append(b)

        return budgets

    # ─── Dépenses ──────────────────────────────────────────────────────────────
    def _seed_depenses(self, budgets, users):
        self.stdout.write("  >>Depenses…")
        cpt1 = users.get("CPT-001")
        cpt2 = users.get("CPT-002")

        for budget in budgets:
            if budget.statut != StatutBudget.APPROUVE:
                continue
            if Depense.objects.filter(budget=budget).exists():
                continue

            lignes = list(budget.lignes.all()[:2])
            if not lignes:
                continue

            gst = budget.gestionnaire
            cpt = cpt1 if budget.departement.code in ("FIN", "RH", "MKT") else cpt2

            # ── 1 Dépense VALIDÉE avec 2 lignes budgétaires consommées ──────────
            # C'est LA règle métier : 1 dépense = N lignes = 1 pièce justificative
            d_validee = Depense.objects.create(
                budget=budget,
                fournisseur="SARL Techno Solutions CI",
                note="Bon de commande N°2026-001 — facture jointe",
                enregistre_par=gst,
                statut=StatutDepense.SAISIE,
            )
            for ligne in lignes:
                montant = min(ligne.montant_disponible * Decimal("0.4"), ligne.montant_disponible)
                if montant > 0:
                    ligne.enregistrer_consommation(
                        montant=montant,
                        note=f"Livraison partielle — {ligne.libelle}",
                        enregistre_par=gst,
                        depense_parent=d_validee,
                        fournisseur=d_validee.fournisseur,
                        designation=ligne.libelle,
                        quantite=ligne.quantite / 2,
                        unite=ligne.unite,
                        prix_unitaire=ligne.prix_unitaire,
                    )
            d_validee.recalculer_total()
            d_validee.statut = StatutDepense.VALIDEE
            d_validee.validateur = cpt
            d_validee.save(update_fields=["statut", "validateur"])
            self._sync_consommations(d_validee, StatutDepense.VALIDEE)
            self.stdout.write(f"      + Depense validee ({len(lignes)} lignes) — {budget.code}")

            # ── 1 Dépense EN ATTENTE avec 2 lignes budgétaires consommées ───────
            lignes2 = list(budget.lignes.all()[2:4])
            if not lignes2:
                lignes2 = lignes  # fallback si moins de 4 lignes
            d_saisie = Depense.objects.create(
                budget=budget,
                fournisseur="CFAO Technologies",
                note="Deuxieme tranche — en attente de validation comptable",
                enregistre_par=gst,
                statut=StatutDepense.SAISIE,
            )
            for ligne in lignes2:
                montant = min(ligne.montant_disponible * Decimal("0.25"), ligne.montant_disponible)
                if montant > 0:
                    ligne.enregistrer_consommation(
                        montant=montant,
                        note=f"Acompte — {ligne.libelle}",
                        enregistre_par=gst,
                        depense_parent=d_saisie,
                        fournisseur=d_saisie.fournisseur,
                        designation=ligne.libelle,
                        quantite=1,
                        unite=ligne.unite,
                        prix_unitaire=montant,
                    )
            d_saisie.recalculer_total()
            self.stdout.write(f"      + Depense en attente ({len(lignes2)} lignes) — {budget.code}")

    def _sync_consommations(self, depense, statut):
        ConsommationLigne.objects.filter(depense=depense).update(statut=statut)
