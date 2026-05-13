import api from './axios'

/* ── Budget annuel ───────────────────────────────────────────────────────── */
export const getBudgetAnnuels    = (params) => api.get('/budget/annuel/', { params })
export const getBudgetAnnuel     = (id)     => api.get(`/budget/annuel/${id}/`)
export const createBudgetAnnuel  = (data)   => api.post('/budget/annuel/', data)
export const updateBudgetAnnuel  = (id, d)  => api.patch(`/budget/annuel/${id}/`, d)
export const deleteBudgetAnnuel  = (id)     => api.delete(`/budget/annuel/${id}/`)

/* ── Allocations départementales ─────────────────────────────────────────── */
export const getAllocations    = (bAnnuelId)         => api.get(`/budget/annuel/${bAnnuelId}/allocations/`)
export const createAllocation = (bAnnuelId, data)   => api.post(`/budget/annuel/${bAnnuelId}/allocations/`, data)
export const updateAllocation = (bAnnuelId, id, d)  => api.patch(`/budget/annuel/${bAnnuelId}/allocations/${id}/`, d)
export const deleteAllocation = (bAnnuelId, id)     => api.delete(`/budget/annuel/${bAnnuelId}/allocations/${id}/`)

/* ── Budgets ─────────────────────────────────────────────────────────────── */
export const getBudgets       = (params) => api.get('/budget/', { params })
export const getBudget        = (id)     => api.get(`/budget/${id}/`)
export const createBudget     = (data)   => api.post('/budget/', data)
export const updateBudget     = (id, d)  => api.patch(`/budget/${id}/`, d)
export const deleteBudget     = (id)     => api.delete(`/budget/${id}/`)

export const soumettreBudget  = (id)        => api.post(`/budget/${id}/soumettre/`)
export const approuverBudget  = (id)        => api.post(`/budget/${id}/approuver/`)
export const rejeterBudget    = (id, data)  => api.post(`/budget/${id}/rejeter/`, data)
export const cloturerBudget   = (id)        => api.post(`/budget/${id}/cloturer/`)
export const archiverBudget   = (id)        => api.post(`/budget/${id}/archiver/`)
export const getRapportCloture = (id)       => api.get(`/budget/${id}/rapport-cloture/`)
export const effectuerVirement = (budgetId, data) => api.post(`/budget/${budgetId}/virement/`, data)

/* ── Lignes budgétaires ──────────────────────────────────────────────────── */
export const getLignes        = (bId)        => api.get(`/budget/${bId}/lignes/`)
export const createLigne      = (bId, data)  => api.post(`/budget/${bId}/lignes/`, data)
export const updateLigne      = (bId, id, d) => api.patch(`/budget/${bId}/lignes/${id}/`, d)
export const deleteLigne      = (bId, id)    => api.delete(`/budget/${bId}/lignes/${id}/`)
export const consommerLigne = (bId, id, montant, files = [], note = '') => {
  const form = new FormData()
  form.append('montant', montant)
  if (note) form.append('note', note)
  for (const f of files) form.append('pieces', f)
  return api.post(`/budget/${bId}/lignes/${id}/consommer/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const depenseMultiLigne = (bId, lignes, note = '', files = []) => {
  const form = new FormData()
  form.append('lignes_json', JSON.stringify(lignes))
  if (note) form.append('note', note)
  for (const f of files) form.append('pieces', f)
  return api.post(`/budget/${bId}/depense-multi/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/* ── Structure hiérarchique ───────────────────────────────────────────────── */
export const getBudgetArbre        = (bId)         => api.get(`/budget/${bId}/arbre/`)
export const getLignesSelecteur    = (bId)         => api.get(`/budget/${bId}/lignes-selecteur/`)
export const createCategorie       = (bId, data)   => api.post(`/budget/${bId}/categories/`, data)
export const deleteCategorie       = (id)          => api.delete(`/budget/categories/${id}/`)
export const createSousCategorie   = (catId, data) => api.post(`/budget/categories/${catId}/sous-categories/`, data)
export const deleteSousCategorie   = (id)          => api.delete(`/budget/sous-categories/${id}/`)
export const createLigneHierarchie = (scId, data)  => api.post(`/budget/sous-categories/${scId}/lignes/`, data)
export const updateLigneHierarchie = (id, data)    => api.patch(`/budget/lignes/${id}/`, data)
export const deleteLigneHierarchie = (id)          => api.delete(`/budget/lignes/${id}/`)

/* ── Exports Excel & PDF ─────────────────────────────────────────────────── */
const _download = (data, filename) => {
  const url = URL.createObjectURL(new Blob([data]))
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const exportBudgetExcel   = async (id, code) => {
  const r = await api.get(`/budget/${id}/export/budget-excel/`,   { responseType: 'blob' })
  _download(r.data, `Budget_${code || id}.xlsx`)
}
export const exportBudgetPdf     = async (id, code) => {
  const r = await api.get(`/budget/${id}/export/budget-pdf/`,     { responseType: 'blob' })
  _download(r.data, `Budget_${code || id}.pdf`)
}
export const exportDepensesExcel = async (id, code) => {
  const r = await api.get(`/budget/${id}/export/depenses-excel/`, { responseType: 'blob' })
  _download(r.data, `Depenses_${code || id}.xlsx`)
}
export const exportDepensesPdf   = async (id, code) => {
  const r = await api.get(`/budget/${id}/export/depenses-pdf/`,   { responseType: 'blob' })
  _download(r.data, `Depenses_${code || id}.pdf`)
}
