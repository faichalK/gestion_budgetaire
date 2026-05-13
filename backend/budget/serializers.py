from rest_framework import serializers
from .models import (
    BudgetAnnuel, AllocationDepartementale,
    Budget, LigneBudgetaire, ConsommationLigne, PieceJustificative,
    StatutBudget, TechniqueEstimation,
    CategoriePrincipale, SousCategorie,
)
from accounts.serializers import UtilisateurSerializer, DepartementSerializer
from common.formatters import (
    formater_montant, formater_taux, formater_date,
    get_couleur_execution, get_statut_config,
)


# ── Budget annuel ─────────────────────────────────────────────────────────────

class AllocationDepartementaleSerializer(serializers.ModelSerializer):
    departement_detail = DepartementSerializer(source='departement', read_only=True)
    departement_nom    = serializers.CharField(source='departement.nom', read_only=True, default=None)

    class Meta:
        model  = AllocationDepartementale
        fields = [
            'id', 'departement', 'departement_detail', 'departement_nom',
            'montant_alloue', 'montant_consomme', 'montant_disponible',
            'date_creation',
        ]
        read_only_fields = ['id', 'montant_consomme', 'montant_disponible', 'date_creation']


class BudgetAnnuelSerializer(serializers.ModelSerializer):
    allocations               = AllocationDepartementaleSerializer(many=True, read_only=True)
    montant_alloue_depts      = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    montant_disponible_global = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    periode_display           = serializers.CharField(read_only=True)
    date_fin_exercice         = serializers.CharField(read_only=True)

    class Meta:
        model  = BudgetAnnuel
        fields = [
            'id', 'annee', 'annee_fin', 'periode_display', 'date_fin_exercice',
            'montant_global', 'description',
            'montant_alloue_depts', 'montant_disponible_global',
            'allocations', 'date_creation',
        ]
        read_only_fields = ['id', 'date_creation']

    def validate(self, data):
        inst     = self.instance
        annee    = data.get('annee',    inst.annee    if inst else None)
        annee_fin = data.get('annee_fin', inst.annee_fin if inst else None)
        pk_exclu = inst.pk if inst else None

        # Un seul budget annuel autorisé dans le système (création uniquement)
        if inst is None and BudgetAnnuel.objects.exists():
            raise serializers.ValidationError(
                "Un budget annuel existe déjà. L'entreprise ne peut voter qu'un seul budget global. "
                "Modifiez le budget existant si nécessaire."
            )
        if annee_fin and annee and annee_fin < annee:
            raise serializers.ValidationError("L'année de fin ne peut pas être antérieure à l'année de début.")
        return data


class AllocationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AllocationDepartementale
        fields = ['id', 'departement', 'montant_alloue']
        read_only_fields = ['id']

    def validate(self, data):
        budget_annuel = self.context['budget_annuel']
        inst          = self.instance
        montant       = data.get('montant_alloue', inst.montant_alloue if inst else 0)
        dept          = data.get('departement',    inst.departement    if inst else None)
        pk_exclu      = inst.pk if inst else None

        # Unicité département/année
        if dept and AllocationDepartementale.objects.exclude(pk=pk_exclu).filter(
            budget_annuel=budget_annuel, departement=dept
        ).exists():
            raise serializers.ValidationError("Ce département a déjà une allocation pour cette année.")

        # Somme allocations ≤ budget global
        from django.db.models import Sum
        total_existant = (
            AllocationDepartementale.objects
            .filter(budget_annuel=budget_annuel)
            .exclude(pk=pk_exclu)
            .aggregate(s=Sum('montant_alloue'))['s'] or 0
        )
        if total_existant + montant > budget_annuel.montant_global:
            disponible = budget_annuel.montant_global - total_existant
            raise serializers.ValidationError(
                f"Montant disponible dans le budget global : {disponible:,.0f} FCFA "
                f"(global : {budget_annuel.montant_global:,.0f} FCFA, déjà alloué : {total_existant:,.0f} FCFA)."
            )
        return data


# ── Pièce justificative ───────────────────────────────────────────────────────

class PieceJustificativeSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model  = PieceJustificative
        fields = ['id', 'nom', 'url', 'date_ajout']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.fichier:
            try:
                return request.build_absolute_uri(obj.fichier.url) if request else obj.fichier.url
            except Exception:
                return None
        return None


# ── Consommation ligne ────────────────────────────────────────────────────────

