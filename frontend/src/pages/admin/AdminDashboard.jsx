import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBudgets, getBudgetAnnuels } from '../../api/budget'
import AlertesZone from '../../components/ui/AlertesZone'
import { Icon, BarChart } from '../../components/AtlasIcons'
import { formaterNombre } from '../../utils/formatters'
import { cn } from '../../lib/cn'

const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

const fmt   = n => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtM  = n => `${formaterNombre(n / 1e6, { maximumFractionDigits: 1 })} M FCFA`

const DEPT_LIST = [
  { name: 'Direction Générale', color: '#C9A961', short: 'DG' },
  { name: 'Marketing',          color: '#3B82F6', short: 'MK' },
  { name: 'R&D',                color: '#10B981', short: 'RD' },
  { name: 'Ressources Humaines',color: '#8B5CF6', short: 'RH' },
  { name: 'Opérations',         color: '#E5A53D', short: 'OP' },
  { name: 'Communication',      color: '#7DD3FC', short: 'CO' },
]

function getDeptColor(name = '') {
  const found = DEPT_LIST.find(d => name.includes(d.short) || name.includes(d.name))
  if (found) return found.color
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i)
  const palette = ['#C9A961','#3B82F6','#10B981','#8B5CF6','#E5A53D','#7DD3FC','#F87171','#34D399']
  return palette[Math.abs(hash) % palette.length]
}

