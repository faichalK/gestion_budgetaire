import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDepenses, validerDepense, rejeterDepense } from '../../api/depenses'
import { getBudget, getBudgetArbre, exportDepensesExcel, exportDepensesPdf } from '../../api/budget'
import { ArrowLeft, ExternalLink, Download, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_DOT = {
  VALIDEE: { bg: '#16A34A', label: 'Validée'    },
  SAISIE:  { bg: '#D97706', label: 'En attente' },
  REJETEE: { bg: '#DC2626', label: 'Rejetée'    },
}

export default function DepensesParBudget({ basePath = '/mes-depenses', depenseBasePath = '/mes-depenses' }) {
  const { budgetId } = useParams()
  const navigate     = useNavigate()
  const { isAdmin, isComptable } = useAuth()

  const [budget,     setBudget]     = useState(null)
  const [arbre,      setArbre]      = useState([])
  const [depenses,   setDepenses]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [openCats,   setOpenCats]   = useState({})
  const [exportOpen,  setExportOpen]  = useState(false)
  const [exporting,   setExporting]   = useState('')
  const exportRef = useRef(null)

  const [rejectModal, setRejectModal] = useState({ open: false, depense: null, motif: '', saving: false, error: '' })
  const [validating,  setValidating]  = useState('')

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
  useEffect(() => { load() }, [budgetId])

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  const depByLigne = {}
  depenses.forEach(d => {
    if (!d.ligne_id) return
    if (!depByLigne[d.ligne_id]) depByLigne[d.ligne_id] = []
    depByLigne[d.ligne_id].push(d)
  })

  const total      = depenses.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
  const budgetGlobal = parseFloat(budget?.montant_global || 0)
  const disponible = budgetGlobal - total
  const taux       = budgetGlobal > 0 ? Math.min(100, Math.round(total / budgetGlobal * 100)) : 0
  const tauxColor  = taux >= 95 ? 'var(--color-danger-500)' : taux >= 80 ? 'var(--color-gold)' : 'var(--af-ink)'

  const budgetPath = isAdmin
    ? `/budgets/${budgetId}`
    : isComptable
      ? `/validation/${budgetId}`
      : `/mes-budgets/${budgetId}`

  const handleValider = async (depense) => {
    if (validating) return
    setValidating(depense.id)
    try {
      await validerDepense(depense.id)
      load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Erreur lors de la validation')
    } finally { setValidating('') }
  }

  const openRejet = (depense) => setRejectModal({ open: true, depense, motif: '', saving: false, error: '' })

  const handleRejeter = async (e) => {
    e.preventDefault()
    if (!rejectModal.motif.trim()) return setRejectModal(m => ({ ...m, error: 'Le motif est obligatoire.' }))
    setRejectModal(m => ({ ...m, saving: true, error: '' }))
    try {
      if (rejectModal.depense.id === '__all__') {
        const enAttente = depenses.filter(d => d.statut === 'SAISIE')
        for (const d of enAttente) {
          try { await rejeterDepense(d.id, { motif_rejet: rejectModal.motif }) } catch { /* continue */ }
        }
      } else {
        await rejeterDepense(rejectModal.depense.id, { motif_rejet: rejectModal.motif })
      }
      setRejectModal({ open: false, depense: null, motif: '', saving: false, error: '' })
      load()
    } catch (e) {
      setRejectModal(m => ({ ...m, saving: false, error: e?.response?.data?.detail || 'Erreur lors du rejet' }))
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
      {/* Retour */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate(basePath)} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          <ArrowLeft size={14} strokeWidth={2} /> Retour
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>

        {/* ── Header navy ── */}
        <div style={{ background: 'var(--af-ink)', padding: '20px 28px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: 7, padding: '3px 10px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.5px' }}>
                  {budget?.code}
                </span>
                <span style={{ fontSize: '12px', opacity: .7 }}>
                  {depenses.length} dépense{depenses.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3, marginBottom: 6 }}>{budget?.nom}</div>
              {budget?.departement_nom && (
                <div style={{ fontSize: '12px', opacity: .75 }}>{budget.departement_nom}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', opacity: .55, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Total dépensé</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.5rem', lineHeight: 1 }}>{fmt(total)}</div>
              <div style={{ fontSize: '11px', opacity: .6, marginTop: 2 }}>FCFA</div>
            </div>
          </div>

          {/* Barre de progression */}
          {budgetGlobal > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '11px' }}>
                <span style={{ opacity: .6 }}>Consommation du budget alloué</span>
                <span style={{ fontWeight: 700, color: taux >= 95 ? '#FCA5A5' : taux >= 80 ? '#FCD34D' : '#93C5FD' }}>
                  {taux}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.15)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${taux}%`,
                  background: taux >= 95 ? '#FCA5A5' : taux >= 80 ? '#FCD34D' : '#60A5FA',
                  transition: 'width .4s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '10px', opacity: .5, fontFamily: 'var(--font-mono)' }}>
                <span>{fmt(total)} FCFA dépensés</span>
                <span>{fmt(budgetGlobal)} FCFA alloués</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Mini KPI strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--color-gray-100)' }}>
          {[
            { label: 'Budget global',  val: fmt(budgetGlobal) + ' FCFA', color: 'var(--color-gold-dark)', bg: 'var(--color-gold-soft)' },
            { label: 'Total dépensé',  val: fmt(total) + ' FCFA',        color: '#6a2fa0',                  bg: '#f5f0fd' },
            { label: 'Disponible',     val: fmt(Math.max(0, disponible)) + ' FCFA', color: disponible <= 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)', bg: disponible <= 0 ? 'var(--color-danger-50)' : 'var(--color-success-50)' },
            { label: "Taux d'exéc.",   val: taux + '%',                  color: tauxColor,                  bg: taux > 75 ? 'var(--color-danger-50)' : taux > 50 ? 'var(--color-warning-50)' : 'var(--color-success-50)' },
          ].map((k, idx, arr) => (
            <div key={k.label} style={{
              padding: '12px 20px', background: k.bg,
              borderRight: idx < arr.length - 1 ? '1px solid var(--color-gray-100)' : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>
                {k.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px', color: k.color }}>
                {k.val}
              </div>
            </div>
          ))}
        </div>

        {/* ── Bande budget parent + export ── */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--color-gray-100)', background: 'var(--color-gray-50)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Budget</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, background: 'rgba(184,134,74,0.15)', color: 'var(--color-gold-dark)', padding: '2px 8px', borderRadius: 6 }}>
            {budget?.code}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-gray-700)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {budget?.nom}
          </span>
          <Link to={budgetPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 600, color: 'var(--color-gold)', textDecoration: 'none', flexShrink: 0 }}>
            <ExternalLink size={12} strokeWidth={2} /> Voir le budget
          </Link>

          {/* Bouton Export dropdown */}
          <div ref={exportRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={!!exporting}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6 }}
            >
              {exporting
                ? <><span className="spinner-sm" /> Export…</>
                : <><Download size={12} strokeWidth={2} /> Exporter <ChevronDown size={10} strokeWidth={2.5} /></>
              }
            </button>
            {exportOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                background: '#fff', border: '1px solid var(--color-gray-200)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.12)',
                minWidth: 190, overflow: 'hidden',
              }}>
                <div style={{ padding: '6px 0' }}>
                  <button
                    onClick={() => handleExport(exportDepensesPdf, 'pdf')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '9px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: '13px', color: 'var(--color-gray-700)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '15px' }}>📄</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>Exporter en PDF</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>Document imprimable</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport(exportDepensesExcel, 'xlsx')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '9px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: '13px', color: 'var(--color-gray-700)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '15px' }}>📊</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>Exporter en Excel</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-gray-400)'  }}>.xlsx — compatible Excel</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Titre section ── */}
        <div style={{ padding: '12px 24px 10px', borderBottom: '1px solid var(--color-gray-200)', background: '#fff' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-gray-700)' }}>Dépenses par ligne budgétaire</span>
        </div>

        {/* ── Arbre catégories ── */}
        {arbre.length === 0 ? (
          <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: '13px' }}>
            Aucune structure budgétaire trouvée.
          </div>
        ) : arbre.map(cat => {
          const catDeps = cat.sous_categories.flatMap(sc => sc.lignes.flatMap(l => depByLigne[l.id] || []))
          if (catDeps.length === 0) return null
          const catTotal = catDeps.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
          const isOpen   = openCats[cat.id] !== false

          return (
            <div key={cat.id}>
              {/* ── Catégorie ── */}
              <div
                onClick={() => setOpenCats(o => ({ ...o, [cat.id]: !isOpen }))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', cursor: 'pointer', background: 'var(--color-gold-soft)', borderBottom: '1px solid rgba(184,134,74,0.15)', userSelect: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,134,74,0.20)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-gold-soft)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isOpen
                    ? <ChevronDown  size={14} strokeWidth={2.5} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
                    : <ChevronRight size={14} strokeWidth={2.5} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
                  }
                  {cat.code && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px', color: 'var(--af-ink)' }}>{cat.code}</span>}
                  <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--af-ink)' }}>{cat.libelle}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px', color: 'var(--af-ink)', whiteSpace: 'nowrap' }}>
                  {fmt(catTotal)} FCFA
                </span>
              </div>

              {isOpen && cat.sous_categories.map(sc => {
                const scDeps = sc.lignes.flatMap(l => depByLigne[l.id] || [])
                if (scDeps.length === 0) return null
                const scTotal = scDeps.reduce((s, d) => s + parseFloat(d.montant || 0), 0)

                return (
                  <div key={sc.id}>
                    {/* ── Sous-catégorie ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px 8px 48px', background: '#F8FAFC', borderBottom: '1px solid var(--color-gray-100)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {sc.code && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', color: 'var(--color-gray-600)' }}>{sc.code}</span>}
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-gray-700)' }}>{sc.libelle}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
                        {fmt(scTotal)} FCFA
                      </span>
                    </div>

                    {sc.lignes.map(ligne => {
                      const lignesDeps = depByLigne[ligne.id] || []
                      if (lignesDeps.length === 0) return null

                      return (
                        <div key={ligne.id}>
                          {/* ── En-tête ligne budgétaire ── */}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 160px 90px',
                            padding: '6px 24px 6px 68px', gap: 12,
                            background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-100)',
                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '.4px', color: 'var(--color-gray-400)',
                          }}>
                            <span style={{ color: 'var(--color-gray-600)', fontSize: '11px', textTransform: 'none', fontWeight: 600, letterSpacing: 0 }}>
                              {ligne.code && <span style={{ fontFamily: 'var(--font-mono)', marginRight: 8, color: 'var(--color-gray-500)' }}>{ligne.code}</span>}
                              {ligne.libelle}
                            </span>
                            <span style={{ textAlign: 'right' }}>Montant dépensé</span>
                            <span style={{ textAlign: 'center' }}>Date</span>
                          </div>

                          {/* ── Dépenses de cette ligne ── */}
                          {lignesDeps.map((d, idx) => {
                            return (
                              <div
                                key={d.id}
                                onClick={() => navigate(`${depenseBasePath}/${d.id}`)}
                                style={{
                                  display: 'grid', gridTemplateColumns: '1fr 160px 90px',
                                  padding: '11px 24px 11px 68px', gap: 12,
                                  borderBottom: idx < lignesDeps.length - 1 ? '1px solid var(--color-gray-100)' : 'none',
                                  alignItems: 'center', cursor: 'pointer', transition: 'background .1s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gold-soft)'}
                                onMouseLeave={e => e.currentTarget.style.background = ''}
                              >
                                {/* Désignation */}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'var(--color-gray-100)', color: 'var(--color-gray-600)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                      {d.reference}
                                    </span>
                                  </div>
                                  {d.fournisseur && (
                                    <div style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>{d.fournisseur}</div>
                                  )}
                                </div>

                                {/* Montant */}
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--color-gray-900)' }}>
                                    {fmt(d.montant)}
                                  </span>
                                  <div style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>FCFA</div>
                                </div>

                                {/* Date */}
                                <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                                  {fmtDate(d.date_depense)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* ── Total général + actions ── */}
        {depenses.length > 0 && (() => {
          const enAttente    = depenses.filter(d => d.statut === 'SAISIE')
          const totalAttente = enAttente.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
          const piece        = depenses.find(d => d.piece_justificative_url)
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'var(--af-ink)', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Total général
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Pièce justificative */}
                {(isComptable || isAdmin) && piece && (
                  <a href={piece.piece_justificative_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600, color: '#93C5FD', textDecoration: 'none', padding: '5px 12px', borderRadius: 6, background: 'rgba(147,197,253,.15)', border: '1px solid rgba(147,197,253,.3)' }}>
                    📎 Pièce justificative
                  </a>
                )}

                {/* Valider / Rejeter — comptable uniquement */}
                {isComptable && enAttente.length > 0 && (
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
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '7px 18px', borderRadius: 8, fontSize: '13px', fontWeight: 700,
                        cursor: 'pointer', border: '1px solid rgba(255,255,255,.3)',
                        background: validating === '__all__' ? '#16A34A' : 'rgba(22,163,74,.2)', color: '#86EFAC',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { if (!validating) { e.currentTarget.style.background = '#16A34A'; e.currentTarget.style.color = '#fff' } }}
                      onMouseLeave={e => { if (!validating) { e.currentTarget.style.background = 'rgba(22,163,74,.2)'; e.currentTarget.style.color = '#86EFAC' } }}
                    >
                      {validating === '__all__' ? <><span className="spinner-sm" /> Validation…</> : <><CheckCircle2 size={14} strokeWidth={2.5} /> Valider</>}
                    </button>
                    <button
                      onClick={() => openRejet({ id: '__all__', reference: 'Toutes', ligne_designation: `${enAttente.length} dépenses`, montant: totalAttente })}
                      disabled={!!validating}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '7px 18px', borderRadius: 8, fontSize: '13px', fontWeight: 700,
                        cursor: 'pointer', border: '1px solid rgba(255,255,255,.3)',
                        background: 'rgba(220,38,38,.2)', color: '#FCA5A5',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,.2)'; e.currentTarget.style.color = '#FCA5A5' }}
                    >
                      <XCircle size={14} strokeWidth={2.5} /> Rejeter
                    </button>
                  </>
                )}

                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '16px', color: '#fff' }}>
                  {fmt(total)} FCFA
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    </div>

    {/* ── Modal rejet dépense ── */}
      {rejectModal.open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRejectModal(m => ({ ...m, open: false })) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={16} strokeWidth={2} style={{ color: 'var(--color-danger-500)' }} />
                Rejeter la dépense
              </h2>
            </div>
            <form onSubmit={handleRejeter}>
              <div className="modal-body">
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)', marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--color-gray-500)', marginBottom: 2 }}>{rejectModal.depense?.reference}</div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-gray-800)' }}>{rejectModal.depense?.ligne_designation || '—'}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--color-gray-900)', marginTop: 4 }}>{fmt(rejectModal.depense?.montant)} FCFA</div>
                </div>
                <div>
                  <label className="form-label">Motif du rejet <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Expliquez la raison du rejet…"
                    value={rejectModal.motif}
                    onChange={e => setRejectModal(m => ({ ...m, motif: e.target.value, error: '' }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                {rejectModal.error && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', marginTop: 10 }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-danger-500)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-danger-700)', fontSize: '12px' }}>{rejectModal.error}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setRejectModal(m => ({ ...m, open: false }))} className="btn btn-secondary btn-md">Annuler</button>
                <button type="submit" disabled={rejectModal.saving} className="btn btn-danger btn-md" style={{ gap: 6 }}>
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
