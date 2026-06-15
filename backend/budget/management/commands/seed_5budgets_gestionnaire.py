"""
python manage.py seed_5budgets_gestionnaire [--email EMAIL]

Crée 5 budgets complets pour le gestionnaire spécifié (ou le premier gestionnaire
actif trouvé), couvrant tous les statuts : BROUILLON, SOUMIS, APPROUVE, REJETE, CLOTURE.
Chaque dépense est accompagnée d'une pièce justificative PDF générée à la volée.
Idempotente : relancer ne crée pas de doublons.
"""
import datetime
import io
import unicodedata
from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import Role, Utilisateur
from budget.models import (
    Budget, StatutBudget,
    BudgetAnnuel, AllocationDepartementale,
    CategoriePrincipale, SousCategorie, LigneBudgetaire,
    Depense, StatutDepense, PieceJustificative,
)


class Command(BaseCommand):
    help = "Crée 5 budgets complets (un par statut) pour le gestionnaire actuel."

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default=None,
            help="Email du gestionnaire cible (défaut : premier gestionnaire actif en base).",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(
            "\n=== Seed 5 budgets gestionnaire ===\n"
        ))

        with transaction.atomic():
            gestionnaire, comptable = self._find_users(options['email'])
            self.stdout.write(
                f"  Gestionnaire : {gestionnaire.prenom} {gestionnaire.nom} ({gestionnaire.email})"
            )
            self.stdout.write(
                f"  Comptable    : {comptable.prenom} {comptable.nom} ({comptable.email})"
            )
            self.stdout.write("")

            ba, alloc = self._find_or_create_allocation(gestionnaire)
            self._creer_budget_brouillon(gestionnaire, ba, alloc)
            self._creer_budget_soumis(gestionnaire, ba, alloc)
            self._creer_budget_approuve(gestionnaire, comptable, ba, alloc)
            self._creer_budget_rejete(gestionnaire, comptable, ba, alloc)
            self._creer_budget_cloture(gestionnaire, comptable, ba, alloc)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"OK — 5 budgets créés pour {gestionnaire.email}"
        ))

    # ── Recherche des utilisateurs ────────────────────────────────────────────

    def _find_users(self, email):
        if email:
            try:
                gestionnaire = Utilisateur.objects.get(email=email, role=Role.GESTIONNAIRE)
            except Utilisateur.DoesNotExist:
                raise CommandError(f"Aucun gestionnaire trouvé avec l'email : {email}")
        else:
            gestionnaire = Utilisateur.objects.filter(role=Role.GESTIONNAIRE, actif=True).first()
            if not gestionnaire:
                raise CommandError(
                    "Aucun gestionnaire actif en base. "
                    "Lancez d'abord `seed_demo` ou `reset_demo_data`."
                )

        comptable = Utilisateur.objects.filter(role=Role.COMPTABLE, actif=True).first()
        if not comptable:
            raise CommandError(
                "Aucun comptable actif en base. "
                "Lancez d'abord `seed_demo` ou `reset_demo_data`."
            )

        return gestionnaire, comptable

    # ── BudgetAnnuel + AllocationDepartementale ───────────────────────────────

    def _find_or_create_allocation(self, gestionnaire):
        """Garantit qu'il existe un BudgetAnnuel 2026 et une AllocationDepartementale
        pour le département du gestionnaire, avec une enveloppe suffisante."""
        dept = gestionnaire.departement
        if not dept:
            raise CommandError(
                f"Le gestionnaire {gestionnaire.email} n'a pas de département assigné. "
                "Assignez un département avant de lancer ce seed."
            )

        # 300M FCFA — large marge au-dessus des ~152M nécessaires pour les 5 budgets
        MONTANT = Decimal('300000000')

        # BudgetAnnuel 2026
        ba = BudgetAnnuel.objects.filter(annee=2026).first()
        if ba is None:
            ba = BudgetAnnuel.objects.create(
                annee=2026,
                annee_fin=2026,
                montant_global=MONTANT,
                description="Budget annuel Atlas Finance 2026",
            )
            self.stdout.write(f"  + BudgetAnnuel 2026 ({MONTANT:,.0f} FCFA)")
        elif ba.montant_global < MONTANT:
            ba.montant_global = MONTANT
            ba.save(update_fields=['montant_global'])
            self.stdout.write(f"  ~ BudgetAnnuel 2026 mis à jour ({MONTANT:,.0f} FCFA)")

        # AllocationDepartementale pour ce département
        alloc = AllocationDepartementale.objects.filter(
            budget_annuel=ba, departement=dept
        ).first()
        if alloc is None:
            alloc = AllocationDepartementale.objects.create(
                budget_annuel=ba,
                departement=dept,
                montant_alloue=MONTANT,
            )
            self.stdout.write(f"  + Allocation {dept.code} 2026 ({MONTANT:,.0f} FCFA)")
        elif alloc.montant_alloue < MONTANT:
            alloc.montant_alloue = MONTANT
            alloc.montant_disponible = MONTANT - alloc.montant_consomme
            alloc.save(update_fields=['montant_alloue', 'montant_disponible'])
            self.stdout.write(f"  ~ Allocation {dept.code} 2026 mise à jour ({MONTANT:,.0f} FCFA)")

        self.stdout.write(
            f"  Département : {dept.code} — {dept.nom} | "
            f"Allocation disponible : {alloc.montant_disponible:,.0f} FCFA"
        )
        return ba, alloc

    # ── Génération d'un PDF minimal valide ────────────────────────────────────

    @staticmethod
    def _ascii(s):
        """Supprime les accents pour les chaînes embarquées dans le PDF."""
        return unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode('ascii')

    def _generer_pdf_bytes(self, titre, fournisseur, montant, reference, date_str):
        """Génère un PDF d'une page valide et lisible (Helvetica, sans lib externe)."""

        def esc(s):
            s = self._ascii(s)
            return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

        sep = '-' * 65

        lignes_stream = [
            "BT",
            "/F1 14 Tf",
            "50 800 Td",
            f"({esc('ATLAS FINANCE')}) Tj",
            "0 -18 Td",
            "/F1 11 Tf",
            f"({esc('PIECE JUSTIFICATIVE / BON DE COMMANDE')}) Tj",
            "0 -8 Td",
            f"({esc(sep)}) Tj",
            "0 -22 Td",
            "/F1 10 Tf",
            f"({esc(f'Objet       : {titre}')}) Tj",
            "0 -18 Td",
            f"({esc(f'Fournisseur : {fournisseur}')}) Tj",
            "0 -18 Td",
            f"({esc(f'Montant     : {montant} FCFA')}) Tj",
            "0 -18 Td",
            f"({esc(f'Reference   : {reference}')}) Tj",
            "0 -18 Td",
            f"({esc(f'Date        : {date_str}')}) Tj",
            "0 -8 Td",
            f"({esc(sep)}) Tj",
            "0 -22 Td",
            "/F1 9 Tf",
            f"({esc('Ce document est genere automatiquement pour demonstration.')}) Tj",
            "0 -14 Td",
            f"({esc('Atlas Finance - Systeme de Gestion Budgetaire 2026.')}) Tj",
            "ET",
        ]
        stream = "\n".join(lignes_stream) + "\n"
        stream_b = stream.encode('latin-1', errors='replace')

        buf = io.BytesIO()

        def w(s):
            if isinstance(s, str):
                s = s.encode('latin-1', errors='replace')
            buf.write(s)

        offsets = []
        w("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")  # header + binary comment (marks as binary)

        offsets.append(buf.tell())
        w("1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n\n")

        offsets.append(buf.tell())
        w("2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n\n")

        offsets.append(buf.tell())
        w("3 0 obj\n"
          "<</Type /Page\n"
          "  /Parent 2 0 R\n"
          "  /MediaBox [0 0 595 842]\n"
          "  /Resources << /Font << /F1 4 0 R >> >>\n"
          "  /Contents 5 0 R\n"
          ">>\nendobj\n\n")

        offsets.append(buf.tell())
        w("4 0 obj\n"
          "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica\n"
          "  /Encoding /WinAnsiEncoding>>\nendobj\n\n")

        offsets.append(buf.tell())
        w(f"5 0 obj\n<</Length {len(stream_b)}>>\nstream\n")
        w(stream_b)
        w("\nendstream\nendobj\n\n")

        xref_pos = buf.tell()
        w("xref\n0 6\n")
        w("0000000000 65535 f \n")
        for off in offsets:
            w(f"{off:010d} 00000 n \n")
        w(f"trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n{xref_pos}\n%%EOF\n")

        return buf.getvalue()

    def _attacher_piece(self, depense, gestionnaire, nom_fichier, titre,
                        fournisseur, montant_str, reference, date_str, description=""):
        """Génère un PDF et crée la PieceJustificative liée à la dépense."""
        pdf_bytes = self._generer_pdf_bytes(titre, fournisseur, montant_str, reference, date_str)
        piece = PieceJustificative(
            depense=depense,
            nom_original=nom_fichier,
            taille=len(pdf_bytes),
            type_mime='application/pdf',
            description=description or titre,
            uploaded_by=gestionnaire,
        )
        piece.fichier.save(nom_fichier, ContentFile(pdf_bytes), save=True)
        return piece

    # ── Helper : création lignes budgétaires ──────────────────────────────────

    def _creer_lignes(self, budget, sous_categorie, specs):
        lignes = {}
        for libelle, unite, qte, pu in specs:
            l = LigneBudgetaire.objects.create(
                budget=budget,
                sous_categorie=sous_categorie,
                libelle=libelle,
                unite=unite,
                quantite=Decimal(str(qte)),
                prix_unitaire=Decimal(str(pu)),
                section='DEPENSE',
            )
            lignes[libelle] = l
        return lignes

    # ── Budget 1 : BROUILLON ──────────────────────────────────────────────────

    def _creer_budget_brouillon(self, gestionnaire, ba, alloc):
        nom = "Formation du Personnel et Développement des Compétences 2026"
        if Budget.objects.filter(nom=nom, gestionnaire=gestionnaire).exists():
            self.stdout.write(f"  (skip) {nom}")
            return

        b = Budget.objects.create(
            gestionnaire=gestionnaire,
            nom=nom,
            departement=gestionnaire.departement,
            budget_annuel=ba,
            allocation=alloc,
            technique_estimation="ASCENDANTE",
            statut=StatutBudget.BROUILLON,
            date_debut=datetime.date(2026, 1, 15),
            date_fin=datetime.date(2026, 12, 31),
        )

        cat_a = CategoriePrincipale.objects.create(
            budget=b, code='A', libelle='Formations et Perfectionnement'
        )
        sc_a1 = SousCategorie.objects.create(
            categorie=cat_a, code='A.1', libelle='Ateliers et formations internes'
        )
        sc_a2 = SousCategorie.objects.create(
            categorie=cat_a, code='A.2', libelle='Certifications et e-learning'
        )

        cat_b = CategoriePrincipale.objects.create(
            budget=b, code='B', libelle='Matériel et Équipements Pédagogiques'
        )
        sc_b1 = SousCategorie.objects.create(
            categorie=cat_b, code='B.1', libelle='Supports et documentation'
        )
        sc_b2 = SousCategorie.objects.create(
            categorie=cat_b, code='B.2', libelle='Équipements salle de formation'
        )

        self._creer_lignes(b, sc_a1, [
            ("Formation gestion de projet Agile / Scrum",          "personne", 20,   85_000),
            ("Atelier communication et leadership",                 "personne", 30,   55_000),
            ("Formation outils collaboratifs Microsoft 365",        "personne", 15,  120_000),
        ])
        self._creer_lignes(b, sc_a2, [
            ("Abonnement e-learning Coursera Business (1 an)",      "forfait",  1, 2_400_000),
            ("Certifications PMP — chefs de projet",               "personne",  3,   800_000),
            ("Certification PRINCE2 Foundation",                   "personne",  2,   650_000),
        ])
        self._creer_lignes(b, sc_b1, [
            ("Manuels de formation et ouvrages métier",             "lot",      1,   650_000),
            ("Fournitures et consommables formation",               "forfait",  1,   350_000),
        ])
        self._creer_lignes(b, sc_b2, [
            ("Tableau blanc interactif 85 pouces",                  "unité",    1, 1_200_000),
            ("Sonorisation et microphones sans fil",                "forfait",  1,   800_000),
            ("Vidéoprojecteur 4K salle de formation",               "unité",    1,   950_000),
        ])

        self.stdout.write(
            f"  + {b.code} [BROUILLON] — {nom} "
            f"({b.montant_global:,.0f} FCFA, {b.lignes.count()} lignes)"
        )

    # ── Budget 2 : SOUMIS ─────────────────────────────────────────────────────

    def _creer_budget_soumis(self, gestionnaire, ba, alloc):
        nom = "Modernisation Équipements de Travail — Semestre 1 2026"
        if Budget.objects.filter(nom=nom, gestionnaire=gestionnaire).exists():
            self.stdout.write(f"  (skip) {nom}")
            return

        b = Budget.objects.create(
            gestionnaire=gestionnaire,
            nom=nom,
            departement=gestionnaire.departement,
            budget_annuel=ba,
            allocation=alloc,
            technique_estimation="ASCENDANTE",
            statut=StatutBudget.BROUILLON,
            date_debut=datetime.date(2026, 1, 20),
            date_fin=datetime.date(2026, 6, 30),
        )

        cat_a = CategoriePrincipale.objects.create(
            budget=b, code='A', libelle='Postes de Travail Informatiques'
        )
        sc_a1 = SousCategorie.objects.create(
            categorie=cat_a, code='A.1', libelle='Ordinateurs et moniteurs'
        )
        sc_a2 = SousCategorie.objects.create(
            categorie=cat_a, code='A.2', libelle='Accessoires et périphériques'
        )

        cat_b = CategoriePrincipale.objects.create(
            budget=b, code='B', libelle='Mobilier Ergonomique de Bureau'
        )
        sc_b1 = SousCategorie.objects.create(
            categorie=cat_b, code='B.1', libelle='Bureaux et sièges'
        )
        sc_b2 = SousCategorie.objects.create(
            categorie=cat_b, code='B.2', libelle='Rangement et aménagement'
        )

        self._creer_lignes(b, sc_a1, [
            ("Ordinateurs portables Dell Latitude 5540 (x12)",     "unité",  12,   920_000),
            ("Stations de travail HP Z4 G4 Workstation (x5)",      "unité",   5, 1_450_000),
            ("Moniteurs 27 pouces IPS 4K Dell U2722D (x20)",       "unité",  20,   195_000),
        ])
        self._creer_lignes(b, sc_a2, [
            ("Claviers et souris ergonomiques (lots x25)",          "lot",    25,    35_000),
            ("Webcams HD 1080p et casques USB (x15)",               "unité",  15,    75_000),
            ("Disques durs externes 2 To (x10)",                    "unité",  10,    85_000),
        ])
        self._creer_lignes(b, sc_b1, [
            ("Bureaux à hauteur variable électrique (x10)",         "unité",  10,   380_000),
            ("Chaises ergonomiques certifiées (x15)",               "unité",  15,   245_000),
        ])
        self._creer_lignes(b, sc_b2, [
            ("Caissons de rangement roulants (x10)",                "unité",  10,   120_000),
            ("Cloisons acoustiques modulaires (x5)",                "unité",   5,   280_000),
        ])

        b.soumettre_budget()

        self.stdout.write(
            f"  + {b.code} [SOUMIS]    — {nom} "
            f"({b.montant_global:,.0f} FCFA, {b.lignes.count()} lignes)"
        )

    # ── Budget 3 : APPROUVÉ (avec dépenses) ──────────────────────────────────

    def _creer_budget_approuve(self, gestionnaire, comptable, ba, alloc):
        nom = "Maintenance Infrastructure Informatique et Licences 2026"
        if Budget.objects.filter(nom=nom, gestionnaire=gestionnaire).exists():
            self.stdout.write(f"  (skip) {nom}")
            return

        b = Budget.objects.create(
            gestionnaire=gestionnaire,
            nom=nom,
            departement=gestionnaire.departement,
            budget_annuel=ba,
            allocation=alloc,
            technique_estimation="ASCENDANTE",
            statut=StatutBudget.BROUILLON,
            date_debut=datetime.date(2026, 1, 5),
            date_fin=datetime.date(2026, 12, 31),
        )

        cat_a = CategoriePrincipale.objects.create(
            budget=b, code='A', libelle='Maintenance Infrastructure Matérielle'
        )
        sc_a1 = SousCategorie.objects.create(
            categorie=cat_a, code='A.1', libelle='Serveurs et réseau'
        )
        sc_a2 = SousCategorie.objects.create(
            categorie=cat_a, code='A.2', libelle='Sécurité et sauvegarde'
        )

        cat_b = CategoriePrincipale.objects.create(
            budget=b, code='B', libelle='Licences Logicielles et Support'
        )
        sc_b1 = SousCategorie.objects.create(
            categorie=cat_b, code='B.1', libelle='Licences Microsoft'
        )
        sc_b2 = SousCategorie.objects.create(
            categorie=cat_b, code='B.2', libelle='Support et assistance'
        )

        ll = {}
        ll.update(self._creer_lignes(b, sc_a1, [
            ("Contrat maintenance préventive serveurs (annuel)",        "forfait",  1, 4_500_000),
            ("Remplacement switches réseau obsolètes (x4)",             "unité",    4,   850_000),
            ("Câblage réseau et connectique (lot)",                     "lot",      1, 1_200_000),
        ]))
        ll.update(self._creer_lignes(b, sc_a2, [
            ("Solution sauvegarde cloud — abonnement annuel 5 To",     "an",       1, 2_800_000),
            ("Renouvellement licences antivirus entreprise (50 postes)","licence", 50,    48_000),
            ("Pare-feu nouvelle génération Fortinet FortiGate",         "unité",    1, 6_500_000),
        ]))
        ll.update(self._creer_lignes(b, sc_b1, [
            ("Microsoft 365 Business Standard — 40 licences/an",       "licence", 40,    95_000),
            ("Windows 11 Pro — licences upgrade (x20)",                "licence", 20,   185_000),
        ]))
        ll.update(self._creer_lignes(b, sc_b2, [
            ("Contrat support externalisé helpdesk 8h–18h (12 mois)",  "mois",    12,   850_000),
            ("Formation techniciens IT niveau 2 (x4 techniciens)",     "personne", 4,   450_000),
        ]))

        b.soumettre_budget()
        b.approuver_budget(comptable)

        # ── Dépense 1 : VALIDÉE — Maintenance + Switches + Antivirus
        d1 = Depense.objects.create(
            budget=b,
            fournisseur="SYSTÈMES INFO AFRIQUE SARL",
            note="BC N°2026-INFO-001 — Maintenance préventive et équipements réseau",
            enregistre_par=gestionnaire,
            statut=StatutDepense.SAISIE,
        )
        for libelle, montant in [
            ("Contrat maintenance préventive serveurs (annuel)",        Decimal("4500000")),
            ("Remplacement switches réseau obsolètes (x4)",             Decimal("3400000")),
            ("Renouvellement licences antivirus entreprise (50 postes)",Decimal("2400000")),
        ]:
            ligne = ll.get(libelle)
            if ligne and montant <= ligne.montant_disponible:
                ligne.enregistrer_consommation(
                    montant=montant, note=libelle,
                    enregistre_par=gestionnaire,
                    depense_parent=d1, fournisseur=d1.fournisseur,
                )
        d1.recalculer_total()
        today = datetime.date.today().strftime('%d/%m/%Y')
        self._attacher_piece(
            d1, gestionnaire,
            nom_fichier="facture_maintenance_reseau_2026.pdf",
            titre="Maintenance serveurs et switches réseau",
            fournisseur=d1.fournisseur,
            montant_str=f"{float(d1.montant_total):,.0f}",
            reference=d1.reference,
            date_str=today,
            description="Facture SYSTÈMES INFO AFRIQUE — maintenance préventive & équipements",
        )
        d1.valider(comptable)

        # ── Dépense 2 : VALIDÉE — Pare-feu + Sauvegarde cloud
        d2 = Depense.objects.create(
            budget=b,
            fournisseur="CYBERSEC TECHNOLOGIES CÔTE D'IVOIRE",
            note="BC N°2026-INFO-002 — Sécurité réseau et continuité d'activité",
            enregistre_par=gestionnaire,
            statut=StatutDepense.SAISIE,
        )
        for libelle, montant in [
            ("Pare-feu nouvelle génération Fortinet FortiGate",        Decimal("6500000")),
            ("Solution sauvegarde cloud — abonnement annuel 5 To",     Decimal("2800000")),
        ]:
            ligne = ll.get(libelle)
            if ligne and montant <= ligne.montant_disponible:
                ligne.enregistrer_consommation(
                    montant=montant, note=libelle,
                    enregistre_par=gestionnaire,
                    depense_parent=d2, fournisseur=d2.fournisseur,
                )
        d2.recalculer_total()
        self._attacher_piece(
            d2, gestionnaire,
            nom_fichier="facture_securite_reseau_2026.pdf",
            titre="Pare-feu FortiGate et sauvegarde cloud",
            fournisseur=d2.fournisseur,
            montant_str=f"{float(d2.montant_total):,.0f}",
            reference=d2.reference,
            date_str=today,
            description="Facture CYBERSEC TECHNOLOGIES — pare-feu et plan de continuité",
        )
        d2.valider(comptable)

        # ── Dépense 3 : EN ATTENTE (SAISIE) — Licences Microsoft
        d3 = Depense.objects.create(
            budget=b,
            fournisseur="MICROSOFT AFRIQUE DISTRIBUTION",
            note="BC N°2026-INFO-003 — Renouvellement licences Microsoft 365 et Windows 11",
            enregistre_par=gestionnaire,
            statut=StatutDepense.SAISIE,
        )
        for libelle, montant in [
            ("Microsoft 365 Business Standard — 40 licences/an",       Decimal("3800000")),
            ("Windows 11 Pro — licences upgrade (x20)",                Decimal("3700000")),
        ]:
            ligne = ll.get(libelle)
            if ligne and montant <= ligne.montant_disponible:
                ligne.enregistrer_consommation(
                    montant=montant, note=libelle,
                    enregistre_par=gestionnaire,
                    depense_parent=d3, fournisseur=d3.fournisseur,
                )
        d3.recalculer_total()
        self._attacher_piece(
            d3, gestionnaire,
            nom_fichier="devis_licences_microsoft_2026.pdf",
            titre="Licences Microsoft 365 et Windows 11 Pro",
            fournisseur=d3.fournisseur,
            montant_str=f"{float(d3.montant_total):,.0f}",
            reference=d3.reference,
            date_str=today,
            description="Devis MICROSOFT AFRIQUE — renouvellement licences (en attente validation)",
        )
        # d3 reste SAISIE — en attente de validation comptable

        b.refresh_from_db()
        self.stdout.write(
            f"  + {b.code} [APPROUVE] — {nom} "
            f"({b.montant_global:,.0f} FCFA | consommé {b.montant_consomme:,.0f} FCFA "
            f"| 3 dépenses dont 2 validées, 1 en attente)"
        )

    # ── Budget 4 : REJETÉ ─────────────────────────────────────────────────────

    def _creer_budget_rejete(self, gestionnaire, comptable, ba, alloc):
        nom = "Rénovation et Climatisation des Locaux Administratifs"
        if Budget.objects.filter(nom=nom, gestionnaire=gestionnaire).exists():
            self.stdout.write(f"  (skip) {nom}")
            return

        b = Budget.objects.create(
            gestionnaire=gestionnaire,
            nom=nom,
            departement=gestionnaire.departement,
            budget_annuel=ba,
            allocation=alloc,
            technique_estimation="ASCENDANTE",
            statut=StatutBudget.BROUILLON,
            date_debut=datetime.date(2026, 2, 1),
            date_fin=datetime.date(2026, 9, 30),
        )

        cat_a = CategoriePrincipale.objects.create(
            budget=b, code='A', libelle='Travaux de Rénovation'
        )
        sc_a1 = SousCategorie.objects.create(
            categorie=cat_a, code='A.1', libelle='Peinture et revêtements'
        )
        sc_a2 = SousCategorie.objects.create(
            categorie=cat_a, code='A.2', libelle='Climatisation et électricité'
        )

        cat_b = CategoriePrincipale.objects.create(
            budget=b, code='B', libelle='Mobilier et Signalétique'
        )
        sc_b1 = SousCategorie.objects.create(
            categorie=cat_b, code='B.1', libelle='Mobilier de bureau'
        )
        sc_b2 = SousCategorie.objects.create(
            categorie=cat_b, code='B.2', libelle='Signalétique et décoration'
        )

        self._creer_lignes(b, sc_a1, [
            ("Peinture intérieure bâtiment principal (1 200 m²)",   "m²",      1200,   4_500),
            ("Revêtement sol vinyle antidérapant (600 m²)",         "m²",       600,   8_500),
            ("Faux plafond dalle suspendue (400 m²)",               "m²",       400,   7_200),
        ])
        self._creer_lignes(b, sc_a2, [
            ("Climatiseurs split 1,5 CV Daikin (x12)",              "unité",     12, 650_000),
            ("Mise aux normes installation électrique générale",     "forfait",    1, 4_200_000),
        ])
        self._creer_lignes(b, sc_b1, [
            ("Remplacement bureaux vétustes (x20)",                 "unité",     20, 320_000),
            ("Armoires classeurs métalliques (x15)",                "unité",     15, 185_000),
        ])
        self._creer_lignes(b, sc_b2, [
            ("Signalétique intérieure et plaques de bureau",        "lot",        1, 1_200_000),
            ("Plantes décoratives espace d'accueil",                "lot",        1,   450_000),
        ])

        b.soumettre_budget()
        b.rejeter_budget(
            comptable,
            motif=(
                "Montant total (35 205 000 FCFA) dépasse le plafond disponible de l'enveloppe "
                "départementale 2026. Réviser les postes Climatisation et Peinture à la baisse. "
                "Joindre obligatoirement 3 devis comparatifs certifiés avant toute resoumission."
            ),
        )

        self.stdout.write(
            f"  + {b.code} [REJETE]   — {nom} "
            f"({b.montant_global:,.0f} FCFA, motif rejet renseigné)"
        )

    # ── Budget 5 : CLÔTURÉ (avec dépenses totalement consommées) ─────────────

    def _creer_budget_cloture(self, gestionnaire, comptable, ba, alloc):
        nom = "Acquisition et Déploiement Postes de Travail — T4 2025"
        if Budget.objects.filter(nom=nom, gestionnaire=gestionnaire).exists():
            self.stdout.write(f"  (skip) {nom}")
            return

        b = Budget.objects.create(
            gestionnaire=gestionnaire,
            nom=nom,
            departement=gestionnaire.departement,
            budget_annuel=ba,
            allocation=alloc,
            technique_estimation="ASCENDANTE",
            statut=StatutBudget.BROUILLON,
            date_debut=datetime.date(2025, 10, 1),
            date_fin=datetime.date(2025, 12, 31),
        )

        cat_a = CategoriePrincipale.objects.create(
            budget=b, code='A', libelle='Matériel Informatique'
        )
        sc_a1 = SousCategorie.objects.create(
            categorie=cat_a, code='A.1', libelle='Ordinateurs et moniteurs'
        )
        sc_a2 = SousCategorie.objects.create(
            categorie=cat_a, code='A.2', libelle='Imprimantes et périphériques'
        )

        cat_b = CategoriePrincipale.objects.create(
            budget=b, code='B', libelle='Services de Déploiement et Support'
        )
        sc_b1 = SousCategorie.objects.create(
            categorie=cat_b, code='B.1', libelle='Installation et configuration'
        )
        sc_b2 = SousCategorie.objects.create(
            categorie=cat_b, code='B.2', libelle='Garantie et formation utilisateurs'
        )

        ll = {}
        ll.update(self._creer_lignes(b, sc_a1, [
            ("Ordinateurs portables HP EliteBook 840 G10 (x10)",    "unité",  10,  850_000),
            ("Stations de travail Dell OptiPlex 7010 SFF (x5)",     "unité",   5,  950_000),
            ("Moniteurs Dell 24 pouces FHD (x15)",                  "unité",  15,  195_000),
        ]))
        ll.update(self._creer_lignes(b, sc_a2, [
            ("Imprimantes multifonctions laser couleur (x3)",       "unité",   3,  750_000),
            ("Scanners documentaires A4 (x2)",                      "unité",   2,  480_000),
            ("Accessoires : câbles, souris, claviers (lots)",       "lot",     1,  850_000),
        ]))
        ll.update(self._creer_lignes(b, sc_b1, [
            ("Installation et configuration OS + logiciels (x15)", "poste",  15,   85_000),
            ("Migration données utilisateurs (x15)",               "migration",15,  65_000),
        ]))
        ll.update(self._creer_lignes(b, sc_b2, [
            ("Garantie étendue 3 ans constructeur (x15 postes)",   "poste",  15,  120_000),
            ("Formation utilisateurs nouveaux équipements (x15)",  "personne",15,   45_000),
        ]))

        b.soumettre_budget()
        b.approuver_budget(comptable)

        # ── Dépense 1 : VALIDÉE — Ordinateurs et stations de travail
        d1 = Depense.objects.create(
            budget=b,
            fournisseur="INFORMATIQUE SERVICES AFRIQUE (ISA)",
            note="BC N°2025-087 — Ordinateurs portables HP et stations de travail Dell",
            enregistre_par=gestionnaire,
            statut=StatutDepense.SAISIE,
        )
        for libelle, montant in [
            ("Ordinateurs portables HP EliteBook 840 G10 (x10)",   Decimal("8500000")),
            ("Stations de travail Dell OptiPlex 7010 SFF (x5)",    Decimal("4750000")),
        ]:
            ligne = ll.get(libelle)
            if ligne and montant <= ligne.montant_disponible:
                ligne.enregistrer_consommation(
                    montant=montant, note=libelle,
                    enregistre_par=gestionnaire,
                    depense_parent=d1, fournisseur=d1.fournisseur,
                )
        d1.recalculer_total()
        today = datetime.date.today().strftime('%d/%m/%Y')
        self._attacher_piece(
            d1, gestionnaire,
            nom_fichier="facture_ordinateurs_HP_Dell_T4_2025.pdf",
            titre="Ordinateurs HP EliteBook et stations Dell OptiPlex",
            fournisseur=d1.fournisseur,
            montant_str=f"{float(d1.montant_total):,.0f}",
            reference=d1.reference,
            date_str="15/11/2025",
            description="Facture N°ISA-2025-087 — livraison et installation postes informatiques",
        )
        d1.valider(comptable)

        # ── Dépense 2 : VALIDÉE — Moniteurs, imprimantes, accessoires
        d2 = Depense.objects.create(
            budget=b,
            fournisseur="INFORMATIQUE SERVICES AFRIQUE (ISA)",
            note="BC N°2025-088 — Moniteurs, imprimantes et accessoires",
            enregistre_par=gestionnaire,
            statut=StatutDepense.SAISIE,
        )
        for libelle, montant in [
            ("Moniteurs Dell 24 pouces FHD (x15)",                 Decimal("2925000")),
            ("Imprimantes multifonctions laser couleur (x3)",      Decimal("2250000")),
            ("Accessoires : câbles, souris, claviers (lots)",      Decimal("850000")),
        ]:
            ligne = ll.get(libelle)
            if ligne and montant <= ligne.montant_disponible:
                ligne.enregistrer_consommation(
                    montant=montant, note=libelle,
                    enregistre_par=gestionnaire,
                    depense_parent=d2, fournisseur=d2.fournisseur,
                )
        d2.recalculer_total()
        self._attacher_piece(
            d2, gestionnaire,
            nom_fichier="facture_moniteurs_imprimantes_T4_2025.pdf",
            titre="Moniteurs Dell, imprimantes laser et accessoires",
            fournisseur=d2.fournisseur,
            montant_str=f"{float(d2.montant_total):,.0f}",
            reference=d2.reference,
            date_str="22/11/2025",
            description="Facture N°ISA-2025-088 — écrans, imprimantes et périphériques",
        )
        d2.valider(comptable)

        # ── Dépense 3 : VALIDÉE — Scanners + services déploiement + garantie + formation
        d3 = Depense.objects.create(
            budget=b,
            fournisseur="TECHNO DEPLOY CÔTE D'IVOIRE SARL",
            note="BC N°2025-089 — Scanners, déploiement, garanties et formation",
            enregistre_par=gestionnaire,
            statut=StatutDepense.SAISIE,
        )
        for libelle, montant in [
            ("Scanners documentaires A4 (x2)",                     Decimal("960000")),
            ("Installation et configuration OS + logiciels (x15)", Decimal("1275000")),
            ("Migration données utilisateurs (x15)",               Decimal("975000")),
            ("Garantie étendue 3 ans constructeur (x15 postes)",   Decimal("1800000")),
            ("Formation utilisateurs nouveaux équipements (x15)",  Decimal("675000")),
        ]:
            ligne = ll.get(libelle)
            if ligne and montant <= ligne.montant_disponible:
                ligne.enregistrer_consommation(
                    montant=montant, note=libelle,
                    enregistre_par=gestionnaire,
                    depense_parent=d3, fournisseur=d3.fournisseur,
                )
        d3.recalculer_total()
        # 2 pièces pour cette dépense : bon de livraison + procès-verbal de formation
        self._attacher_piece(
            d3, gestionnaire,
            nom_fichier="facture_deploiement_formation_T4_2025.pdf",
            titre="Services déploiement, garantie et formation utilisateurs",
            fournisseur=d3.fournisseur,
            montant_str=f"{float(d3.montant_total):,.0f}",
            reference=d3.reference,
            date_str="05/12/2025",
            description="Facture N°TDC-2025-089 — installation, migration et formation",
        )
        self._attacher_piece(
            d3, gestionnaire,
            nom_fichier="PV_reception_formation_T4_2025.pdf",
            titre="Procès-verbal de réception et attestation formation",
            fournisseur=d3.fournisseur,
            montant_str=f"{float(d3.montant_total):,.0f}",
            reference=d3.reference,
            date_str="12/12/2025",
            description="PV de réception des équipements et attestation formation (15 agents)",
        )
        d3.valider(comptable)

        # Clôturer le budget (budget exécuté à 100%)
        b.cloturer_budget()
        b.refresh_from_db()

        self.stdout.write(
            f"  + {b.code} [CLOTURE]  — {nom} "
            f"({b.montant_global:,.0f} FCFA | consommé {b.montant_consomme:,.0f} FCFA "
            f"| 3 dépenses — toutes validées)"
        )
