import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getBudget, updateBudget, soumettreBudget,
  exportBudgetExcel, exportBudgetPdf, exportDepensesExcel, exportDepensesPdf,
} from '../../api/budget'
import { getDepenses } from '../../api/depenses'
import { getScoreBudget } from '../../api/ia'
import { StatutBadge, AlerteBadge } from '../../components/StatusBadge'
import LignesBudgetaires from '../../components/budget/LignesBudgetaires'
import DepenseMultiModal from '../../components/budget/DepenseMultiModal'
import { notifRefresh } from '../../utils/notifRefresh'
import { ConfirmModal } from '../../components/ui'
import {
  ArrowLeft, Pencil, Send, DollarSign,
  CheckCircle2, AlertTriangle, Info,
  FileText, Paperclip, Download, ChevronDown,
} from '../../components/AtlasIcons'
import { formaterNombre } from '../../utils/formatters'
import { cn } from '../../lib/cn'

const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

const fmt  = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtM = (n) => formaterNombre(Number(n) / 1e6, { maximumFractionDigits: 2 })

const METHOD_LABELS = {
  PERT: 'PERT', ANALOGIE: 'ANALOGIE', ASCENDANTE: 'ASCENDANTE',
  DESCENDANTE: 'DESCENDANTE', PARAMETRIQUE: 'PARAMÉTRIQUE', TROIS_POINTS: '3 POINTS',
}

