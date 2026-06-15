import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getDepense, validerDepense, rejeterDepense,
  uploadPieces, deletePiece, downloadPiece,
} from '../../api/depenses'
import PiecePreview from '../../components/PiecePreview'
import { DepenseBadge } from '../../components/StatusBadge'
import { notifRefresh } from '../../utils/notifRefresh'
import { ConfirmModal } from '../../components/ui'
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Paperclip, ExternalLink, Trash2, Download, Eye,
} from '../../components/AtlasIcons'
import { formaterNombre } from '../../utils/formatters'

const fmt     = (n)   => formaterNombre(parseFloat(n) || 0, { maximumFractionDigits: 0 })
const fmtM    = (n)   => formaterNombre(Number(n) / 1e6, { maximumFractionDigits: 2 })
const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  : '—'

const STATUT_CFG = {
  SAISIE:  { label: 'En attente',  color: '#D97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.3)'  },
  VALIDEE: { label: 'Validée',     color: '#15803D', bg: 'rgba(21,128,61,0.06)',   border: 'rgba(21,128,61,0.25)' },
  REJETEE: { label: 'Rejetée',     color: '#B91C1C', bg: 'rgba(185,28,28,0.05)',   border: 'rgba(185,28,28,0.2)'  },
}

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
  const [uploading,     setUploading]     = useState(false)
  const [dragOver,      setDragOver]      = useState(false)
  const [pieceError,    setPieceError]    = useState('')
  const [pieceModal, setPieceModal] = useState({ open: false, selected: null })
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


  const handleUpload = async (incoming) => {
    const files = Array.from(incoming).filter(f =>
      /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i.test(f.name)
    )
    if (!files.length) return
    setPieceError(''); setUploading(true)
    try { await uploadPieces(depense.id, files); await load() }
    catch (err) { setPieceError(err.response?.data?.detail || 'Erreur lors du téléversement.') }
    finally { setUploading(false) }
  }

  const handleDeletePiece = (piece) => {
    setConfirmModal({
      title: 'Supprimer la pièce',
      message: `Supprimer « ${piece.nom_original} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
      onConfirm: async () => {
        try { await deletePiece(depense.id, piece.id); await load() }
        catch (err) { setPieceError(err.response?.data?.detail || 'Erreur.') }
      },
    })
  }

  const handleValider = () => {
    setConfirmModal({
      title: 'Valider la dépense',
      message: `Confirmer la validation de ${fmt(depense.montant_total)} FCFA sur ${depense.lignes?.length || 0} ligne(s) ?`,
      confirmLabel: 'Valider',
      variant: 'success',
      onConfirm: async () => {
        setValidating(true)
        try { await validerDepense(depense.id); notifRefresh(); await load() }
        finally { setValidating(false) }
      },
    })
  }

  const handleRejeter = async (e) => {
    e.preventDefault()
    if (motif.trim().length < 10) { setMotifError('Motif trop court (min. 10 caractères).'); return }
    setRejecting(true); setMotifError('')
    try {
      await rejeterDepense(depense.id, { motif: motif.trim() })
      notifRefresh(); setShowRejeter(false); await load()
    } catch (err) { setMotifError(err.response?.data?.detail || 'Erreur lors du rejet.') }
    finally { setRejecting(false) }
  }

  if (loading || !depense) return <div className="af-loader"><div className="af-spinner" /></div>

  const statut    = depense.statut
  const enAttente = statut === 'SAISIE'
  const validee   = statut === 'VALIDEE'
  const rejetee   = statut === 'REJETEE'
  const lignes    = depense.lignes || []
  const pieces    = depense.pieces || []
  const cfg       = STATUT_CFG[statut] || STATUT_CFG.SAISIE

  const titre    = depense.reference || `DEP-${String(depense.id).slice(0, 6).toUpperCase()}`
  const sousTitre = depense.fournisseur || depense.note || 'Dépense'

  const peutGererPieces    = enAttente && (isAdmin || !isComptable)
  const peutModifierPieces = peutGererPieces || (validee && isAdmin)

  const budgetPath = isAdmin
    ? `/budgets/${depense.budget_id}`
    : isComptable
      ? `/validation/${depense.budget_id}`
      : `/mes-budgets/${depense.budget_id}`

  const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

  return (
    <div>

      {/* ── Header (même style que BudgetDetail) ──────────────────────────── */}
      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] mb-[14px]">
        <div style={{ padding: '20px 24px' }}>
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div style={{ minWidth: 0 }}>
              <div className="flex gap-2 mb-2.5 flex-wrap items-center">
                <span className="font-mono text-[11px] font-bold bg-[#EDE7DA] text-[#0E2A47] px-2.5 py-[3px] rounded-[6px]">
                  {titre}
                </span>
                {depense.budget_code && (
                  <span className="font-mono text-[11px] font-semibold px-2.5 py-[3px] rounded-[6px]"
                    style={{ background: 'rgba(184,134,74,0.12)', color: '#B8864A' }}>
                    {depense.budget_code}
                  </span>
                )}
                <DepenseBadge statut={statut} />
              </div>
              <div className="text-[18px] font-extrabold text-[#0E2A47] leading-[1.25] mb-1.5">
                {sousTitre}
              </div>
              <div className="flex gap-3 text-[12px] text-[rgba(90,107,126,0.7)] flex-wrap">
                {depense.date && <span>Soumis le {fmtDate(depense.date)}</span>}
                {depense.enregistre_par && <span>· Par {depense.enregistre_par}</span>}
                {validee && depense.validateur_nom && (
                  <span className="text-[#15803D] font-medium">· Validé par {depense.validateur_nom}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0 flex-wrap">
              <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                <ArrowLeft size={13} strokeWidth={2} /> Retour
              </button>
              {isComptable && enAttente && (
                <>
                  <button
                    onClick={() => { setMotif(''); setMotifError(''); setShowRejeter(true) }}
                    className="btn btn-danger btn-sm" style={{ gap: 6 }}
                  >
                    <XCircle size={13} strokeWidth={2} /> Rejeter
                  </button>
                  <button onClick={handleValider} disabled={validating} className="btn btn-gold btn-sm" style={{ gap: 6 }}>
                    {validating
                      ? <><span className="spinner-sm" /> Validation…</>
                      : <><CheckCircle2 size={13} strokeWidth={2} /> Valider</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-[14px] mb-[14px]">
        {[
          { label: 'Montant total',      value: fmtM(depense.montant_total), unit: ' M FCFA', sub: `${fmt(depense.montant_total)} FCFA`, delta: 'flat' },
          { label: 'Lignes budgétaires', value: lignes.length, unit: '',      sub: `ligne${lignes.length !== 1 ? 's' : ''} de consommation`, delta: 'flat' },
          { label: 'Pièces jointes',     value: pieces.length, unit: '',      sub: `pièce${pieces.length !== 1 ? 's' : ''} justificative${pieces.length !== 1 ? 's' : ''}`, delta: pieces.length > 0 ? 'up' : 'flat' },
          { label: 'Statut',             value: cfg.label,     unit: '',      sub: validee && depense.validateur_nom ? `par ${depense.validateur_nom}` : enAttente ? 'En cours de traitement' : 'Voir motif ci-dessous', delta: validee ? 'up' : rejetee ? 'down' : 'flat', valueColor: cfg.color },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">{k.label}</div>
            <div className="text-[26px] leading-none tracking-[-0.02em] mb-1.5 tabular-nums font-bold" style={{ color: k.valueColor || '#0E2A47' }}>
              {k.value}<span className="text-[#B8864A] text-[14px] ml-0.5">{k.unit}</span>
            </div>
            <div className={`text-[11px] ${DELTA[k.delta]}`}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Synthèse + Budget associé ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 14 }}>

        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
          <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Synthèse</div>
          </div>
          <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
            {[
              { label: 'Référence',   val: titre },
              { label: 'Fournisseur', val: depense.fournisseur || '—' },
              { label: 'Description', val: depense.note || '—' },
              { label: 'Date soumis', val: fmtDate(depense.date) },
              { label: 'Soumis par',  val: depense.enregistre_par || '—' },
              ...(depense.validateur_nom ? [{ label: validee ? 'Validé par' : 'Traité par', val: depense.validateur_nom }] : []),
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', flexDirection: 'column', padding: '6px 0', borderBottom: '1px solid var(--af-line)' }}>
                <span style={{ fontSize: 11, color: 'var(--af-mute)', marginBottom: 2 }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--af-ivory)', wordBreak: 'break-word' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Budget associé</div>
            {depense.budget_id && (
              <Link to={budgetPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#B8864A', textDecoration: 'none' }}>
                <ExternalLink size={12} strokeWidth={2} /> Voir le budget
              </Link>
            )}
          </div>
          <div style={{ padding: '14px 20px' }}>
            {depense.budget_id ? (
              <>
                <div style={{ fontFamily: 'var(--af-mono)', fontSize: 13, fontWeight: 700, color: '#B8864A', background: 'rgba(184,134,74,0.10)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginBottom: 10 }}>
                  {depense.budget_code}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ivory)', lineHeight: 1.4 }}>{depense.budget_nom}</div>
                <div style={{ marginTop: 12, padding: '10px 14px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, fontSize: 12, color: cfg.color, fontWeight: 600 }}>
                  {cfg.label} — {fmt(depense.montant_total)} FCFA
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--af-mute)', fontStyle: 'italic' }}>Dépense hors budget</div>
            )}
            {rejetee && depense.motif_rejet && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(185,28,28,0.05)', border: '1px solid rgba(185,28,28,0.2)', borderLeft: '3px solid #B91C1C', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#B91C1C', marginBottom: 4 }}>Motif de rejet</div>
                <div style={{ fontSize: 12, color: 'var(--af-ivory)', lineHeight: 1.5 }}>{depense.motif_rejet}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lignes budgétaires ─────────────────────────────────────────────── */}
      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] mb-[14px]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
          <div className="text-[13px] font-semibold text-[#0E2A47]">Lignes budgétaires</div>
          <span style={{ fontSize: 12, color: 'var(--af-mute)' }}>{lignes.length} ligne{lignes.length !== 1 ? 's' : ''}</span>
        </div>
        {lignes.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
            Aucune ligne budgétaire associée.
          </div>
        ) : (() => {
          const grouped = {}
          lignes.forEach(cl => {
            const ck = cl.cat_code || cl.cat_libelle || '—'
            const sk = cl.sous_cat_code || cl.sous_cat_libelle || '—'
            if (!grouped[ck]) grouped[ck] = { code: cl.cat_code, libelle: cl.cat_libelle || ck, sous_cats: {} }
            if (!grouped[ck].sous_cats[sk]) grouped[ck].sous_cats[sk] = { code: cl.sous_cat_code, libelle: cl.sous_cat_libelle || sk, lignes: [] }
            grouped[ck].sous_cats[sk].lignes.push(cl)
          })
          return (
            <table className="af-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '38%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '26%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Intitulé</th>
                  <th style={{ textAlign: 'right' }}>Montant</th>
                  <th>Date</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).flatMap(([ck, cat]) => [
                  <tr key={`cat-${ck}`} style={{ background: 'rgba(14,42,71,0.055)' }}>
                    <td colSpan={4} style={{ padding: '8px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0E2A47', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {cat.code && `${cat.code} — `}{cat.libelle}
                      </span>
                    </td>
                  </tr>,
                  ...Object.entries(cat.sous_cats).flatMap(([sk, sc]) => [
                    <tr key={`sc-${sk}`} style={{ background: 'rgba(14,42,71,0.025)' }}>
                      <td colSpan={4} style={{ padding: '6px 28px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#5A6B7E' }}>
                          {sc.code && `${sc.code} — `}{sc.libelle}
                        </span>
                      </td>
                    </tr>,
                    ...sc.lignes.map(cl => (
                      <tr key={cl.id}>
                        <td style={{ paddingLeft: 40, fontWeight: 600, fontSize: 12, color: '#0E2A47' }}>
                          {cl.ligne_libelle || '—'}
                          {cl.ligne_code && <span style={{ marginLeft: 8, fontSize: 10, fontFamily: 'var(--af-mono)', background: 'rgba(14,42,71,0.06)', color: '#5A6B7E', padding: '1px 6px', borderRadius: 3 }}>{cl.ligne_code}</span>}
                        </td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--af-ink)' }}>{fmt(cl.montant)} FCFA</td>
                        <td className="muted">{fmtDate(cl.date)}</td>
                        <td className="muted" style={{ fontStyle: cl.note ? 'normal' : 'italic' }}>{cl.note || '—'}</td>
                      </tr>
                    )),
                  ]),
                ])}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--af-steel)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--af-ink)' }}>Total</td>
                  <td className="num" style={{ padding: '10px 16px', fontWeight: 800, color: 'var(--af-ink)', fontFamily: 'var(--af-mono)' }}>
                    {fmt(depense.montant_total)} FCFA
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )
        })()}
      </div>

      {/* ── Pièces justificatives + Visualiseur ───────────────────────────── */}
      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] mt-[14px]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Pièces justificatives</div>
            {pieces.length > 0 && (
              <span style={{ background: 'rgba(184,134,74,0.15)', color: '#B8864A', padding: '1px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                {pieces.length}
              </span>
            )}
          </div>
          {peutModifierPieces && (
            <>
              <input ref={fileRef} type="file" multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={e => { handleUpload(e.target.files); e.target.value = '' }}
              />
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
                className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                {uploading
                  ? <><span className="spinner-sm" /> Téléversement…</>
                  : <><Paperclip size={12} strokeWidth={2} /> Ajouter</>}
              </button>
            </>
          )}
        </div>

        {/* Zone vide */}
        {pieces.length === 0 && (
          <div style={{ padding: '16px 20px' }}>
            {peutModifierPieces ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragOver ? '#B8864A' : 'var(--af-line)'}`,
                  borderRadius: 10, padding: '40px 20px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  background: dragOver ? 'rgba(184,134,74,0.06)' : 'var(--af-steel)',
                  cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
                }}
              >
                <Paperclip size={26} strokeWidth={1.5} style={{ color: dragOver ? '#B8864A' : 'var(--af-mute)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-cream)' }}>
                  Aucune pièce — déposez un fichier ici
                </span>
                <span style={{ fontSize: 11, color: 'var(--af-mute)' }}>PDF, image, Word, Excel · max 5 Mo/fichier</span>
              </div>
            ) : (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
                Aucune pièce justificative.
                {enAttente && (
                  <span style={{ display: 'block', marginTop: 4, color: '#B91C1C', fontWeight: 600, fontSize: 12 }}>
                    ⚠ Au moins une pièce est requise avant la validation.
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Liste des pièces */}
        {pieces.length > 0 && (
          <div>
            {pieces.map(p => {
              const isImg = p.type_mime?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(p.nom_original || '')
              const isPdf = p.type_mime === 'application/pdf' || p.nom_original?.toLowerCase().endsWith('.pdf')
              const typeIcon = isImg ? '🖼' : isPdf ? '📄' : '📎'
              return (
                <div
                  key={p.id}
                  onClick={() => setPieceModal({ open: true, selected: p })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px', borderBottom: '1px solid var(--af-line)',
                    cursor: 'pointer', transition: 'background .1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,42,71,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{typeIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--af-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nom_original}
                    </div>
                    {p.taille_lisible && (
                      <div style={{ fontSize: 10, color: 'var(--af-mute)' }}>{p.taille_lisible}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button type="button" title="Aperçu"
                      onClick={() => setPieceModal({ open: true, selected: p })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#0E2A47', display: 'flex', alignItems: 'center' }}>
                      <Eye size={13} strokeWidth={2} />
                    </button>
                    <button type="button" title="Télécharger"
                      onClick={() => downloadPiece(p.id, p.nom_original)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#B8864A', display: 'flex', alignItems: 'center' }}>
                      <Download size={13} strokeWidth={2} />
                    </button>
                    {peutModifierPieces && (
                      <button type="button" title="Supprimer"
                        onClick={() => handleDeletePiece(p)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#B91C1C', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {peutModifierPieces && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
                onClick={() => fileRef.current?.click()}
                style={{
                  margin: '8px 16px', border: `1px dashed ${dragOver ? '#B8864A' : 'var(--af-line)'}`,
                  borderRadius: 8, padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', transition: 'all .15s',
                  background: dragOver ? 'rgba(184,134,74,0.06)' : 'transparent',
                }}
              >
                <Paperclip size={11} strokeWidth={2} style={{ color: 'var(--af-mute)' }} />
                <span style={{ fontSize: 11, color: 'var(--af-mute)' }}>Ajouter une pièce</span>
              </div>
            )}
          </div>
        )}

        {pieceError && (
          <div style={{ display: 'flex', gap: 8, padding: '8px 14px', borderTop: '1px solid var(--af-line)', background: 'rgba(185,28,28,0.04)' }}>
            <AlertTriangle size={13} style={{ color: '#B91C1C', flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: '#B91C1C', fontSize: 12 }}>{pieceError}</span>
          </div>
        )}
      </div>

      {/* ── Modal visualisation pièce ─────────────────────────────────────── */}
      {pieceModal.open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPieceModal({ open: false, selected: null }) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 860, width: '95vw' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, fontSize: 15 }}>Pièces justificatives — {titre}</h2>
              <button onClick={() => setPieceModal({ open: false, selected: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--af-mute)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: pieces.length > 1 ? '220px 1fr' : '1fr', minHeight: 420 }}>
                {pieces.length > 1 && (
                  <div style={{ borderRight: '1px solid rgba(14,42,71,0.08)', padding: '8px 0', background: '#FAFAFA' }}>
                    {pieces.map(p => {
                      const isImg = p.type_mime?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(p.nom_original || '')
                      const isPdf = p.type_mime === 'application/pdf' || p.nom_original?.toLowerCase().endsWith('.pdf')
                      const emoji = isImg ? '🖼' : isPdf ? '📄' : '📎'
                      const isSel = pieceModal.selected?.id === p.id
                      return (
                        <button key={p.id} onClick={() => setPieceModal(m => ({ ...m, selected: p }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: isSel ? 'rgba(184,134,74,0.08)' : 'none', border: 'none', borderLeft: isSel ? '3px solid #B8864A' : '3px solid transparent', cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(14,42,71,0.04)' }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'none' }}
                        >
                          <span style={{ fontSize: 18 }}>{emoji}</span>
                          <span style={{ fontSize: 11, color: 'var(--af-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.nom_original || `Pièce ${String(p.id).slice(0, 6)}`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', padding: 24, minHeight: 420 }}>
                  {pieceModal.selected ? (
                    <>
                      <PiecePreview piece={pieceModal.selected} maxHeight={460} />
                      <div style={{ marginTop: 14 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ gap: 6 }}
                          onClick={() => downloadPiece(pieceModal.selected.id, pieceModal.selected.nom_original)}
                        >
                          <Download size={12} strokeWidth={2} /> Télécharger
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--af-mute)', fontSize: 13 }}>Aucune pièce sélectionnée</div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setPieceModal({ open: false, selected: null })} className="btn btn-secondary btn-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal rejet ──────────────────────────────────────────────────────── */}
      {showRejeter && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRejeter(false) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={15} strokeWidth={2} /> Rejeter la dépense
              </h2>
            </div>
            <form onSubmit={handleRejeter}>
              <div className="modal-body">
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--af-steel)', border: '1px solid var(--af-line)', marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--af-ink)', marginBottom: 4 }}>{sousTitre}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--af-cream)' }}>
                    <span>{lignes.length} ligne{lignes.length !== 1 ? 's' : ''}</span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700 }}>{fmt(depense.montant_total)} FCFA</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(185,28,28,0.05)', border: '1px solid rgba(185,28,28,0.2)', marginBottom: 14 }}>
                  <AlertTriangle size={14} style={{ color: '#B91C1C', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>
                    Le gestionnaire sera notifié du rejet.
                  </p>
                </div>
                <label className="form-label">Motif de rejet <span style={{ color: '#B91C1C' }}>*</span></label>
                <textarea required rows={4} className="form-input"
                  placeholder="Expliquer la raison du rejet (min. 10 caractères)…"
                  value={motif} onChange={e => setMotif(e.target.value)}
                  style={{ resize: 'vertical', minHeight: 90 }}
                />
                <div style={{ fontSize: 11, color: motif.length < 10 ? '#B91C1C' : '#15803D', marginTop: 4 }}>
                  {motif.length} / min 10 caractères
                </div>
                {motifError && (
                  <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(185,28,28,0.05)', border: '1px solid rgba(185,28,28,0.2)', marginTop: 10 }}>
                    <AlertTriangle size={13} style={{ color: '#B91C1C', flexShrink: 0 }} />
                    <span style={{ color: '#B91C1C', fontSize: 12 }}>{motifError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowRejeter(false)} className="btn btn-secondary btn-sm">Annuler</button>
                <button type="submit" disabled={rejecting} className="btn btn-danger btn-sm" style={{ gap: 6 }}>
                  {rejecting
                    ? <><span className="spinner-sm" /> Rejet…</>
                    : <><XCircle size={14} strokeWidth={2} /> Confirmer le rejet</>}
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
