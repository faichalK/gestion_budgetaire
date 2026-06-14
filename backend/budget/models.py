import datetime
import uuid
from decimal import Decimal
from django.db import IntegrityError, models, transaction
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from accounts.models import Utilisateur, Departement


# ── Technique d'estimation ────────────────────────────────────────────────────

class TechniqueEstimation(models.TextChoices):
    ANALOGIE     = 'ANALOGIE',     'Analogie'
    TROIS_POINTS = 'TROIS_POINTS', '3 Points (PERT)'
    ASCENDANTE   = 'ASCENDANTE',   'Ascendante'


# ── Budget annuel global (Étape 1 — Estimation, établi par l'admin) ───────────

class BudgetAnnuel(models.Model):
    """
    Budget annuel global défini par l'administrateur.
    Il se divise en allocations départementales.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    annee          = models.IntegerField(verbose_name="Année de début")
    annee_fin      = models.IntegerField(null=True, blank=True, verbose_name="Année de fin")
    montant_global = models.DecimalField(
                         max_digits=18, decimal_places=2,
                         validators=[MinValueValidator(0)],
                         verbose_name="Budget global"
                     )
    description    = models.TextField(blank=True, verbose_name="Description / note")
    date_creation  = models.DateTimeField(auto_now_add=True)
    est_cloture    = models.BooleanField(default=False, verbose_name="Exercice clôturé")
    date_cloture   = models.DateTimeField(null=True, blank=True, verbose_name="Date de clôture de l'exercice")

    class Meta:
        db_table            = 'budget_annuel'
        verbose_name        = 'Budget annuel'
        verbose_name_plural = 'Budgets annuels'
        ordering            = ['-annee']

    def __str__(self):
        if self.annee_fin and self.annee_fin != self.annee:
            return f"Budget {self.annee}-{self.annee_fin}"
        return f"Budget {self.annee}"

    @property
    def periode_display(self):
        if self.annee_fin and self.annee_fin != self.annee:
            return f"{self.annee}-{self.annee_fin}"
        return str(self.annee)

    @property
    def date_fin_exercice(self):
        """31 décembre de l'année de fin (ou de début si annee_fin non renseigné)."""
        fin = self.annee_fin if self.annee_fin else self.annee
        return f"{fin}-12-31"

    @property
    def montant_alloue_depts(self):
        from django.db.models import Sum
        return self.allocations.aggregate(s=Sum('montant_alloue'))['s'] or Decimal('0')

    @property
    def montant_consomme_direct(self):
        """Total montant_global des budgets rattachés directement (sans allocation départementale)."""
        from django.db.models import Sum
        return self.budgets.filter(allocation__isnull=True).aggregate(s=Sum('montant_global'))['s'] or Decimal('0')

    @property
    def montant_disponible_global(self):
        return self.montant_global - self.montant_alloue_depts - self.montant_consomme_direct


# ── Allocation départementale ─────────────────────────────────────────────────

class AllocationDepartementale(models.Model):
    """
    Part du budget annuel allouée à un département.
    Créée et gérée par l'administrateur.
    """
    id                 = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget_annuel      = models.ForeignKey(
                             BudgetAnnuel,
                             on_delete=models.CASCADE,
                             related_name='allocations',
                             verbose_name="Budget annuel"
                         )
    departement        = models.ForeignKey(
                             Departement,
                             on_delete=models.PROTECT,
                             related_name='allocations',
                             verbose_name="Département"
                         )
    montant_alloue     = models.DecimalField(
                             max_digits=18, decimal_places=2,
                             validators=[MinValueValidator(0)],
                             verbose_name="Montant alloué"
                         )
    montant_consomme   = models.DecimalField(
                             max_digits=18, decimal_places=2,
                             default=0,
                             verbose_name="Montant consommé"
                         )
    montant_disponible = models.DecimalField(
                             max_digits=18, decimal_places=2,
                             default=0,
                             verbose_name="Montant disponible"
                         )
    date_creation      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table            = 'allocation_departementale'
        verbose_name        = 'Allocation départementale'
        verbose_name_plural = 'Allocations départementales'
        unique_together     = ('budget_annuel', 'departement')
        ordering            = ['budget_annuel', 'departement__nom']

    def __str__(self):
        return f"Allocation {self.departement} – {self.budget_annuel.annee}"

    def clean(self):
        from django.core.exceptions import ValidationError
        from django.db.models import Sum
        total_existant = (
            AllocationDepartementale.objects
            .filter(budget_annuel=self.budget_annuel)
            .exclude(pk=self.pk)
            .aggregate(s=Sum('montant_alloue'))['s'] or 0
        )
        if total_existant + self.montant_alloue > self.budget_annuel.montant_global:
            disponible = self.budget_annuel.montant_global - total_existant
            raise ValidationError(
                f"Montant dépasse le budget disponible : {disponible:,.0f} FCFA "
                f"(global : {self.budget_annuel.montant_global:,.0f} FCFA, "
                f"déjà alloué : {total_existant:,.0f} FCFA)."
            )

    def save(self, *args, **kwargs):
        # Valider le budget global sauf lors d'une mise à jour partielle (ex: recalcul consommation)
        if not kwargs.get('update_fields'):
            self.full_clean()
        self.montant_disponible = self.montant_alloue - self.montant_consomme
        super().save(*args, **kwargs)

    def verifier_disponibilite(self):
        return self.montant_disponible > 0

    def recalculer_consommation(self):
        from django.db.models import Sum
        total = self.budgets.aggregate(s=Sum('montant_global'))['s'] or Decimal('0')
        self.montant_consomme = total
        self.montant_disponible = self.montant_alloue - self.montant_consomme
        self.save(update_fields=['montant_consomme', 'montant_disponible'])


