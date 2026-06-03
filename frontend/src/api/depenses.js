/**
 * BudgetFlow — API Dépenses
 */
import api from './axios'

export const getDepenses    = (params)    => api.get('/v1/depenses/', { params })
export const getDepense     = (id)        => api.get(`/v1/depenses/${id}/`)

export const createDepenseHorsBudget = ({ libelle, montant, fournisseur = '', note = '', files = [] }) => {
  const form = new FormData()
  form.append('libelle_hors_budget', libelle)
  form.append('montant', montant)
  if (fournisseur) form.append('fournisseur', fournisseur)
  if (note)        form.append('note', note)
  for (const f of files) form.append('pieces', f)
  return api.post('/v1/depenses/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const validerDepense = (id, data)  => api.post(`/v1/depenses/${id}/valider/`, data)
export const rejeterDepense = (id, data)  => api.post(`/v1/depenses/${id}/rejeter/`, data)

/* ── Pièces justificatives ───────────────────────────────────────────────── */

export const getPieces = (depenseId) =>
  api.get(`/v1/depenses/${depenseId}/pieces/`)

export const uploadPieces = (depenseId, files) => {
  const form = new FormData()
  for (const f of files) form.append('pieces', f)
  return api.post(`/v1/depenses/${depenseId}/pieces/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deletePiece = (depenseId, pieceId) =>
  api.delete(`/v1/depenses/${depenseId}/pieces/${pieceId}/`)

export const downloadPiece = async (pieceId, nomOriginal = 'piece') => {
  const res = await api.get(`/v1/pieces/${pieceId}/download/`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = nomOriginal
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
