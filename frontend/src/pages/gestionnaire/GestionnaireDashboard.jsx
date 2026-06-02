import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBudgets } from '../../api/budget'
import { getDepenses } from '../../api/depenses'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { Icon, StatusBadge } from '../../components/AtlasIcons'
import Card from '../../components/ui/Card'
import { formaterNombre } from '../../utils/formatters'
import AlertesZone from '../../components/ui/AlertesZone'

const fmt  = n => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtM = n => `${formaterNombre(n / 1e6, { maximumFractionDigits: 1 })}`

const METHOD_LABELS = {
  PERT: 'PERT', ANALOGIE: 'ANALOGIE', ASCENDANTE: 'ASCENDANTE',
  DESCENDANTE: 'DESCENDANTE', PARAMETRIQUE: 'PARAMÉTRIQUE',
}

const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

export default function GestionnaireDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [budgets,  setBudgets]  = useState([])
  const [depenses, setDepenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtre,   setFiltre]   = useState('Tous')

  useEffect(() => {
    Promise.all([getBudgets(), getDepenses()])
      .then(([b, d]) => {
        setBudgets(b.data.results ?? b.data)
        setDepenses(d.data?.data ?? d.data?.results ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const dept       = user?.departement_nom || user?.departement_detail?.nom || ''
  const brouillons = budgets.filter(b => b.statut === 'BROUILLON')
  const rejetes    = budgets.filter(b => b.statut === 'REJETE')
  const approuves  = budgets.filter(b => b.statut === 'APPROUVE')
  const totalAlloue  = approuves.reduce((s, b) => s + parseFloat(b.montant_global   || 0), 0)
  const totalConsome = approuves.reduce((s, b) => s + parseFloat(b.montant_consomme || 0), 0)

  const FILTRES = ['Tous', 'Brouillons', 'Soumis', 'Approuvés']
  const STATUT_BY_FILTRE = { Brouillons: 'BROUILLON', Soumis: 'SOUMIS', 'Approuvés': 'APPROUVE' }
  const budgetsFiltres = filtre === 'Tous' ? budgets : budgets.filter(b => b.statut === STATUT_BY_FILTRE[filtre])

  if (loading) return (
    <div className="af-loader"><div className="af-spinner"/><span>Chargement…</span></div>
  )

  const kpis = [
    { icon: Icon.budget,   label: 'Enveloppe allouée', value: fmtM(totalAlloue),  unit: ' M FCFA', delta: 'flat', sub: `${approuves.length} approuvé${approuves.length !== 1 ? 's' : ''}` },
    { icon: Icon.expense,  label: 'Engagé',             value: fmtM(totalConsome), unit: ' M FCFA', delta: totalAlloue > 0 && totalConsome / totalAlloue > 0.8 ? 'down' : 'up', sub: totalAlloue > 0 ? `${Math.round(totalConsome / totalAlloue * 100)}%` : '—' },
    { icon: Icon.validate, label: 'À soumettre',        value: brouillons.length,  delta: 'flat', sub: `Brouillon${brouillons.length !== 1 ? 's' : ''}` },
    { icon: Icon.audit,    label: 'Refusés',             value: rejetes.length,     delta: rejetes.length > 0 ? 'down' : 'flat', sub: rejetes.length > 0 ? 'Action requise' : 'Aucun rejet' },
  ]

  return (
    <div>
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">
            {dept ? `Département · ${dept}` : 'Mes budgets'}
          </div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">
            Mes budgets en cours
          </h1>
          <div className="text-[13px] text-[#5A6B7E]">
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} actifs · {depenses.length} dépense{depenses.length !== 1 ? 's' : ''} ce mois.
          </div>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/mes-depenses')}>
            {Icon.filter} Filtres
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/creer-budget')}>
            {Icon.plus} Créer un budget
          </button>
        </div>
      </div>

      <AlertesZone budgets={budgets} budgetBasePath="/mes-budgets" />

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">
              {k.icon}{k.label}
            </div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
              {k.value}{k.unit && <span className="text-[#B8864A] text-[16px] ml-0.5">{k.unit}</span>}
            </div>
            <div className={cn('text-[11px] inline-flex items-center gap-1', DELTA[k.delta])}>{k.sub}</div>
          </div>
        ))}
      </div>

      <Card.Table>
        <div className="flex items-center px-5 py-4 border-b border-[rgba(14,42,71,0.08)]">
          <h3 className="text-base font-semibold text-[#0E2A47] tracking-tight">Budgets actifs</h3>
          <div className="ml-auto flex gap-1.5">
            {FILTRES.map(f => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={cn(
                  'inline-flex px-2.5 py-1 rounded-full text-[12px] border transition-all duration-150',
                  filtre === f
                    ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
                    : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {budgetsFiltres.length === 0 ? (
          <div className="py-10 px-5 text-center text-[13px] text-[rgba(90,107,126,0.7)]">
            Aucun budget{filtre !== 'Tous' ? ` pour "${filtre}"` : ''}.{' '}
            <button onClick={() => navigate('/creer-budget')} className="text-[#B8864A] bg-transparent border-none cursor-pointer font-semibold">
              Créer un budget →
            </button>
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr><th>Réf.</th><th>Intitulé</th><th>Méthode</th><th>Montant</th><th>Exécution</th><th>Statut</th><th>Modifié</th></tr>
            </thead>
            <tbody>
              {budgetsFiltres
                .slice()
                .sort((a, b) => new Date(b.date_modification || b.date_creation) - new Date(a.date_modification || a.date_creation))
                .map(b => {
                  const taux = parseFloat(b.montant_global) > 0
                    ? Math.round(parseFloat(b.montant_consomme || 0) / parseFloat(b.montant_global) * 100)
                    : 0
                  return (
                    <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/mes-budgets/${b.id}`)}>
                      <td className="ref">{b.code}</td>
                      <td>{b.nom}</td>
                      <td><span className="af-tag-method">{METHOD_LABELS[b.methode_budgetisation] || b.methode_budgetisation || '—'}</span></td>
                      <td className="num">{fmt(b.montant_global)} FCFA</td>
                      <td style={{ minWidth: 120 }}>
                        {b.statut === 'APPROUVE' ? (
                          <div className="af-bar" style={{ width: 100 }}>
                            <div className={`af-bar-fill ${taux > 85 ? 'danger' : taux > 70 ? 'warn' : ''}`} style={{ width: `${taux}%` }}/>
                          </div>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td><StatusBadge status={b.statut}/></td>
                      <td className="muted">
                        {new Date(b.date_modification || b.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </Card.Table>
    </div>
  )
}