class ConsommationLigneSerializer(serializers.ModelSerializer):
    enregistre_par_nom = serializers.SerializerMethodField()
    montant_fmt        = serializers.SerializerMethodField()
    date_fmt           = serializers.SerializerMethodField()
    statut_config      = serializers.SerializerMethodField()
    pieces             = PieceJustificativeSerializer(many=True, read_only=True)

    class Meta:
        model  = ConsommationLigne
        fields = [
            'id', 'montant', 'montant_fmt',
            'note',
            'date', 'date_fmt',
            'enregistre_par_nom',
            'statut_config',
            'pieces',
        ]

    def get_enregistre_par_nom(self, obj):
        if obj.enregistre_par:
            return f"{obj.enregistre_par.prenom} {obj.enregistre_par.nom}"
        return None

    def get_montant_fmt(self, obj):
        return formater_montant(obj.montant)

    def get_date_fmt(self, obj):
        return formater_date(obj.date, format='long')

    def get_statut_config(self, obj):
        statut = getattr(obj, 'statut', None)
        if statut:
            return get_statut_config(statut, 'depense')
        return None


# ── Ligne budgétaire ──────────────────────────────────────────────────────────

class LigneBudgetaireSerializer(serializers.ModelSerializer):
    consommations = ConsommationLigneSerializer(many=True, read_only=True)
    sous_lignes   = serializers.SerializerMethodField()

    class Meta:
        model  = LigneBudgetaire
        fields = [
            'id', 'budget', 'parent',
            'code', 'libelle', 'unite', 'section',
            'quantite', 'prix_unitaire',
            'cout_optimiste', 'cout_probable', 'cout_pessimiste',
            'montant_alloue', 'montant_consomme', 'montant_disponible',
            'date_creation', 'consommations', 'sous_lignes',
        ]
        read_only_fields = ['id', 'budget', 'montant_alloue', 'montant_consomme', 'montant_disponible', 'date_creation']

    def get_sous_lignes(self, obj):
        # Sérialisé récursivement (1 niveau de profondeur suffit)
        children = obj.sous_lignes.all()
        return LigneBudgetaireSerializer(children, many=True, context=self.context).data


class LigneBudgetaireCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LigneBudgetaire
        fields = ['id', 'parent', 'code', 'libelle', 'unite', 'section', 'quantite', 'prix_unitaire']
        read_only_fields = ['id']


# ── Budget ────────────────────────────────────────────────────────────────────

class BudgetListSerializer(serializers.ModelSerializer):
    statut_display      = serializers.CharField(source='get_statut_display', read_only=True)
    departement_detail  = DepartementSerializer(source='departement', read_only=True)
    departement_nom     = serializers.CharField(source='departement.nom', read_only=True, default=None)
    gestionnaire_nom    = serializers.SerializerMethodField()
    comptable_nom       = serializers.SerializerMethodField()
    taux_consommation   = serializers.SerializerMethodField()
    niveau_alerte       = serializers.CharField(source='verifier_seuil_alerte', read_only=True)
    annee               = serializers.SerializerMethodField()
    periode_display     = serializers.SerializerMethodField()
    # Champs formatés
    montant_global_fmt  = serializers.SerializerMethodField()
    montant_consomme_fmt = serializers.SerializerMethodField()
    montant_disponible_fmt = serializers.SerializerMethodField()
    taux_consommation_fmt  = serializers.SerializerMethodField()
    couleur_execution   = serializers.SerializerMethodField()
    statut_config       = serializers.SerializerMethodField()
    date_creation_fmt   = serializers.SerializerMethodField()
    date_soumission_fmt = serializers.SerializerMethodField()

    class Meta:
        model  = Budget
        fields = [
            'id', 'code', 'nom',
            'departement', 'departement_detail', 'departement_nom',
            'gestionnaire_nom', 'comptable_nom', 'annee', 'periode_display',
            'montant_global', 'montant_consomme', 'montant_disponible',
            'montant_global_fmt', 'montant_consomme_fmt', 'montant_disponible_fmt',
            'statut', 'statut_display', 'statut_config', 'niveau_alerte',
            'motif_rejet',
            'date_debut', 'date_fin', 'date_creation', 'date_soumission', 'date_cloture',
            'date_creation_fmt', 'date_soumission_fmt',
            'taux_consommation', 'taux_consommation_fmt', 'couleur_execution',
        ]

    def get_annee(self, obj):
        ba = obj.budget_annuel or (obj.allocation.budget_annuel if obj.allocation else None)
        return ba.annee if ba else None

    def get_periode_display(self, obj):
        ba = obj.budget_annuel or (obj.allocation.budget_annuel if obj.allocation else None)
        return ba.periode_display if ba else None

    def get_taux_consommation(self, obj):
        return obj.calculer_taux_consommation()

    def get_gestionnaire_nom(self, obj):
        if obj.gestionnaire:
            return f"{obj.gestionnaire.prenom} {obj.gestionnaire.nom}"
        return None

    def get_comptable_nom(self, obj):
        if obj.comptable:
            return f"{obj.comptable.prenom} {obj.comptable.nom}"
        return None

    def get_montant_global_fmt(self, obj):
        return formater_montant(obj.montant_global)

    def get_montant_consomme_fmt(self, obj):
        return formater_montant(obj.montant_consomme)

    def get_montant_disponible_fmt(self, obj):
        return formater_montant(obj.montant_disponible)

    def get_taux_consommation_fmt(self, obj):
        taux = obj.calculer_taux_consommation()
        return formater_taux(taux, 100)

    def get_couleur_execution(self, obj):
        return get_couleur_execution(obj.calculer_taux_consommation())

    def get_statut_config(self, obj):
        return get_statut_config(obj.statut, 'budget')

    def get_date_creation_fmt(self, obj):
        return formater_date(obj.date_creation, format='long')

    def get_date_soumission_fmt(self, obj):
        return formater_date(obj.date_soumission, format='long')


