import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getBudgets, getBudget, getLignes, approuverBudget, rejeterBudget, cloturerBudget } from '../../api/budget'
import { getDepenses } from '../../api/depenses'
import { StatutBadge, DepenseBadge } from '../../components/StatusBadge'
import { Search, ArrowLeft, ArrowRight, CheckCircle2, XCircle, TrendingUp, BarChart3, Download, Printer } from 'lucide-react'
import { notifRefresh } from '../../utils/notifRefresh'
import { ConfirmModal } from '../../components/ui'
import { exportCSV, exportCSVMulti, printPDF, printPDFMulti } from '../../utils/export'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtK    = fmt
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/* ══════════════════════════════════════════════════════════════════════════════
   Liste des budgets à valider
══════════════════════════════════════════════════════════════════════════════ */
export function BudgetsAValiderList() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const [budgets,    setBudgets]    = useState([])
  const [allBudgets, setAllBudgets] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filtre,     setFiltre]     = useState(searchParams.get('statut') || 'SOUMIS')
  const deptId = searchParams.get('dept')

  useEffect(() => {
    const s = searchParams.get('statut') || 'SOUMIS'
    if (s !== filtre) { setFiltre(s); setLoading(true) }
  }, [searchParams])

  // Charger tous les budgets une seule fois pour les comptages
  useEffect(() => {
    getBudgets().then(r => setAllBudgets(r.data.results ?? r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const params = { statut: filtre || undefined }
    if (deptId) params.departement = deptId
    getBudgets(params)
      .then(r => setBudgets(r.data.results ?? r.data))
      .finally(() => setLoading(false))
  }, [filtre, deptId])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  // R-COMPT-01 : le Comptable ne voit jamais BROUILLON (filtré côté API)
  const FILTRES = [
    { key: 'SOUMIS',   label: 'En attente', countKey: 'SOUMIS'   },
    { key: 'APPROUVE', label: 'Approuvés',  countKey: 'APPROUVE' },
    { key: 'REJETE',   label: 'Rejetés',    countKey: 'REJETE'   },
    { key: '',         label: 'Tous',       countKey: null        },
  ]

  const countFor = (key) => key
    ? allBudgets.filter(b => b.statut === key).length
    : allBudgets.length

  const q       = search.trim().toLowerCase()
  const visible = q
    ? budgets.filter(b =>
        b.nom?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.gestionnaire_nom?.toLowerCase().includes(q) ||
        b.departement_nom?.toLowerCase().includes(q)
      )
    : budgets

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets à valider</h1>
          <p className="page-subtitle">{visible.length} budget{visible.length !== 1 ? 's' : ''}</p>
        </div>
        <div />
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        {[
          { label: 'EN ATTENTE',  val: countFor('SOUMIS'),   color: 'var(--color-warning-600)',  border: 'var(--color-warning-600)'  },
          { label: 'APPROUVÉS',   val: countFor('APPROUVE'), color: 'var(--color-success-600)',  border: 'var(--color-success-600)'  },
          { label: 'REJETÉS',     val: countFor('REJETE'),   color: 'var(--color-danger-600)',   border: 'var(--color-danger-600)'   },
          { label: 'TOTAL',       val: countFor(null),       color: 'var(--color-gold)',  border: 'var(--color-gold)'  },
        ].map(k => (
          <div key={k.label} className="card" style={{ borderTop: `3px solid ${k.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '22px', color: 'var(--color-gray-900)' }}>{k.val}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginTop: 2 }}>budget{k.val !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Barre recherche + filtres */}
      <div className="filter-bar mb-5" style={{ flexWrap: 'nowrap' }}>
        <div className="search-wrapper flex-1 min-w-[200px]">
          <Search size={14} strokeWidth={2} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Rechercher par nom, code, gestionnaire…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-[6px]" style={{ flexShrink: 0 }}>
          {FILTRES.map(f => {
            const cnt = countFor(f.countKey)
            return (
              <button
                key={f.key}
                onClick={() => { setLoading(true); setFiltre(f.key) }}
                className={`filter-pill${filtre === f.key ? ' active' : ''}`}
              >
                {f.label}
                <span style={{
                  marginLeft: 5,
                  background: filtre === f.key ? 'rgba(255,255,255,.25)' : 'var(--color-gray-200)',
                  color: filtre === f.key ? '#fff' : 'var(--color-gray-600)',
                  fontSize: '10px', padding: '0px 5px', borderRadius: 8, fontWeight: 700,
                }}>
                  {cnt}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <CheckCircle2 size={28} strokeWidth={1.5} className="text-[var(--color-success-400)]" />
            </div>
            <p className="empty-title">Aucun budget</p>
            <p className="empty-body">
              {q ? `Aucun résultat pour « ${search} »` : 'Aucun budget pour ce filtre'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {['Code', 'Nom', 'Département', 'Gestionnaire', 'Soumis le', 'Montant', 'Taux', 'Statut', 'Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(b => {
                const taux = parseFloat(b.taux_consommation || 0)
                return (
                  <tr
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/validation/${b.id}`)}
                  >
                    <td>
                      <span className="code-tag">{b.code}</span>
                    </td>
                    <td className="font-medium max-w-[200px]">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">{b.nom}</div>
                      {b.comptable_nom && (
                        <div className="text-[11px] mt-[2px]" style={{ color: b.statut === 'APPROUVE' ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                          {b.statut === 'APPROUVE' ? '✓' : '✕'} {b.comptable_nom}
                        </div>
                      )}
                    </td>
                    <td className="text-[#6B7280]">{b.departement_nom || '—'}</td>
                    <td className="text-[#6B7280]">{b.gestionnaire_nom || '—'}</td>
                    <td className="text-[#9CA3AF] text-[12px] whitespace-nowrap">
                      {b.date_soumission
                        ? new Date(b.date_soumission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="font-mono font-semibold whitespace-nowrap">
                      {fmt(b.montant_global)} <span className="text-[10px] text-[#9CA3AF]">FCFA</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="exec-bar w-[60px]">
                          <div
                            className="exec-bar-fill"
                            style={{
                              width: `${Math.min(taux, 100)}%`,
                              background: taux > 75 ? 'var(--color-danger-600)' : taux > 50 ? 'var(--color-warning-600)' : 'var(--color-success-600)',
                            }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-bold font-mono"
                          style={{ color: taux > 75 ? 'var(--color-danger-600)' : taux > 50 ? 'var(--color-warning-600)' : '#374151' }}
                        >
                          {taux}%
                        </span>
                      </div>
                    </td>
                    <td><StatutBadge statut={b.statut} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/validation/${b.id}`)}
                        className="btn btn-primary btn-sm gap-[5px]"
                      >
                        Examiner <ArrowRight size={12} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════════════════════
   Détail budget — vue comptable (Budget vs Réel)
══════════════════════════════════════════════════════════════════════════════ */
export function BudgetValidationDetail({ basePath = '/validation' }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [budget,        setBudget]        = useState(null)
  const [lignes,        setLignes]        = useState([])
  const [depensesItems, setDepensesItems] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [showRejet,     setShowRejet]     = useState(false)
  const [motifRejet,    setMotifRejet]    = useState('')
  const [motifError,    setMotifError]    = useState('')
  const [confirmModal,  setConfirmModal]  = useState(null)
  const [openExport,    setOpenExport]    = useState(null)

  const load = () => {
    Promise.all([getBudget(id), getLignes(id), getDepenses({ budget: id })])
      .then(([b, l, d]) => {
        setBudget(b.data)
        setLignes(l.data.results ?? l.data)
        setDepensesItems(d.data?.data ?? d.data?.results ?? d.data ?? [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleAction = async (type) => {
    if (type === 'rejeter') {
      setMotifRejet(''); setMotifError(''); setShowRejet(true)
      return
    }
    setConfirmModal({
      title: 'Approuver le budget',
      message: `Approuver le budget "${budget?.nom || ''}" ? Le gestionnaire sera notifié et pourra commencer à saisir des dépenses.`,
      confirmLabel: 'Approuver',
      variant: 'success',
      onConfirm: async () => {
        setSaving(true)
        try { await approuverBudget(id); notifRefresh(); navigate(basePath) }
        catch (err) { alert(err.response?.data?.detail || 'Erreur') }
        finally { setSaving(false) }
      },
    })
    return
  }

  const handleRejeterConfirm = async () => {
    if (motifRejet.trim().length < 10) {
      setMotifError('Le motif doit faire au moins 10 caractères.')
      return
    }
    setSaving(true)
    try {
      await rejeterBudget(id, { motif: motifRejet })
      notifRefresh()
      setShowRejet(false)
      navigate(basePath)
    } catch (err) { setMotifError(err.response?.data?.detail || 'Erreur') }
    finally { setSaving(false) }
  }

  const handleCloturer = () => {
    setConfirmModal({
      title: 'Clôturer le budget',
      message: `Clôturer définitivement le budget "${budget?.nom || ''}" ? Cette action est irréversible et mettra fin à toute saisie de dépenses.`,
      confirmLabel: 'Clôturer',
      variant: 'warning',
      onConfirm: async () => {
        setSaving(true)
        try { await cloturerBudget(id); navigate(basePath) }
        catch (err) { alert(err.response?.data?.detail || 'Erreur') }
        finally { setSaving(false) }
      },
    })
  }

  if (loading || !budget) return <div className="page-loader"><div className="spinner" /></div>

  const depenses    = lignes.filter(l => l.section === 'DEPENSE')
  const revenus     = lignes.filter(l => l.section === 'REVENU')
  const totalBudget = lignes.reduce((s, l) => s + parseFloat(l.montant_alloue   || 0), 0)
  const totalReel   = lignes.reduce((s, l) => s + parseFloat(l.montant_consomme || 0), 0)
  const ecartGlobal = totalBudget - totalReel
  const tauxGlobal  = totalBudget > 0 ? Math.round(totalReel / totalBudget * 100) : 0

  const SECTION_LABEL = { DEPENSE: 'Dépenses', REVENU: 'Revenus' }

  const buildRows = (useFmt) => {
    const totalDep = depenses.reduce((s, l) => s + parseFloat(l.montant_alloue || 0), 0)
    const totalRev = revenus.reduce((s,  l) => s + parseFloat(l.montant_alloue || 0), 0)
    return lignes.map(l => {
      const a          = parseFloat(l.montant_alloue   || 0)
      const c          = parseFloat(l.montant_consomme || 0)
      const e          = a - c
      const sectionTot = l.section === 'DEPENSE' ? totalDep : totalRev
      const pct        = sectionTot > 0 ? Math.round(a / sectionTot * 100) : 0
      const section    = SECTION_LABEL[l.section] ?? l.section
      return useFmt
        ? [l.code || '—', l.libelle, section, fmt(a), fmt(c), (e >= 0 ? '+' : '') + fmt(e), pct + '%']
        : [l.code || '',  l.libelle, section, a,       c,      e,                             pct + '%']
    })
  }

  const STATUT_DEP = { SAISIE: 'En attente', VALIDEE: 'Validée', REJETEE: 'Rejetée' }
  const DEP_HEADERS = ['Référence', 'Ligne budgétaire', 'Montant (FCFA)', 'Date', 'Statut']

  const buildDepensesRows = (useFmt) =>
    depensesItems.map(d => {
      const ligne = lignes.find(l => String(l.id) === String(d.ligne ?? d.ligne_id))
      const m     = parseFloat(d.montant || 0)
      return useFmt
        ? [d.reference || d.libelle || '—', ligne?.libelle || d.ligne_designation || '—', fmt(m), fmtDate(d.date_depense || d.date), STATUT_DEP[d.statut] ?? d.statut]
        : [d.reference || d.libelle || '',  ligne?.libelle || d.ligne_designation || '',  m,       d.date_depense || d.date || '',    d.statut || '']
    })

  const metaBase = {
    subtitle: `${budget.code} · ${budget.departement_nom} · ${budget.gestionnaire_nom || '—'}`,
    filters:  `Statut : ${budget.statut}`,
  }

  const handleExportCSV = (type) => {
    setOpenExport(null)
    if (type === 'budget') {
      exportCSV(`Budget_${budget.code}`,
        ['Code', 'Libellé', 'Section', 'Budget alloué (FCFA)', 'Réel (FCFA)', 'Écart (FCFA)', '% Budget'],
        buildRows(false),
      )
    } else if (type === 'depenses') {
      exportCSV(`Depenses_${budget.code}`, DEP_HEADERS, buildDepensesRows(false))
    } else {
      exportCSVMulti(`Rapport_Global_${budget.code}`, [
        { title: 'Lignes budgétaires', headers: ['Code', 'Libellé', 'Section', 'Budget alloué (FCFA)', 'Réel (FCFA)', 'Écart (FCFA)', '% Budget'], rows: buildRows(false) },
        { title: 'Dépenses',           headers: DEP_HEADERS, rows: buildDepensesRows(false) },
      ])
    }
  }

  const handleExportPDF = (type) => {
    setOpenExport(null)
    if (type === 'budget') {
      printPDF(budget.nom,
        ['Code', 'Libellé', 'Section', 'Budget (FCFA)', 'Réel (FCFA)', 'Écart (FCFA)', '% Budget'],
        buildRows(true),
        { ...metaBase, stats: [
          { value: fmt(totalBudget) + ' FCFA', label: 'Budget global'      },
          { value: fmt(totalReel)   + ' FCFA', label: 'Montant réel'        },
          { value: tauxGlobal + '%',            label: 'Taux consommation'  },
        ]},
      )
    } else if (type === 'depenses') {
      const totalDep  = depensesItems.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
      const nbValides = depensesItems.filter(d => d.statut === 'VALIDEE').length
      printPDF(`Dépenses — ${budget.nom}`,
        DEP_HEADERS,
        buildDepensesRows(true),
        { ...metaBase, stats: [
          { value: fmt(totalDep) + ' FCFA',       label: 'Total dépensé' },
          { value: String(depensesItems.length),  label: 'Nb dépenses'  },
          { value: String(nbValides),             label: 'Validées'     },
        ]},
      )
    } else {
      printPDFMulti(`Rapport global — ${budget.nom}`, [
        { title: 'Lignes budgétaires',  headers: ['Code', 'Libellé', 'Section', 'Budget (FCFA)', 'Réel (FCFA)', 'Écart (FCFA)', '% Budget'], rows: buildRows(true) },
        { title: 'Dépenses enregistrées', headers: DEP_HEADERS, rows: buildDepensesRows(true) },
      ], { ...metaBase, stats: [
        { value: fmt(totalBudget) + ' FCFA', label: 'Budget global'     },
        { value: fmt(totalReel)   + ' FCFA', label: 'Montant réel'       },
        { value: tauxGlobal + '%',            label: 'Taux consommation' },
      ]})
    }
  }

  const tauColor = (t) => t >= 95 ? 'var(--color-danger-600)' : t >= 80 ? 'var(--color-warning-600)' : t >= 50 ? 'var(--color-success-600)' : 'var(--color-gold)'

  return (
    <div>
      {/* Hero header */}
      <div
        className="rounded-[var(--radius-lg)] px-[30px] py-[26px] mb-6 text-white relative overflow-hidden"
        style={{ background: 'var(--af-ink)' }}
      >
        <div className="absolute rounded-full pointer-events-none" style={{ top: -50, right: -50, width: 200, height: 200, background: 'rgba(201,168,76,.06)' }} />
        <div className="relative flex items-start gap-4">
          <button
            onClick={() => navigate(basePath)}
            className="rounded-[9px] px-[10px] py-2 cursor-pointer text-white flex items-center shrink-0 mt-[2px]"
            style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)' }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-[10px] mb-2 flex-wrap">
              <code
                className="rounded-[6px] px-[10px] py-[3px] text-[12px] font-bold font-mono"
                style={{ background: 'rgba(255,255,255,.15)' }}
              >
                {budget.code}
              </code>
              <StatutBadge statut={budget.statut} />
              <span className="text-[12px] opacity-70">{budget.date_debut} → {budget.date_fin}</span>
            </div>
            <h1 className="font-display font-extrabold text-[1.4rem] tracking-[-0.4px] mb-[8px]" style={{ color: '#F8FAFC' }}>
              {budget.nom}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]" style={{ color: 'rgba(255,255,255,.85)' }}>
              <span>
                <span style={{ color: 'rgba(255,255,255,.5)' }}>Gestionnaire</span>{' '}
                <strong className="text-white">{budget.gestionnaire_nom || '—'}</strong>
              </span>
              <span>
                <span style={{ color: 'rgba(255,255,255,.5)' }}>Département</span>{' '}
                <strong className="text-white">{budget.departement_nom || '—'}</strong>
              </span>
              {budget.comptable_nom && (
                <span>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>Comptable</span>{' '}
                  <strong className="text-white">{budget.comptable_nom}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-[10px] shrink-0">
            {budget.statut === 'SOUMIS' && (
              <>
                <button
                  onClick={() => handleAction('rejeter')}
                  disabled={saving}
                  className="inline-flex items-center gap-[7px] px-[18px] py-[9px] rounded-[9px] font-bold text-[13px] cursor-pointer"
                  style={{ border: '1.5px solid rgba(252,165,165,.5)', background: 'rgba(239,68,68,.15)', color: '#fca5a5' }}
                >
                  <XCircle size={15} strokeWidth={2} /> Rejeter
                </button>
                <button
                  onClick={() => handleAction('approuver')}
                  disabled={saving}
                  className="inline-flex items-center gap-[7px] px-[18px] py-[9px] rounded-[9px] border-none text-white font-bold text-[13px] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 10px rgba(5,150,105,.4)' }}
                >
                  <CheckCircle2 size={15} strokeWidth={2} /> Approuver
                </button>
              </>
            )}
            {budget.statut === 'APPROUVE' && (
              <button
                onClick={handleCloturer}
                disabled={saving}
                className="inline-flex items-center gap-[7px] px-[18px] py-[9px] rounded-[9px] border-none text-white font-bold text-[13px] cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0E2A47, #163A5F)', boxShadow: '0 2px 10px rgba(14,42,71,.35)' }}
              >
                Clôturer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Export toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'csv', icon: <Download size={13} strokeWidth={2.2} />, label: 'CSV', bg: 'var(--color-gold-soft)', bgHover: 'rgba(184,134,74,0.22)', border: 'var(--color-gold-line)', color: 'var(--af-ink)', handler: handleExportCSV },
          { key: 'pdf', icon: <Printer  size={13} strokeWidth={2.2} />, label: 'PDF', bg: 'var(--af-ink)', bgHover: '#163A5F', border: 'var(--af-ink)', color: '#fff',    handler: handleExportPDF },
        ].map(btn => (
          <div key={btn.key} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenExport(openExport === btn.key ? null : btn.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                background: btn.bg, border: `1px solid ${btn.border}`,
                color: btn.color, fontSize: '12px', fontWeight: 600,
              }}
              onMouseEnter={e => e.currentTarget.style.background = btn.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = btn.bg}
            >
              {btn.icon} Exporter {btn.label} <span style={{ fontSize: 9, marginLeft: 2 }}>▾</span>
            </button>
            {openExport === btn.key && (
              <div
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                  background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 50, minWidth: 170, overflow: 'hidden',
                }}
              >
                {[
                  { type: 'budget',   label: 'Lignes budget'   },
                  { type: 'depenses', label: 'Dépenses'         },
                  { type: 'global',   label: 'Rapport global'   },
                ].map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => btn.handler(opt.type)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 14px', fontSize: '12px', fontWeight: 600,
                      color: '#374151', background: 'transparent', border: 'none',
                      cursor: 'pointer', borderBottom: '1px solid #F3F4F6',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-4 gap-[14px] mb-[22px]">
        {[
          {
            label: 'BUDGET GLOBAL', value: fmt(totalBudget), unit: 'FCFA',
            sub: 'Montant alloué total',
            color: 'var(--color-gold)', bg: 'var(--color-gold-soft)',
            icon: <BarChart3 size={18} strokeWidth={1.8} />,
          },
          {
            label: 'MONTANT RÉEL', value: fmt(totalReel), unit: 'FCFA',
            sub: 'Dépenses enregistrées',
            color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)',
            icon: <TrendingUp size={18} strokeWidth={1.8} />,
          },
          {
            label: 'ÉCART',
            value: `${ecartGlobal >= 0 ? '+' : ''}${fmt(ecartGlobal)}`, unit: 'FCFA',
            sub: ecartGlobal >= 0 ? 'Sous le budget' : 'Dépassement',
            color: ecartGlobal >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)',
            bg:    ecartGlobal >= 0 ? 'var(--color-success-50)'  : 'var(--color-danger-50)',
            icon: ecartGlobal >= 0
              ? <CheckCircle2 size={18} strokeWidth={1.8} />
              : <XCircle size={18} strokeWidth={1.8} />,
          },
          {
            label: 'TAUX CONSOMMATION', value: `${tauxGlobal}%`, unit: '',
            sub: `${lignes.length} ligne${lignes.length !== 1 ? 's' : ''}`,
            color: tauColor(tauxGlobal),
            bg: tauxGlobal >= 95 ? 'var(--color-danger-50)' : tauxGlobal >= 80 ? 'var(--color-warning-50)' : 'var(--color-gold-soft)',
            icon: <BarChart3 size={18} strokeWidth={1.8} />,
          },
        ].map(({ label, value, unit, sub, color, bg, icon }) => (
          <div key={label} className="card px-5 py-[18px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-[#6B7280] tracking-[.5px]">{label}</span>
              <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: bg, color }}>{icon}</div>
            </div>
            <div className="font-mono font-extrabold text-[1.2rem] tracking-[-0.3px] mb-1" style={{ color }}>
              {value} {unit && <span className="text-[11px] font-medium opacity-70">{unit}</span>}
            </div>
            <div className="text-[11px] text-[#9CA3AF]">{sub}</div>
          </div>
        ))}
      </div>

      {/* Barre de progression globale */}
      <div className="card mb-[22px]">
        <div className="flex justify-between items-center mb-[10px]">
          <span className="text-[13px] font-semibold text-[#374151]">Consommation globale</span>
          <span className="text-[13px] font-bold font-mono" style={{ color: tauColor(tauxGlobal) }}>
            {tauxGlobal}%
          </span>
        </div>
        <div className="h-[10px] bg-[#F3F4F6] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width_.4s]"
            style={{
              width: `${Math.min(tauxGlobal, 100)}%`,
              background: `linear-gradient(90deg, ${tauColor(Math.max(0, tauxGlobal - 20))}, ${tauColor(tauxGlobal)})`,
            }}
          />
        </div>
        <div className="flex justify-between mt-[6px] text-[11px] text-[#9CA3AF] font-mono">
          <span>0</span>
          <span>{fmt(totalReel)} / {fmt(totalBudget)} FCFA</span>
          <span>{fmt(totalBudget)} FCFA</span>
        </div>
      </div>

      {/* ── Section Dépenses ── */}
      <SectionDepenses
        depenses={depensesItems}
        lignes={lignes}
      />
      <div className="h-5" />

      {/* ── Section Budget ── */}
      <SectionBudget
        titre="Budget — Dépenses"
        lignes={depenses}
        couleur="#D97706"
        couleurBg="var(--color-warning-50)"
        couleurBorder="var(--color-warning-200)"
      />
      {revenus.length > 0 && <><div className="h-4" /><SectionBudget titre="Budget — Revenus" lignes={revenus} couleur="#0D9488" couleurBg="#f0fdfa" couleurBorder="#99f6e4" /></>}


      {/* Zone de décision */}
      {(budget.statut === 'SOUMIS' || budget.statut === 'APPROUVE') && (
        <div
          className="mt-6 rounded-[var(--radius-lg)] px-7 py-[22px] flex justify-between items-center flex-wrap gap-4"
          style={{ background: 'var(--af-ink)' }}
        >
          <div>
            <div className="font-display font-bold text-white mb-1 text-[15px]">
              {budget.statut === 'APPROUVE' ? 'Clôture budgétaire' : 'Décision de validation'}
            </div>
            <div className="text-[13px] text-white/65">
              {budget.statut === 'APPROUVE'
                ? 'Clôturez le budget pour figer la consommation finale'
                : 'Analysez les lignes ci-dessus avant de valider ou rejeter ce budget'
              }
            </div>
          </div>
          <div className="flex gap-3">
            {budget.statut === 'SOUMIS' && (
              <>
                <button
                  onClick={() => handleAction('rejeter')}
                  disabled={saving}
                  className="inline-flex items-center gap-[7px] px-[22px] py-[10px] rounded-[9px] font-bold text-[14px] cursor-pointer"
                  style={{ border: '1.5px solid rgba(252,165,165,.5)', background: 'rgba(239,68,68,.15)', color: '#fca5a5' }}
                >
                  <XCircle size={15} strokeWidth={2} /> Rejeter le budget
                </button>
                <button
                  onClick={() => handleAction('approuver')}
                  disabled={saving}
                  className="inline-flex items-center gap-[7px] px-[22px] py-[10px] rounded-[9px] border-none text-white font-bold text-[14px] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 14px rgba(5,150,105,.4)' }}
                >
                  <CheckCircle2 size={15} strokeWidth={2} /> Approuver le budget
                </button>
              </>
            )}
            {budget.statut === 'APPROUVE' && (
              <button
                onClick={handleCloturer}
                disabled={saving}
                className="inline-flex items-center gap-[7px] px-[22px] py-[10px] rounded-[9px] border-none text-white font-bold text-[14px] cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0E2A47, #163A5F)', boxShadow: '0 2px 14px rgba(14,42,71,.35)' }}
              >
                Clôturer le budget
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de rejet avec motif */}
      {showRejet && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRejet(false) }}>
          <div className="modal-panel" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={16} style={{ color: 'var(--color-danger-600)' }} />
                Rejeter le budget
              </h2>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-gray-600)', marginBottom: 16 }}>
                Indiquez un motif de rejet détaillé (minimum 10 caractères). Il sera transmis au gestionnaire.
              </p>
              <label className="form-label">Motif de rejet <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
              <textarea
                className="form-input"
                rows={4}
                value={motifRejet}
                onChange={e => { setMotifRejet(e.target.value); setMotifError('') }}
                placeholder="Ex : Les montants des lignes B.1 et B.2 semblent surestimés par rapport à l'exercice précédent…"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              {motifError && (
                <p style={{ fontSize: '12px', color: 'var(--color-danger-600)', marginTop: 6 }}>{motifError}</p>
              )}
              <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginTop: 4 }}>
                {motifRejet.length} / 500 caractères
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowRejet(false)} className="btn btn-secondary btn-md">Annuler</button>
              <button
                onClick={handleRejeterConfirm}
                disabled={saving}
                className="btn btn-danger btn-md"
                style={{ gap: 6 }}
              >
                <XCircle size={14} /> Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════════════════════
   Section Dépenses — ConsommationLigne groupées par ligne budgétaire
══════════════════════════════════════════════════════════════════════════════ */
function SectionDepenses({ depenses, lignes }) {
  const couleur       = 'var(--af-ink)'
  const couleurBg     = 'var(--color-gold-soft)'
  const couleurBorder = 'var(--color-gold-line)'

  const totalDepense = depenses.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
  const nbDepenses   = depenses.length
  const nbValides    = depenses.filter(d => d.statut === 'VALIDEE').length
  const tauxValide   = nbDepenses > 0 ? Math.round(nbValides / nbDepenses * 100) : 0

  // Grouper par ligne_id et croiser avec les lignes budgétaires
  const groupsMap = {}
  depenses.forEach(d => {
    const key = d.ligne ?? d.ligne_id
    if (!groupsMap[key]) groupsMap[key] = []
    groupsMap[key].push(d)
  })
  const lignesDepense = lignes.filter(l => l.section === 'DEPENSE')
  const groups = Object.entries(groupsMap).map(([ligneId, items]) => {
    const ligne      = lignesDepense.find(l => String(l.id) === String(ligneId))
    const totalGrp   = items.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
    return {
      ligneId,
      libelle: ligne?.libelle ?? items[0]?.ligne_designation ?? `Ligne ${ligneId}`,
      alloue:  parseFloat(ligne?.montant_alloue || 0),
      depense: totalGrp,
      items,
    }
  })
  const maxVal = Math.max(...groups.map(g => Math.max(g.alloue, g.depense)), 1)

  return (
    <div className="card p-0 overflow-hidden">
      {/* En-tête */}
      <div
        className="px-5 py-3 flex justify-between items-center"
        style={{ borderBottom: `1px solid ${couleurBorder}`, background: couleurBg }}
      >
        <h3 className="font-display font-extrabold text-[15px]" style={{ color: couleur }}>
          Dépenses
        </h3>
        <div className="flex gap-[18px] text-[12px]">
          <span className="text-[#6B7280]">
            Total : <strong style={{ color: couleur }}>{fmt(totalDepense)} FCFA</strong>
          </span>
          <span className="text-[#6B7280]">{nbDepenses} dépense{nbDepenses !== 1 ? 's' : ''}</span>
          <span className="font-bold" style={{ color: nbValides > 0 ? 'var(--color-success-600)' : 'var(--color-gray-600)' }}>
            {nbValides} validée{nbValides !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {depenses.length === 0 ? (
        <div className="text-center py-8 text-[#9CA3AF] text-[13px]">
          Aucune dépense enregistrée pour ce budget
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: 0 }}>

          {/* Panneau gauche : KPI */}
          <div className="p-5 border-r border-[#F3F4F6]">
            <div className="mb-[14px]">
              <span className="font-mono font-extrabold text-[1.4rem]" style={{ color: couleur }}>
                {fmt(totalDepense)} FCFA
              </span>
            </div>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-[#6B7280]">Nb dépenses</span>
              <span className="font-bold font-mono">{nbDepenses}</span>
            </div>
            <div className="flex justify-between text-[12px] mb-[18px]">
              <span className="text-[#6B7280]">Validées</span>
              <span className="font-bold font-mono">{nbValides}</span>
            </div>
            <div className="text-[10px] font-bold text-[#9CA3AF] mb-[6px] tracking-[.3px]">TAUX DE VALIDATION</div>
            <div
              className="h-6 rounded-[6px] overflow-hidden relative mb-1"
              style={{ background: couleurBg, border: `1px solid ${couleurBorder}` }}
            >
              <div
                className="h-full rounded-[6px] transition-[width_.4s]"
                style={{ width: `${Math.min(tauxValide, 100)}%`, background: couleur }}
              />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold"
                style={{ color: tauxValide > 40 ? '#fff' : couleur }}
              >
                {tauxValide}%
              </span>
            </div>
          </div>

          {/* Centre : barres horizontales par ligne budgétaire */}
          <div className="p-4 border-r border-[#F3F4F6] overflow-y-auto max-h-[300px]">
            <div className="flex gap-4 text-[10px] font-bold text-[#9CA3AF] mb-3">
              <span className="flex items-center gap-[5px]">
                <span className="w-[10px] h-[10px] rounded-[2px] inline-block" style={{ background: couleur }} />
                Alloué
              </span>
              <span className="flex items-center gap-[5px]">
                <span
                  className="w-[10px] h-[10px] rounded-[2px] inline-block"
                  style={{ background: `${couleur}55`, border: `1.5px dashed ${couleur}` }}
                />
                Dépensé
              </span>
            </div>
            {groups.map(g => {
              const nVal = g.items.filter(d => d.statut === 'VALIDEE').length
              const nAtt = g.items.filter(d => d.statut === 'SAISIE').length
              const nRej = g.items.filter(d => d.statut === 'REJETEE').length
              return (
                <div key={g.ligneId} className="mb-[16px]">
                  <div className="text-[12px] font-medium text-[#374151] mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {g.libelle}
                  </div>
                  <div className="h-[9px] bg-[#F3F4F6] rounded-full overflow-hidden mb-[3px]">
                    <div className="h-full rounded-full" style={{ width: `${(g.alloue / maxVal) * 100}%`, background: couleur }} />
                  </div>
                  <div className="h-[9px] bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(g.depense / maxVal) * 100}%`, background: `${couleur}88`, border: `1px dashed ${couleur}` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-[2px] font-mono mb-[5px]">
                    <span>{fmt(g.alloue)} FCFA</span>
                    <span>{fmt(g.depense)} FCFA</span>
                  </div>
                  <div className="flex gap-[6px] flex-wrap">
                    {nVal > 0 && (
                      <span className="inline-flex items-center gap-[3px] text-[10px] font-bold px-[6px] py-[2px] rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>
                        <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ background: '#059669' }} />
                        {nVal} validée{nVal > 1 ? 's' : ''}
                      </span>
                    )}
                    {nAtt > 0 && (
                      <span className="inline-flex items-center gap-[3px] text-[10px] font-bold px-[6px] py-[2px] rounded-full" style={{ background: '#FFFBEB', color: '#92400E' }}>
                        <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ background: '#D97706' }} />
                        {nAtt} en attente
                      </span>
                    )}
                    {nRej > 0 && (
                      <span className="inline-flex items-center gap-[3px] text-[10px] font-bold px-[6px] py-[2px] rounded-full" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                        <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ background: '#DC2626' }} />
                        {nRej} rejetée{nRej > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Droite : tableau par ligne budgétaire avec statuts */}
          <div className="overflow-y-auto max-h-[300px]">
            <table className="data-table rounded-none">
              <thead className="sticky top-0 z-[1]">
                <tr style={{ background: couleur }}>
                  {['Ligne budgétaire', 'Nb', 'Montant'].map(h => (
                    <th
                      key={h}
                      className="text-[10px] font-bold text-white tracking-[.3px] whitespace-nowrap px-[10px] py-2"
                      style={{ textAlign: h === 'Montant' || h === 'Nb' ? 'right' : 'left', background: couleur }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => {
                  return (
                    <tr key={g.ligneId} style={{ background: i % 2 === 0 ? '#fff' : couleurBg }}>
                      <td className="px-[10px] py-2 text-[12px] font-medium max-w-[130px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {g.libelle}
                      </td>
                      <td className="px-[10px] py-2 text-[12px] text-right font-mono text-[#6B7280]">
                        {g.items.length}
                      </td>
                      <td className="px-[10px] py-2 text-[12px] text-right font-semibold font-mono">
                        {fmt(g.depense)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════════════════════
   Composant section (Revenus ou Dépenses)
══════════════════════════════════════════════════════════════════════════════ */
function SectionBudget({ titre, lignes, couleur, couleurBg, couleurBorder }) {
  const totalAlloue   = lignes.reduce((s, l) => s + parseFloat(l.montant_alloue   || 0), 0)
  const totalConsomme = lignes.reduce((s, l) => s + parseFloat(l.montant_consomme || 0), 0)
  const difference    = totalAlloue - totalConsomme
  const tauxGlobal    = totalAlloue > 0 ? Math.round(totalConsomme / totalAlloue * 100) : 0
  const maxVal        = Math.max(...lignes.map(l => parseFloat(l.montant_alloue || 0)), 1)

  const pctBadge = (pct) => {
    if (pct >= 90) return { bg: 'var(--color-danger-50)',   color: 'var(--color-danger-700)'  }
    if (pct >= 75) return { bg: 'var(--color-warning-50)',  color: 'var(--color-warning-700)' }
    return              { bg: 'var(--color-success-50)',  color: 'var(--color-success-700)' }
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* En-tête section */}
      <div
        className="px-5 py-3 flex justify-between items-center"
        style={{ borderBottom: `1px solid ${couleurBorder}`, background: couleurBg }}
      >
        <h3 className="font-display font-extrabold text-[15px]" style={{ color: couleur }}>
          {titre}
        </h3>
        <div className="flex gap-[18px] text-[12px]">
          <span className="text-[#6B7280]">
            Budget : <strong style={{ color: couleur }}>{fmtK(totalAlloue)} FCFA</strong>
          </span>
          <span className="text-[#6B7280]">
            Réel : <strong className="text-[#374151]">{fmtK(totalConsomme)} FCFA</strong>
          </span>
          <span className="font-bold" style={{ color: difference >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
            {difference >= 0 ? '▲ +' : '▼ '}{fmtK(difference)} FCFA
          </span>
        </div>
      </div>

      {lignes.length === 0 ? (
        <div className="text-center py-8 text-[#9CA3AF] text-[13px]">
          Aucune ligne de type « {titre.toLowerCase()} »
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: 0 }}>

          {/* Panneau gauche : KPI */}
          <div className="p-5 border-r border-[#F3F4F6]">
            <div className="mb-[14px]">
              <span
                className="font-mono font-extrabold text-[1.4rem]"
                style={{ color: difference >= 0 ? 'var(--color-success-700)' : 'var(--color-danger-600)' }}
              >
                {difference >= 0 ? '+' : ''}{fmtK(difference)} FCFA
              </span>
            </div>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-[#6B7280]">Budget alloué</span>
              <span className="font-bold font-mono">{fmtK(totalAlloue)}</span>
            </div>
            <div className="flex justify-between text-[12px] mb-[18px]">
              <span className="text-[#6B7280]">Consommé</span>
              <span className="font-bold font-mono">{fmtK(totalConsomme)}</span>
            </div>

            <div className="text-[10px] font-bold text-[#9CA3AF] mb-[6px] tracking-[.3px]">
              {titre.toUpperCase()} % DU BUDGET
            </div>
            <div
              className="h-6 rounded-[6px] overflow-hidden relative mb-1"
              style={{ background: couleurBg, border: `1px solid ${couleurBorder}` }}
            >
              <div
                className="h-full rounded-[6px] transition-[width_.4s]"
                style={{ width: `${Math.min(tauxGlobal, 100)}%`, background: couleur }}
              />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold"
                style={{ color: tauxGlobal > 40 ? '#fff' : couleur }}
              >
                {tauxGlobal}%
              </span>
            </div>
          </div>

          {/* Centre : graphe barres horizontales */}
          <div className="p-4 border-r border-[#F3F4F6] overflow-y-auto max-h-[300px]">
            <div className="flex gap-4 text-[10px] font-bold text-[#9CA3AF] mb-3">
              <span className="flex items-center gap-[5px]">
                <span className="w-[10px] h-[10px] rounded-[2px] inline-block" style={{ background: couleur }} />
                Alloué
              </span>
              <span className="flex items-center gap-[5px]">
                <span
                  className="w-[10px] h-[10px] rounded-[2px] inline-block"
                  style={{ background: `${couleur}55`, border: `1.5px dashed ${couleur}` }}
                />
                Consommé
              </span>
            </div>
            {lignes.map(l => {
              const pctAlloue   = (parseFloat(l.montant_alloue   || 0) / maxVal) * 100
              const pctConsomme = (parseFloat(l.montant_consomme || 0) / maxVal) * 100
              return (
                <div key={l.id} className="mb-[14px]">
                  <div className="text-[12px] font-medium text-[#374151] mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {l.libelle}
                  </div>
                  <div className="h-[9px] bg-[#F3F4F6] rounded-full overflow-hidden mb-[3px]">
                    <div className="h-full rounded-full" style={{ width: `${pctAlloue}%`, background: couleur }} />
                  </div>
                  <div className="h-[9px] bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pctConsomme}%`, background: `${couleur}88`, border: `1px dashed ${couleur}` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-[2px] font-mono">
                    <span>{fmtK(l.montant_alloue)} FCFA</span>
                    <span>{fmtK(l.montant_consomme)} FCFA</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Droite : tableau des lignes */}
          <div className="overflow-y-auto max-h-[300px]">
            <table className="data-table rounded-none">
              <thead className="sticky top-0 z-[1]">
                <tr style={{ background: couleur }}>
                  {['Libellé', 'Budget', 'Réel', 'Écart', '% Budget'].map(h => (
                    <th
                      key={h}
                      className="text-[10px] font-bold text-white tracking-[.3px] whitespace-nowrap px-[10px] py-2"
                      style={{ textAlign: h === 'Libellé' ? 'left' : 'right', background: couleur }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => {
                  const alloue   = parseFloat(l.montant_alloue   || 0)
                  const consomme = parseFloat(l.montant_consomme || 0)
                  const ecart    = alloue - consomme
                  const pct      = totalAlloue > 0 ? Math.round(alloue / totalAlloue * 100) : 0
                  const { bg, color } = pctBadge(pct)
                  return (
                    <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : couleurBg }}>
                      <td className="px-[10px] py-2 text-[12px] font-medium max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {l.libelle}
                      </td>
                      <td className="px-[10px] py-2 text-[12px] text-right font-semibold font-mono">
                        {fmtK(alloue)}
                      </td>
                      <td className="px-[10px] py-2 text-[12px] text-right text-[#6B7280] font-mono">
                        {fmtK(consomme)}
                      </td>
                      <td
                        className="px-[10px] py-2 text-[12px] text-right font-semibold font-mono"
                        style={{ color: ecart >= 0 ? 'var(--color-success-700)' : 'var(--color-danger-600)' }}
                      >
                        {fmtK(ecart)}
                      </td>
                      <td className="px-[10px] py-2 text-right">
                        <span
                          className="rounded-full px-2 py-[2px] text-[10px] font-bold"
                          style={{ background: bg, color }}
                        >
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