# ── Budget ────────────────────────────────────────────────────────────────────

class StatutBudget(models.TextChoices):
    BROUILLON = 'BROUILLON', 'Brouillon'
    SOUMIS    = 'SOUMIS',    'Soumis'
    APPROUVE  = 'APPROUVE',  'Approuvé'
    REJETE    = 'REJETE',    'Rejeté'
    CLOTURE   = 'CLOTURE',   'Clôturé'
    ARCHIVE   = 'ARCHIVE',   'Archivé'

TRANSITIONS_BUDGET = {
    StatutBudget.BROUILLON: [StatutBudget.SOUMIS],
    StatutBudget.SOUMIS:    [StatutBudget.APPROUVE, StatutBudget.REJETE],
    StatutBudget.APPROUVE:  [StatutBudget.CLOTURE],
    StatutBudget.REJETE:    [StatutBudget.SOUMIS],
    StatutBudget.CLOTURE:   [StatutBudget.ARCHIVE],
    StatutBudget.ARCHIVE:   [],
}

class NiveauAlerte(models.TextChoices):
    NORMAL   = 'NORMAL',   'Normal'
    ORANGE   = 'ORANGE',   '🟠 Orange (≥75%)'
    ROUGE    = 'ROUGE',    '🔴 Rouge (≥90%)'
    CRITIQUE = 'CRITIQUE', '⚠️ Critique (≥100%)'