export default function BudgetDetail({ basePath = '/mes-budgets' }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [budget,    setBudget]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [hasLignes, setHasLignes] = useState(false)
  const [activeTab, setActiveTab] = useState('lignes')

  const [showDepenseModal, setShowDepenseModal] = useState(false)

  const [showEdit,   setShowEdit]   = useState(false)
  const [editForm,   setEditForm]   = useState({ nom: '', date_debut: '', date_fin: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState('')

  const [showSoumission,   setShowSoumission]   = useState(false)
  const [soumissionSaving, setSoumissionSaving] = useState(false)
  const [soumissionError,  setSoumissionError]  = useState('')

  const [depenses,       setDepenses]       = useState([])
  const [depensesLoaded, setDepensesLoaded] = useState(false)

  const [iaScore, setIaScore] = useState(null)

  const [confirmModal, setConfirmModal] = useState(null)

  const [exporting,  setExporting]  = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)
  const loadRef = useRef(() => {})
  const loadDepensesRef = useRef(() => {})

  const load = () => {
    getBudget(id)
      .then(b => {
        setBudget(b.data)
        setHasLignes((b.data.lignes?.length || 0) > 0)
        if (['APPROUVE', 'SOUMIS'].includes(b.data.statut)) {
          getScoreBudget(id).then(r => setIaScore(r.data)).catch(() => {})
        }
      })
      .finally(() => setLoading(false))
  }

  const loadDepenses = () => {
    getDepenses({ budget: id })
      .then(r => {
        const rawDeps = r.data?.data ?? []
        // Flatten Depense.lignes into ConsommationLigne-like records for the existing UI
        setDepenses(rawDeps.flatMap(dep =>
          (dep.lignes?.length ? dep.lignes : [{}]).map(cl => ({
            id:                    dep.id,
            groupe_ref:            dep.id,
            reference:             dep.fournisseur || dep.note || String(dep.id).slice(0, 8).toUpperCase(),
            ligne_designation:     cl.ligne_libelle,
            ligne_code:            cl.ligne_code,
            montant:               cl.montant || dep.montant_total,
            statut:                dep.statut,
            date_depense:          cl.date || dep.date,
            piece_justificative_url: dep.pieces?.[0]?.url_download || null,
            nombre_pieces:         dep.nombre_pieces,
            motif_rejet:           dep.motif_rejet,
          }))
        ))
      })
      .catch(() => {})
      .finally(() => setDepensesLoaded(true))
  }

  useEffect(() => { loadRef.current = load; loadDepensesRef.current = loadDepenses })

  useEffect(() => {
    const t = window.setTimeout(() => loadRef.current?.(), 0)
    return () => window.clearTimeout(t)
  }, [id])

  useEffect(() => {
    if (budget?.statut !== 'APPROUVE' || depensesLoaded) return
    const t = window.setTimeout(() => loadDepensesRef.current?.(), 0)
    return () => window.clearTimeout(t)
  }, [budget?.statut, depensesLoaded])

  useEffect(() => {
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openEdit = () => {
    setEditForm({ nom: budget.nom, date_debut: budget.date_debut, date_fin: budget.date_fin })
    setEditError(''); setShowEdit(true)
  }
  const handleEdit = async (e) => {
    e.preventDefault(); setEditError(''); setEditSaving(true)
    try { await updateBudget(id, editForm); setShowEdit(false); load() }
    catch (err) { setEditError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erreur') }
    finally { setEditSaving(false) }
  }

  const openSoumission = () => { setSoumissionError(''); setShowSoumission(true) }
  const handleSoumettre = async (e) => {
    e.preventDefault(); setSoumissionSaving(true); setSoumissionError('')
    try { await soumettreBudget(id); notifRefresh(); setShowSoumission(false); load() }
    catch (err) { setSoumissionError(err.response?.data?.detail || 'Erreur lors de la soumission') }
    finally { setSoumissionSaving(false) }
  }

  const openDepense = () => setShowDepenseModal(true)
  const closeDepense = () => setShowDepenseModal(false)
  const onDepenseSuccess = () => { setShowDepenseModal(false); load(); loadDepenses() }

  const handleExport = async (fn, key) => {
    if (exporting) return
    setExporting(key)
    try { await fn(id, budget.code) }
    catch (e) { alert(e?.response?.data?.detail || "Erreur lors de l'export") }
    finally { setExporting('') }
  }

  if (loading || !budget) return <div className="af-loader"><div className="af-spinner" /></div>

  const editable  = ['BROUILLON', 'REJETE'].includes(budget.statut)
  const brouillon = budget.statut === 'BROUILLON'
  const approuve  = budget.statut === 'APPROUVE'

  // ── KPI computations ────────────────────────────────────────────────────────
  const lignes        = budget.lignes || []
  const lignesRevenu  = lignes.filter(l => l.section === 'REVENU')
  const lignesDepense = lignes.filter(l => l.section === 'DEPENSE')
  const totalRecettes = lignesRevenu.reduce((s, l) => s + parseFloat(l.montant_alloue || 0), 0)
  const totalDepPrevu = lignesDepense.reduce((s, l) => s + parseFloat(l.montant_alloue || 0), 0)
  const totalEngage   = parseFloat(budget.montant_consomme || 0)
  const montantGlobal = parseFloat(budget.montant_global || 0)
  const taux          = parseFloat(budget.taux_consommation || 0)

  // ── PERT ────────────────────────────────────────────────────────────────────
  const isPERT = budget.technique_estimation === 'TROIS_POINTS'
  const totalO = lignes.reduce((s, l) => s + parseFloat(l.cout_optimiste || 0), 0)
  const totalM = lignes.reduce((s, l) => s + parseFloat(l.cout_probable  || 0), 0)
  const totalP = lignes.reduce((s, l) => s + parseFloat(l.cout_pessimiste || 0), 0)
  const pertEstimate = isPERT && (totalO + totalM + totalP) > 0
    ? (totalO + 4 * totalM + totalP) / 6 : 0

  const tabsDef = [
    { id: 'lignes',   label: 'Lignes budgétaires' },
    ...(approuve ? [{ id: 'depenses', label: `Dépenses${depenses.length > 0 ? ` (${depenses.length})` : ''}` }] : []),
  ]

  const alloc           = budget.allocation_detail
  const allocAlloue     = parseFloat(alloc?.montant_alloue    || 0)
  const allocConsomme   = parseFloat(alloc?.montant_consomme  || 0)
  const allocDisponible = parseFloat(alloc?.montant_disponible || 0)
  const allocTaux       = allocAlloue > 0 ? Math.min(Math.round(allocConsomme / allocAlloue * 100), 100) : 0

  return (
    <div>
      {/* ── Header light ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] mb-[14px]">
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--af-mono)', fontSize: 11, fontWeight: 700, background: 'var(--af-steel)', color: 'var(--af-ink)', padding: '3px 10px', borderRadius: 6 }}>
                  {budget.code}
                </span>
                {budget.departement_nom && (
                  <span className="af-dept-chip">
                    <span className="d" style={{ background: '#C9A961' }} />
                    {budget.departement_nom.replace(/^Ministère (de |du |des |de l')?/i, '').trim().slice(0, 24)}
                  </span>
                )}
                {budget.annee && <span className="af-pill">Exercice {budget.annee}</span>}
                <StatutBadge statut={budget.statut} />
                {budget.technique_estimation && (
                  <span className="af-tag-method">{METHOD_LABELS[budget.technique_estimation] || budget.technique_estimation}</span>
                )}
                <AlerteBadge niveau={budget.niveau_alerte} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--af-ivory)', lineHeight: 1.25, marginBottom: 6 }}>
                {budget.nom}
              </div>
              {(budget.date_debut || budget.gestionnaire_nom) && (
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--af-mute)', flexWrap: 'wrap' }}>
                  {budget.date_debut && <span>{budget.date_debut} → {budget.date_fin}</span>}
                  {budget.gestionnaire_nom && <span>Gestionnaire : {budget.gestionnaire_nom}</span>}
                  {budget.comptable_nom && (
                    <span>
                      {approuve ? '✓ Approuvé' : budget.statut === 'REJETE' ? '✗ Rejeté' : 'Comptable'} : {budget.comptable_nom}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <button onClick={() => navigate(basePath)} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                <ArrowLeft size={13} strokeWidth={2} /> Retour
              </button>
              {editable && !isAdmin && (
                <button onClick={openEdit} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                  <Pencil size={13} strokeWidth={2} /> Modifier
                </button>
              )}
              {brouillon && hasLignes && !isAdmin && (
                <button onClick={openSoumission} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                  <Send size={13} strokeWidth={2} /> Soumettre
                </button>
              )}
              {approuve && !isAdmin && (
                <button onClick={openDepense} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                  <DollarSign size={13} strokeWidth={2} /> Dépense
                </button>
              )}
              <div ref={exportRef} style={{ position: 'relative' }}>
                <button onClick={() => setExportOpen(o => !o)} disabled={!!exporting} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                  {exporting
                    ? <><span className="spinner-sm" /> Export…</>
                    : <><Download size={13} strokeWidth={2} /> Exporter <ChevronDown size={10} strokeWidth={2.5} /></>}
                </button>
                {exportOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--af-line)', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.12)', minWidth: 200, overflow: 'hidden' }}>
                    {[
                      { fn: exportBudgetExcel,   key: 'bxls', label: 'Budget Excel' },
                      { fn: exportBudgetPdf,     key: 'bpdf', label: 'Budget PDF'   },
                      ...(approuve ? [
                        { fn: exportDepensesExcel, key: 'dxls', label: 'Dépenses Excel' },
                        { fn: exportDepensesPdf,   key: 'dpdf', label: 'Dépenses PDF'   },
                      ] : []),
                    ].map(item => (
                      <button key={item.key}
                        onClick={() => { handleExport(item.fn, item.key); setExportOpen(false) }}
                        style={{ display: 'block', width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--af-ivory)', textAlign: 'left', fontWeight: 500 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--af-steel)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >{item.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-[14px] mb-[14px]">
        {lignesRevenu.length > 0 ? (
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Recettes prévues</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
              {fmtM(totalRecettes)}<span className="text-[#B8864A] text-[16px] ml-0.5"> M FCFA</span>
            </div>
            <div className={cn('text-[11px]', DELTA.flat)}>{lignesRevenu.length} ligne{lignesRevenu.length !== 1 ? 's' : ''}</div>
          </div>
        ) : (
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Budget total</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
              {fmtM(montantGlobal)}<span className="text-[#B8864A] text-[16px] ml-0.5"> M FCFA</span>
            </div>
            <div className={cn('text-[11px]', DELTA.flat)}>{lignes.length} ligne{lignes.length !== 1 ? 's' : ''}</div>
          </div>
        )}
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Dépenses prévues</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
            {fmtM(lignesDepense.length > 0 ? totalDepPrevu : montantGlobal)}<span className="text-[#B8864A] text-[16px] ml-0.5"> M FCFA</span>
          </div>
          <div className={cn('text-[11px]', DELTA.flat)}>{lignesDepense.length > 0 ? lignesDepense.length : lignes.length} ligne{(lignesDepense.length || lignes.length) !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Engagé à date</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
            {fmtM(totalEngage)}<span className="text-[#B8864A] text-[16px] ml-0.5"> M FCFA</span>
          </div>
          <div className={cn('text-[11px]', montantGlobal > 0 && totalEngage / montantGlobal > 0.8 ? DELTA.down : DELTA.up)}>
            {montantGlobal > 0 ? `${Math.round(totalEngage / montantGlobal * 100)}%` : '—'} du budget
          </div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Disponible</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
            {fmtM(parseFloat(budget.montant_disponible || 0))}<span className="text-[#B8864A] text-[16px] ml-0.5"> M FCFA</span>
          </div>
          <div className={cn('text-[11px]', parseFloat(budget.montant_disponible || 0) < 0 ? DELTA.down : parseFloat(budget.taux_consommation || 0) > 80 ? DELTA.down : DELTA.flat)}>
            Taux : {Math.round(parseFloat(budget.taux_consommation || 0))}%
          </div>
        </div>
      </div>

      {/* ── 2-column layout ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 14 }}>

        {/* ── Colonne gauche ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Status banners */}
          {(!isAdmin && brouillon && !hasLignes) && (
            <StatusBanner type="info" icon={<FileText size={15} strokeWidth={2} />}>
              Budget en brouillon — ajoutez au moins une ligne budgétaire pour pouvoir le soumettre.
            </StatusBanner>
          )}
          {(!isAdmin && brouillon && hasLignes) && (
            <StatusBanner type="primary" icon={<Info size={15} strokeWidth={2} />}>
              Budget prêt — cliquez sur <strong>Soumettre</strong> pour l'envoyer en validation.
            </StatusBanner>
          )}
          {budget.statut === 'SOUMIS' && (
            <StatusBanner type="primary" icon={<Info size={15} strokeWidth={2} />}>
              Budget soumis — en attente de validation par le comptable.
            </StatusBanner>
          )}
          {(!isAdmin && approuve) && (
            <StatusBanner type="success" icon={<CheckCircle2 size={15} strokeWidth={2} />}>
              Budget approuvé — enregistrez les dépenses réelles avec leurs pièces justificatives.
            </StatusBanner>
          )}
          {budget.statut === 'REJETE' && (
            <div>
              <StatusBanner type="danger" icon={<AlertTriangle size={15} strokeWidth={2} />}>
                Budget rejeté — corrigez les lignes puis soumettez à nouveau.
              </StatusBanner>
              {budget.motif_rejet && (
                <div style={{ marginTop: 8, padding: '12px 16px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, borderLeft: '4px solid #DC2626' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#DC2626', marginBottom: 4 }}>Motif de rejet</div>
                  <div style={{ fontSize: 13, color: 'var(--af-ivory)', lineHeight: 1.55 }}>{budget.motif_rejet}</div>
                </div>
              )}
            </div>
          )}

          {/* Lignes card */}
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
              <div className="text-[13px] font-semibold text-[#0E2A47]">Lignes budgétaires</div>
              <div className="flex items-center gap-2">
                {tabsDef.map(t => (
                  <button key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      'inline-flex px-2.5 py-1 rounded-full text-[12px] border transition-all duration-150',
                      activeTab === t.id
                        ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
                        : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
                    )}
                  >{t.label}</button>
                ))}
              </div>
            </div>

            {activeTab === 'lignes' && (
              <>
                <LignesBudgetaires
                  budgetId={budget.id}
                  readOnly={!editable || isAdmin}
                  onTotalChange={(total) => setHasLignes(total > 0)}
                />
                {isPERT && (totalO + totalM + totalP) > 0 && (
                  <div style={{ padding: '10px 20px', borderTop: '1px solid var(--af-line)', background: 'var(--af-steel)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--af-ink)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Formule PERT</span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontSize: 12, color: 'var(--af-cream)' }}>
                      E = (O + 4M + P) / 6 = <strong style={{ color: 'var(--af-gold)' }}>{fmt(pertEstimate)} FCFA</strong>
                    </span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontSize: 11, color: 'var(--af-mute)' }}>
                      O={fmtM(totalO)}M · M={fmtM(totalM)}M · P={fmtM(totalP)}M
                    </span>
                  </div>
                )}
              </>
            )}

            {activeTab === 'depenses' && (
              <DepensesGroupees depenses={depenses} loaded={depensesLoaded} fmt={fmt} />
            )}
          </div>
        </div>

        {/* ── Colonne droite ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Synthèse */}
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
            <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
              <div className="text-[13px] font-semibold text-[#0E2A47]">Synthèse</div>
            </div>
            <div style={{ padding: '14px 20px' }}>
              {montantGlobal > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--af-cream)' }}>Taux d'exécution</span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: taux > 85 ? '#DC2626' : taux > 70 ? '#E5A53D' : 'var(--af-ink)' }}>
                      {Math.round(taux)}%
                    </span>
                  </div>
                  <div className="af-bar">
                    <div className={`af-bar-fill ${taux > 85 ? 'danger' : taux > 70 ? 'warn' : ''}`} style={{ width: `${Math.min(100, taux)}%` }} />
                  </div>
                </div>
              )}
              {[
                { label: 'Budget global',  val: `${fmtM(montantGlobal)} M FCFA` },
                { label: 'Consommé',       val: `${fmtM(totalEngage)} M FCFA` },
                { label: 'Disponible',     val: `${fmtM(parseFloat(budget.montant_disponible || 0))} M FCFA` },
                ...(budget.date_debut ? [{ label: 'Période', val: `${budget.date_debut} → ${budget.date_fin}` }] : []),
                ...(budget.gestionnaire_nom ? [{ label: 'Gestionnaire', val: budget.gestionnaire_nom }] : []),
                ...(budget.comptable_nom ? [{ label: 'Comptable', val: budget.comptable_nom }] : []),
              ].map((r, i, arr) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--af-line)' : 'none' }}>
                  <span style={{ fontSize: 12, color: 'var(--af-cream)' }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--af-ivory)', textAlign: 'right', maxWidth: '56%', wordBreak: 'break-word' }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PERT estimation */}
          {isPERT && (
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
                <div className="text-[13px] font-semibold text-[#0E2A47]">Estimation PERT</div>
                <div className="text-[11px] text-[#5A6B7E]">3 points</div>
              </div>
              <div style={{ padding: '14px 20px' }}>
                <div style={{ fontFamily: 'var(--af-mono)', fontSize: 12, textAlign: 'center', color: 'var(--af-cream)', marginBottom: 14, padding: '8px 12px', background: 'var(--af-steel)', borderRadius: 8 }}>
                  E = (O + 4×M + P) / 6
                </div>
                {[
                  { label: 'Optimiste (O)',  val: totalO,       color: '#15803D' },
                  { label: 'Probable (M)',   val: totalM,       color: 'var(--af-gold)' },
                  { label: 'Pessimiste (P)', val: totalP,       color: '#B91C1C' },
                  { label: 'Estimation E',   val: pertEstimate, color: 'var(--af-ink)', bold: true },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--af-line)' : 'none' }}>
                    <span style={{ fontSize: 12, color: r.color, fontWeight: r.bold ? 700 : 500 }}>{r.label}</span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontSize: 12, fontWeight: r.bold ? 800 : 600, color: r.color }}>{fmtM(r.val)} M</span>
                  </div>
                ))}
                {pertEstimate > 0 && montantGlobal > 0 && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: Math.abs(pertEstimate - montantGlobal) / montantGlobal > 0.1 ? 'rgba(220,38,38,0.06)' : 'rgba(21,128,61,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--af-cream)' }}>
                    Écart vs budget :{' '}
                    <strong style={{ color: Math.abs(pertEstimate - montantGlobal) / montantGlobal > 0.1 ? '#DC2626' : '#15803D' }}>
                      {pertEstimate > montantGlobal ? '+' : ''}{fmtM(pertEstimate - montantGlobal)} M FCFA
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* IA Score */}
          {iaScore && (
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
                <div className="text-[13px] font-semibold text-[#0E2A47]">Avis IA Claude</div>
                <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: iaScore.score >= 80 ? '#15803D' : iaScore.score >= 60 ? '#E5A53D' : '#DC2626' }}>
                  {iaScore.score}/100
                </span>
              </div>
              <div style={{ padding: '14px 20px' }}>
                <div style={{ marginBottom: 12 }}>
                  <div className="af-bar">
                    <div className={`af-bar-fill ${iaScore.score < 60 ? 'danger' : iaScore.score < 80 ? 'warn' : ''}`} style={{ width: `${iaScore.score}%` }} />
                  </div>
                </div>
                {iaScore.commentaire && (
                  <div style={{ fontSize: 12, color: 'var(--af-cream)', lineHeight: 1.6 }}>
                    {iaScore.commentaire}
                  </div>
                )}
                {iaScore.recommandations?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--af-mute)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Recommandations</div>
                    {iaScore.recommandations.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: 'var(--af-cream)' }}>
                        <span style={{ color: 'var(--af-gold)', flexShrink: 0 }}>›</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enveloppe département */}
          {alloc && (
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
                <div className="text-[13px] font-semibold text-[#0E2A47]">Enveloppe dépt.</div>
                <div className="text-[11px] text-[#5A6B7E]">{budget.departement_nom?.replace(/^Ministère (de |du |des |de l')?/i, '').trim().slice(0, 18)}</div>
              </div>
              <div style={{ padding: '14px 20px' }}>
                <div className="af-bar" style={{ marginBottom: 10 }}>
                  <div className={`af-bar-fill ${allocTaux > 85 ? 'danger' : allocTaux > 70 ? 'warn' : ''}`} style={{ width: `${allocTaux}%` }} />
                </div>
                {[
                  { label: 'Alloué',     val: `${fmtM(allocAlloue)} M FCFA`     },
                  { label: 'Consommé',   val: `${fmtM(allocConsomme)} M FCFA`   },
                  { label: 'Disponible', val: `${fmtM(allocDisponible)} M FCFA` },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--af-line)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--af-cream)' }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--af-mono)', color: 'var(--af-ivory)' }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, textAlign: 'right', fontSize: 11, fontWeight: 700, color: allocTaux >= 100 ? '#DC2626' : 'var(--af-mute)' }}>
                  {allocTaux}% utilisé
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {showDepenseModal && (
        <DepenseMultiModal budgetId={budget.id} onClose={closeDepense} onSuccess={onDepenseSuccess} />
      )}

      {showSoumission && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSoumission(false) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={15} strokeWidth={2} style={{ color: 'var(--color-gold)' }} /> Soumettre le budget
              </h2>
            </div>
            <form onSubmit={handleSoumettre}>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 9, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 12 }}>
                  <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: 'var(--af-ivory)' }}>
                    Une fois soumis, ce budget <strong>ne pourra plus être modifié</strong>. Il sera transmis au comptable pour validation.
                  </p>
                </div>
                {soumissionError && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', marginTop: 12 }}>
                    <AlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <span style={{ color: '#DC2626', fontSize: 12 }}>{soumissionError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowSoumission(false)} className="btn btn-secondary btn-sm">Annuler</button>
                <button type="submit" disabled={soumissionSaving} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                  {soumissionSaving ? <><span className="spinner-sm" /> Soumission…</> : <><Send size={14} strokeWidth={2} /> Confirmer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEdit(false) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Modifier le budget</h2>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="mb-[18px]">
                  <label className="form-label">Nom du budget</label>
                  <input required className="form-input" value={editForm.nom}
                    onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-[14px]">
                  <div className="mb-[18px]" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date début</label>
                    <input type="date" required className="form-input" value={editForm.date_debut}
                      onChange={e => setEditForm(f => ({ ...f, date_debut: e.target.value }))} />
                  </div>
                  <div className="mb-[18px]" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date fin</label>
                    <input type="date" required className="form-input" value={editForm.date_fin}
                      onChange={e => setEditForm(f => ({ ...f, date_fin: e.target.value }))} />
                  </div>
                </div>
                {editError && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', marginTop: 12 }}>
                    <AlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <span style={{ color: '#DC2626', fontSize: 12 }}>{editError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEdit(false)} className="btn btn-secondary btn-sm">Annuler</button>
                <button type="submit" disabled={editSaving} className="btn btn-primary btn-sm">
                  {editSaving ? <><span className="spinner-sm" /> Enregistrement…</> : 'Enregistrer'}
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

/* ── DepensesGroupees ─────────────────────────────────────────────────────── */
function groupByGroupeRef(depenses) {
  const map = new Map()
  for (const d of depenses) {
    const key = d.groupe_ref || d.id
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(d)
  }
  return [...map.values()]
}

const SMAP = {
  SAISIE:  { cls: 'af-badge submit',  lbl: 'En attente' },
  VALIDEE: { cls: 'af-badge approve', lbl: 'Validée'    },
  REJETEE: { cls: 'af-badge reject',  lbl: 'Rejetée'    },
}

function groupStatut(lines) {
  if (lines.every(l => l.statut === 'VALIDEE')) return 'VALIDEE'
  if (lines.some(l => l.statut === 'REJETEE'))  return 'REJETEE'
  return 'SAISIE'
}

function DepenseGroupe({ lines, fmt }) {
  const [open, setOpen] = useState(false)
  const first   = lines[0]
  const statut  = groupStatut(lines)
  const total   = lines.reduce((s, l) => s + parseFloat(l.montant || 0), 0)
  const s       = SMAP[statut] || { cls: 'af-badge', lbl: statut }
  const multi   = lines.length > 1

  return (
    <>
      <tr
        style={{ cursor: multi ? 'pointer' : 'default', background: open ? 'var(--af-steel)' : undefined }}
        onClick={() => multi && setOpen(o => !o)}
      >
        <td className="ref">{first.reference}</td>
        <td>{multi ? <span style={{ color: 'var(--af-mute)', fontStyle: 'italic', fontSize: 11 }}>{lines.length} lignes</span> : (first.ligne_designation || '—')}</td>
        <td className="muted">{first.date_depense ? new Date(first.date_depense).toLocaleDateString('fr-FR') : '—'}</td>
        <td>{first.piece_justificative_url ? <Paperclip size={13} style={{ color: 'var(--af-cream)' }} /> : <span className="muted">—</span>}</td>
        <td className="num">{fmt(total)} FCFA</td>
        <td><span className={s.cls}>{s.lbl}</span></td>
        <td style={{ paddingRight: 12, textAlign: 'right' }}>
          {multi && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 5, background: 'var(--af-steel)',
              color: 'var(--af-cream)', fontSize: 10, transition: 'transform .2s',
              transform: open ? 'rotate(180deg)' : 'none',
            }}>▾</span>
          )}
        </td>
      </tr>
      {open && multi && lines.map(l => (
        <tr key={l.id} style={{ background: 'rgba(14,42,71,0.04)' }}>
          <td style={{ paddingLeft: 28 }}><span style={{ fontSize: 10, color: 'var(--af-mute)', fontFamily: 'var(--af-mono)' }}>{l.ligne_code}</span></td>
          <td style={{ fontSize: 12, color: 'var(--af-cream)' }}>{l.ligne_designation}</td>
          <td />
          <td />
          <td className="num" style={{ fontSize: 12 }}>{fmt(l.montant)} FCFA</td>
          <td><span className={SMAP[l.statut]?.cls || 'af-badge'}>{SMAP[l.statut]?.lbl || l.statut}</span></td>
          <td />
        </tr>
      ))}
    </>
  )
}