class BudgetDetailSerializer(serializers.ModelSerializer):
    statut_display                = serializers.CharField(source='get_statut_display', read_only=True)
    technique_estimation_display  = serializers.CharField(source='get_technique_estimation_display', read_only=True)
    departement_detail            = DepartementSerializer(source='departement', read_only=True)
    departement_nom               = serializers.CharField(source='departement.nom', read_only=True, default=None)
    gestionnaire_detail           = UtilisateurSerializer(source='gestionnaire', read_only=True)
    gestionnaire_nom              = serializers.SerializerMethodField()
    comptable_detail              = UtilisateurSerializer(source='comptable', read_only=True)
    comptable_nom                 = serializers.SerializerMethodField()
    allocation_detail             = AllocationDepartementaleSerializer(source='allocation', read_only=True)
    lignes                        = LigneBudgetaireSerializer(many=True, read_only=True)
    taux_consommation             = serializers.SerializerMethodField()
    niveau_alerte                 = serializers.CharField(source='verifier_seuil_alerte', read_only=True)
    annee                         = serializers.SerializerMethodField()
    periode_display               = serializers.SerializerMethodField()
    # Champs formatés
    montant_global_fmt            = serializers.SerializerMethodField()
    montant_consomme_fmt          = serializers.SerializerMethodField()
    montant_disponible_fmt        = serializers.SerializerMethodField()
    taux_consommation_fmt         = serializers.SerializerMethodField()
    couleur_execution             = serializers.SerializerMethodField()
    statut_config                 = serializers.SerializerMethodField()
    date_creation_fmt             = serializers.SerializerMethodField()
    date_soumission_fmt           = serializers.SerializerMethodField()
    date_cloture_fmt              = serializers.SerializerMethodField()

    class Meta:
        model  = Budget
        fields = [
            'id', 'code', 'nom',
            'gestionnaire', 'gestionnaire_detail', 'gestionnaire_nom',
            'comptable', 'comptable_detail', 'comptable_nom',
            'budget_annuel', 'allocation', 'allocation_detail',
            'departement', 'departement_detail', 'departement_nom',
            'annee', 'periode_display',
            'montant_global', 'montant_consomme', 'montant_disponible',
            'montant_global_fmt', 'montant_consomme_fmt', 'montant_disponible_fmt',
            'statut', 'statut_display', 'statut_config',
            'technique_estimation', 'technique_estimation_display', 'niveau_alerte',
            'motif_rejet',
            'date_debut', 'date_fin', 'date_creation', 'date_soumission', 'date_cloture',
            'date_creation_fmt', 'date_soumission_fmt', 'date_cloture_fmt',
            'taux_consommation', 'taux_consommation_fmt', 'couleur_execution',
            'lignes',
        ]

    def get_gestionnaire_nom(self, obj):
        if obj.gestionnaire:
            return f"{obj.gestionnaire.prenom} {obj.gestionnaire.nom}"
        return None

    def get_comptable_nom(self, obj):
        if obj.comptable:
            return f"{obj.comptable.prenom} {obj.comptable.nom}"
        return None

    def get_annee(self, obj):
        ba = obj.budget_annuel or (obj.allocation.budget_annuel if obj.allocation else None)
        return ba.annee if ba else None

    def get_periode_display(self, obj):
        ba = obj.budget_annuel or (obj.allocation.budget_annuel if obj.allocation else None)
        return ba.periode_display if ba else None

    def get_taux_consommation(self, obj):
        return obj.calculer_taux_consommation()

    def get_montant_global_fmt(self, obj):
        return formater_montant(obj.montant_global)

    def get_montant_consomme_fmt(self, obj):
        return formater_montant(obj.montant_consomme)

    def get_montant_disponible_fmt(self, obj):
        return formater_montant(obj.montant_disponible)

    def get_taux_consommation_fmt(self, obj):
        taux = obj.calculer_taux_consommation()
        return formater_taux(taux, 100)

    def get_couleur_execution(self, obj):
        return get_couleur_execution(obj.calculer_taux_consommation())

    def get_statut_config(self, obj):
        return get_statut_config(obj.statut, 'budget')

    def get_date_creation_fmt(self, obj):
        return formater_date(obj.date_creation, format='long')

    def get_date_soumission_fmt(self, obj):
        return formater_date(obj.date_soumission, format='long')

    def get_date_cloture_fmt(self, obj):
        return formater_date(obj.date_cloture, format='long')


class BudgetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Budget
        fields = ['id', 'code', 'nom', 'budget_annuel', 'allocation', 'departement', 'date_debut', 'date_fin']
        read_only_fields = ['id', 'code']

    def validate(self, data):
        allocation    = data.get('allocation')
        budget_annuel = data.get('budget_annuel')
        departement   = data.get('departement')

        # Il faut au moins un exercice ou une allocation
        if not allocation and not budget_annuel:
            raise serializers.ValidationError("Veuillez sélectionner un exercice budgétaire.")

        # Dériver budget_annuel depuis l'allocation si non fourni
        if allocation and not budget_annuel:
            data['budget_annuel'] = allocation.budget_annuel

        # Si une allocation est choisie, dériver le département automatiquement
        if allocation and not departement:
            data['departement'] = allocation.departement

        if allocation and departement:
            if allocation.departement_id != departement.pk:
                raise serializers.ValidationError(
                    "L'allocation sélectionnée n'appartient pas au département choisi."
                )
        if allocation and not allocation.verifier_disponibilite():
            raise serializers.ValidationError("L'allocation sélectionnée n'a plus de montant disponible.")
        return data

    def create(self, validated_data):
        validated_data['gestionnaire'] = self.context['request'].user
        return super().create(validated_data)


class BudgetUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Budget
        fields = ['nom', 'departement', 'allocation', 'date_debut', 'date_fin']

    def validate(self, data):
        instance    = self.instance
        allocation  = data.get('allocation',  instance.allocation)
        departement = data.get('departement', instance.departement)
        if allocation and departement:
            if allocation.departement_id != departement.pk:
                raise serializers.ValidationError(
                    "L'allocation sélectionnée n'appartient pas au département choisi."
                )
        return data


# ── Serializers hiérarchiques (3 niveaux) ─────────────────────────────────────

class LigneBudgetaireHierarchieSerializer(serializers.ModelSerializer):
    montant_alloue_fmt     = serializers.SerializerMethodField()
    montant_consomme_fmt   = serializers.SerializerMethodField()
    montant_disponible_fmt = serializers.SerializerMethodField()
    categorie_code         = serializers.SerializerMethodField()
    sous_cat_code          = serializers.SerializerMethodField()

    class Meta:
        model  = LigneBudgetaire
        fields = [
            'id', 'sous_categorie', 'libelle', 'code',
            'unite', 'quantite', 'prix_unitaire',
            'montant_alloue', 'montant_consomme', 'montant_disponible',
            'montant_alloue_fmt', 'montant_consomme_fmt', 'montant_disponible_fmt',
            'categorie_code', 'sous_cat_code',
        ]

    def get_montant_alloue_fmt(self, obj):
        return formater_montant(obj.montant_alloue)

    def get_montant_consomme_fmt(self, obj):
        return formater_montant(obj.montant_consomme)

    def get_montant_disponible_fmt(self, obj):
        return formater_montant(obj.montant_disponible)

    def get_categorie_code(self, obj):
        try:
            return obj.sous_categorie.categorie.code
        except Exception:
            return None

    def get_sous_cat_code(self, obj):
        try:
            return obj.sous_categorie.code
        except Exception:
            return None


class SousCategorieSerializer(serializers.ModelSerializer):
    lignes        = LigneBudgetaireHierarchieSerializer(many=True, read_only=True)
    total         = serializers.SerializerMethodField()
    total_formate = serializers.SerializerMethodField()

    class Meta:
        model  = SousCategorie
        fields = ['id', 'code', 'libelle', 'ordre', 'lignes', 'total', 'total_formate']

    def get_total(self, obj):
        return float(obj.total)

    def get_total_formate(self, obj):
        return formater_montant(obj.total)


class CategoriePrincipaleSerializer(serializers.ModelSerializer):
    sous_categories = SousCategorieSerializer(many=True, read_only=True)
    total           = serializers.SerializerMethodField()
    total_formate   = serializers.SerializerMethodField()

    class Meta:
        model  = CategoriePrincipale
        fields = ['id', 'code', 'libelle', 'ordre', 'sous_categories', 'total', 'total_formate']

    def get_total(self, obj):
        return float(obj.total)

    def get_total_formate(self, obj):
        return formater_montant(obj.total)
