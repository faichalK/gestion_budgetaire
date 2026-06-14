import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getBudgets, getBudget, getLignes, getBudgetArbre, approuverBudget, rejeterBudget, cloturerBudget } from '../../api/budget'
import { getDepenses } from '../../api/depenses'
import { cn } from '../../lib/cn'
import { Icon, StatusBadge } from '../../components/AtlasIcons'
import Card from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui'
import { exportCSV, exportCSVMulti, printPDF, printPDFMulti } from '../../utils/export'
import { formaterNombre } from '../../utils/formatters'

const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

const fmt     = n => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

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
    if (s === filtre) return
    const t = window.setTimeout(() => { setFiltre(s); setLoading(true) }, 0)
    return () => window.clearTimeout(t)
  }, [searchParams, filtre])

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

  if (loading) return (
    <div className="af-loader"><div className="af-spinner"/><span>Chargement…</span></div>
  )

  const FILTRES = [
    { key: 'SOUMIS',   label: 'En attente' },
    { key: 'APPROUVE', label: 'Approuvés'  },
    { key: 'REJETE',   label: 'Rejetés'    },
    { key: '',         label: 'Tous'        },
  ]

  const countFor = key => key
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
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">
            Comptabilité · File de validation
          </div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">
            Budgets à valider
          </h1>
          <div className="text-[13px] text-[#5A6B7E]">
            {visible.length} budget{visible.length !== 1 ? 's' : ''} · {countFor('SOUMIS')} en attente
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        {[
          { label: 'En attente', value: countFor('SOUMIS'),   delta: 'flat', sub: 'budget(s)' },
          { label: 'Approuvés',  value: countFor('APPROUVE'), delta: 'up',   sub: 'budget(s)' },
          { label: 'Rejetés',    value: countFor('REJETE'),   delta: 'down', sub: 'budget(s)' },
          { label: 'Total',      value: countFor(''),         delta: 'flat', sub: 'budgets'   },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">{k.label}</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{k.value}</div>
            <div className={cn('text-[11px] inline-flex items-center gap-1', DELTA[k.delta])}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(90,107,126,0.7)] flex">{Icon.search}</span>
          <input
            className="form-input pl-8 text-[13px]"
            type="text"
            placeholder="Rechercher par nom, code, gestionnaire…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTRES.map(f => (
            <button
              key={f.key}
              onClick={() => { setLoading(true); setFiltre(f.key) }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] border transition-all duration-150',
                filtre === f.key
                  ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
                  : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
              )}
            >
              {f.label}
              <span className={cn(
                'text-[10px] font-bold px-1.5 rounded-full',
                filtre === f.key ? 'bg-white/20 text-[#B8864A]' : 'bg-[rgba(14,42,71,0.06)] text-[rgba(90,107,126,0.7)]'
              )}>
                {countFor(f.key)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card.Table>
        {visible.length === 0 ? (
          <div className="py-10 px-5 text-center text-[13px] text-[rgba(90,107,126,0.7)]">
            {q ? `Aucun résultat pour « ${search} »` : 'Aucun budget pour ce filtre'}
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr>
                <th>Code</th><th>Nom</th><th>Département</th><th>Gestionnaire</th>
                <th>Soumis le</th><th>Montant</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/validation/${b.id}`)}>
                  <td className="ref">{b.code}</td>
                  <td>{b.nom}</td>
                  <td className="muted">{b.departement_nom || '—'}</td>
                  <td className="muted">{b.gestionnaire_nom || '—'}</td>
                  <td className="muted">{fmtDate(b.date_soumission)}</td>
                  <td className="num">{fmt(b.montant_global)} FCFA</td>
                  <td><StatusBadge status={b.statut}/></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card.Table>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════════════════════
   Vue intégrée : Lignes budgétaires + Dépenses par ligne
══════════════════════════════════════════════════════════════════════════════ */
function LignesAvecDepenses({ categories, depensesItems, lignes, fmt }) {
  const byLigne = {}
  depensesItems.forEach(dep => {
    ;(dep.lignes_cl || []).forEach(cl => {
      const lid = String(cl.ligne_id)
      if (!byLigne[lid]) byLigne[lid] = []
      byLigne[lid].push({
        dep_id:  dep.id,
        ref:     dep.reference,
        statut:  dep.statut,
        montant: parseFloat(cl.montant || 0),
        date:    cl.date,
      })
    })
  })

  const DEP_STATUT = {
    SAISIE:  { label: 'En attente', color: '#B8864A' },
    VALIDEE: { label: 'Validée',    color: '#15803D' },
    REJETEE: { label: 'Rejetée',    color: '#DC2626' },
  }

  const revenusLignes  = lignes.filter(l => l.section === 'REVENU')
  const depensesLignes = lignes.filter(l => l.section !== 'REVENU')
  const totRev  = revenusLignes.reduce((s, l)  => s + parseFloat(l.montant_alloue || 0), 0)
  const totDep  = depensesLignes.reduce((s, l) => s + parseFloat(l.montant_alloue || 0), 0)
  const solde   = totRev - totDep

  if (categories.length === 0) {
    return (
      <Card.Table>
        <div className="flex items-center px-5 py-4 border-b border-[rgba(14,42,71,0.08)]">
          <h3 className="text-base font-semibold text-[#0E2A47] tracking-tight">Lignes budgétaires</h3>
          <span className="ml-2 text-[11px] text-[rgba(90,107,126,0.7)]">{lignes.length} ligne{lignes.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="af-table">
          <thead><tr><th>Intitulé</th><th>Type</th><th>Alloué</th><th>Consommé</th><th>Écart</th></tr></thead>
          <tbody>
            {lignes.map(l => {
              const a = parseFloat(l.montant_alloue || 0)
              const c = parseFloat(l.montant_consomme || 0)
              const e = a - c
              return (
                <tr key={l.id}>
                  <td>{l.libelle}</td>
                  <td><span className="text-[10px] font-semibold px-2 py-0.5 rounded border" style={{ background: l.section === 'REVENU' ? 'rgba(45,106,79,0.12)' : 'rgba(14,42,71,0.06)', color: l.section === 'REVENU' ? '#15803D' : '#5A6B7E', borderColor: l.section === 'REVENU' ? 'rgba(45,106,79,0.4)' : 'rgba(14,42,71,0.15)' }}>{l.section === 'REVENU' ? 'Revenu' : 'Budget'}</span></td>
                  <td className="num">{fmt(a)} FCFA</td>
                  <td className="num muted">{fmt(c)} FCFA</td>
                  <td className="num" style={{ color: e >= 0 ? '#15803D' : '#DC2626' }}>{e >= 0 ? '+' : ''}{fmt(e)} FCFA</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="grid grid-cols-3 gap-[14px] px-5 py-3.5 border-t border-[rgba(14,42,71,0.08)]">
          {[
            { label: 'Total recettes',    value: fmt(totRev),  color: '#7DCFA0' },
            { label: 'Total dépenses',    value: fmt(totDep),  color: '#F5A0A0' },
            { label: 'Solde prévisionnel',value: fmt(solde),   color: '#B8864A' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[10px] tracking-[0.18em] uppercase text-[rgba(90,107,126,0.7)] mb-1">{s.label}</div>
              <div className="tabular-nums font-mono text-[18px]" style={{ color: s.color }}>{s.value} FCFA</div>
            </div>
          ))}
        </div>
      </Card.Table>
    )
  }

  return (
    <Card.Table>
      <div className="flex items-center px-5 py-4 border-b border-[rgba(14,42,71,0.08)]">
        <h3 className="text-base font-semibold text-[#0E2A47] tracking-tight">Lignes budgétaires & Dépenses</h3>
        <span className="ml-2 text-[11px] text-[rgba(90,107,126,0.7)]">{lignes.length} ligne{lignes.length !== 1 ? 's' : ''}</span>
      </div>
      <table className="af-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: '40%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Intitulé</th>
            <th className="text-right">Alloué</th>
            <th className="text-right">Consommé</th>
            <th className="text-right">Écart</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <React.Fragment key={cat.id}>
              <tr style={{ background: 'rgba(14,42,71,0.055)' }}>
                <td colSpan={5} style={{ padding: '8px 16px' }}>
                  <span className="text-[11px] font-bold text-[#0E2A47] tracking-[0.08em] uppercase">{cat.code} — {cat.libelle}</span>
                  <span className="ml-3 text-[11px] text-[#B8864A] font-mono font-bold">{fmt(cat.total)} FCFA</span>
                </td>
              </tr>
              {cat.sous_categories.map(sc => (
                <React.Fragment key={sc.id}>
                  <tr style={{ background: 'rgba(14,42,71,0.025)' }}>
                    <td colSpan={5} style={{ padding: '6px 28px' }}>
                      <span className="text-[11px] font-semibold text-[#5A6B7E]">{sc.code} — {sc.libelle}</span>
                      <span className="ml-3 text-[10px] text-[rgba(90,107,126,0.6)] font-mono">{fmt(sc.total)} FCFA</span>
                    </td>
                  </tr>
                  {sc.lignes.map(ligne => {
                    const a    = parseFloat(ligne.montant_alloue    || 0)
                    const c    = parseFloat(ligne.montant_consomme  || 0)
                    const e    = a - c
                    const deps = byLigne[String(ligne.id)] || []
                    return (
                      <React.Fragment key={ligne.id}>
                        <tr>
                          <td style={{ paddingLeft: 40 }}>
                            <span className="text-[12px] font-semibold text-[#0E2A47]">{ligne.libelle}</span>
                            {ligne.code && (
                              <span className="ml-2 text-[10px] font-mono bg-[rgba(14,42,71,0.06)] text-[#5A6B7E] px-1.5 py-[2px] rounded">{ligne.code}</span>
                            )}
                          </td>
                          <td className="num">{fmt(a)} FCFA</td>
                          <td className="num muted">{fmt(c)} FCFA</td>
                          <td className="num" style={{ color: e >= 0 ? '#15803D' : '#DC2626' }}>{e >= 0 ? '+' : ''}{fmt(e)} FCFA</td>
                          <td/>
                        </tr>
                        {deps.map((d, i) => {
                          const cfg = DEP_STATUT[d.statut] || { label: d.statut, color: '#5A6B7E' }
                          return (
                            <tr key={`${d.dep_id}-${i}`} style={{ background: 'rgba(184,134,74,0.04)' }}>
                              <td style={{ paddingLeft: 56 }}>
                                <span className="text-[11px] font-mono font-semibold text-[#B8864A]">{d.ref}</span>
                                {d.date && <span className="ml-2 text-[11px] text-[rgba(90,107,126,0.6)]">{fmtDate(d.date)}</span>}
                              </td>
                              <td/>
                              <td className="num">
                                <span className="text-[12px] font-mono text-[#0E2A47]">{fmt(d.montant)} FCFA</span>
                              </td>
                              <td/>
                              <td>
                                <span className="text-[10px] font-semibold px-2 py-[2px] rounded" style={{ background: cfg.color + '22', color: cfg.color }}>{cfg.label}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-3 gap-[14px] px-5 py-3.5 border-t border-[rgba(14,42,71,0.08)]">
        {[
          { label: 'Total recettes',     value: fmt(totRev), color: '#7DCFA0' },
          { label: 'Total dépenses',     value: fmt(totDep), color: '#F5A0A0' },
          { label: 'Solde prévisionnel', value: fmt(solde),  color: '#B8864A' },
        ].map(s => (
          <div key={s.label}>
            <div className="text-[10px] tracking-[0.18em] uppercase text-[rgba(90,107,126,0.7)] mb-1">{s.label}</div>
            <div className="tabular-nums font-mono text-[18px]" style={{ color: s.color }}>{s.value} FCFA</div>
          </div>
        ))}
      </div>
    </Card.Table>
  )
}


/* ══════════════════════════════════════════════════════════════════════════════
   Détail budget — vue comptable (Budget vs Réel)
══════════════════════════════════════════════════════════════════════════════ */
export function BudgetValidationDetail({ basePath = '/validation' }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { isComptable } = useAuth()
  const [budget,        setBudget]        = useState(null)
  const [categories,    setCategories]    = useState([])
  const [lignes,        setLignes]        = useState([])
  const [depensesItems, setDepensesItems] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [showRejet,     setShowRejet]     = useState(false)
  const [motifRejet,    setMotifRejet]    = useState('')
  const [motifError,    setMotifError]    = useState('')
  const [confirmModal,  setConfirmModal]  = useState(null)
  const [openExport,    setOpenExport]    = useState(null)
  const loadRef = useRef(() => {})

  const load = () => {
    Promise.all([getBudget(id), getLignes(id), getDepenses({ budget: id }), getBudgetArbre(id)])
      .then(([b, l, d, arbre]) => {
        setBudget(b.data)
        setLignes(l.data.results ?? l.data)
        setCategories(arbre.data?.data ?? [])
        const rawDeps = d.data?.data ?? d.data?.results ?? d.data ?? []
        // 1 item par Depense (pas par ConsommationLigne)
        setDepensesItems(rawDeps.map(dep => ({
          id:           dep.id,
          reference:    dep.reference || String(dep.id).slice(0, 8).toUpperCase(),
          montant:      dep.montant_total,
          statut:       dep.statut,
          date:         dep.date,
          nb_lignes:    dep.lignes?.length || 0,
          pieces:       dep.pieces || [],
          nombre_pieces: dep.nombre_pieces ?? (dep.pieces?.length || 0),
          motif_rejet:  dep.motif_rejet,
          fournisseur:  dep.fournisseur,
          note:         dep.note,
          lignes_cl:    dep.lignes || [],
        })))
      })
      .finally(() => setLoading(false))
  }
  loadRef.current = load

  useEffect(() => {
    const t = window.setTimeout(() => loadRef.current(), 0)
    return () => window.clearTimeout(t)
  }, [id])

  const handleAction = async (type) => {
    if (type === 'rejeter') {
      setMotifRejet(''); setMotifError(''); setShowRejet(true)
      return
    }
    setConfirmModal({
      title: 'Approuver le budget',
      message: `Approuver le budget "${budget?.nom || ''}" ? Le gestionnaire sera notifié.`,
      confirmLabel: 'Approuver',
      variant: 'success',
      onConfirm: async () => {
        setSaving(true)
        try { await approuverBudget(id); navigate(basePath) }
        catch (err) { alert(err.response?.data?.detail || 'Erreur') }
        finally { setSaving(false) }
      },
    })
  }

  const handleRejeterConfirm = async () => {
    if (motifRejet.trim().length < 10) {
      setMotifError('Le motif doit faire au moins 10 caractères.')
      return
    }
    setSaving(true)
    try {
      await rejeterBudget(id, { motif: motifRejet })
      setShowRejet(false)
      navigate(basePath)
    } catch (err) { setMotifError(err.response?.data?.detail || 'Erreur') }
    finally { setSaving(false) }
  }

  const handleCloturer = () => {
    setConfirmModal({
      title: 'Clôturer le budget',
      message: `Clôturer définitivement le budget "${budget?.nom || ''}" ? Cette action est irréversible.`,
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

  if (loading || !budget) return (
    <div className="af-loader"><div className="af-spinner"/><span>Chargement…</span></div>
  )

  const totalBudget    = lignes.reduce((s, l) => s + parseFloat(l.montant_alloue   || 0), 0)
  const totalReel      = lignes.reduce((s, l) => s + parseFloat(l.montant_consomme || 0), 0)
  const ecartGlobal    = totalBudget - totalReel
  const tauxGlobal     = totalBudget > 0 ? Math.round(totalReel / totalBudget * 100) : 0

  const STATUT_DEP = { SAISIE: 'En attente', VALIDEE: 'Validée', REJETEE: 'Rejetée' }
  const DEP_HEADERS = ['Référence', 'Ligne budgétaire', 'Montant (FCFA)', 'Date', 'Statut']

  const buildRows = useFmt => lignes.map(l => {
    const a = parseFloat(l.montant_alloue || 0)
    const c = parseFloat(l.montant_consomme || 0)
    const e = a - c
    const sectionLabel = l.section === 'REVENU' ? 'Revenu' : 'Budget'
    return useFmt
      ? [l.code || '—', l.libelle, sectionLabel, fmt(a), fmt(c), (e >= 0 ? '+' : '') + fmt(e)]
      : [l.code || '',  l.libelle, sectionLabel, a,       c,      e]
  })

  const buildDepensesRows = useFmt => depensesItems.map(d => {
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

  const handleExportCSV = type => {
    setOpenExport(null)
    if (type === 'budget') {
      exportCSV(`Budget_${budget.code}`, ['Code', 'Libellé', 'Section', 'Budget alloué', 'Réel', 'Écart'], buildRows(false))
    } else if (type === 'depenses') {
      exportCSV(`Depenses_${budget.code}`, DEP_HEADERS, buildDepensesRows(false))
    } else {
      exportCSVMulti(`Rapport_${budget.code}`, [
        { title: 'Lignes budgétaires', headers: ['Code', 'Libellé', 'Section', 'Budget alloué', 'Réel', 'Écart'], rows: buildRows(false) },
        { title: 'Dépenses', headers: DEP_HEADERS, rows: buildDepensesRows(false) },
      ])
    }
  }

  const handleExportPDF = type => {
    setOpenExport(null)
    const stats = [
      { value: fmt(totalBudget) + ' FCFA', label: 'Budget global' },
      { value: fmt(totalReel)   + ' FCFA', label: 'Montant réel'  },
      { value: tauxGlobal + '%',            label: 'Taux'          },
    ]
    if (type === 'budget') {
      printPDF(budget.nom, ['Code', 'Libellé', 'Section', 'Budget', 'Réel', 'Écart'], buildRows(true), { ...metaBase, stats })
    } else if (type === 'depenses') {
      printPDF(`Dépenses — ${budget.nom}`, DEP_HEADERS, buildDepensesRows(true), { ...metaBase, stats })
    } else {
      printPDFMulti(`Rapport global — ${budget.nom}`, [
        { title: 'Lignes budgétaires', headers: ['Code', 'Libellé', 'Section', 'Budget', 'Réel', 'Écart'], rows: buildRows(true) },
        { title: 'Dépenses',          headers: DEP_HEADERS, rows: buildDepensesRows(true) },
      ], { ...metaBase, stats })
    }
  }

  return (
    <div>
      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] mb-[14px]">
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="font-mono text-[11px] font-bold bg-[#EDE7DA] text-[#0E2A47] px-2.5 py-[3px] rounded-[6px]">
                  {budget.code}
                </span>
                {budget.departement_nom && (
                  <span className="af-dept-chip">
                    <span className="d" style={{ background: '#C9A961' }}/>
                    {budget.departement_nom.replace(/^Ministère (de |du |des |de l')?/i, '').trim().slice(0, 24)}
                  </span>
                )}
                {budget.annee && (
                  <span className="inline-flex px-2.5 py-1 rounded-full text-[12px] text-[#5A6B7E] border border-[rgba(14,42,71,0.16)] bg-white">
                    Exercice {budget.annee}
                  </span>
                )}
                <StatusBadge status={budget.statut}/>
                {budget.methode_budgetisation && <span className="af-tag-method">{budget.methode_budgetisation}</span>}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--af-ivory)', lineHeight: 1.25, marginBottom: 6 }}>
                {budget.nom}
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--af-mute)', flexWrap: 'wrap' }}>
                <span>Soumis par {budget.gestionnaire_nom || '—'}</span>
                {budget.departement_nom && <span>· {budget.departement_nom}</span>}
                {budget.date_soumission && <span>· {fmtDate(budget.date_soumission)}</span>}
                {budget.comptable_nom && (
                  <span style={{ color: budget.statut === 'APPROUVE' ? '#15803D' : budget.statut === 'REJETE' ? '#B91C1C' : 'var(--af-mute)' }}>
                    {budget.statut === 'APPROUVE' ? '✓ Approuvé' : budget.statut === 'REJETE' ? '✗ Rejeté' : 'Comptable'} : {budget.comptable_nom}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(basePath)}>
                ← Retour
              </button>

              <div className="relative">
                <button className="btn btn-secondary btn-sm" onClick={() => setOpenExport(openExport ? null : 'open')}>
                  {Icon.download} Exporter ▾
                </button>
                {openExport && (
                  <div className="absolute right-0 top-[calc(100%+4px)] bg-white border border-[rgba(14,42,71,0.08)] rounded-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] z-50 min-w-[160px]">
                    {[
                      { type: 'budget',   label: 'CSV — Lignes budget'  },
                      { type: 'depenses', label: 'CSV — Dépenses'        },
                      { type: 'global',   label: 'CSV — Rapport global'  },
                      { type: 'pdf_b',    label: 'PDF — Lignes budget'   },
                      { type: 'pdf_d',    label: 'PDF — Dépenses'        },
                      { type: 'pdf_g',    label: 'PDF — Rapport global'  },
                    ].map(opt => (
                      <button
                        key={opt.type}
                        onClick={() => opt.type.startsWith('pdf') ? handleExportPDF(opt.type.replace('pdf_b','budget').replace('pdf_d','depenses').replace('pdf_g','global')) : handleExportCSV(opt.type)}
                        className="block w-full text-left px-3.5 py-2.5 text-[12px] font-semibold text-[#5A6B7E] bg-transparent border-none border-b border-[rgba(14,42,71,0.06)] cursor-pointer hover:bg-[rgba(14,42,71,0.03)] last:border-b-0"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isComptable && budget.statut === 'SOUMIS' && (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => handleAction('rejeter')} disabled={saving}>
                    {Icon.reject} Rejeter
                  </button>
                  <button className="btn btn-gold btn-sm" onClick={() => handleAction('approuver')} disabled={saving}>
                    {Icon.check} Approuver
                  </button>
                </>
              )}
              {isComptable && budget.statut === 'APPROUVE' && (
                <button className="btn btn-secondary btn-sm" onClick={handleCloturer} disabled={saving}>
                  Clôturer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        {[
          { label: 'Budget global',      value: fmt(totalBudget), unit: ' FCFA', delta: 'flat', sub: `${lignes.length} lignes` },
          { label: 'Montant réel',       value: fmt(totalReel),   unit: ' FCFA', delta: 'flat', sub: 'Dépenses enregistrées' },
          { label: 'Écart',              value: (ecartGlobal >= 0 ? '+' : '') + fmt(ecartGlobal), unit: ' FCFA', delta: ecartGlobal >= 0 ? 'up' : 'down', sub: ecartGlobal >= 0 ? 'Sous le budget' : 'Dépassement', valueColor: ecartGlobal >= 0 ? '#15803D' : '#DC2626' },
          { label: 'Taux consommation',  value: tauxGlobal,       unit: '%',     delta: tauxGlobal > 85 ? 'down' : tauxGlobal > 60 ? 'flat' : 'up', sub: tauxGlobal > 85 ? 'Critique' : tauxGlobal > 60 ? 'Modéré' : 'Normal' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">{k.label}</div>
            <div className="text-[18px] leading-none tracking-[-0.02em] mb-1.5 tabular-nums" style={{ color: k.valueColor || '#0E2A47' }}>
              {k.value}<span className="text-[#B8864A] text-[14px] ml-0.5">{k.unit}</span>
            </div>
            <div className={cn('text-[11px] inline-flex items-center gap-1', DELTA[k.delta])}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Synthèse + Informations (même layout que BudgetDetail gestionnaire) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 14 }}>

        {/* Synthèse */}
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
          <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Synthèse</div>
          </div>
          <div style={{ padding: '14px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--af-cream)' }}>Taux d'exécution</span>
                <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: tauxGlobal > 85 ? '#DC2626' : tauxGlobal > 70 ? '#E5A53D' : 'var(--af-ink)' }}>
                  {tauxGlobal}%
                </span>
              </div>
              <div className="af-bar">
                <div className={`af-bar-fill ${tauxGlobal > 85 ? 'danger' : tauxGlobal > 70 ? 'warn' : ''}`} style={{ width: `${Math.min(100, tauxGlobal)}%` }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
              {[
                { label: 'Budget global', val: `${fmt(totalBudget)} FCFA` },
                { label: 'Consommé',      val: `${fmt(totalReel)} FCFA` },
                { label: 'Écart',         val: `${ecartGlobal >= 0 ? '+' : ''}${fmt(ecartGlobal)} FCFA`, color: ecartGlobal >= 0 ? '#15803D' : '#DC2626' },
                ...(budget.date_debut ? [{ label: 'Période', val: `${budget.date_debut} → ${budget.date_fin}` }] : []),
                ...(budget.gestionnaire_nom ? [{ label: 'Gestionnaire', val: budget.gestionnaire_nom }] : []),
                ...(budget.comptable_nom    ? [{ label: 'Comptable',    val: budget.comptable_nom    }] : []),
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', flexDirection: 'column', padding: '6px 0', borderBottom: '1px solid var(--af-line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--af-mute)', marginBottom: 2 }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.color || 'var(--af-ivory)', wordBreak: 'break-word' }}>{r.val}</span>
                </div>
              ))}
            </div>
            {budget.description && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--af-steel)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--af-mute)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Justification</div>
                <p style={{ fontSize: 12, color: 'var(--af-cream)', lineHeight: 1.6, margin: 0 }}>{budget.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Informations */}
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Informations</div>
            {budget.methode_budgetisation && <span className="af-tag-method">{budget.methode_budgetisation}</span>}
          </div>
          <div style={{ padding: '14px 20px' }}>
            {[
              { label: 'Code',         val: budget.code },
              { label: 'Gestionnaire', val: budget.gestionnaire_nom || '—' },
              { label: 'Département',  val: budget.departement_nom  || '—' },
              { label: 'Méthode',      val: budget.methode_budgetisation || '—' },
              { label: 'Créé le',      val: fmtDate(budget.date_creation) },
              { label: 'Soumis le',    val: fmtDate(budget.date_soumission) },
              ...(budget.comptable_nom  ? [{ label: 'Comptable',    val: budget.comptable_nom  }] : []),
              ...(budget.motif_rejet   ? [{ label: 'Motif rejet',  val: budget.motif_rejet, danger: true }] : []),
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--af-line)' }}>
                <span style={{ fontSize: 11, color: 'var(--af-mute)', flexShrink: 0 }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.danger ? '#B91C1C' : 'var(--af-ivory)', textAlign: 'right', wordBreak: 'break-word' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lignes budgétaires & Dépenses — pleine largeur ─────────────────── */}
      <LignesAvecDepenses
        categories={categories}
        depensesItems={depensesItems}
        lignes={lignes}
        fmt={fmt}
      />

      {showRejet && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRejet(false) }}>
          <div className="modal-panel" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2 text-[15px] font-bold">
                {Icon.reject} Rejeter le budget
              </h2>
            </div>
            <div className="modal-body">
              <p className="text-[13px] text-[#5A6B7E] mb-4">
                Indiquez un motif de rejet détaillé (minimum 10 caractères). Il sera transmis au gestionnaire.
              </p>
              <label className="form-label">Motif de rejet <span className="text-[#DC2626]">*</span></label>
              <textarea
                className="form-input"
                rows={4}
                value={motifRejet}
                onChange={e => { setMotifRejet(e.target.value); setMotifError('') }}
                placeholder="Ex : Les montants des lignes B.1 et B.2 semblent surestimés…"
                style={{ resize: 'vertical', height: 'auto', paddingTop: 10, paddingBottom: 10 }}
              />
              {motifError && <p className="text-[12px] text-[#DC2626] mt-1.5">{motifError}</p>}
              <div className="text-[11px] text-[rgba(90,107,126,0.7)] mt-1">{motifRejet.length} / 500 caractères</div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowRejet(false)} className="btn btn-secondary btn-md">Annuler</button>
              <button onClick={handleRejeterConfirm} disabled={saving} className="btn btn-danger btn-md">
                {Icon.reject} Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
}