function DepensesGroupees({ depenses, loaded, fmt }) {
  if (!loaded) return <div style={{ padding: 28, textAlign: 'center' }}><div className="af-spinner" style={{ margin: '0 auto' }} /></div>
  if (depenses.length === 0) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
      Aucune dépense enregistrée sur ce budget.
    </div>
  )
  const groups = groupByGroupeRef(depenses)
  return (
    <table className="af-table">
      <thead>
        <tr><th>Réf.</th><th>Libellé</th><th>Date</th><th>PJ</th><th>Montant</th><th>Statut</th><th /></tr>
      </thead>
      <tbody>
        {groups.map((lines, i) => <DepenseGroupe key={i} lines={lines} fmt={fmt} />)}
      </tbody>
    </table>
  )
}

/* ── StatusBanner ─────────────────────────────────────────────────────────── */
function StatusBanner({ type, icon, children }) {
  const cfg = {
    info:    { bg: 'var(--af-steel)',          border: 'var(--af-line)',               color: 'var(--af-cream)'  },
    primary: { bg: 'rgba(184,134,74,0.08)',    border: 'rgba(184,134,74,0.25)',        color: 'var(--af-gold)'   },
    success: { bg: 'rgba(21,128,61,0.06)',     border: 'rgba(21,128,61,0.2)',          color: '#15803D'          },
    danger:  { bg: 'rgba(220,38,38,0.05)',     border: 'rgba(220,38,38,0.2)',          color: '#DC2626'          },
  }[type] || {}
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '10px 16px', borderRadius: 10,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      fontSize: 13,
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span>{children}</span>
    </div>
  )
}
