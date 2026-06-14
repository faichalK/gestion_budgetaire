import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDepenses, validerDepense, rejeterDepense } from '../../api/depenses'
import { getBudget, getBudgetArbre, exportDepensesExcel, exportDepensesPdf } from '../../api/budget'
import { ArrowLeft, ExternalLink, Download, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Eye } from '../../components/AtlasIcons'
import { formaterNombre } from '../../utils/formatters'

const fmt    = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtM   = (n) => formaterNombre(parseFloat(n || 0) / 1_000_000, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

const DEP_STATUT = {
  SAISIE:  { color: '#92400E', bg: '#FEF3C7', label: 'En attente' },
  VALIDEE: { color: '#166534', bg: '#DCFCE7', label: 'Validée'    },
  REJETEE: { color: '#991B1B', bg: '#FEE2E2', label: 'Rejetée'    },
}

export default function DepensesParBudget({ basePath = '/mes-depenses', depenseBasePath = '/mes-depenses' }) {
  const { budgetId } = useParams()
  const navigate     = useNavigate()
  const { isAdmin, isComptable } = useAuth()

  const [budget,    setBudget]    = useState(null)
  const [arbre,     setArbre]     = useState([])
  const [depenses,  setDepenses]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [openCats,  setOpenCats]  = useState({})
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting,  setExporting]  = useState('')
  const exportRef = useRef(null)

  const [rejectModal, setRejectModal] = useState({ open: false, depense: null, motif: '', saving: false, error: '' })
  const [validating,  setValidating]  = useState('')
  const [pieceModal,  setPieceModal]  = useState({ open: false, pieces: [], selected: null, depRef: '' })
  const loadRef = useRef(() => {})

  const load = () => {
    setLoading(true)
    Promise.all([
      getBudget(budgetId),
      getBudgetArbre(budgetId),
      getDepenses({ budget: budgetId }),
    ])
      .then(([bRes, aRes, dRes]) => {
        setBudget(bRes.data)
        const cats = aRes.data?.data ?? []
        setArbre(cats)
        const open = {}
        cats.forEach(c => { open[c.id] = true })
        setOpenCats(open)
        setDepenses(dRes.data?.data ?? [])
      })
      .catch(() => navigate(basePath))
      .finally(() => setLoading(false))
  }
  loadRef.current = load

  useEffect(() => {
    const timeoutId = window.setTimeout(() => loadRef.current(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [budgetId])

  useEffect(() => {
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) return <div className="af-loader"><div className="af-spinner" /></div>

  const depByLigne = {}
  depenses.forEach(dep => {
    ;(dep.lignes || []).forEach(cl => {
      if (!cl.ligne_id) return
      if (!depByLigne[cl.ligne_id]) depByLigne[cl.ligne_id] = []
      depByLigne[cl.ligne_id].push({
        id:           dep.id,
        reference:    dep.reference,
        montant:      cl.montant,
        statut:       dep.statut,
        date_depense: cl.date,
        note:         cl.note || dep.note,
        fournisseur:  dep.fournisseur,
        pieces:       dep.pieces || [],
        nombre_pieces: dep.nombre_pieces,
        motif_rejet:  dep.motif_rejet,
      })
    })
  })

  const total        = depenses.reduce((s, d) => s + parseFloat(d.montant_total || 0), 0)
  const budgetGlobal = parseFloat(budget?.montant_global || 0)
  const disponible   = budgetGlobal - total
  const taux         = budgetGlobal > 0 ? Math.min(100, Math.round(total / budgetGlobal * 100)) : 0
  const tauxColor    = taux >= 95 ? '#DC2626' : taux >= 80 ? '#D97706' : '#0E2A47'
  const totalPieces  = depenses.reduce((s, d) => s + (d.nombre_pieces || 0), 0)
  const enAttente    = depenses.filter(d => d.statut === 'SAISIE')
  const totalAttente = enAttente.reduce((s, d) => s + parseFloat(d.montant_total || 0), 0)

  const budgetPath = isAdmin
    ? `/budgets/${budgetId}`
    : isComptable
      ? `/validation/${budgetId}`
      : `/mes-budgets/${budgetId}`

  const openRejet = (depense) => setRejectModal({ open: true, depense, motif: '', saving: false, error: '' })

  const handleRejeter = async (e) => {
    e.preventDefault()
    if (rejectModal.motif.trim().length < 10) return setRejectModal(m => ({ ...m, error: 'Le motif doit faire au moins 10 caractères.' }))
    setRejectModal(m => ({ ...m, saving: true, error: '' }))
    try {
      if (rejectModal.depense.id === '__all__') {
        for (const d of enAttente) {
          try { await rejeterDepense(d.id, { motif: rejectModal.motif }) } catch { /* continue */ }
        }
      } else {
        await rejeterDepense(rejectModal.depense.id, { motif: rejectModal.motif })
      }
      setRejectModal({ open: false, depense: null, motif: '', saving: false, error: '' })
      load()
    } catch (err) {
      setRejectModal(m => ({ ...m, saving: false, error: err?.response?.data?.detail || 'Erreur lors du rejet' }))
    }
  }

  const handleExport = async (fn, key) => {
    if (exporting) return
    setExporting(key)
    setExportOpen(false)
    try { await fn(budgetId, budget?.code) }
    catch { /* silent */ }
    finally { setExporting('') }
  }

  return (
    <>
      <div>
        {/* ── Header white card ─────────────────────────────────────────────── */}
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] mb-[14px]">
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--af-mono)', fontSize: 11, fontWeight: 700, background: 'var(--af-steel)', color: 'var(--af-ink)', padding: '3px 10px', borderRadius: 6 }}>
                    {budget?.code}
                  </span>
                  {budget?.annee && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'rgba(184,134,74,0.12)', color: '#B8864A' }}>
                      Exercice {budget.annee}
                    </span>
                  )}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: '#FEF3C7', color: '#92400E' }}>
                    {depenses.length} dépense{depenses.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--af-ivory)', lineHeight: 1.25, marginBottom: 6 }}>
                  {budget?.nom}
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--af-mute)', flexWrap: 'wrap' }}>
                  {budget?.departement_nom && <span>{budget.departement_nom}</span>}
                  {budget?.date_debut && <span>{budget.date_debut} → {budget.date_fin}</span>}
                  {budget?.gestionnaire_nom && <span>Gestionnaire : {budget.gestionnaire_nom}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                <button onClick={() => navigate(basePath)} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                  <ArrowLeft size={13} strokeWidth={2} /> Retour
                </button>
                <Link to={budgetPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--af-cream)', background: 'var(--af-steel)', border: '1px solid var(--af-line)', padding: '5px 10px', borderRadius: 7, textDecoration: 'none' }}>
                  <ExternalLink size={12} strokeWidth={2} /> Voir le budget
                </Link>
                <div ref={exportRef} style={{ position: 'relative' }}>
                  <button onClick={() => setExportOpen(o => !o)} disabled={!!exporting} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                    {exporting
                      ? <><span className="spinner-sm" /> Export…</>
                      : <><Download size={13} strokeWidth={2} /> Exporter <ChevronDown size={10} strokeWidth={2.5} /></>}
                  </button>
                  {exportOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--af-line)', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.12)', minWidth: 190, overflow: 'hidden' }}>
                      <div style={{ padding: '6px 0' }}>
                        {[
                          { fn: exportDepensesPdf,   key: 'pdf',  label: 'Exporter en PDF',   sub: 'Document imprimable',      emoji: '📄' },
                          { fn: exportDepensesExcel, key: 'xlsx', label: 'Exporter en Excel',  sub: '.xlsx — compatible Excel', emoji: '📊' },
                        ].map(item => (
                          <button key={item.key} onClick={() => handleExport(item.fn, item.key)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--af-cream)', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--af-steel)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <span style={{ fontSize: 15 }}>{item.emoji}</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{item.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--af-mute)' }}>{item.sub}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 KPI cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-[14px] mb-[14px]">
          {[
            { label: 'Budget global',  value: fmtM(budgetGlobal), unit: ' M FCFA', sub: `${fmt(budgetGlobal)} FCFA`,                                       delta: 'flat' },
            { label: 'Total dépensé',  value: fmtM(total),        unit: ' M FCFA', sub: `${depenses.length} dépense${depenses.length !== 1 ? 's' : ''}`,    delta: total > budgetGlobal * 0.8 ? 'down' : 'flat' },
            { label: 'Disponible',     value: fmtM(Math.max(0, disponible)), unit: ' M FCFA', sub: `${fmt(Math.max(0, disponible))} FCFA`,                   delta: disponible <= 0 ? 'down' : 'up' },
            { label: "Taux d'exéc.",   value: taux,               unit: '%',       sub: `${totalPieces} pièce${totalPieces !== 1 ? 's' : ''} jointe${totalPieces !== 1 ? 's' : ''}`, delta: taux >= 95 ? 'down' : taux >= 80 ? 'flat' : 'up', valueColor: tauxColor },
          ].map(k => (
            <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
              <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">{k.label}</div>
              <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums" style={k.valueColor ? { color: k.valueColor } : {}}>
                {k.value}<span className="text-[#B8864A] text-[16px] ml-0.5">{k.unit}</span>
              </div>
              <div className={`text-[11px] ${DELTA[k.delta]}`}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Synthèse + Informations ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 14 }}>
          {/* Synthèse */}
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(14,42,71,0.08)', fontSize: 13, fontWeight: 600, color: 'var(--af-ink)' }}>
              Synthèse financière
            </div>
            <div style={{ padding: '16px 20px' }}>
              {budgetGlobal > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--af-cream)' }}>Taux d'exécution</span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: tauxColor }}>{taux}%</span>
                  </div>
                  <div className="af-bar">
                    <div className={`af-bar-fill ${taux >= 95 ? 'danger' : taux >= 80 ? 'warn' : ''}`} style={{ width: `${Math.min(100, taux)}%` }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                {[
                  { label: 'Budget global', val: `${fmtM(budgetGlobal)} M FCFA` },
                  { label: 'Total dépensé', val: `${fmtM(total)} M FCFA` },
                  { label: 'Disponible',    val: `${fmtM(Math.max(0, disponible))} M FCFA` },
                  { label: 'En attente',    val: `${enAttente.length} dép.` },
                ].map(row => (
                  <div key={row.label} style={{ padding: '6px 0', borderBottom: '1px solid rgba(14,42,71,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--af-mute)' }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontSize: 12, fontWeight: 700, color: 'var(--af-ink)', whiteSpace: 'nowrap' }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Informations */}
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(14,42,71,0.08)', fontSize: 13, fontWeight: 600, color: 'var(--af-ink)' }}>
              Informations
            </div>
            <div style={{ padding: '16px 20px' }}>
              {[
                { label: 'Code budget',   val: budget?.code },
                { label: 'Exercice',      val: budget?.annee ? `${budget.annee}` : null },
                { label: 'Département',   val: budget?.departement_nom },
                { label: 'Gestionnaire',  val: budget?.gestionnaire_nom },
                { label: 'Dépenses',      val: `${depenses.length} enregistrée${depenses.length !== 1 ? 's' : ''}` },
                { label: 'Pièces',        val: `${totalPieces} jointe${totalPieces !== 1 ? 's' : ''}` },
              ].filter(r => r.val).map(row => (
                <div key={row.label} style={{ padding: '6px 0', borderBottom: '1px solid rgba(14,42,71,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--af-mute)', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--af-ink)', textAlign: 'right' }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Dépenses par ligne budgétaire ─────────────────────────────────── */}
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] overflow-hidden">
          <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(14,42,71,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--af-ink)' }}>Dépenses par ligne budgétaire</span>
            <span style={{ fontSize: 11, color: 'var(--af-mute)' }}>
              {depenses.length} dépense{depenses.length !== 1 ? 's' : ''} enregistrée{depenses.length !== 1 ? 's' : ''}
            </span>
          </div>

          {arbre.length === 0 ? (
            <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
              Aucune structure budgétaire trouvée.
            </div>
          ) : arbre.map(cat => {
            const catDeps  = cat.sous_categories.flatMap(sc => sc.lignes.flatMap(l => depByLigne[l.id] || []))
            const catTotal = catDeps.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
            const isOpen   = openCats[cat.id] !== false

            return (
              <div key={cat.id}>
                {/* Catégorie */}
                <div
                  onClick={() => setOpenCats(o => ({ ...o, [cat.id]: !isOpen }))}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', cursor: 'pointer', background: catDeps.length === 0 ? 'rgba(14,42,71,0.03)' : 'rgba(184,134,74,0.08)', borderBottom: '1px solid rgba(14,42,71,0.06)', userSelect: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = catDeps.length === 0 ? 'rgba(14,42,71,0.05)' : 'rgba(184,134,74,0.13)'}
                  onMouseLeave={e => e.currentTarget.style.background = catDeps.length === 0 ? 'rgba(14,42,71,0.03)' : 'rgba(184,134,74,0.08)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isOpen
                      ? <ChevronDown  size={14} strokeWidth={2.5} style={{ color: '#B8864A', flexShrink: 0 }} />
                      : <ChevronRight size={14} strokeWidth={2.5} style={{ color: '#B8864A', flexShrink: 0 }} />
                    }
                    {cat.code && <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 800, fontSize: 13, color: 'var(--af-ink)' }}>{cat.code}</span>}
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--af-ink)' }}>{cat.libelle}</span>
                  </div>
                  {catDeps.length === 0
                    ? <span style={{ fontSize: 11, color: 'var(--af-mute)', fontStyle: 'italic' }}>Aucune dépense</span>
                    : <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 800, fontSize: 13, color: 'var(--af-ink)' }}>{fmt(catTotal)} FCFA</span>
                  }
                </div>

                {isOpen && cat.sous_categories.map(sc => {
                  const scDeps = sc.lignes.flatMap(l => depByLigne[l.id] || [])
                  if (scDeps.length === 0) return null
                  const scTotal = scDeps.reduce((s, d) => s + parseFloat(d.montant || 0), 0)

                  return (
                    <div key={sc.id}>
                      {/* Sous-catégorie */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px 8px 48px', background: 'rgba(14,42,71,0.025)', borderBottom: '1px solid rgba(14,42,71,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {sc.code && <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 12, color: 'var(--af-cream)' }}>{sc.code}</span>}
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--af-cream)' }}>{sc.libelle}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 12, color: 'var(--af-cream)' }}>{fmt(scTotal)} FCFA</span>
                      </div>

                      {sc.lignes.map(ligne => {
                        const lignesDeps = depByLigne[ligne.id] || []
                        if (lignesDeps.length === 0) return null

                        return (
                          <div key={ligne.id}>
                            {/* En-tête ligne budgétaire */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 100px auto', padding: '6px 24px 6px 68px', gap: 12, background: 'rgba(14,42,71,0.02)', borderBottom: '1px solid rgba(14,42,71,0.05)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--af-mute)' }}>
                              <span style={{ color: 'var(--af-cream)', fontSize: 11, textTransform: 'none', fontWeight: 600, letterSpacing: 0 }}>
                                {ligne.code && <span style={{ fontFamily: 'var(--af-mono)', marginRight: 8, color: 'var(--af-mute)' }}>{ligne.code}</span>}
                                {ligne.libelle}
                              </span>
                              <span style={{ textAlign: 'right' }}>Montant</span>
                              <span style={{ textAlign: 'center' }}>Date</span>
                              <span style={{ textAlign: 'center' }}>Statut</span>
                              <span style={{ textAlign: 'right' }}>Actions</span>
                            </div>

                            {/* Dépenses de cette ligne */}
                            {lignesDeps.map((d, idx) => (
                              <div key={`${d.id}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 100px auto', padding: '10px 24px 10px 68px', gap: 12, borderBottom: '1px solid rgba(14,42,71,0.05)', alignItems: 'center' }}>
                                {/* Désignation */}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--af-ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {d.reference || d.note || d.fournisseur || String(d.id).slice(0, 8).toUpperCase()}
                                  </div>
                                  {d.fournisseur && (
                                    <div style={{ fontSize: 11, color: 'var(--af-mute)' }}>{d.fournisseur}</div>
                                  )}
                                </div>
                                {/* Montant */}
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: 'var(--af-ink)' }}>{fmt(d.montant)}</span>
                                  <div style={{ fontSize: 10, color: 'var(--af-mute)' }}>FCFA</div>
                                </div>
                                {/* Date */}
                                <div style={{ fontSize: 11, color: 'var(--af-mute)', fontFamily: 'var(--af-mono)', textAlign: 'center' }}>
                                  {fmtDate(d.date_depense)}
                                </div>
                                {/* Statut */}
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: DEP_STATUT[d.statut]?.bg || '#F3F4F6', color: DEP_STATUT[d.statut]?.color || '#374151' }}>
                                    {DEP_STATUT[d.statut]?.label || d.statut}
                                  </span>
                                </div>
                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                  {d.pieces.length > 0 && (
                                    <button
                                      onClick={() => setPieceModal({ open: true, pieces: d.pieces, selected: d.pieces[0], depRef: d.reference || String(d.id).slice(0, 8).toUpperCase() })}
                                      title="Voir les pièces justificatives"
                                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(184,134,74,0.3)', background: 'rgba(184,134,74,0.08)', cursor: 'pointer', color: '#B8864A' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184,134,74,0.2)'; e.currentTarget.style.borderColor = '#B8864A' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(184,134,74,0.08)'; e.currentTarget.style.borderColor = 'rgba(184,134,74,0.3)' }}
                                    >
                                      <Eye size={13} strokeWidth={2} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => navigate(`${depenseBasePath}/${d.id}`)}
                                    title="Voir le détail de la dépense"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(14,42,71,0.12)', background: 'rgba(14,42,71,0.04)', cursor: 'pointer', color: 'var(--af-cream)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,42,71,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(14,42,71,0.04)'}
                                  >
                                    <ExternalLink size={13} strokeWidth={2} />
                                  </button>
                                  {isComptable && !isAdmin && d.statut === 'SAISIE' && (
                                    <>
                                      <button
                                        onClick={async () => { setValidating(d.id); try { await validerDepense(d.id); load() } catch {} finally { setValidating('') } }}
                                        disabled={!!validating}
                                        title="Valider cette dépense"
                                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(22,163,74,0.3)', background: 'rgba(22,163,74,0.1)', cursor: 'pointer', color: '#16A34A' }}
                                        onMouseEnter={e => { if (!validating) { e.currentTarget.style.background = '#16A34A'; e.currentTarget.style.color = '#fff' } }}
                                        onMouseLeave={e => { if (!validating) { e.currentTarget.style.background = 'rgba(22,163,74,0.1)'; e.currentTarget.style.color = '#16A34A' } }}
                                      >
                                        {validating === d.id ? <span className="spinner-sm" /> : <CheckCircle2 size={13} strokeWidth={2.5} />}
                                      </button>
                                      <button
                                        onClick={() => openRejet(d)}
                                        disabled={!!validating}
                                        title="Rejeter cette dépense"
                                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.1)', cursor: 'pointer', color: '#DC2626' }}
                                        onMouseEnter={e => { if (!validating) { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff' } }}
                                        onMouseLeave={e => { if (!validating) { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.color = '#DC2626' } }}
                                      >
                                        <XCircle size={13} strokeWidth={2.5} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Footer total + actions globales */}
          {depenses.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'var(--af-ink)', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Total général</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {isComptable && !isAdmin && enAttente.length > 0 && (
                  <>
                    <button
                      onClick={async () => {
                        setValidating('__all__')
                        for (const d of enAttente) {
                          try { await validerDepense(d.id) } catch { /* continue */ }
                        }
                        setValidating('')
                        load()
                      }}
                      disabled={!!validating}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,.3)', background: validating === '__all__' ? '#16A34A' : 'rgba(22,163,74,.2)', color: '#86EFAC', transition: 'all .15s' }}
                      onMouseEnter={e => { if (!validating) { e.currentTarget.style.background = '#16A34A'; e.currentTarget.style.color = '#fff' } }}
                      onMouseLeave={e => { if (!validating) { e.currentTarget.style.background = 'rgba(22,163,74,.2)'; e.currentTarget.style.color = '#86EFAC' } }}
                    >
                      {validating === '__all__' ? <><span className="spinner-sm" /> Validation…</> : <><CheckCircle2 size={14} strokeWidth={2.5} /> Valider tout ({enAttente.length})</>}
                    </button>
                    <button
                      onClick={() => openRejet({ id: '__all__', note: `${enAttente.length} dépenses en attente`, montant_total: totalAttente })}
                      disabled={!!validating}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(220,38,38,.2)', color: '#FCA5A5', transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,.2)'; e.currentTarget.style.color = '#FCA5A5' }}
                    >
                      <XCircle size={14} strokeWidth={2.5} /> Rejeter tout
                    </button>
                  </>
                )}
                <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 900, fontSize: 16, color: '#fff' }}>{fmt(total)} FCFA</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal visualisation pièce ─────────────────────────────────────────── */}
      {pieceModal.open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPieceModal(m => ({ ...m, open: false })) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 860, width: '95vw' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, fontSize: 15 }}>Pièces justificatives — {pieceModal.depRef}</h2>
              <button onClick={() => setPieceModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--af-mute)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: pieceModal.pieces.length > 1 ? '220px 1fr' : '1fr', minHeight: 400 }}>
                {/* Liste des pièces (si plusieurs) */}
                {pieceModal.pieces.length > 1 && (
                  <div style={{ borderRight: '1px solid rgba(14,42,71,0.08)', padding: '8px 0', background: '#FAFAFA' }}>
                    {pieceModal.pieces.map(p => {
                      const isImg = p.type_mime?.startsWith('image/')
                      const isPdf = p.type_mime === 'application/pdf'
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
                            {p.nom_original || p.nom || `Pièce ${String(p.id).slice(0, 6)}`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {/* Prévisualisation */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', padding: 24, minHeight: 400 }}>
                  {pieceModal.selected ? (() => {
                    const p    = pieceModal.selected
                    const isImg = p.type_mime?.startsWith('image/')
                    const isPdf = p.type_mime === 'application/pdf'
                    if (isImg) return (
                      <img src={p.url_download} alt={p.nom_original} style={{ maxWidth: '100%', maxHeight: 460, objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 16px rgba(14,42,71,0.12)' }} />
                    )
                    if (isPdf) return (
                      <iframe src={p.url_download} title={p.nom_original} style={{ width: '100%', height: 460, border: 'none', borderRadius: 8 }} />
                    )
                    return (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 52, marginBottom: 12 }}>📎</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ink)', marginBottom: 16 }}>{p.nom_original || 'Fichier'}</div>
                        <a href={p.url_download} download target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: 'var(--af-ink)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                          <Download size={14} strokeWidth={2} /> Télécharger
                        </a>
                      </div>
                    )
                  })() : (
                    <div style={{ color: 'var(--af-mute)', fontSize: 13 }}>Aucune pièce sélectionnée</div>
                  )}
                  {/* Bouton download en bas (pour image/pdf) */}
                  {pieceModal.selected && (pieceModal.selected.type_mime?.startsWith('image/') || pieceModal.selected.type_mime === 'application/pdf') && (
                    <div style={{ marginTop: 14 }}>
                      <a href={pieceModal.selected.url_download} download target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, background: 'white', border: '1px solid rgba(14,42,71,0.12)', color: 'var(--af-cream)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        <Download size={12} strokeWidth={2} /> Télécharger
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setPieceModal(m => ({ ...m, open: false }))} className="btn btn-secondary btn-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal rejet dépense ───────────────────────────────────────────────── */}
      {rejectModal.open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRejectModal(m => ({ ...m, open: false })) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={16} strokeWidth={2} style={{ color: 'var(--color-danger-500)' }} />
                Rejeter la dépense
              </h2>
            </div>
            <form onSubmit={handleRejeter}>
              <div className="modal-body">
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--af-steel)', border: '1px solid var(--af-line)', marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--af-ink)' }}>
                    {rejectModal.depense?.reference || rejectModal.depense?.note || rejectModal.depense?.fournisseur || '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: 'var(--af-ink)', marginTop: 4 }}>
                    {fmt(rejectModal.depense?.montant_total || rejectModal.depense?.montant)} FCFA
                  </div>
                </div>
                <div>
                  <label className="form-label">Motif du rejet <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                  <textarea className="form-input" rows={3} placeholder="Expliquez la raison du rejet (min. 10 caractères)…" value={rejectModal.motif} onChange={e => setRejectModal(m => ({ ...m, motif: e.target.value, error: '' }))} style={{ resize: 'vertical' }} />
                  <div style={{ fontSize: 11, marginTop: 4, color: rejectModal.motif.length < 10 ? 'var(--color-danger-500)' : 'var(--color-success-600)' }}>
                    {rejectModal.motif.length} / min 10 caractères
                  </div>
                </div>
                {rejectModal.error && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', marginTop: 10 }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-danger-500)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-danger-700)', fontSize: 12 }}>{rejectModal.error}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setRejectModal(m => ({ ...m, open: false }))} className="btn btn-secondary btn-sm">Annuler</button>
                <button type="submit" disabled={rejectModal.saving} className="btn btn-danger btn-sm" style={{ gap: 6 }}>
                  {rejectModal.saving ? <><span className="spinner-sm" /> Rejet…</> : <><XCircle size={14} strokeWidth={2} /> Confirmer le rejet</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
