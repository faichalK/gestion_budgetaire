/**
 * BudgetFlow — API Rapports & KPIs
 */
import api from './axios'

/* ── KPIs existants ─────────────────────────────────────────────────────── */
export const getKpis                      = ()       => api.get('/v1/rapports/kpis/')
export const getEvolutionMensuelle        = (period) => api.get('/v1/rapports/evolution-mensuelle/', { params: { period } })
export const getParCategorie              = ()       => api.get('/v1/rapports/par-categorie/')
export const getParDepartement            = ()       => api.get('/v1/rapports/par-departement/')
export const getTauxUtilisationEnveloppes = ()       => api.get('/v1/rapports/taux-utilisation-enveloppes/')
export const getExecutionBudgetaire = (params) => api.get('/v1/rapports/execution-budgetaire/', { params })

/* ── Rapports détaillés ─────────────────────────────────────────────────── */
export const getRapportMensuel     = (mois, annee)              => api.get('/v1/rapports/mensuel/',     { params: { mois, annee } })
export const getRapportTrimestriel = (trimestre, annee)         => api.get('/v1/rapports/trimestriel/', { params: { trimestre, annee } })
export const getRapportAnnuel      = (annee)                    => api.get('/v1/rapports/annuel/',      { params: { annee } })
export const getRapportAdhoc       = (params)                   => api.post('/v1/rapports/adhoc/',      params)
export const exportRapport         = (type, format, params)     => api.post('/v1/rapports/export/', { type, format, params }, { responseType: 'blob' })