class Budget(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gestionnaire = models.ForeignKey(
                       Utilisateur,
                       on_delete=models.PROTECT,
                       related_name='budgets_crees',
                       verbose_name="Gestionnaire"
                   )
    comptable    = models.ForeignKey(
                       Utilisateur,
                       on_delete=models.SET_NULL,
                       null=True, blank=True,
                       related_name='budgets_valides',
                       verbose_name="Comptable"
                   )
    budget_annuel = models.ForeignKey(
                        BudgetAnnuel,
                        on_delete=models.PROTECT,
                        related_name='budgets',
                        null=True, blank=True,
                        verbose_name="Exercice budgétaire"
                    )
    allocation   = models.ForeignKey(
                       AllocationDepartementale,
                       on_delete=models.PROTECT,
                       related_name='budgets',
                       null=True, blank=True,
                       verbose_name="Allocation départementale"
                   )
    departement  = models.ForeignKey(
                       Departement,
                       on_delete=models.PROTECT,
                       related_name='budgets',
                       null=True, blank=True,
                       verbose_name="Département"
                   )
    code         = models.CharField(max_length=50, unique=True, verbose_name="Code")
    nom          = models.CharField(max_length=200, verbose_name="Nom")
    technique_estimation = models.CharField(
                               max_length=20,
                               choices=TechniqueEstimation.choices,
                               default=TechniqueEstimation.ASCENDANTE,
                               verbose_name="Technique d'estimation"
                           )
    montant_global     = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name="Montant global")
    montant_consomme   = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name="Montant consommé")
    montant_disponible = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name="Montant disponible")
    statut             = models.CharField(
                             max_length=10,
                             choices=StatutBudget.choices,
                             default=StatutBudget.BROUILLON,
                             verbose_name="Statut"
                         )
    piece_justificative = models.FileField(
                              upload_to='budgets/pj/%Y/%m/',
                              null=True, blank=True,
                              verbose_name="Pièce justificative de soumission"
                          )
    motif_rejet     = models.CharField(max_length=500, blank=True, default='', verbose_name="Motif de rejet")
    date_debut      = models.DateField(verbose_name="Date début")
    date_fin        = models.DateField(verbose_name="Date fin")
    date_creation   = models.DateTimeField(auto_now_add=True)
    date_soumission = models.DateTimeField(null=True, blank=True)
    date_cloture    = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table            = 'budget'
        verbose_name        = 'Budget'
        verbose_name_plural = 'Budgets'
        ordering            = ['-date_creation']
        indexes = [
            models.Index(fields=['statut'],     name='budget_statut_ea2d92_idx'),
            models.Index(fields=['departement'], name='budget_departe_91c8d7_idx'),
        ]

    def __str__(self):
        return f"{self.code} – {self.nom}"

    def save(self, *args, **kwargs):
        if not self.code:
            annee  = datetime.date.today().year
            prefix = f'BDG-{annee}-'
            # Extraire le numéro max déjà utilisé pour éviter les doublons si des budgets ont été supprimés
            existing = (
                Budget.objects
                .filter(code__startswith=prefix)
                .values_list('code', flat=True)
            )
            max_seq = 0
            for code in existing:
                try:
                    max_seq = max(max_seq, int(code[len(prefix):]))
                except (ValueError, IndexError):
                    pass
            # Boucle de sécurité anti-collision en cas de création concurrente
            seq = max_seq + 1
            candidate = f'{prefix}{seq:03d}'
            while Budget.objects.filter(code=candidate).exists():
                seq += 1
                candidate = f'{prefix}{seq:03d}'
            self.code = candidate
        super().save(*args, **kwargs)

    def recalculer_montants(self):
        from django.db.models import Sum
        agg = self.lignes.aggregate(
            total_alloue=Sum('montant_alloue'),
            total_consomme=Sum('montant_consomme'),
        )
        self.montant_global     = agg['total_alloue']   or 0
        self.montant_consomme   = agg['total_consomme'] or 0
        self.montant_disponible = self.montant_global - self.montant_consomme
        self.save(update_fields=['montant_global', 'montant_consomme', 'montant_disponible'])
        if self.allocation_id:
            self.allocation.recalculer_consommation()

    def calculer_taux_consommation(self):
        if self.montant_global:
            return round(float(self.montant_consomme) / float(self.montant_global) * 100, 2)
        return 0

    def verifier_seuil_alerte(self):
        taux = self.calculer_taux_consommation()
        if taux >= 100: return NiveauAlerte.CRITIQUE
        if taux >= 90:  return NiveauAlerte.ROUGE
        if taux >= 75:  return NiveauAlerte.ORANGE
        return NiveauAlerte.NORMAL

    @property
    def niveau_alerte(self):
        return self.verifier_seuil_alerte()

    def _changer_statut(self, nouveau_statut):
        if nouveau_statut not in TRANSITIONS_BUDGET.get(self.statut, []):
            raise ValidationError(f"Transition {self.statut} → {nouveau_statut} non autorisée.")
        self.statut = nouveau_statut

    def soumettre_budget(self):
        from django.utils import timezone
        if not self.lignes.exists():
            raise ValidationError("Impossible de soumettre : ajoutez au moins une ligne budgétaire avant de soumettre.")
        self._changer_statut(StatutBudget.SOUMIS)
        self.date_soumission = timezone.now()
        self.save(update_fields=['statut', 'date_soumission'])

    def approuver_budget(self, comptable):
        self._changer_statut(StatutBudget.APPROUVE)
        self.comptable = comptable
        self.save(update_fields=['statut', 'comptable'])

    def rejeter_budget(self, comptable, motif=''):
        self._changer_statut(StatutBudget.REJETE)
        self.comptable   = comptable
        self.motif_rejet = motif
        self.save(update_fields=['statut', 'comptable', 'motif_rejet'])

    def cloturer_budget(self):
        from django.utils import timezone
        self._changer_statut(StatutBudget.CLOTURE)
        self.date_cloture = timezone.now()
        self.save(update_fields=['statut', 'date_cloture'])

    def archiver_budget(self):
        self._changer_statut(StatutBudget.ARCHIVE)
        self.save(update_fields=['statut'])


# ── Catégorie principale (Niveau 1) ───────────────────────────────────────────

