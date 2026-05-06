import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDepense, validerDepense, rejeterDepense } from '../../api/depenses'
import { DepenseBadge } from '../../components/StatusBadge'
import { notifRefresh } from '../../utils/notifRefresh'
import { ConfirmModal } from '../../components/ui'
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Paperclip, ExternalLink, Receipt,
} from 'lucide-react'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

export default function DepenseDetail({ basePath = '/mes-depenses' }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { isAdmin, isComptable } = useAuth()

  const [depense,      setDepense]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [confirmModal, setConfirmModal] = useState(null)

  const [showRejeter,   setShowRejeter]   = useState(false)
  const [rejeterMotif,  setRejeterMotif]  = useState('')
  const [rejeterError,  setRejeterError]  = useState('')
  const [rejeterSaving, setRejeterSaving] = useState(false)
  const [validating,    setValidating]    = useState(false)

  const load = () => {
    setLoading(true)
    getDepense(id)
      .then(r => setDepense(r.data?.data ?? r.data))
      .catch(() => navigate(basePath))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const handleValider = () => {
    setConfirmModal({
      title: 'Valider la dépense',
      message: `Confirmer la validation de ${depense?.reference} (${fmt(depense?.montant)} FCFA) ?`,
      confirmLabel: 'Valider',
      variant: 'success',
      onConfirm: async () => {
        setValidating(true)
        try { await validerDepense(id); notifRefresh(); load() }
        catch (err) { alert(err.response?.data?.detail || 'Erreur') }
        finally { setValidating(false) }
      },
    })
  }

  const handleRejeter = async (e) => {
    e.preventDefault()
    if (rejeterMotif.trim().length < 10) { setRejeterError('Motif trop court (min. 10 caractères).'); return }
    setRejeterSaving(true); setRejeterError('')
    try {
      await rejeterDepense(id, { motif: rejeterMotif.trim() })
      notifRefresh(); setShowRejeter(false); load()
    } catch (err) {
      setRejeterError(err.response?.data?.detail || 'Erreur')
    } finally { setRejeterSaving(false) }
  }

  if (loading || !depense) return <div className="page-loader"><div className="spinner" /></div>

  const montant   = parseFloat(depense.montant || 0)
  const enAttente = depense.statut === 'SAISIE'
  const validee   = depense.statut === 'VALIDEE'
  const rejetee   = depense.statut === 'REJETEE'

  const budgetPath = isAdmin
    ? `/budgets/${depense.budget_id}`
    : isComptable
      ? `/validation/${depense.budget_id}`
      : `/mes-budgets/${depense.budget_id}`

  return (
    <div>
      {/* Retour */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          <ArrowLeft size={14} strokeWidth={2} /> Retour
        </button>
      </div>

      {/* Carte principale */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>

        {/* Header navy */}
        <div style={{
          background: 'var(--af-ink)', padding: '20px 28px',
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(255,255,255,.18)', borderRadius: 7,
                  padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                  fontFamily: 'var(--font-mono)', letterSpacing: '.5px',
                }}>
                  {depense.reference}
                </span>
                <DepenseBadge statut={depense.statut} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3 }}>
                {depense.ligne_designation || depense.fournisseur || '—'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', opacity: .55, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Montant</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.5rem', lineHeight: 1 }}>{fmt(montant)}</div>
              <div style={{ fontSize: '11px', opacity: .6, marginTop: 2 }}>FCFA</div>
            </div>
          </div>
        </div>

        {/* Bande budget parent */}
        {depense.budget_id && (
          <div style={{
            padding: '10px 24px', borderBottom: '1px solid var(--color-gray-100)',
            background: 'var(--color-gray-50)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Budget</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, background: 'rgba(184,134,74,0.15)', color: 'var(--color-gold-dark)', padding: '2px 8px', borderRadius: 6 }}>
              {depense.budget_code}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-gray-700)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {depense.budget_nom}
            </span>
            <Link to={budgetPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 600, color: 'var(--color-gold)', textDecoration: 'none', flexShrink: 0 }}>
              <ExternalLink size={12} strokeWidth={2} /> Voir le budget
            </Link>
          </div>
        )}

        {/* ── En-têtes du tableau de la dépense ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 160px 120px 150px',
          padding: '7px 24px', gap: 12,
          background: 'var(--color-gold-soft)', borderBottom: '1px solid rgba(184,134,74,0.15)',
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.4px', color: 'var(--color-gold-dark)',
        }}>
          <span>Désignation / Fournisseur</span>
          <span style={{ textAlign: 'right' }}>Montant</span>
          <span>Date</span>
          <span>Note</span>
        </div>

        {/* ── Ligne de dépense ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 160px 120px 150px',
          padding: '16px 24px', gap: 12, alignItems: 'start',
          borderBottom: '1px solid var(--color-gray-100)',
        }}>
          {/* Désignation */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-gray-900)', marginBottom: 3 }}>
              {depense.ligne_designation || '—'}
            </div>
            {depense.fournisseur && (
              <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
                {depense.fournisseur}
              </div>
            )}
            {depense.enregistre_par && depense.enregistre_par !== '—' && (
              <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginTop: 2 }}>
                Saisi par {depense.enregistre_par}
              </div>
            )}
            {depense.piece_justificative_url && (
              <a
                href={depense.piece_justificative_url}
                target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '12px', fontWeight: 600, color: 'var(--color-gold)', textDecoration: 'none' }}
              >
                <Paperclip size={11} strokeWidth={2} /> Justificatif
              </a>
            )}
          </div>

          {/* Montant */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: 'var(--color-gray-900)' }}>{fmt(montant)}</div>
            <div style={{ fontSize: '10px', color: 'var(--color-gray-400)', marginTop: 1 }}>FCFA</div>
          </div>

          {/* Date */}
          <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', fontFamily: 'var(--font-mono)' }}>
            {fmtDate(depense.date_depense)}
          </div>

          {/* Note */}
          <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', fontStyle: depense.note ? 'italic' : 'normal' }}>
            {depense.note || '—'}
          </div>
        </div>

        {/* Bandeau statut rejet */}
        {rejetee && depense.motif_rejet && (
          <div style={{
            margin: '0 24px 0', padding: '10px 14px',
            background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)',
            borderLeft: '4px solid var(--color-danger-500)', borderRadius: 8,
            display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 12, marginBottom: 4,
          }}>
            <AlertTriangle size={14} style={{ color: 'var(--color-danger-600)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-danger-700)', marginBottom: 3 }}>
                Motif de rejet
                {depense.validateur_nom && <span style={{ fontWeight: 400 }}> — {depense.validateur_nom}</span>}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-danger-800)' }}>{depense.motif_rejet}</div>
            </div>
          </div>
        )}

        {/* Pièces jointes supplémentaires */}
        {depense.pieces?.length > 0 && (
          <div style={{ padding: '10px 24px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {depense.pieces.map(p => (
              <a
                key={p.id} href={p.url} target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 8, fontSize: '12px', fontWeight: 600,
                  background: 'var(--color-gray-50)', color: 'var(--color-gray-700)',
                  border: '1px solid var(--color-gray-200)', textDecoration: 'none',
                }}
              >
                <Paperclip size={11} strokeWidth={2} /> {p.nom || 'Pièce jointe'}
              </a>
            ))}
          </div>
        )}

        {/* ── Footer total + actions ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'var(--af-ink)', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Total dépense
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '18px', color: '#fff' }}>
              {fmt(montant)} FCFA
            </span>
            {validee && depense.validateur_nom && (
              <span style={{ fontSize: '11px', color: '#86EFAC', fontWeight: 500 }}>
                Validée par {depense.validateur_nom}
              </span>
            )}
          </div>

          {isComptable && enAttente && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => { setRejeterMotif(''); setRejeterError(''); setShowRejeter(true) }}
                className="btn btn-md"
                style={{ background: 'rgba(239,68,68,.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,.3)', gap: 6 }}
              >
                <XCircle size={14} strokeWidth={2} /> Rejeter
              </button>
              <button
                onClick={handleValider}
                disabled={validating}
                className="btn btn-md"
                style={{ background: '#16A34A', color: '#fff', border: 'none', gap: 6 }}
              >
                {validating
                  ? <><span className="spinner-sm" /> Validation…</>
                  : <><CheckCircle2 size={14} strokeWidth={2} /> Valider la dépense</>
                }
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal rejet ── */}
      {showRejeter && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRejeter(false) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={15} strokeWidth={2} /> Rejeter la dépense
              </h2>
            </div>
            <form onSubmit={handleRejeter}>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 9, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', marginBottom: 14 }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-danger-600)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '13px', color: 'var(--color-danger-800)' }}>Le gestionnaire sera notifié du rejet et du motif indiqué.</p>
                </div>
                <label className="form-label">Motif de rejet <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
                <textarea
                  required rows={4} className="form-input"
                  placeholder="Expliquer la raison du rejet (min. 10 caractères)…"
                  value={rejeterMotif}
                  onChange={e => setRejeterMotif(e.target.value)}
                  style={{ resize: 'vertical', minHeight: 90 }}
                />
                <div style={{ fontSize: '11px', color: rejeterMotif.length < 10 ? 'var(--color-danger-500)' : 'var(--color-success-600)', marginTop: 4 }}>
                  {rejeterMotif.length} / min 10 caractères
                </div>
                {rejeterError && (
                  <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', marginTop: 10 }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-danger-500)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-danger-700)', fontSize: '12px' }}>{rejeterError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowRejeter(false)} className="btn btn-secondary btn-md">Annuler</button>
                <button type="submit" disabled={rejeterSaving} className="btn btn-danger btn-md" style={{ gap: 6 }}>
                  {rejeterSaving ? <><span className="spinner-sm" /> Rejet…</> : <><XCircle size={14} strokeWidth={2} /> Confirmer le rejet</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
}
