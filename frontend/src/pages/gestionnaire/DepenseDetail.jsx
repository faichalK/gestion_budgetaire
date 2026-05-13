import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getDepense, validerDepense, rejeterDepense,
  uploadPieces, deletePiece, downloadPiece,
} from '../../api/depenses'
import { DepenseBadge } from '../../components/StatusBadge'
import { notifRefresh } from '../../utils/notifRefresh'
import { ConfirmModal } from '../../components/ui'
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Paperclip, ExternalLink, Trash2, Download,
} from '../../components/AtlasIcons'
import { formaterNombre } from '../../utils/formatters'

const fmt     = (n)   => formaterNombre(parseFloat(n) || 0, { maximumFractionDigits: 0 })
const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  : '—'

export default function DepenseDetail({ basePath = '/mes-depenses' }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { isAdmin, isComptable } = useAuth()

  const [depense,      setDepense]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [confirmModal, setConfirmModal] = useState(null)
  const [showRejeter,  setShowRejeter]  = useState(false)
  const [motif,        setMotif]        = useState('')
  const [motifError,   setMotifError]   = useState('')
  const [rejecting,    setRejecting]    = useState(false)
  const [validating,   setValidating]   = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [dragOver,     setDragOver]     = useState(false)
  const [pieceError,   setPieceError]   = useState('')
  const fileRef = useRef(null)
  const loadRef = useRef(() => {})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getDepense(id)
      setDepense(r.data?.data ?? r.data)
    } catch {
      navigate(basePath)
    } finally {
      setLoading(false)
    }
  }, [id, basePath, navigate])

  useEffect(() => { loadRef.current = load }, [load])
  useEffect(() => {
    const t = window.setTimeout(() => loadRef.current(), 0)
    return () => window.clearTimeout(t)
  }, [id])

  /* ── Upload pièces ────────────────────────────────────────────────── */
  const handleUpload = async (incoming) => {
    const files = Array.from(incoming).filter(f =>
      /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i.test(f.name)
    )
    if (!files.length) return
    setPieceError(''); setUploading(true)
    try {
      await uploadPieces(depense.id, files)
      await load()
    } catch (err) {
      setPieceError(err.response?.data?.detail || 'Erreur lors du téléversement.')
    } finally { setUploading(false) }
  }

  /* ── Supprimer pièce ──────────────────────────────────────────────── */
  const handleDeletePiece = (piece) => {
    setConfirmModal({
      title: 'Supprimer la pièce',
      message: `Supprimer « ${piece.nom_original} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deletePiece(depense.id, piece.id)
          await load()
        } catch (err) {
          setPieceError(err.response?.data?.detail || 'Erreur lors de la suppression.')
        }
      },
    })
  }

  /* ── Valider ──────────────────────────────────────────────────────── */
  const handleValider = () => {
    setConfirmModal({
      title: 'Valider la dépense',
      message: `Confirmer la validation de ${fmt(depense.montant_total)} FCFA sur ${depense.lignes?.length || 0} ligne(s) ?`,
      confirmLabel: 'Valider',
      variant: 'success',
      onConfirm: async () => {
        setValidating(true)
        try {
          await validerDepense(depense.id)
          notifRefresh()
          await load()
        } finally { setValidating(false) }
      },
    })
  }

  /* ── Rejeter ──────────────────────────────────────────────────────── */
  const handleRejeter = async (e) => {
    e.preventDefault()
    if (motif.trim().length < 10) { setMotifError('Motif trop court (min. 10 caractères).'); return }
    setRejecting(true); setMotifError('')
    try {
      await rejeterDepense(depense.id, { motif: motif.trim() })
      notifRefresh()
      setShowRejeter(false)
      await load()
    } catch (err) {
      setMotifError(err.response?.data?.detail || 'Erreur lors du rejet.')
    } finally { setRejecting(false) }
  }

  if (loading || !depense) return <div className="af-loader"><div className="af-spinner" /></div>

  const statut    = depense.statut
  const enAttente = statut === 'SAISIE'
  const validee   = statut === 'VALIDEE'
  const rejetee   = statut === 'REJETEE'
  const lignes    = depense.lignes || []
  const pieces    = depense.pieces || []

  const titrePrincipal = depense.note || depense.fournisseur || `Dépense ${String(depense.id).slice(0, 8).toUpperCase()}`

  const peutGererPieces = enAttente && (isAdmin || (!isComptable))
  const peutModifierPieces = peutGererPieces || (validee && isAdmin)

  const budgetPath = isAdmin
    ? `/budgets/${depense.budget_id}`
    : isComptable
      ? `/validation/${depense.budget_id}`
      : `/mes-budgets/${depense.budget_id}`

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm btn-sm" style={{ gap: 6 }}>
          <ArrowLeft size={14} strokeWidth={2} /> Retour
        </button>
      </div>

      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] overflow-hidden mb-5">

        {/* ── Header ── */}
        <div style={{ background: 'var(--af-steel)', padding: '20px 28px', borderBottom: '1px solid var(--af-line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <DepenseBadge statut={statut} />
                {lignes.length > 1 && (
                  <span style={{ fontSize: '11px', color: 'var(--af-mute)', background: 'var(--af-line)', padding: '2px 8px', borderRadius: 6 }}>
                    {lignes.length} lignes budgétaires
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3, color: 'var(--af-ink)', marginBottom: 2 }}>
                {titrePrincipal}
              </div>
              {depense.fournisseur && depense.note && (
                <div style={{ fontSize: '12px', color: 'var(--af-mute)' }}>{depense.fournisseur}</div>
              )}
              {depense.enregistre_par && (
                <div style={{ fontSize: '11px', color: 'var(--af-mute)', marginTop: 4 }}>
                  Soumis par {depense.enregistre_par} · {fmtDate(depense.date)}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', color: 'var(--af-mute)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>
                Total dépense
              </div>
              <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 900, fontSize: '1.5rem', lineHeight: 1, color: 'var(--af-ink)' }}>
                {fmt(depense.montant_total)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--af-mute)', marginTop: 2 }}>FCFA</div>
            </div>
          </div>
        </div>

        {/* ── Bande budget ── */}
        {depense.budget_id && (
          <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--af-line)', background: 'var(--af-steel)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--af-mute)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Budget</span>
            <span style={{ fontFamily: 'var(--af-mono)', fontSize: '11px', fontWeight: 700, background: 'rgba(184,134,74,0.15)', color: 'var(--color-gold-dark)', padding: '2px 8px', borderRadius: 6 }}>
              {depense.budget_code}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--af-cream)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {depense.budget_nom}
            </span>
            <Link to={budgetPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 600, color: 'var(--color-gold)', textDecoration: 'none', flexShrink: 0 }}>
              <ExternalLink size={12} strokeWidth={2} /> Voir le budget
            </Link>
          </div>
        )}

        {/* ── En-têtes colonnes lignes ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 160px 130px',
          padding: '7px 24px', gap: 12,
          background: 'var(--af-steel)', borderBottom: '1px solid var(--af-line)',
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.4px', color: 'var(--af-mute)',
        }}>
          <span>Ligne budgétaire</span>
          <span style={{ textAlign: 'right' }}>Montant</span>
          <span>Date</span>
        </div>

        {/* ── Lignes de la dépense ── */}
        {lignes.map((cl, idx) => (
          <div key={cl.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 160px 130px',
            padding: '14px 24px', gap: 12, alignItems: 'start',
            borderBottom: idx < lignes.length - 1 ? '1px solid var(--af-line)' : 'none',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--af-ink)', marginBottom: 2 }}>
                {cl.ligne_libelle || '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--af-mute)' }}>
                {[cl.cat_libelle, cl.sous_cat_libelle].filter(l => l && l !== '—').join(' › ')}
              </div>
              {cl.note && (
                <div style={{ fontSize: '11px', color: 'var(--af-cream)', marginTop: 2, fontStyle: 'italic' }}>
                  {cl.note}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--af-ink)' }}>
                {fmt(cl.montant)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--af-mute)', marginTop: 1 }}>FCFA</div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--af-cream)', fontFamily: 'var(--af-mono)' }}>
              {fmtDate(cl.date)}
            </div>
          </div>
        ))}

        {/* ── Pièces justificatives ── */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--af-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--af-mute)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Pièces justificatives
              {pieces.length > 0 && (
                <span style={{ marginLeft: 6, background: 'rgba(184,134,74,0.15)', color: 'var(--color-gold-dark)', padding: '1px 7px', borderRadius: 9999, fontWeight: 700 }}>
                  {pieces.length}
                </span>
              )}
            </span>
            {peutModifierPieces && (
              <>
                <input
                  ref={fileRef} type="file" multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  style={{ display: 'none' }}
                  onChange={e => { handleUpload(e.target.files); e.target.value = '' }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 6, fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', border: '1px solid rgba(184,134,74,0.35)',
                    background: 'rgba(184,134,74,0.08)', color: 'var(--color-gold-dark)',
                    transition: 'all .15s',
                  }}
                >
                  {uploading
                    ? <><span className="af-spinner" style={{ width: 12, height: 12 }} /> Téléversement…</>
                    : <><Paperclip size={12} strokeWidth={2} /> Ajouter des pièces</>
                  }
                </button>
              </>
            )}
          </div>

          {/* Zone drag & drop si aucune pièce et upload autorisé */}
          {pieces.length === 0 && peutModifierPieces && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `1.5px dashed ${dragOver ? 'var(--color-gold)' : 'var(--af-line-2)'}`,
                borderRadius: 8, padding: '20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: dragOver ? 'var(--color-gold-soft)' : 'var(--af-steel)',
                cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
              }}
            >
              <Paperclip size={20} strokeWidth={1.5} style={{ color: dragOver ? 'var(--color-gold)' : 'var(--af-mute)' }} />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--af-cream)' }}>
                Aucune pièce jointe — déposez des fichiers ici
              </span>
              <span style={{ fontSize: '11px', color: 'var(--af-mute)' }}>
                PDF, image, Word, Excel · max 5 Mo/fichier · 20 Mo total
              </span>
            </div>
          )}

          {/* Liste des pièces */}
          {pieces.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pieces.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: '#fff', border: '1px solid var(--af-line)',
                }}>
                  <Paperclip size={13} strokeWidth={2} style={{ color: 'var(--af-mute)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--af-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nom_original}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--af-mute)' }}>
                      {p.taille_lisible} · {p.type_mime}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadPiece(p.id, p.nom_original)}
                    title="Télécharger"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-gold)', display: 'flex', alignItems: 'center' }}
                  >
                    <Download size={14} strokeWidth={2} />
                  </button>
                  {peutModifierPieces && (
                    <button
                      type="button"
                      onClick={() => handleDeletePiece(p)}
                      title="Supprimer"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-danger-500)', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}

              {/* Ajouter pièce supplémentaire par drag & drop */}
              {peutModifierPieces && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `1px dashed ${dragOver ? 'var(--color-gold)' : 'var(--af-line)'}`,
                    borderRadius: 8, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: dragOver ? 'var(--color-gold-soft)' : 'transparent',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  <Paperclip size={12} strokeWidth={2} style={{ color: 'var(--af-mute)' }} />
                  <span style={{ fontSize: '11.5px', color: 'var(--af-mute)' }}>
                    Déposer d'autres fichiers ou <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>parcourir</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {pieceError && (
            <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, marginTop: 8, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <AlertTriangle size={13} style={{ color: 'var(--color-danger-500)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: 'var(--color-danger-700)', fontSize: '12px' }}>{pieceError}</span>
            </div>
          )}

          {enAttente && pieces.length === 0 && (
            <p style={{ fontSize: '11px', color: 'var(--color-danger-500)', marginTop: 6, fontWeight: 600 }}>
              ⚠ Au moins une pièce justificative est requise avant la validation.
            </p>
          )}
        </div>

        {/* ── Motif de rejet ── */}
        {rejetee && depense.motif_rejet && (
          <div style={{ margin: '12px 24px', padding: '10px 14px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', borderLeft: '4px solid var(--color-danger-500)', borderRadius: 8, display: 'flex', gap: 10 }}>
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

        {/* ── Footer total + actions ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', borderTop: '1px solid var(--af-line)',
          background: 'var(--af-ink)', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Total
            </span>
            <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 900, fontSize: '18px', color: '#fff' }}>
              {fmt(depense.montant_total)} FCFA
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
                onClick={() => { setMotif(''); setMotifError(''); setShowRejeter(true) }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(220,38,38,.2)', color: '#FCA5A5', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,.2)'; e.currentTarget.style.color = '#FCA5A5' }}
              >
                <XCircle size={14} strokeWidth={2} /> Rejeter
              </button>
              <button
                onClick={handleValider}
                disabled={validating}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,.3)', background: validating ? '#16A34A' : 'rgba(22,163,74,.2)', color: '#86EFAC', transition: 'all .15s' }}
                onMouseEnter={e => { if (!validating) { e.currentTarget.style.background = '#16A34A'; e.currentTarget.style.color = '#fff' } }}
                onMouseLeave={e => { if (!validating) { e.currentTarget.style.background = 'rgba(22,163,74,.2)'; e.currentTarget.style.color = '#86EFAC' } }}
              >
                {validating
                  ? <><span className="af-spinner" style={{ width: 14, height: 14 }} /> Validation…</>
                  : <><CheckCircle2 size={14} strokeWidth={2} /> Valider</>
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
              <h2 style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={15} strokeWidth={2} /> Rejeter la dépense
              </h2>
            </div>
            <form onSubmit={handleRejeter}>
              <div className="modal-body">
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--af-steel)', border: '1px solid var(--af-line)', marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--af-ink)', marginBottom: 4 }}>
                    {titrePrincipal}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--af-cream)' }}>
                    <span>{lignes.length} ligne{lignes.length !== 1 ? 's' : ''}</span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700 }}>{fmt(depense.montant_total)} FCFA</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', marginBottom: 14 }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-danger-600)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '12px', color: 'var(--color-danger-700)', margin: 0 }}>
                    Le gestionnaire sera notifié du rejet. Toutes les lignes seront rejetées.
                  </p>
                </div>

                <label className="form-label">Motif de rejet <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
                <textarea
                  required rows={4} className="form-input"
                  placeholder="Expliquer la raison du rejet (min. 10 caractères)…"
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  style={{ resize: 'vertical', minHeight: 90 }}
                />
                <div style={{ fontSize: '11px', color: motif.length < 10 ? 'var(--color-danger-500)' : 'var(--color-success-600)', marginTop: 4 }}>
                  {motif.length} / min 10 caractères
                </div>

                {motifError && (
                  <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', marginTop: 10 }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-danger-500)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-danger-700)', fontSize: '12px' }}>{motifError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowRejeter(false)} className="btn btn-secondary btn-sm">Annuler</button>
                <button type="submit" disabled={rejecting} className="btn btn-danger btn-sm" style={{ gap: 6 }}>
                  {rejecting
                    ? <><span className="af-spinner" style={{ width: 14, height: 14 }} /> Rejet…</>
                    : <><XCircle size={14} strokeWidth={2} /> Confirmer le rejet</>
                  }
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
