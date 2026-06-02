import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKpis, getParDepartement, getTauxUtilisationEnveloppes, getEvolutionMensuelle, getParCategorie } from '../../api/rapports'
import { LineChart, DeptChip } from '../../components/AtlasIcons'
import { formaterNombre } from '../../utils/formatters'
import { cn } from '../../lib/cn'

const fmt  = n => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtM = n => `${formaterNombre(Number(n) / 1e6, { maximumFractionDigits: 1 })} M`
const CAT_COLORS = ['#C9A961','#3B82F6','#10B981','#8B5CF6','#E5A53D','#F87171','#34D399','#60A5FA']
const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function RapportsKPIPage() {
  const [period, setPeriod] = useState('12M')

  const { data: kpisData } = useQuery({ queryKey: ['rapports-kpis'], queryFn: () => getKpis().then(r => r.data.data) })
  const { data: deptData  } = useQuery({ queryKey: ['rapports-dept'],  queryFn: () => getParDepartement().then(r => r.data.data) })
  const { data: envData   } = useQuery({ queryKey: ['rapports-env'],   queryFn: () => getTauxUtilisationEnveloppes().then(r => r.data.data) })
  const { data: evoData   } = useQuery({
    queryKey: ['rapports-evo', period],
    queryFn:  () => getEvolutionMensuelle(period).then(r => r.data.data),
  })
  const { data: catData } = useQuery({ queryKey: ['rapports-cat'], queryFn: () => getParCategorie().then(r => r.data.data) })

  const kpis       = kpisData || {}
  const depts      = Array.isArray(deptData)  ? deptData  : []
  const enveloppes = Array.isArray(envData)   ? envData   : []
  const categories = Array.isArray(catData)   ? catData.slice(0, 8) : []

  const evoRows  = Array.isArray(evoData) ? evoData : []
  const evolution = evoRows.map(e => Math.round(Number(e.montant_total || 0) / 1e6))
  const evoLabels = evoRows.map(e => {
    if (!e.mois) return ''
    const d = new Date(e.mois)
    return `${MOIS_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
  })

  const deptRows = depts.slice(0, 6).map((d, i) => ({
    nom:      d.departement__nom || `Département ${i + 1}`,
    alloue:   Number(d.montant_total || 0),
    engage:   Number(d.montant_consomme || 0),
    taux:     d.montant_total > 0
      ? Math.round(Number(d.montant_consomme || 0) / Number(d.montant_total) * 100)
      : 0,
    anomalies: d.nb_anomalies || 0,
  }))

  return (
    <div>
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">Période · {period === '3M' ? '3 derniers mois' : period === 'YTD' ? 'Depuis janvier' : period === 'Tout' ? 'Tout l\'exercice' : '12 derniers mois'}</div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Indicateurs clés</h1>
          <div className="text-[13px] text-[#5A6B7E]">Pilotage consolidé · 6 départements · allocation totale exercice.</div>
        </div>
        <div className="ml-auto flex gap-1.5">
          {['3M', '12M', 'YTD', 'Tout'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn(
                'inline-flex px-2.5 py-1 rounded-full text-[12px] border transition-all duration-150',
                p === period
                  ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
                  : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
              )}
            >{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Taux d'exécution</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{kpis.taux_execution ?? '68,4'}<span className="text-[#B8864A] text-[16px] ml-0.5">%</span></div>
          <div className="text-[11px] text-[#15803D]">+4,2 pts</div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Délai moyen validation</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">1,3<span className="text-[#B8864A] text-[16px] ml-0.5"> j</span></div>
          <div className="text-[11px] text-[#15803D]">-0,4 j</div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Taux de rejet</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{kpis.taux_rejet ?? '8,2'}<span className="text-[#B8864A] text-[16px] ml-0.5">%</span></div>
          <div className="text-[11px] text-[#5A6B7E]">stable</div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Anomalies IA</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{kpis.nb_enveloppes_critiques ?? 42}</div>
          <div className="text-[11px] text-[#B91C1C]">+11 vs T1</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
          <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Évolution dépenses par département</div>
          </div>
          <div className="p-5">
            {evolution.length === 0
              ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8A39A', fontSize: 13 }}>
                  Aucune dépense enregistrée sur cette période
                </div>
              : <LineChart data={evolution} height={200} labels={evoLabels} />
            }
            {evolution.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#A8A39A' }}>Total période :</span>
                <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: 'var(--af-ink)' }}>
                  {fmtM(evolution.reduce((s, v) => s + v * 1e6, 0))} FCFA
                </span>
                <span style={{ fontSize: 11, color: '#A8A39A', marginLeft: 8 }}>
                  {evoRows.length} mois · {evoRows.reduce((s, e) => s + (e.nb_depenses || 0), 0)} dépenses
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
          <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Répartition par catégorie</div>
          </div>
          <div className="p-5">
            {categories.length === 0
              ? <div style={{ textAlign: 'center', color: '#A8A39A', fontSize: 13, padding: '32px 0' }}>
                  Aucune dépense par catégorie enregistrée
                </div>
              : categories.map((r, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div className="af-flex-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }}/>
                      {r.libelle}
                    </span>
                    <span style={{ fontFamily: 'var(--af-mono)', fontSize: 11, color: 'var(--af-cream)', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ color: 'var(--af-mute)', fontSize: 10 }}>{fmtM(r.montant)} FCFA</span>
                      <span style={{ fontWeight: 700 }}>{r.pourcentage}%</span>
                    </span>
                  </div>
                  <div className="af-bar">
                    <div className="af-bar-fill" style={{ width: `${Math.min(r.pourcentage, 100)}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}/>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {enveloppes.length > 0 && (
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)] mb-[14px]">
          <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
            <div className="text-[13px] font-semibold text-[#0E2A47]">Taux d'utilisation des enveloppes</div>
          </div>
          <div className="p-5">
            {enveloppes.map(e => {
              const taux  = parseFloat(e.taux_utilisation) || 0
              const color = e.est_critique ? 'var(--af-st-reject)' : taux > 70 ? '#E5A53D' : 'var(--af-st-approve)'
              return (
                <div key={e.id} style={{ marginBottom: 14 }}>
                  <div className="af-flex-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ivory)' }}>{e.departement}</span>
                    <div className="af-flex" style={{ gap: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--af-cream)', fontFamily: 'var(--af-mono)' }}>
                        {fmt(e.montant_alloue)} / {fmt(e.montant_total)} FCFA
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--af-mono)', color }}>{taux}%</span>
                      {e.est_critique && <span className="af-badge reject">Critique</span>}
                    </div>
                  </div>
                  <div className="af-bar">
                    <div className={`af-bar-fill ${e.est_critique ? 'danger' : taux > 70 ? 'warn' : 'ok'}`} style={{ width: `${Math.min(100, taux)}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
        <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
          <div className="text-[13px] font-semibold text-[#0E2A47]">Performance par département</div>
        </div>
        <table className="af-table">
          <thead>
            <tr>
              <th>Département</th><th>Allocation</th><th>Engagé</th>
              <th>Restant</th><th>Exécution</th><th>Anomalies</th>
            </tr>
          </thead>
          <tbody>
            {deptRows.map((r, i) => (
              <tr key={i}>
                <td>
                  <span className="af-dept-chip">
                    <span className="d" style={{ background: ['#C9A961','#3B82F6','#10B981','#8B5CF6','#E5A53D','#7DD3FC'][i % 6] }}/>
                    {r.nom.replace(/^Ministère (de |du |des |de l')?/i, '').trim().slice(0, 22)}
                  </span>
                </td>
                <td className="num">{fmtM(r.alloue)} FCFA</td>
                <td className="num">{fmtM(r.engage)} FCFA</td>
                <td className="num muted">{fmtM(r.alloue - r.engage)} FCFA</td>
                <td>
                  <div className="af-flex" style={{ gap: 10 }}>
                    <div className="af-bar" style={{ width: 80 }}>
                      <div className={`af-bar-fill ${r.taux > 85 ? 'danger' : r.taux > 70 ? 'warn' : ''}`} style={{ width: `${r.taux}%` }}/>
                    </div>
                    <span className="num" style={{ fontSize: 11 }}>{r.taux}%</span>
                  </div>
                </td>
                <td className="num" style={{ color: r.anomalies > 5 ? '#FCA5A5' : 'var(--af-cream)' }}>
                  {r.anomalies}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
