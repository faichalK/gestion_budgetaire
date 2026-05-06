import { useQuery } from '@tanstack/react-query'
import {
  getKpis,
  getParDepartement,
  getTauxUtilisationEnveloppes,
  getEvolutionMensuelle,
} from '../../api/rapports'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { BarChart3, CheckCircle2, Clock, XCircle, TrendingUp, AlertTriangle } from 'lucide-react'
import { formaterNombre } from '../../utils/formatters'

export default function RapportsKPIPage() {
  const { data: kpisData } = useQuery({ queryKey: ['rapports-kpis'], queryFn: () => getKpis().then(r => r.data.data) })
  const { data: deptData  } = useQuery({ queryKey: ['rapports-dept'],  queryFn: () => getParDepartement().then(r => r.data.data) })
  const { data: envData   } = useQuery({ queryKey: ['rapports-env'],   queryFn: () => getTauxUtilisationEnveloppes().then(r => r.data.data) })
  const { data: evoData   } = useQuery({ queryKey: ['rapports-evo'],   queryFn: () => getEvolutionMensuelle().then(r => r.data.data) })

  const kpis       = kpisData || {}
  const depts      = Array.isArray(deptData) ? deptData : []
  const enveloppes = Array.isArray(envData) ? envData : []
  const evolution  = Array.isArray(evoData) ? evoData.map(e => ({
    mois:    e.mois ? new Date(e.mois).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : '?',
    budgets: e.nb_budgets,
    montant: Math.round(Number(e.montant_total) / 1000),
  })) : []

  const deptChart = depts.slice(0, 8).map(d => ({
    nom:    d.departement__code || d.departement__nom?.slice(0, 8),
    montant: Math.round(Number(d.montant_total) / 1000),
  }))

  const envColor = (taux, critique) => {
    if (critique) return 'var(--color-danger-600)'
    if (taux > 70) return 'var(--color-warning-600)'
    return 'var(--color-success-600)'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Statistiques</h1>
          <p className="page-subtitle">Tableau de bord analytique en temps réel</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid mb-7">
        {[
          { label: 'TOTAL BUDGETS',       value: kpis.budgets?.total ?? '—',          icon: <BarChart3 size={20} strokeWidth={1.8} />,     color: 'var(--color-gold)', bg: 'var(--color-gold-soft)' },
          { label: 'APPROUVÉS',           value: kpis.budgets?.approuves ?? '—',       icon: <CheckCircle2 size={20} strokeWidth={1.8} />,  color: 'var(--color-success-600)', bg: 'var(--color-success-50)' },
          { label: 'SOUMIS',              value: kpis.budgets?.soumis ?? '—',          icon: <Clock size={20} strokeWidth={1.8} />,         color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)' },
          { label: 'REJETÉS',             value: kpis.budgets?.rejetes ?? '—',         icon: <XCircle size={20} strokeWidth={1.8} />,       color: 'var(--color-danger-600)',  bg: 'var(--color-danger-50)'  },
          { label: 'TAUX APPROBATION',    value: kpis.taux_approbation != null ? `${kpis.taux_approbation}%` : '—', icon: <TrendingUp size={20} strokeWidth={1.8} />, color: 'var(--af-ink)', bg: 'rgba(14,42,71,0.07)' },
          { label: 'ENVELOPPES CRITIQUES',value: kpis.nb_enveloppes_critiques ?? '—', icon: <AlertTriangle size={20} strokeWidth={1.8} />, color: '#C2410C', bg: '#fff7ed' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-[14px]">
            <div
              className="w-11 h-11 rounded-[11px] flex items-center justify-center shrink-0"
              style={{ background: bg, color }}
            >
              {icon}
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#6B7280] tracking-[.5px] mb-[3px]">{label}</div>
              <div className="font-mono font-extrabold text-[1.5rem] leading-none" style={{ color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid form-grid-2 gap-[18px] mb-6" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {/* Évolution mensuelle */}
        <div className="card">
          <h3 className="font-display font-bold text-[14px] text-[#1F2937] mb-[18px]">
            Évolution mensuelle
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
              <Tooltip
                contentStyle={{ borderRadius: 9, border: '1px solid var(--color-gray-200)', fontSize: 12 }}
                formatter={(v, n) => [v, n === 'montant' ? 'Montant (k FCFA)' : 'Nb budgets']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="budgets" stroke="var(--af-ink)"    strokeWidth={2} dot={{ r: 3 }} name="Budgets" />
              <Line type="monotone" dataKey="montant" stroke="var(--color-gold)" strokeWidth={2} dot={{ r: 3 }} name="Montant (k)" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Par département */}
        <div className="card">
          <h3 className="font-display font-bold text-[14px] text-[#1F2937] mb-[18px]">
            Répartition par département
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
              <XAxis dataKey="nom" tick={{ fontSize: 10, fill: 'var(--color-gray-500)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
              <Tooltip
                contentStyle={{ borderRadius: 9, border: '1px solid var(--color-gray-200)', fontSize: 12 }}
                formatter={v => [`${v} k FCFA`]}
              />
              <Bar dataKey="montant" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Taux d'utilisation enveloppes */}
      <div className="card">
        <h3 className="font-display font-bold text-[14px] text-[#1F2937] mb-[18px]">
          Taux d'utilisation des enveloppes
        </h3>
        {enveloppes.length === 0 ? (
          <p className="text-[#9CA3AF] text-center py-5 text-[13px]">
            Aucune enveloppe
          </p>
        ) : (
          <div className="flex flex-col gap-[14px]">
            {enveloppes.map(e => {
              const taux   = parseFloat(e.taux_utilisation) || 0
              const color  = envColor(taux, e.est_critique)
              return (
                <div key={e.id}>
                  <div className="flex justify-between items-center mb-[6px]">
                    <span className="text-[13px] text-[#374151] font-semibold">
                      {e.departement}
                    </span>
                    <div className="flex gap-3 items-center">
                      <span className="text-[11px] text-[#9CA3AF] font-mono">
                        {formaterNombre(e.montant_alloue)} / {formaterNombre(e.montant_total)} FCFA
                      </span>
                      <span className="text-[12px] font-extrabold font-mono" style={{ color }}>
                        {taux}%
                      </span>
                      {e.est_critique && (
                        <span className="badge badge-REJETE text-[10px]">Critique</span>
                      )}
                    </div>
                  </div>
                  <div className="exec-bar">
                    <div
                      className="exec-bar-fill"
                      style={{
                        width: `${Math.min(100, taux)}%`,
                        background: `linear-gradient(90deg, ${envColor(Math.max(0, taux - 20), false)}, ${color})`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