function normShort(raw = '') {
  return String(raw).replace(/^Ministère (de |du |des |de l')?/i, '').trim().slice(0, 20) || 'Autre'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [budgets,     setBudgets]     = useState([])
  const [annuels,     setAnnuels]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const charger = useCallback(() => {
    Promise.all([getBudgets(), getBudgetAnnuels()])
      .then(([b, a]) => {
        setBudgets(b.data.results ?? b.data)
        setAnnuels(a.data.results ?? a.data)
        setLastRefresh(new Date())
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    charger()
    const interval = setInterval(charger, 3 * 60 * 1000) // 3 minutes
    return () => clearInterval(interval)
  }, [charger])

  const ba           = annuels[0]
  const annee        = ba?.annee ?? new Date().getFullYear()
  const actifs       = budgets
  const approuves    = budgets.filter(b => b.statut === 'APPROUVE')
  const soumis       = budgets.filter(b => b.statut === 'SOUMIS')
  const alertes      = actifs.filter(b => ['ROUGE','CRITIQUE'].includes(b.niveau_alerte))
  // Allocation totale = budget annuel global (pas seulement les budgets approuvés)
  const totalAlloue  = parseFloat(ba?.montant_global || 0)
  const totalConsome = budgets.reduce((s, b) => s + parseFloat(b.montant_consomme || 0), 0)
  const tauxExec     = totalAlloue > 0 ? Math.round(totalConsome / totalAlloue * 100) : 0

  /* ── Allocation par département ── */
  const deptMapRaw = {}
  approuves.forEach(b => {
    const nom = normShort(b.departement_detail?.nom || b.departement_nom || 'Autre')
    if (!deptMapRaw[nom]) deptMapRaw[nom] = { alloue: 0, consomme: 0 }
    deptMapRaw[nom].alloue   += parseFloat(b.montant_global   || 0)
    deptMapRaw[nom].consomme += parseFloat(b.montant_consomme || 0)
  })
  const deptMap = Object.entries(deptMapRaw)
    .map(([name, v]) => ({ name, ...v, pct: v.alloue > 0 ? Math.round(v.consomme / v.alloue * 100) : 0 }))
    .sort((a, b) => b.alloue - a.alloue)
    .slice(0, 5)

  /* ── Évolution mensuelle (6 mois) ── */
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i))
    const mo = d.getMonth(), y = d.getFullYear()
    const mois = actifs.filter(b => {
      const c = new Date(b.date_creation)
      return c.getMonth() === mo && c.getFullYear() === y
    })
    const dep = Math.round(mois.reduce((s, b) => s + parseFloat(b.montant_consomme || 0), 0) / 1e6)
    const rev = Math.round(mois.reduce((s, b) => s + parseFloat(b.montant_global   || 0), 0) / 1e6)
    return { label: MONTHS[mo], stacks: [dep, rev] }
  })

  if (loading) return (
    <div className="af-loader"><div className="af-spinner"/><span>Chargement…</span></div>
  )

  return (
    <div>
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">Exercice {annee} · Vue consolidée</div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Vue d'ensemble exécutive</h1>
          <div className="text-[13px] text-[#5A6B7E]">
            {budgets.length} budgets au total · {approuves.length} approuvés · {soumis.length} en attente
            <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--af-mute)' }}>
              Actualisé à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · toutes les 3 min
            </span>
          </div>
        </div>
        <div className="ml-auto flex gap-2.5">
        </div>
      </div>

      <AlertesZone budgets={budgets} budgetBasePath="/budgets" />

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">{Icon.budget}Allocation totale</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{fmtM(totalAlloue).replace(' M FCFA', '')}<span className="text-[#B8864A] text-[16px] ml-0.5"> M FCFA</span></div>
          <div className={cn('text-[11px]', DELTA.flat)}>Exercice {annee}</div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">{Icon.expense}Dépenses engagées</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{fmtM(totalConsome).replace(' M FCFA', '')}<span className="text-[#B8864A] text-[16px] ml-0.5"> M FCFA</span></div>
          <div className={cn('text-[11px]', tauxExec > 75 ? DELTA.down : tauxExec > 50 ? DELTA.flat : DELTA.up)}>{tauxExec}% du budget</div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">{Icon.validate}En attente</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{soumis.length}</div>
          <div className={cn('text-[11px]', soumis.length > 3 ? DELTA.down : DELTA.flat)}>{soumis.length > 0 ? `${soumis.length} à valider` : 'À jour'}</div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">{Icon.ai}Alertes critiques</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{alertes.length}</div>
          <div className={cn('text-[11px]', alertes.length > 0 ? DELTA.down : DELTA.up)}>{alertes.length > 0 ? 'Action requise' : 'Aucune alerte'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Évolution mensuelle</div>
            <div className="text-[11px] text-[#5A6B7E]">Dépenses vs allocation</div>
          </div>
          <div className="p-5" style={{ paddingTop: 8 }}>
            <BarChart
              data={barData.map(d => d.stacks)}
              labels={barData.map(d => d.label)}
            />
            <div className="af-legend" style={{ marginTop: 10 }}>
              <div className="item"><span className="dot" style={{ background: '#C04848' }}></span>Dépenses</div>
              <div className="item"><span className="dot" style={{ background: '#2D6A4F' }}></span>Alloué</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
          <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Allocation par département</div>
          </div>
          <div className="p-5">
            {deptMap.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>Aucune donnée</div>
            ) : deptMap.map((d, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div className="af-flex-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: getDeptColor(d.name), marginRight: 8 }}></span>
                    {d.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--af-cream)' }}>
                    <span style={{ fontFamily: 'var(--af-mono)' }}>{fmtM(d.alloue)}</span>
                    <span style={{ marginLeft: 8, color: d.pct > 85 ? '#FCA5A5' : 'var(--af-gold)' }}>{d.pct}%</span>
                  </span>
                </div>
                <div className="af-bar"><div className={`af-bar-fill ${d.pct > 85 ? 'danger' : d.pct > 70 ? 'warn' : ''}`} style={{ width: `${d.pct}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
          <div className="text-[13px] font-semibold text-[#0E2A47]">Alertes & anomalies</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/budgets')}>Voir tout</button>
        </div>
        {alertes.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
            Aucune alerte critique — tous les budgets sont dans les limites.
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr><th>Réf.</th><th>Budget</th><th>Département</th><th>Montant</th><th>Sévérité</th><th></th></tr>
            </thead>
            <tbody>
              {alertes.slice(0, 6).map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/budgets/${b.id}`)}>
                  <td className="ref">{b.code}</td>
                  <td>{b.nom}</td>
                  <td>
                    <span className="af-dept-chip">
                      <span className="d" style={{ background: getDeptColor(normShort(b.departement_detail?.nom || b.departement_nom || '')) }}></span>
                      {normShort(b.departement_detail?.nom || b.departement_nom || 'Autre')}
                    </span>
                  </td>
                  <td className="num muted">{fmt(b.montant_global)} FCFA</td>
                  <td>
                    <span className={`af-badge ${b.niveau_alerte === 'CRITIQUE' ? 'reject' : 'submit'}`}>
                      {b.niveau_alerte === 'CRITIQUE' ? 'Critique' : 'Modérée'}
                    </span>
                  </td>
                  <td><button className="btn btn-ghost btn-sm">{Icon.arrow}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
