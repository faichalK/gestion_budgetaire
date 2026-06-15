"""
Atlas Finance — Serializers pour les rapports budgétaires.
"""
from rest_framework import serializers


class MetaRapportSerializer(serializers.Serializer):
    type          = serializers.CharField()
    label_periode = serializers.CharField()
    date_debut    = serializers.DateField()
    date_fin      = serializers.DateField()
    genere_le     = serializers.DateTimeField()


class NbParStatutSerializer(serializers.Serializer):
    APPROUVE = serializers.IntegerField()
    SOUMIS   = serializers.IntegerField()
    REJETE   = serializers.IntegerField()
    CLOTURE  = serializers.IntegerField()


class ResumeRapportSerializer(serializers.Serializer):
    nb_budgets          = serializers.IntegerField()
    montant_global      = serializers.DecimalField(max_digits=18, decimal_places=2)
    montant_consomme    = serializers.DecimalField(max_digits=18, decimal_places=2)
    montant_disponible  = serializers.DecimalField(max_digits=18, decimal_places=2)
    taux_global         = serializers.FloatField()
    nb_par_statut       = NbParStatutSerializer()


class EvolutionMoisSerializer(serializers.Serializer):
    mois  = serializers.DateTimeField()
    total = serializers.DecimalField(max_digits=18, decimal_places=2)
    nb    = serializers.IntegerField()


class TopDepenseSerializer(serializers.Serializer):
    ligne_id         = serializers.UUIDField()
    ligne__libelle   = serializers.CharField()
    ligne__budget__code = serializers.CharField()
    ligne__budget__nom  = serializers.CharField()
    total            = serializers.DecimalField(max_digits=18, decimal_places=2)
    nb               = serializers.IntegerField()


class DepenseParDepartementSerializer(serializers.Serializer):
    ligne__budget__departement_id  = serializers.UUIDField(allow_null=True)
    ligne__budget__departement__nom = serializers.CharField(allow_null=True)
    total = serializers.DecimalField(max_digits=18, decimal_places=2)
    nb    = serializers.IntegerField()


class RepartitionBudgetSerializer(serializers.Serializer):
    ligne__budget_id                 = serializers.UUIDField()
    ligne__budget__code              = serializers.CharField()
    ligne__budget__nom               = serializers.CharField()
    ligne__budget__departement__nom  = serializers.CharField(allow_null=True)
    total_consomme  = serializers.DecimalField(max_digits=18, decimal_places=2)
    nb_depenses     = serializers.IntegerField()


class AlerteSerializer(serializers.Serializer):
    budget_id       = serializers.CharField()
    budget_code     = serializers.CharField()
    budget_nom      = serializers.CharField()
    departement     = serializers.CharField()
    taux            = serializers.FloatField()
    niveau          = serializers.CharField()
    montant_global  = serializers.DecimalField(max_digits=18, decimal_places=2)
    montant_consomme = serializers.DecimalField(max_digits=18, decimal_places=2)


class DetailMoisSerializer(serializers.Serializer):
    mois  = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=18, decimal_places=2)
    nb    = serializers.IntegerField()


class DetailTrimestreSerializer(serializers.Serializer):
    trimestre = serializers.IntegerField()
    total     = serializers.DecimalField(max_digits=18, decimal_places=2)
    nb        = serializers.IntegerField()


class AllocationInfoSerializer(serializers.Serializer):
    departement         = serializers.CharField()
    montant_alloue      = serializers.DecimalField(max_digits=18, decimal_places=2)
    montant_consomme    = serializers.DecimalField(max_digits=18, decimal_places=2)
    montant_disponible  = serializers.DecimalField(max_digits=18, decimal_places=2)
    taux                = serializers.FloatField()


class BudgetAnnuelInfoSerializer(serializers.Serializer):
    id             = serializers.CharField()
    annee          = serializers.IntegerField()
    montant_global = serializers.DecimalField(max_digits=18, decimal_places=2)
    nb_allocations = serializers.IntegerField()
    allocations    = AllocationInfoSerializer(many=True)


class ComparaisonSerializer(serializers.Serializer):
    annee_precedente = serializers.IntegerField()
    total_precedent  = serializers.DecimalField(max_digits=18, decimal_places=2)
    total_actuel     = serializers.DecimalField(max_digits=18, decimal_places=2)
    variation_pct    = serializers.FloatField(allow_null=True)


# ─── Serializers complets par type ────────────────────────────────────────────

class RapportMensuelSerializer(serializers.Serializer):
    meta                     = MetaRapportSerializer()
    resume                   = ResumeRapportSerializer()
    evolution_depenses       = EvolutionMoisSerializer(many=True)
    top_depenses             = TopDepenseSerializer(many=True)
    depenses_par_departement = DepenseParDepartementSerializer(many=True)
    repartition_par_budget   = RepartitionBudgetSerializer(many=True)
    alertes                  = AlerteSerializer(many=True)
    total_depenses_periode   = serializers.DecimalField(max_digits=18, decimal_places=2)
    nb_depenses_periode      = serializers.IntegerField()


class RapportTrimestrielSerializer(RapportMensuelSerializer):
    detail_mois = DetailMoisSerializer(many=True)


class RapportAnnuelSerializer(RapportMensuelSerializer):
    budget_annuel     = BudgetAnnuelInfoSerializer(allow_null=True)
    detail_trimestres = DetailTrimestreSerializer(many=True)
    comparaison       = ComparaisonSerializer()


class RapportAdhocSerializer(RapportMensuelSerializer):
    filtres_actifs = serializers.DictField(child=serializers.JSONField(), required=False)