class CategoriePrincipale(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget    = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='categories', verbose_name="Budget")
    code      = models.CharField(max_length=5, verbose_name="Code (A, B, C...)")
    libelle   = models.CharField(max_length=200, verbose_name="Libellé")
    ordre     = models.PositiveIntegerField(default=0, verbose_name="Ordre")

    class Meta:
        db_table        = 'categorie_principale'
        verbose_name    = 'Catégorie principale'
        verbose_name_plural = 'Catégories principales'
        unique_together = [('budget', 'code')]
        ordering        = ['ordre', 'code']

    def __str__(self):
        return f"{self.code} – {self.libelle}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generer_code()
        if not self.ordre:
            self.ordre = CategoriePrincipale.objects.filter(budget=self.budget).count() + 1
        super().save(*args, **kwargs)

    def _generer_code(self):
        import string
        existants = list(CategoriePrincipale.objects.filter(budget=self.budget).values_list('code', flat=True))
        for lettre in string.ascii_uppercase:
            if lettre not in existants:
                return lettre
        raise ValidationError("Maximum 26 catégories atteint (A–Z).")

    @property
    def total(self):
        from django.db.models import Sum
        result = LigneBudgetaire.objects.filter(
            sous_categorie__categorie=self
        ).aggregate(s=Sum('montant_alloue'))['s']
        return result or Decimal('0')


# ── Sous-catégorie (Niveau 2) ─────────────────────────────────────────────────

