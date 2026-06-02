import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBudgets } from '../../api/budget'
import { getDepenses } from '../../api/depenses'
import { useAuth } from '../../context/AuthContext'
import AlertesZone from '../../components/ui/AlertesZone'
import { cn } from '../../lib/cn'
import { Icon, StatusBadge } from '../../components/AtlasIcons'
import Card from '../../components/ui/Card'
import { formaterNombre } from '../../utils/formatters'

const fmt = n => formaterNombre(n, { maximumFractionDigits: 0 })

const DELTA = {
  up:   'text-[#15803D]',
  down: 'text-[#B91C1C]',
  flat: 'text-[#5A6B7E]',
}

function normDept(raw = '') {
  return String(raw).replace(/^Ministère (de |du |des |de l')?/i, '').trim().slice(0, 22) || 'Autre'
}

function getDeptColor(name = '') {
  const map = { Marketing: '#3B82F6', 'R&D': '#10B981', RH: '#8B5CF6', Opérations: '#E5A53D', Communication: '#7DD3FC' }
  const found = Object.entries(map).find(([k]) => name.includes(k))
  if (found) return found[1]
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i)
  return ['#C9A961','#3B82F6','#10B981','#8B5CF6','#E5A53D'][Math.abs(h) % 5]
}

export default function ComptableDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [budgets,  setBudgets]  = useState([])
  const [depenses, setDepenses] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([getBudgets(), getDepenses()])
      .then(([b, d]) => {
        setBudgets(b.data.results ?? b.data)
        setDepenses(d.data?.data ?? d.data?.results ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const aValider     = budgets.filter(b => b.statut === 'SOUMIS')
  const depEnAttente = depenses.filter(d => d.statut === 'SAISIE')
  const approuvesSem = budgets.filter(b => b.statut === 'APPROUVE').length
  const rejetes      = budgets.filter(b => b.statut === 'REJETE').length
  const totalBudgets = budgets.filter(b => b.statut !== 'BROUILLON').length
  const tauxRejet    = totalBudgets > 0 ? Math.round(rejetes / totalBudgets * 100 * 10) / 10 : 0

  if (loading) return (
    <div className="af-loader"><div className="af-spinner"/><span>Chargement…</span></div>
  )

  const kpis = [
    { icon: Icon.validate, label: 'Budgets à approuver', value: aValider.length, delta: aValider.length > 3 ? 'down' : 'flat', sub: aValider.length > 0 ? `${Math.min(aValider.length, 3)} critiques` : 'À jour' },
    { icon: Icon.expense,  label: 'Dépenses à valider',  value: depEnAttente.length, delta: 'flat', sub: depEnAttente.length > 0 ? 'en attente' : 'À jour' },
    { icon: Icon.audit,    label: 'Approuvés',            value: approuvesSem, delta: 'up',   sub: 'exercice en cours' },
    { icon: Icon.kpi,      label: 'Taux de rejet',        value: tauxRejet,    unit: '%', delta: 'flat', sub: 'stable' },
  ]

  return (
    <div>
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">
            File de validation · {aValider.length} en attente
          </div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">
            À traiter aujourd'hui
          </h1>
          <div className="text-[13px] text-[#5A6B7E]">Ordre par ancienneté de soumission.</div>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/validation')}>
            File de validation
          </button>
        </div>
      </div>

      <AlertesZone budgets={budgets} budgetBasePath="/validation" />

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">
              {k.icon}{k.label}
            </div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
              {k.value}{k.unit && <span className="text-[#B8864A] text-[16px] ml-0.5">{k.unit}</span>}
            </div>
            <div className={cn('text-[11px] inline-flex items-center gap-1', DELTA[k.delta])}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      <Card.Table className="mb-[14px]">
        <div className="flex items-center px-5 py-4 border-b border-[rgba(14,42,71,0.08)]">
          <h3 className="text-base font-semibold text-[#0E2A47] tracking-tight">Budgets en attente d'approbation</h3>
          <div className="ml-auto">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/validation')}>Voir tout</button>
          </div>
        </div>
        {aValider.length === 0 ? (
          <div className="py-8 px-5 text-center text-[13px] text-[rgba(90,107,126,0.7)]">
            Aucun budget en attente d'approbation.
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr><th>Soumis</th><th>Réf.</th><th>Intitulé</th><th>Gestionnaire</th><th>Département</th><th>Montant</th><th></th></tr>
            </thead>
            <tbody>
              {aValider
                .slice()
                .sort((a, b) => new Date(a.date_soumission || a.date_creation) - new Date(b.date_soumission || b.date_creation))
                .slice(0, 6)
                .map(b => {
                  const dept = normDept(b.departement_detail?.nom || b.departement_nom || '')
                  return (
                    <tr key={b.id}>
                      <td className="muted">
                        {new Date(b.date_soumission || b.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="ref">{b.code}</td>
                      <td>{b.nom}</td>
                      <td>{b.gestionnaire_nom || '—'}</td>
                      <td>
                        <span className="af-dept-chip">
                          <span className="d" style={{ background: getDeptColor(dept) }}></span>
                          {dept}
                        </span>
                      </td>
                      <td className="num">{fmt(b.montant_global)} FCFA</td>
                      <td>
                        <button className="btn btn-secondary btn-xs" onClick={() => navigate(`/validation/${b.id}`)}>
                          Examiner →
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </Card.Table>

      <Card.Table>
        <div className="flex items-center px-5 py-4 border-b border-[rgba(14,42,71,0.08)]">
          <h3 className="text-base font-semibold text-[#0E2A47] tracking-tight">Dépenses à valider</h3>
          <span className="text-[11px] text-[rgba(90,107,126,0.7)] ml-2">Top 5</span>
        </div>
        {depEnAttente.length === 0 ? (
          <div className="py-8 px-5 text-center text-[13px] text-[rgba(90,107,126,0.7)]">
            Aucune dépense en attente.
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr><th>Réf.</th><th>Ligne budgétaire</th><th>Budget</th><th>Montant</th><th></th></tr>
            </thead>
            <tbody>
              {depEnAttente.slice(0, 5).map(d => (
                <tr key={d.id}>
                  <td className="ref">{d.note || d.fournisseur || String(d.id).slice(0, 8).toUpperCase()}</td>
                  <td>{d.budget_nom || '—'}</td>
                  <td className="muted">{d.budget_code || '—'}</td>
                  <td className="num">{fmt(d.montant_total)} FCFA</td>
                  <td>
                    <button className="btn btn-secondary btn-xs" onClick={() => navigate(`/depenses/${d.id}`)}>
                      Examiner →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card.Table>
    </div>
  )
}
