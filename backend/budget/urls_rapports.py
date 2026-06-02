from django.urls import path
from .views_rapports import (
    KpisView,
    EvolutionMensuelleView,
    ParDepartementView,
    TauxUtilisationEnveloppesView,
    ExecutionBudgetaireView,
    ParCategorieView,
)
from .rapport_view import (
    RapportMensuelView,
    RapportTrimestrielView,
    RapportAnnuelView,
    RapportAdhocView,
    ExportRapportView,
)

urlpatterns = [
    # ── KPIs existants ──────────────────────────────────────────────────────
    path('kpis/',                        KpisView.as_view(),                    name='rapports-kpis'),
    path('evolution-mensuelle/',         EvolutionMensuelleView.as_view(),      name='rapports-evolution'),
    path('par-departement/',             ParDepartementView.as_view(),          name='rapports-par-dept'),
    path('taux-utilisation-enveloppes/', TauxUtilisationEnveloppesView.as_view(), name='rapports-enveloppes'),
    path('execution-budgetaire/',        ExecutionBudgetaireView.as_view(),     name='rapports-execution'),
    path('par-categorie/',               ParCategorieView.as_view(),            name='rapports-par-categorie'),

    # ── Nouveaux rapports détaillés ─────────────────────────────────────────
    path('mensuel/',      RapportMensuelView.as_view(),      name='rapport-mensuel'),
    path('trimestriel/',  RapportTrimestrielView.as_view(),  name='rapport-trimestriel'),
    path('annuel/',       RapportAnnuelView.as_view(),       name='rapport-annuel'),
    path('adhoc/',        RapportAdhocView.as_view(),        name='rapport-adhoc'),
    path('export/',       ExportRapportView.as_view(),       name='rapport-export'),
]