class SousCategorie(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    categorie = models.ForeignKey(CategoriePrincipale, on_delete=models.CASCADE, related_name='sous_categories', verbose_name="Catégorie")
    code      = models.CharField(max_length=10, verbose_name="Code (A.1, A.2...)")
    libelle   = models.CharField(max_length=200, verbose_name="Libellé")
    ordre     = models.PositiveIntegerField(default=0, verbose_name="Ordre")

    class Meta:
        db_table        = 'sous_categorie'
        verbose_name    = 'Sous-catégorie'
        verbose_name_plural = 'Sous-catégories'
        unique_together = [('categorie', 'code')]
        ordering        = ['ordre', 'code']

    def __str__(self):
        return f"{self.code} – {self.libelle}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generer_code()
        if not self.ordre:
            self.ordre = SousCategorie.objects.filter(categorie=self.categorie).count() + 1
        super().save(*args, **kwargs)

    def _generer_code(self):
        n = SousCategorie.objects.filter(categorie=self.categorie).count() + 1
        return f"{self.categorie.code}.{n}"

    @property
    def total(self):
        from django.db.models import Sum
        result = self.lignes.aggregate(s=Sum('montant_alloue'))['s']
        return result or Decimal('0')


# ── Ligne budgétaire ──────────────────────────────────────────────────────────

class SectionLigne(models.TextChoices):
    REVENU  = 'REVENU',  'Revenu'
    DEPENSE = 'DEPENSE', 'Dépense'
    BUDGET  = 'BUDGET',  'Budget'


class LigneBudgetaire(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget         = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='lignes', verbose_name="Budget")
    parent         = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sous_lignes', verbose_name="Ligne parente")
    sous_categorie = models.ForeignKey(
                         'SousCategorie',
                         on_delete=models.CASCADE,
                         related_name='lignes',
                         null=True, blank=True,
                         verbose_name="Sous-catégorie"
                     )
    code           = models.CharField(max_length=30, blank=True, verbose_name="Code")
    libelle        = models.CharField(max_length=200, verbose_name="Désignation")
    unite          = models.CharField(max_length=50, blank=True, verbose_name="Unité")
    section        = models.CharField(max_length=10, choices=SectionLigne.choices, default='BUDGET', verbose_name="Section")
    quantite       = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)], default=1, verbose_name="Quantité")
    prix_unitaire  = models.DecimalField(max_digits=18, decimal_places=2, validators=[MinValueValidator(0)], default=0, verbose_name="Prix unitaire")
    # Champs PERT (technique 3 points)
    cout_optimiste  = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name="Coût optimiste (Co)")
    cout_probable   = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name="Coût le plus probable (Cm)")
    cout_pessimiste = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name="Coût pessimiste (Cp)")
    montant_alloue     = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name="Montant alloué")
    montant_consomme   = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name="Montant consommé")
    montant_disponible = models.DecimalField(max_digits=18, decimal_places=2, default=0, verbose_name="Montant disponible")
    date_creation  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table            = 'ligne_budgetaire'
        verbose_name        = 'Ligne budgétaire'
        verbose_name_plural = 'Lignes budgétaires'
        ordering            = ['code', 'id']

    def __str__(self):
        return f"{self.code} – {self.libelle}" if self.code else self.libelle

    def save(self, *args, **kwargs):
        # Une ligne parente tire son montant de la somme de ses sous-lignes (après leur save)
        # Calcul standard / PERT pour les lignes sans sous-lignes
        if all(x is not None for x in [self.cout_optimiste, self.cout_probable, self.cout_pessimiste]):
            self.montant_alloue = (self.cout_optimiste + 4 * self.cout_probable + self.cout_pessimiste) / Decimal('6')
        else:
            self.montant_alloue = self.quantite * self.prix_unitaire
        self.montant_disponible = self.montant_alloue - self.montant_consomme

        # Vérifier que le total des lignes ne dépasse pas l'enveloppe disponible
        if self.budget_id:
            old_montant = Decimal('0')
            if self.pk:
                try:
                    old_montant = LigneBudgetaire.objects.get(pk=self.pk).montant_alloue
                except LigneBudgetaire.DoesNotExist:
                    pass
            delta = self.montant_alloue - old_montant

            if delta > 0 and self.budget.allocation_id:
                # Budget avec allocation départementale : vérifier contre l'allocation
                allocation = AllocationDepartementale.objects.select_related('departement').get(
                    pk=self.budget.allocation_id
                )
                if allocation.montant_consomme + delta > allocation.montant_alloue:
                    disponible = allocation.montant_alloue - allocation.montant_consomme + old_montant
                    raise ValidationError(
                        f"Ce montant dépasse l'enveloppe du département {allocation.departement} "
                        f"({allocation.montant_alloue:,.0f} FCFA alloués). "
                        f"Disponible restant : {max(disponible, Decimal('0')):,.0f} FCFA."
                    )

            elif delta > 0 and self.budget.budget_annuel_id and not self.budget.allocation_id:
                # Budget direct (sans allocation) : vérifier contre le disponible global de l'exercice
                ba = BudgetAnnuel.objects.get(pk=self.budget.budget_annuel_id)
                disponible_global = ba.montant_disponible_global
                if delta > disponible_global:
                    raise ValidationError(
                        f"Ce montant dépasse l'enveloppe globale disponible de l'exercice {ba.periode_display} "
                        f"({ba.montant_global:,.0f} FCFA au total). "
                        f"Disponible restant : {max(disponible_global, Decimal('0')):,.0f} FCFA."
                    )

        super().save(*args, **kwargs)
        # Propager le montant vers la ligne parente si elle existe
        if self.parent_id:
            from django.db.models import Sum
            parent = LigneBudgetaire.objects.get(pk=self.parent_id)
            total_enfants = parent.sous_lignes.aggregate(s=Sum('montant_alloue'))['s'] or Decimal('0')
            parent.montant_alloue    = total_enfants
            parent.montant_disponible = parent.montant_alloue - parent.montant_consomme
            LigneBudgetaire.objects.filter(pk=parent.pk).update(
                montant_alloue=parent.montant_alloue,
                montant_disponible=parent.montant_disponible,
            )
        self.budget.recalculer_montants()

    def delete(self, *args, **kwargs):
        budget = self.budget
        parent_id = self.parent_id
        super().delete(*args, **kwargs)
        # Recalculer la ligne parente après suppression d'un enfant
        if parent_id:
            from django.db.models import Sum
            parent = LigneBudgetaire.objects.get(pk=parent_id)
            total_enfants = parent.sous_lignes.aggregate(s=Sum('montant_alloue'))['s'] or Decimal('0')
            LigneBudgetaire.objects.filter(pk=parent_id).update(
                montant_alloue=total_enfants,
                montant_disponible=total_enfants - parent.montant_consomme,
            )
        budget.recalculer_montants()

    def effectuer_virement(self, ligne_dest, montant, motif=''):
        from django.db import transaction
        from decimal import Decimal as _D
        if self.budget_id != ligne_dest.budget_id:
            raise ValidationError("Les deux lignes doivent appartenir au même budget.")
        if self.budget.statut != StatutBudget.APPROUVE:
            raise ValidationError("Le virement n'est possible que sur un budget approuvé.")
        montant = _D(str(montant))
        if montant <= 0:
            raise ValidationError("Le montant du virement doit être positif.")
        if montant > self.montant_disponible:
            raise ValidationError(
                f"Montant ({montant:,.0f} FCFA) supérieur au disponible sur la ligne source ({self.montant_disponible:,.0f} FCFA)."
            )
        with transaction.atomic():
            LigneBudgetaire.objects.filter(pk=self.pk).update(
                montant_alloue=models.F('montant_alloue') - montant,
                montant_disponible=models.F('montant_disponible') - montant,
            )
            LigneBudgetaire.objects.filter(pk=ligne_dest.pk).update(
                montant_alloue=models.F('montant_alloue') + montant,
                montant_disponible=models.F('montant_disponible') + montant,
            )
            self.refresh_from_db()
            ligne_dest.refresh_from_db()
            self.budget.recalculer_montants()

    def enregistrer_consommation(self, montant, note='', enregistre_par=None, depense_parent=None, fournisseur='', **_ignored):
        """
        Enregistre une ConsommationLigne sur cette ligne budgétaire.

        Args:
            montant         : montant à consommer (Decimal ou float)
            note            : libellé / description de la ligne
            enregistre_par  : Utilisateur auteur
            depense_parent  : Depense parente (si fournie, la ligne y est rattachée)
            fournisseur     : fournisseur (copié depuis la Depense si fourni)
        Returns:
            ConsommationLigne créée
        """
        if self.budget.niveau_alerte == NiveauAlerte.CRITIQUE:
            raise ValidationError("Dépense bloquée : le budget a atteint 100% de sa consommation (CRITIQUE).")
        montant = Decimal(str(montant))
        if montant <= 0:
            raise ValidationError("Le montant de la dépense doit être positif.")
        if montant > self.montant_disponible:
            raise ValidationError(
                f"Montant ({montant:,.0f} FCFA) supérieur au disponible sur cette ligne ({self.montant_disponible:,.0f} FCFA)."
            )
        with transaction.atomic():
            cl = ConsommationLigne.objects.create(
                ligne=self,
                depense=depense_parent,
                montant=montant,
                note=note or '',
                fournisseur=fournisseur or '',
                enregistre_par=enregistre_par,
                statut=depense_parent.statut if depense_parent else StatutDepense.SAISIE,
            )
            self.montant_consomme += montant
            self.montant_disponible = self.montant_alloue - self.montant_consomme
            LigneBudgetaire.objects.filter(pk=self.pk).update(
                montant_consomme=self.montant_consomme,
                montant_disponible=self.montant_disponible,
            )
            self.budget.recalculer_montants()
        return cl

    def annuler_consommation(self, montant):
        montant = Decimal(str(montant))
        if montant <= 0:
            raise ValidationError("Le montant a annuler doit etre positif.")
        if montant > self.montant_consomme:
            raise ValidationError("Impossible d'annuler plus que le montant consomme sur cette ligne.")

        with transaction.atomic():
            self.montant_consomme -= montant
            self.montant_disponible = self.montant_alloue - self.montant_consomme
            LigneBudgetaire.objects.filter(pk=self.pk).update(
                montant_consomme=self.montant_consomme,
                montant_disponible=self.montant_disponible,
            )
            self.budget.recalculer_montants()


