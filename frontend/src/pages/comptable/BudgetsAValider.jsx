import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getBudgets, getBudget, getLignes, approuverBudget, rejeterBudget, cloturerBudget } from '../../api/budget'
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
  const loadRef = useRef(() => {})

  const load = () => {
    Promise.all([getBudget(id), getLignes(id), getDepenses({ budget: id })])
      .then(([b, l, d]) => {
        setBudget(b.data)
        setLignes(l.data.results ?? l.data)
        // Flatten Depense.lignes into per-ligne records for the table
        const rawDeps = d.data?.data ?? d.data?.results ?? d.data ?? []
        setDepensesItems(rawDeps.flatMap(dep =>
          (dep.lignes?.length ? dep.lignes : [{}]).map(cl => ({
            id:                  dep.id,
            ligne_id:            cl.ligne_id,
            ligne_designation:   cl.ligne_libelle,
            montant:             cl.montant || dep.montant_total,
            montant_total:       dep.montant_total,
            statut:              dep.statut,
            date:                cl.date || dep.date,
            date_depense:        cl.date || dep.date,
            note:                cl.note || dep.note,
            fournisseur:         dep.fournisseur,
            reference:           dep.fournisseur || dep.note || String(dep.id).slice(0, 8).toUpperCase(),
            piece_justificative_url: dep.pieces?.[0]?.url_download || null,
            nombre_pieces:       dep.nombre_pieces,
            motif_rejet:         dep.motif_rejet,
            budget_id:           dep.budget_id,
            budget_code:         dep.budget_code,
            budget_nom:          dep.budget_nom,
          }))
        ))
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

  const depensesLignes = lignes.filter(l => l.section === 'DEPENSE')
  const revenusLignes  = lignes.filter(l => l.section === 'REVENU')
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
    return useFmt
      ? [l.code || '—', l.libelle, l.section, fmt(a), fmt(c), (e >= 0 ? '+' : '') + fmt(e)]
      : [l.code || '',  l.libelle, l.section, a,       c,      e]
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
      <Card className="p-0 overflow-hidden mb-[14px]">
        <div className="px-6 py-5">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex gap-2 mb-2.5 flex-wrap items-center">
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
              <div className="text-[18px] font-extrabold text-[#0E2A47] leading-[1.25] mb-1.5">
                {budget.nom}
              </div>
              <div className="text-[12px] text-[rgba(90,107,126,0.7)]">
                Soumis par {budget.gestionnaire_nom || '—'} · {budget.departement_nom || '—'}
                {budget.date_soumission ? ` · ${fmtDate(budget.date_soumission)}` : ''}
              </div>
            </div>

            <div className="flex gap-2 shrink-0 flex-wrap">
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

              {budget.statut === 'SOUMIS' && (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => handleAction('rejeter')} disabled={saving}>
                    {Icon.reject} Rejeter
                  </button>
                  <button className="btn btn-gold btn-sm" onClick={() => handleAction('approuver')} disabled={saving}>
                    {Icon.check} Approuver
                  </button>
                </>
              )}
              {budget.statut === 'APPROUVE' && (
                <button className="btn btn-secondary btn-sm" onClick={handleCloturer} disabled={saving}>
                  Clôturer
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

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

      <Card className="mb-[14px]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[13px] font-semibold text-[#0E2A47]">Consommation globale</span>
          <span className="text-[13px] font-bold font-mono" style={{ color: tauxGlobal > 85 ? '#DC2626' : '#B8864A' }}>{tauxGlobal}%</span>
        </div>
        <div className="af-bar" style={{ height: 10 }}>
          <div className={`af-bar-fill ${tauxGlobal > 85 ? 'danger' : tauxGlobal > 70 ? 'warn' : ''}`} style={{ width: `${Math.min(tauxGlobal, 100)}%` }}/>
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-[rgba(90,107,126,0.7)] font-mono">
          <span>0</span>
          <span>{fmt(totalReel)} / {fmt(totalBudget)} FCFA</span>
          <span>{fmt(totalBudget)} FCFA</span>
        </div>
      </Card>

      <div className="grid gap-[14px]" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="flex flex-col gap-[14px]">
          <Card.Table>
            <div className="flex items-center px-5 py-4 border-b border-[rgba(14,42,71,0.08)]">
              <h3 className="text-base font-semibold text-[#0E2A47] tracking-tight">Lignes budgétaires</h3>
              <div className="ml-auto"><span className="af-tag-method">{budget.methode_budgetisation || 'ANALOGIE'}</span></div>
            </div>
            {lignes.length === 0 ? (
              <div className="py-5 text-center text-[13px] text-[rgba(90,107,126,0.7)]">Aucune ligne budgétaire</div>
            ) : (
              <table className="af-table">
                <thead>
                  <tr><th>Type</th><th>Intitulé</th><th>Budget alloué</th><th>Réel</th><th>Écart</th></tr>
                </thead>
                <tbody>
                  {lignes.map(l => {
                    const a = parseFloat(l.montant_alloue || 0)
                    const c = parseFloat(l.montant_consomme || 0)
                    const e = a - c
                    return (
                      <tr key={l.id}>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.10em] px-[9px] py-1 rounded-[4px] border" style={{
                            background: l.section === 'REVENU' ? 'rgba(45,106,79,0.18)' : 'rgba(192,72,72,0.15)',
                            color: l.section === 'REVENU' ? '#7DCFA0' : '#F5A0A0',
                            borderColor: l.section === 'REVENU' ? 'rgba(45,106,79,0.5)' : 'rgba(192,72,72,0.5)',
                          }}>
                            {l.section}
                          </span>
                        </td>
                        <td>{l.libelle}</td>
                        <td className="num">{fmt(a)} FCFA</td>
                        <td className="num muted">{fmt(c)} FCFA</td>
                        <td className="num" style={{ color: e >= 0 ? '#15803D' : '#DC2626' }}>
                          {e >= 0 ? '+' : ''}{fmt(e)} FCFA
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            <div className="grid grid-cols-3 gap-[14px] px-5 py-3.5 border-t border-[rgba(14,42,71,0.08)]">
              {[
                { label: 'Total recettes', value: fmt(revenusLignes.reduce((s, l) => s + parseFloat(l.montant_alloue || 0), 0)), color: '#7DCFA0' },
                { label: 'Total dépenses', value: fmt(depensesLignes.reduce((s, l) => s + parseFloat(l.montant_alloue || 0), 0)), color: '#F5A0A0' },
                { label: 'Solde prévisionnel', value: fmt(revenusLignes.reduce((s, l) => s + parseFloat(l.montant_alloue || 0), 0) - depensesLignes.reduce((s, l) => s + parseFloat(l.montant_alloue || 0), 0)), color: '#B8864A' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-[10px] tracking-[0.18em] uppercase text-[rgba(90,107,126,0.7)] mb-1">{s.label}</div>
                  <div className="tabular-nums font-mono text-[18px]" style={{ color: s.color }}>{s.value} FCFA</div>
                </div>
              ))}
            </div>
          </Card.Table>

          {depensesItems.length > 0 && (
            <Card.Table>
              <div className="flex items-center px-5 py-4 border-b border-[rgba(14,42,71,0.08)]">
                <h3 className="text-base font-semibold text-[#0E2A47] tracking-tight">Dépenses enregistrées</h3>
                <span className="text-[11px] text-[rgba(90,107,126,0.7)] ml-2">{depensesItems.length} dépense{depensesItems.length !== 1 ? 's' : ''}</span>
              </div>
              <table className="af-table">
                <thead>
                  <tr><th>Réf.</th><th>Libellé</th><th>Ligne budgétaire</th><th>Montant</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {depensesItems.map(d => {
                    const ligne = lignes.find(l => String(l.id) === String(d.ligne ?? d.ligne_id))
                    return (
                      <tr key={d.id}>
                        <td className="ref">{d.reference || d.code || `DP-${d.id}`}</td>
                        <td>{d.libelle || d.description || '—'}</td>
                        <td className="muted">{ligne?.libelle || d.ligne_designation || '—'}</td>
                        <td className="num">{fmt(d.montant)} FCFA</td>
                        <td><StatusBadge status={d.statut}/></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card.Table>
          )}
        </div>

        <div className="flex flex-col gap-[14px]">
          <Card>
            <Card.Header title="Synthèse" />
            <Card.Body padded>
              <div className="flex justify-between mb-3.5">
                <span className="text-[#5A6B7E]">Total demandé</span>
                <span className="tabular-nums font-mono text-[20px] text-[#B8864A]">{fmt(totalBudget)} FCFA</span>
              </div>
              <div className="flex justify-between mb-3.5">
                <span className="text-[#5A6B7E]">Consommé</span>
                <span className="tabular-nums">{fmt(totalReel)} FCFA</span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[11px] text-[rgba(90,107,126,0.7)]">Taux de consommation</span>
                <span className="tabular-nums" style={{ color: tauxGlobal > 85 ? '#DC2626' : '#15803D' }}>{tauxGlobal}%</span>
              </div>
              <div className="af-bar"><div className={`af-bar-fill ${tauxGlobal > 85 ? 'danger' : tauxGlobal > 70 ? 'warn' : 'ok'}`} style={{ width: `${Math.min(tauxGlobal, 100)}%` }}/></div>
            </Card.Body>
          </Card>

          {budget.description && (
            <Card>
              <Card.Header title="Justification" />
              <Card.Body padded>
                <p className="text-[13px] text-[#5A6B7E] leading-[1.7]">{budget.description}</p>
              </Card.Body>
            </Card>
          )}

          <Card>
            <Card.Header title="Informations" />
            <Card.Body padded>
              <div className="flex flex-col gap-2.5 text-[12px]">
                {[
                  { label: 'Code',         val: budget.code },
                  { label: 'Gestionnaire', val: budget.gestionnaire_nom || '—' },
                  { label: 'Département',  val: budget.departement_nom  || '—' },
                  { label: 'Méthode',      val: budget.methode_budgetisation || '—' },
                  { label: 'Créé le',      val: fmtDate(budget.date_creation) },
                  { label: 'Soumis le',    val: fmtDate(budget.date_soumission) },
                  budget.comptable_nom ? { label: 'Comptable', val: budget.comptable_nom } : null,
                ].filter(Boolean).map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-[rgba(90,107,126,0.7)]">{row.label}</span>
                    <span className="text-[#0E2A47] font-semibold">{row.val}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

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