# ── Statuts dépense ───────────────────────────────────────────────────────────

class StatutDepense(models.TextChoices):
    SAISIE  = 'SAISIE',  'En attente'
    VALIDEE = 'VALIDEE', 'Validée'
    REJETEE = 'REJETEE', 'Rejetée'


# ── Dépense (entité parente regroupant les lignes d'une soumission) ────────────

class Depense(models.Model):
    """
    Représente une soumission complète : une ou plusieurs lignes de consommation
    couvertes par un ou plusieurs pièces justificatives.
    Remplace le champ groupe_ref flottant.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget         = models.ForeignKey(
                         'Budget',
                         on_delete=models.CASCADE,
                         null=True, blank=True,
                         related_name='depenses',
                         verbose_name="Budget"
                     )
    libelle_hors_budget = models.CharField(
                         max_length=300, blank=True,
                         verbose_name="Libellé (hors budget)"
                     )
    statut         = models.CharField(
                         max_length=12,
                         choices=StatutDepense.choices,
                         default=StatutDepense.SAISIE,
                         verbose_name="Statut"
                     )
    fournisseur    = models.CharField(max_length=200, blank=True, verbose_name="Fournisseur")
    note           = models.CharField(max_length=500, blank=True, verbose_name="Note / description")
    motif_rejet    = models.CharField(max_length=500, blank=True, verbose_name="Motif de rejet")
    enregistre_par = models.ForeignKey(
                         Utilisateur,
                         on_delete=models.SET_NULL,
                         null=True, blank=True,
                         related_name='depenses_soumises',
                         verbose_name="Enregistré par"
                     )
    validateur     = models.ForeignKey(
                         Utilisateur,
                         on_delete=models.SET_NULL,
                         null=True, blank=True,
                         related_name='depenses_traitees',
                         verbose_name="Validé/Rejeté par"
                     )
    date           = models.DateTimeField(auto_now_add=True, verbose_name="Date de soumission")
    montant_total  = models.DecimalField(
                         max_digits=18, decimal_places=2, default=0,
                         verbose_name="Montant total"
                     )

    class Meta:
        db_table            = 'depense'
        verbose_name        = 'Dépense'
        verbose_name_plural = 'Dépenses'
        ordering            = ['-date']

    def __str__(self):
        return f"Dépense {self.id} — {self.montant_total:,.0f} FCFA ({self.get_statut_display()})"

    def recalculer_total(self):
        from django.db.models import Sum
        total = self.lignes.aggregate(s=Sum('montant'))['s'] or Decimal('0')
        self.montant_total = total
        self.save(update_fields=['montant_total'])

    @property
    def nombre_pieces(self):
        return self.pieces_justificatives.count()

    def valider(self, validateur):
        if self.statut != StatutDepense.SAISIE:
            raise ValidationError(f"Impossible de valider une dépense au statut {self.statut}.")
        with transaction.atomic():
            self.statut    = StatutDepense.VALIDEE
            self.validateur = validateur
            self.save(update_fields=['statut', 'validateur'])
            self.lignes.update(statut=StatutDepense.VALIDEE, validateur=validateur)

    def rejeter(self, validateur, motif):
        motif = (motif or '').strip()
        if self.statut != StatutDepense.SAISIE:
            raise ValidationError(f"Impossible de rejeter une dépense au statut {self.statut}.")
        if len(motif) < 10:
            raise ValidationError("Motif trop court (minimum 10 caractères).")
        with transaction.atomic():
            for ligne in self.lignes.select_related('ligne').all():
                ligne.ligne.annuler_consommation(ligne.montant)
                ligne.statut      = StatutDepense.REJETEE
                ligne.motif_rejet = motif
                ligne.validateur  = validateur
                ligne.save(update_fields=['statut', 'motif_rejet', 'validateur'])
            self.statut      = StatutDepense.REJETEE
            self.motif_rejet = motif
            self.validateur  = validateur
            self.save(update_fields=['statut', 'motif_rejet', 'validateur'])


# ── Ligne de consommation (enfant d'une Depense) ──────────────────────────────

class ConsommationLigne(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    depense        = models.ForeignKey(
                         Depense,
                         on_delete=models.CASCADE,
                         null=True, blank=True,
                         related_name='lignes',
                         verbose_name="Dépense parente"
                     )
    ligne          = models.ForeignKey(
                         LigneBudgetaire,
                         on_delete=models.CASCADE,
                         null=True, blank=True,
                         related_name='consommations',
                         verbose_name="Ligne budgétaire"
                     )
    reference      = models.CharField(
                         max_length=50, unique=True, null=True, blank=True,
                         verbose_name="Référence"
                     )
    groupe_ref     = models.UUIDField(
                         null=True, blank=True, db_index=True,
                         verbose_name="Référence groupe (legacy)"
                     )
    fournisseur    = models.CharField(max_length=200, blank=True, verbose_name="Fournisseur")
    statut         = models.CharField(
                         max_length=12,
                         choices=StatutDepense.choices,
                         default=StatutDepense.SAISIE,
                         verbose_name="Statut"
                     )
    motif_rejet    = models.CharField(max_length=500, blank=True, verbose_name="Motif de rejet")
    designation    = models.CharField(max_length=500, blank=True, default='', verbose_name="Désignation du poste")
    quantite       = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True, verbose_name="Quantité")
    unite          = models.CharField(max_length=50, blank=True, default='', verbose_name="Unité")
    prix_unitaire  = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, verbose_name="Prix unitaire (FCFA)")
    montant        = models.DecimalField(max_digits=18, decimal_places=2, verbose_name="Montant dépensé")
    note           = models.CharField(max_length=500, blank=True, verbose_name="Note / libellé")
    date           = models.DateTimeField(auto_now_add=True, verbose_name="Date d'enregistrement")
    enregistre_par = models.ForeignKey(
                         Utilisateur,
                         on_delete=models.SET_NULL,
                         null=True, blank=True,
                         related_name='depenses_enregistrees',
                         verbose_name="Enregistré par"
                     )
    validateur     = models.ForeignKey(
                         Utilisateur,
                         on_delete=models.SET_NULL,
                         null=True, blank=True,
                         related_name='depenses_validees',
                         verbose_name="Validé/Rejeté par"
                     )

    class Meta:
        db_table            = 'consommation_ligne'
        verbose_name        = 'Ligne de dépense'
        verbose_name_plural = 'Lignes de dépense'
        ordering            = ['-date']

    @classmethod
    def _generer_reference(cls):
        year = datetime.date.today().year
        prefix = f'DEP-{year}-'
        existing = cls.objects.filter(reference__startswith=prefix).values_list('reference', flat=True)
        max_seq = 0
        for reference in existing:
            try:
                max_seq = max(max_seq, int(reference[len(prefix):]))
            except (TypeError, ValueError):
                continue
        return f'{prefix}{max_seq + 1:04d}'

    def save(self, *args, **kwargs):
        if kwargs.get('update_fields') or self.reference or not self._state.adding:
            super().save(*args, **kwargs)
            return

        for _ in range(5):
            self.reference = self._generer_reference()
            try:
                super().save(*args, **kwargs)
                return
            except IntegrityError:
                self.reference = None
        raise IntegrityError("Impossible de generer une reference de depense unique.")

    def valider(self, validateur):
        if self.statut != StatutDepense.SAISIE:
            raise ValidationError(f"Impossible de valider une depense au statut {self.statut}.")
        self.statut = StatutDepense.VALIDEE
        self.validateur = validateur
        self.save(update_fields=['statut', 'validateur'])

    def rejeter(self, validateur, motif):
        motif = (motif or '').strip()
        if self.statut != StatutDepense.SAISIE:
            raise ValidationError(f"Impossible de rejeter une depense au statut {self.statut}.")
        if len(motif) < 10:
            raise ValidationError("Motif trop court (minimum 10 caracteres).")
        with transaction.atomic():
            if self.ligne:
                self.ligne.annuler_consommation(self.montant)
            self.statut     = StatutDepense.REJETEE
            self.motif_rejet = motif
            self.validateur  = validateur
            self.save(update_fields=['statut', 'motif_rejet', 'validateur'])

    def __str__(self):
        return f"{self.reference or self.id} – {self.montant:,.0f} FCFA"


# ── Pièce justificative (liée à la Depense parente) ───────────────────────────

PIECE_FORMATS_AUTORISES = {'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
PIECE_TAILLE_MAX        = 5 * 1024 * 1024   # 5 Mo par fichier
PIECE_TAILLE_TOTALE_MAX = 20 * 1024 * 1024  # 20 Mo par dépense


class PieceJustificative(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    depense      = models.ForeignKey(
                       Depense,
                       on_delete=models.CASCADE,
                       related_name='pieces_justificatives',
                       verbose_name="Dépense"
                   )
    fichier      = models.FileField(
                       upload_to='pieces_justificatives/%Y/%m/',
                       verbose_name="Fichier"
                   )
    nom_original = models.CharField(max_length=255, verbose_name="Nom original")
    taille       = models.PositiveIntegerField(verbose_name="Taille (octets)")
    type_mime    = models.CharField(max_length=100, verbose_name="Type MIME")
    description  = models.CharField(max_length=255, blank=True, verbose_name="Description")
    md5_hash     = models.CharField(max_length=32, blank=True, verbose_name="Hash MD5")
    uploaded_at  = models.DateTimeField(auto_now_add=True, verbose_name="Date d'upload")
    uploaded_by  = models.ForeignKey(
                       Utilisateur,
                       on_delete=models.PROTECT,
                       related_name='pieces_uploadees',
                       verbose_name="Uploadé par"
                   )

    class Meta:
        db_table            = 'piece_justificative'
        verbose_name        = 'Pièce justificative'
        verbose_name_plural = 'Pièces justificatives'
        ordering            = ['-uploaded_at']

    @property
    def taille_lisible(self) -> str:
        if self.taille >= 1024 * 1024:
            return f"{self.taille / 1024 / 1024:.1f} Mo"
        return f"{self.taille / 1024:.0f} Ko"

    def __str__(self):
        return self.nom_original or str(self.fichier)


# ── Notifications in-app ──────────────────────────────────────────────────────

class Notification(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    destinataire = models.ForeignKey(
                       Utilisateur,
                       on_delete=models.CASCADE,
                       related_name='notifications',
                       verbose_name="Destinataire"
                   )
    type_notif   = models.CharField(max_length=30, verbose_name="Type")
    message      = models.CharField(max_length=500, verbose_name="Message")
    lien         = models.CharField(max_length=200, blank=True, verbose_name="Lien")
    lu           = models.BooleanField(default=False, verbose_name="Lu")
    date         = models.DateTimeField(auto_now_add=True, verbose_name="Date")

    class Meta:
        db_table            = 'notification'
        verbose_name        = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering            = ['-date']

    def __str__(self):
        return f"[{self.type_notif}] {self.message[:60]}"


def creer_notification(destinataire, type_notif, message, lien=''):
    """Helper pour créer une notification in-app."""
    Notification.objects.create(
        destinataire=destinataire,
        type_notif=type_notif,
        message=message,
        lien=lien,
    )
