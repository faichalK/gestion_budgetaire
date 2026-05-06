import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBudgets, getBudgetAnnuels } from '../../api/budget'
import { getUtilisateurs } from '../../api/accounts'
import KpiCard from '../../components/KpiCard'
import { StatutBadge, AlerteBadge } from '../../components/StatusBadge'
import {
  CartesianGrid, Tooltip, XAxis, YAxis,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import {
  ArrowRight, CheckCircle2, Clock,
  Building2, TrendingUp, Wallet, ShieldAlert, Users, Target,
  Sparkles, AlertTriangle, MessageSquare,
} from 'lucide-react'
import { formaterMontant, formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtFull = (n) => formaterMontant(n)
const fmtMillions = (n) => `${formaterNombre(n / 1e6, { maximumFractionDigits: 1 })}M`
const MAX_DEPT_SLICES = 7
const DEPT_COLORS = [
  '#1E6B9E', // bleu marine
  '#15803D', // vert forêt
  '#B8864A', // or atlas
  '#5A6B7E', // ardoise
  '#C04C1A', // terra cotta
  '#1A7A6E', // teal
  '#9B1C1C', // bordeaux
]
const DEPT_COLOR_MAP = {
  Informatique: '#1E6B9E',
  Logistique: '#15803D',
  'Ressources Hum': '#B8864A',
  'Ressources Hum.': '#B8864A',
  RH: '#B8864A',
  Finance: '#5A6B7E',
  Comptabilite: '#1E6B9E',
  Comptabilité: '#1E6B9E',
  Administration: '#C04C1A',
  Sante: '#1A7A6E',
  Santé: '#1A7A6E',
  Education: '#15803D',
  Éducation: '#15803D',
  Agriculture: '#15803D',
  Transport: '#B8864A',
  Justice: '#5A6B7E',
  Securite: '#9B1C1C',
  Sécurité: '#9B1C1C',
}
const RADIAN = Math.PI / 180

function getDeptColor(name = '') {
  if (name === 'Autres') return '#9CA3AF'
  if (DEPT_COLOR_MAP[name]) return DEPT_COLOR_MAP[name]

  const key = String(name)
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return DEPT_COLORS[Math.abs(hash) % DEPT_COLORS.length]
}

function normalizeDeptName(raw = '') {
  return String(raw).replace(/^Ministère (de |du |des |de l')?/i, '').trim() || 'Autre'
}

function toTopSlicesWithOthers(entries, maxSlices = MAX_DEPT_SLICES) {
  const sorted = [...entries]
    .filter(e => Number(e?.value || 0) > 0)
    .sort((a, b) => b.value - a.value)

  if (sorted.length <= maxSlices) return sorted

  const top = sorted.slice(0, maxSlices)
  const othersValue = sorted.slice(maxSlices).reduce((sum, item) => sum + item.value, 0)
  return othersValue > 0 ? [...top, { name: 'Autres', value: othersValue }] : top
}

function renderPieValueLabel({ cx, x, y, value, percent }) {
  if (!percent || percent < 0.04) return null
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700, fill: '#111827', pointerEvents: 'none' }}>
      {fmtMillions(value)}
    </text>
  )
}

function renderPieCountLabel({ cx, x, y, value, percent }) {
  if (!percent || percent < 0.04) return null
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700, fill: '#111827', pointerEvents: 'none' }}>
      {value}
    </text>
  )
}

function AllocationDept({ deptData }) {
  if (!deptData?.length) return null
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Building2 size={15} strokeWidth={2} color="var(--af-ink)" />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-gray-900)' }}>Allocation par département</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {deptData.slice(0, 8).map(dept => {
          const pct = dept.taux
          const barColor  = pct >= 90 ? 'var(--color-danger-500)' : 'var(--color-gold)'
          const pctColor  = pct >= 90 ? 'var(--color-danger-500)' : 'var(--color-gold)'
          const dotColor  = getDeptColor(dept.name)
          const millions  = formaterNombre(dept.alloue / 1e6, { maximumFractionDigits: 0 })
          return (
            <div key={dept.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-900)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dept.name}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {millions} M FCFA
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: pctColor, flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--color-gray-100)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 99 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function jaugeColor(t) {
  if (t > 75) return 'var(--color-danger-500)'
  if (t > 50) return 'var(--color-gold)'
  return 'var(--color-success-500)'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [budgets, setBudgets] = useState([])
  const [annuels, setAnnuels] = useState([])
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBudgets(), getBudgetAnnuels(), getUtilisateurs()])
      .then(([b, a, u]) => {
        setBudgets(b.data.results ?? b.data)
        setAnnuels(a.data.results ?? a.data)
        setUsers(u.data.results ?? u.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // ✅ CORRIGÉ : useMemo placé AVANT tout return conditionnel
  const countPieData = useMemo(() => {
    const budgetCountByDept = {}
    budgets
      .filter(b => b.statut !== 'BROUILLON')
      .forEach(b => {
        const dept = b.departement_detail?.nom || b.departement_nom || 'Autre'
        const short = normalizeDeptName(dept)
        budgetCountByDept[short] = (budgetCountByDept[short] || 0) + 1
      })
    const countData = Object.entries(budgetCountByDept)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    return toTopSlicesWithOthers(countData)
  }, [budgets])

  // ✅ return conditionnel APRÈS tous les hooks
  if (loading) return (
    <div className="page-loader">
      <div className="spinner" />
      <span>Chargement du tableau de bord…</span>
    </div>
  )

  /* ── KPIs ── */
  const ba = annuels[0]
  const budgetsActifs   = budgets.filter(b => b.statut !== 'BROUILLON')
  const enveloppeGlobale = parseFloat(ba?.montant_global || 0)
  const totalBudgets     = budgetsActifs.length
  const budgetsApprouves = budgetsActifs.filter(b => b.statut === 'APPROUVE').length
  const budgetsSoumis    = budgetsActifs.filter(b => b.statut === 'SOUMIS').length
  const budgetsRejetes   = budgetsActifs.filter(b => b.statut === 'REJETE').length
  const montantAlloue    = budgetsActifs.reduce((s, b) => s + parseFloat(b.montant_global || 0), 0)
  const montantConsom    = budgetsActifs.reduce((s, b) => s + parseFloat(b.montant_consomme || 0), 0)
  const tauxGlobal       = montantAlloue > 0 ? Math.round(montantConsom / montantAlloue * 100) : 0

  /* ── Budgets en attente ── */
  const enAttente = budgetsActifs
    .filter(b => b.statut === 'SOUMIS')
    .sort((a, b) => new Date(a.date_soumission || 0) - new Date(b.date_soumission || 0))
    .slice(0, 5)

  /* ── Budgets en alerte ── */
  const enAlerte = budgetsActifs
    .filter(b => ['ROUGE', 'CRITIQUE'].includes(b.niveau_alerte) && b.statut === 'APPROUVE')
    .slice(0, 5)

  /* ── Consommation par département (budgets APPROUVÉS uniquement) ── */
  const deptMap = {}
  budgetsActifs.filter(b => b.statut === 'APPROUVE').forEach(b => {
    const dept = b.departement_detail?.nom || b.departement_nom || 'Autre'
    const short = normalizeDeptName(dept)
    if (!deptMap[short]) deptMap[short] = { alloue: 0, consomme: 0 }
    deptMap[short].alloue   += parseFloat(b.montant_global || 0)
    deptMap[short].consomme += parseFloat(b.montant_consomme || 0)
  })
  const deptData = Object.entries(deptMap)
    .map(([name, v]) => ({ name, ...v, taux: v.alloue > 0 ? Math.round(v.consomme / v.alloue * 100) : 0 }))
    .sort((a, b) => b.alloue - a.alloue)
  const budgetPieData  = toTopSlicesWithOthers(deptData.map(d => ({ name: d.name, value: d.alloue })))
  const depensePieData = toTopSlicesWithOthers(deptData.map(d => ({ name: d.name, value: d.consomme })))

  const now = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  /* ── Évolution mensuelle (6 derniers mois) ── */
  const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const evolutionData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    const m = d.getMonth(), y = d.getFullYear()
    const bMois = budgetsActifs.filter(b => {
      const c = new Date(b.date_creation)
      return c.getMonth() === m && c.getFullYear() === y
    })
    return {
      name: MOIS_LABELS[m],
      budgets: bMois.length,
      montant: Math.round(bMois.reduce((s, b) => s + parseFloat(b.montant_global || 0), 0) / 1e6),
      consomme: Math.round(bMois.reduce((s, b) => s + parseFloat(b.montant_consomme || 0), 0) / 1e6),
    }
  })

  return (
    <div>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">{now} — Exercice {ba?.annee ?? new Date().getFullYear()}</p>
        </div>
      </div>

      {/* ── KPI grid ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard
          icon={<Wallet size={22} strokeWidth={1.8} />}
          label="Budget Total Alloué"
          value={montantAlloue >= 1e6 ? fmtMillions(montantAlloue) : `${fmt(montantAlloue)} F`}
          trendText={`Enveloppe annuelle: ${fmt(enveloppeGlobale)} F`}
          color="#B8864A" bgColor="rgba(184,134,74,0.10)"
          sparklineData={evolutionData.map(d => d.montant)}
        />
        <KpiCard
          icon={<TrendingUp size={22} strokeWidth={1.8} />}
          label="Budget Consommé"
          value={montantConsom >= 1e6 ? fmtMillions(montantConsom) : `${fmt(montantConsom)} F`}
          trendText={`${Math.round(budgetsApprouves/Math.max(totalBudgets,1))*100}% budgets approuvés`}
          color="#0E2A47" bgColor="rgba(14,42,71,0.08)"
          onClick={() => navigate('/budgets')}
          sparklineData={evolutionData.map(d => d.consomme)}
        />
        <KpiCard
          icon={<Clock size={22} strokeWidth={1.8} />}
          label="Budgets En Attente"
          value={budgetsSoumis}
          trendText={budgetsSoumis > 0 ? `${budgetsSoumis} à valider` : 'Aucun en attente'}
          color="#B8864A" bgColor="rgba(184,134,74,0.10)"
          onClick={() => navigate('/budgets')}
        />
        <KpiCard
          icon={<Target size={22} strokeWidth={1.8} />}
          label="Taux Réalisation"
          value={`${tauxGlobal}%`}
          trendText={`${fmt(montantConsom)} FCFA utilisés`}
          color="#15803D" bgColor="rgba(21,128,61,0.10)"
          sparklineData={evolutionData.map(d => d.budgets)}
        />
        <KpiCard
          icon={<Users size={22} strokeWidth={1.8} />}
          label="Utilisateurs"
          value={users.length}
          trendText={`${users.filter(u=>u.role==='GESTIONNAIRE').length} gestionnaires`}
          color="#0E2A47" bgColor="rgba(14,42,71,0.08)"
          onClick={() => navigate('/utilisateurs')}
        />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20, marginBottom:24, minWidth: 0 }}>
        {/* 1. Budgets par département */}
        <div className="card" style={{ padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <Building2 size={15} strokeWidth={2} color="var(--af-ink)" />
            <span style={{ fontWeight:700, fontSize:14, color:'var(--color-gray-900)' }}>Budgets par département</span>
          </div>
          {deptData.length === 0 ? (
            <div className="empty-state" style={{ padding:'30px 0' }}>
              <div className="empty-icon">📊</div>
              <div className="empty-title">Aucun budget</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart margin={{ top: 20, right: 55, left: 55, bottom: 10 }}>
                <Pie
                  data={budgetPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={42}
                  paddingAngle={2}
                  label={renderPieValueLabel}
                  labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                >
                  {budgetPieData.map((entry, index) => (
                    <Cell key={`cell-budget-${index}`} fill={getDeptColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtFull(v)}
                  contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid var(--color-gray-150)', boxShadow:'var(--shadow-md)' }}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  formatter={v => <span style={{ fontSize:10, color:'var(--color-gray-500)' }}>{v}</span>}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 2. Dépenses par département */}
        <div className="card" style={{ padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <TrendingUp size={15} strokeWidth={2} color="#22C55E" />
            <span style={{ fontWeight:700, fontSize:14, color:'var(--color-gray-900)' }}>Dépenses par département</span>
          </div>
          {deptData.length === 0 ? (
            <div className="empty-state" style={{ padding:'30px 0' }}>
              <div className="empty-icon">💰</div>
              <div className="empty-title">Aucune dépense</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart margin={{ top: 20, right: 55, left: 55, bottom: 10 }}>
                <Pie
                  data={depensePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={42}
                  paddingAngle={2}
                  label={renderPieValueLabel}
                  labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                >
                  {depensePieData.map((entry, index) => (
                    <Cell key={`cell-depense-${index}`} fill={getDeptColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtFull(v)}
                  contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid var(--color-gray-150)', boxShadow:'var(--shadow-md)' }}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  formatter={v => <span style={{ fontSize:10, color:'var(--color-gray-500)' }}>{v}</span>}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3. Nombre de budgets par département */}
        <div className="card" style={{ padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <Target size={15} strokeWidth={2} color="#F59E0B" />
            <span style={{ fontWeight:700, fontSize:14, color:'var(--color-gray-900)' }}>Nombre de budgets</span>
          </div>
          {countPieData.length === 0 ? (
            <div className="empty-state" style={{ padding:'30px 0' }}>
              <div className="empty-icon">📋</div>
              <div className="empty-title">Aucun budget</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart margin={{ top: 20, right: 55, left: 55, bottom: 10 }}>
                <Pie
                  data={countPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={42}
                  paddingAngle={2}
                  label={renderPieCountLabel}
                  labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                >
                  {countPieData.map((entry, index) => (
                    <Cell key={`cell-count-${index}`} fill={getDeptColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `${v} budget${v > 1 ? 's' : ''}`}
                  contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid var(--color-gray-150)', boxShadow:'var(--shadow-md)' }}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  formatter={v => <span style={{ fontSize:10, color:'var(--color-gray-500)' }}>{v}</span>}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Allocation par département ───────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <AllocationDept deptData={deptData} />
      </div>

      {/* ── Évolution mensuelle ───────────────────────────────────────────── */}
      <div className="card" style={{ padding:'20px 24px', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
          <TrendingUp size={15} strokeWidth={2} color="var(--color-gold)" />
          <span style={{ fontWeight:700, fontSize:14, color:'var(--color-gray-900)' }}>Évolution budgétaire — 6 derniers mois</span>
          <span style={{ fontSize:11, color:'var(--color-gray-400)', marginLeft:4 }}>(montants en millions FCFA)</span>
        </div>
        {evolutionData.every(d => d.montant === 0 && d.budgets === 0) ? (
          <div className="empty-state" style={{ padding:'30px 0' }}>
            <div className="empty-icon">📈</div>
            <div className="empty-title">Aucune donnée pour cette période</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolutionData} margin={{ top:4, right:16, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--color-gray-500)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:'var(--color-gray-400)' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                formatter={(v, n) => [`${v} M FCFA`, n === 'montant' ? 'Alloué' : n === 'consomme' ? 'Consommé' : 'Budgets']}
                contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid var(--color-gray-150)', boxShadow:'var(--shadow-md)' }}
              />
              <Legend iconSize={7} iconType="circle" formatter={v => <span style={{ fontSize:11, color:'var(--color-gray-500)' }}>{v === 'montant' ? 'Alloué (M)' : v === 'consomme' ? 'Consommé (M)' : 'Nb budgets'}</span>} />
              <Line type="monotone" dataKey="montant"  stroke="var(--af-ink)"            strokeWidth={2} dot={{ r:3 }} activeDot={{ r:5 }} />
              <Line type="monotone" dataKey="consomme" stroke="var(--color-gold)"         strokeWidth={2} dot={{ r:3 }} activeDot={{ r:5 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Renseignements IA ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {/* Header */}
          <div style={{
            padding: '16px 22px', background: 'var(--af-night)', borderBottom: '1px solid var(--af-line)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'var(--color-gold-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={18} strokeWidth={2} style={{ color: 'var(--color-gold)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                    Renseignements IA
                  </span>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                    borderRadius: 9999, padding: '2px 9px',
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: '#16A34A', animation: 'ia-pulse 2s ease-in-out infinite',
                    }} />
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#15803D', letterSpacing: '.4px' }}>EN LIGNE</span>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: 1 }}>
                  Détection d'anomalies, prédictions et assistant intelligent
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/ia')} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
              Explorer <ArrowRight size={12} strokeWidth={2.5} />
            </button>
          </div>

          {/* 3 action cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', minWidth: 0 }}>
            {[
              {
                icon: <AlertTriangle size={19} strokeWidth={1.8} />,
                iconBg: 'var(--color-danger-50)', iconColor: 'var(--color-danger-600)',
                title: 'Anomalies',
                desc: 'Dépassements, sous-utilisations et pièces manquantes',
                action: () => navigate('/ia'),
                label: 'Détecter',
                badge: budgetsRejetes > 0 ? budgetsRejetes : null,
              },
              {
                icon: <TrendingUp size={19} strokeWidth={1.8} />,
                iconBg: 'var(--color-gold-soft)', iconColor: 'var(--color-gold)',
                title: 'Prédictions',
                desc: 'Projections de consommation et recommandations IA',
                action: () => navigate('/ia'),
                label: 'Analyser',
                badge: null,
              },
              {
                icon: <MessageSquare size={19} strokeWidth={1.8} />,
                iconBg: 'rgba(14,42,71,0.07)', iconColor: 'var(--af-ink)',
                title: 'Assistant IA',
                desc: 'Posez vos questions budgétaires à Claude',
                action: () => window.dispatchEvent(new Event('open-chatbot')),
                label: 'Ouvrir le chat',
                badge: null,
              },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                style={{
                  padding: '20px 22px', textAlign: 'left', background: 'transparent',
                  border: 'none', borderRight: i < 2 ? '1px solid #F3F4F6' : 'none',
                  cursor: 'pointer', transition: 'background .15s',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gold-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    background: item.iconBg, color: item.iconColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                      {item.title}
                    </span>
                    {item.badge && (
                      <span style={{
                        background: 'var(--color-danger-600)', color: '#fff',
                        fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: 9999,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                  {item.desc}
                </p>
                <span style={{
                  fontSize: '12px', fontWeight: 600, color: 'var(--color-gold)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {item.label} <ArrowRight size={11} strokeWidth={2.5} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action panels ────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20, marginBottom:24, minWidth: 0 }}>
        {/* Budgets en attente de validation */}
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{
            padding:'14px 20px', borderBottom:'1px solid var(--color-gray-100)',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            background:'var(--color-gray-25)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'rgba(14,42,71,0.07)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Clock size={14} strokeWidth={2} color="var(--af-ink)" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--color-gray-900)' }}>En attente de validation</div>
                <div style={{ fontSize:11, color:'var(--color-gray-400)', marginTop:1 }}>{budgetsSoumis} budget{budgetsSoumis!==1?'s':''} soumis</div>
              </div>
            </div>
            <button onClick={() => navigate('/budgets')} className="btn btn-ghost btn-xs" style={{ gap:4 }}>
              Tout voir <ArrowRight size={12} />
            </button>
          </div>
          <div>
            {enAttente.length === 0 ? (
              <div className="empty-state" style={{ padding:'28px 0' }}>
                <div style={{ fontSize:'1.8rem', marginBottom:8 }}>🎉</div>
                <div className="empty-title">Aucun budget en attente</div>
              </div>
            ) : enAttente.map(b => (
              <div
                key={b.id}
                onClick={() => navigate(`/budgets/${b.id}`)}
                style={{
                  padding:'10px 20px', borderBottom:'1px solid var(--color-gray-50)',
                  cursor:'pointer', transition:'background .1s',
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
                }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--color-gold-soft)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--color-gray-900)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {b.nom}
                  </div>
                  <div style={{ fontSize:11, color:'var(--color-gray-400)' }}>
                    <span className="code-tag" style={{ fontSize:10, marginRight:6 }}>{b.code}</span>
                    {b.departement_nom || b.departement_detail?.nom || '—'}
                  </div>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color:'var(--color-gray-700)', flexShrink:0 }}>
                  {fmt(b.montant_global)} F
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budgets en alerte */}
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{
            padding:'14px 20px', borderBottom:'1px solid var(--color-gray-100)',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            background:'var(--color-gray-25)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#FFF1F2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ShieldAlert size={14} strokeWidth={2} color="#E11D48" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--color-gray-900)' }}>Budgets en alerte critique</div>
                <div style={{ fontSize:11, color:'var(--color-gray-400)', marginTop:1 }}>{enAlerte.length} budget{enAlerte.length!==1?'s':''} ROUGE / CRITIQUE</div>
              </div>
            </div>
            <button onClick={() => navigate('/budgets')} className="btn btn-ghost btn-xs" style={{ gap:4 }}>
              Tout voir <ArrowRight size={12} />
            </button>
          </div>
          <div>
            {enAlerte.length === 0 ? (
              <div className="empty-state" style={{ padding:'28px 0' }}>
                <CheckCircle2 size={28} color="var(--color-success-500)" style={{ marginBottom:8, opacity:.6 }} />
                <div className="empty-title">Aucune alerte critique</div>
              </div>
            ) : enAlerte.map(b => {
              const taux = b.montant_global > 0
                ? Math.round(parseFloat(b.montant_consomme||0)/parseFloat(b.montant_global)*100) : 0
              return (
                <div
                  key={b.id}
                  onClick={() => navigate(`/budgets/${b.id}`)}
                  style={{
                    padding:'10px 20px', borderBottom:'1px solid var(--color-gray-50)',
                    cursor:'pointer', transition:'background .1s',
                    display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='#FFF1F2'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--color-gray-900)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:4 }}>
                      {b.nom}
                    </div>
                    <div style={{ height:4, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(taux,100)}%`, background:'#E11D48', borderRadius:99 }} />
                    </div>
                  </div>
                  <div style={{ flexShrink:0, textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:800, color:'#E11D48' }}>{taux}%</div>
                    <AlerteBadge niveau={b.niveau_alerte} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tableau budgets récents ───────────────────────────────────────── */}
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid var(--color-gray-100)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'var(--color-gray-25)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Wallet size={15} strokeWidth={2} color="var(--color-gold)" />
            <span style={{ fontWeight:700, fontSize:14, color:'var(--color-gray-900)' }}>Tous les budgets</span>
            <span style={{ fontSize:12, color:'var(--color-gray-400)', fontFamily:'var(--font-mono)' }}>
              ({totalBudgets})
            </span>
          </div>
          <button onClick={() => navigate('/budgets')} className="btn btn-secondary btn-sm" style={{ gap:5 }}>
            Gérer les budgets <ArrowRight size={13} strokeWidth={2} />
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              {['Code', 'Budget', 'Département', 'Montant global', 'Consommation', 'Statut', 'Alerte'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...budgets]
              .sort((a,b)=>new Date(b.date_creation)-new Date(a.date_creation))
              .slice(0,10)
              .map(b => {
                const taux = b.montant_global > 0
                  ? Math.round(parseFloat(b.montant_consomme||0)/parseFloat(b.montant_global)*100) : 0
                return (
                  <tr key={b.id} className="clickable" onClick={() => navigate(`/budgets/${b.id}`)}>
                    <td><span className="code-tag">{b.code}</span></td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13, color:'var(--color-gray-900)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {b.nom}
                      </div>
                      <div style={{ fontSize:11, color:'var(--color-gray-400)', marginTop:1 }}>{b.gestionnaire_nom || '—'}</div>
                    </td>
                    <td style={{ color:'var(--color-gray-500)', fontSize:13 }}>
                      {b.departement_detail?.nom || b.departement_nom || <span style={{color:'var(--color-gray-300)'}}>—</span>}
                    </td>
                    <td style={{ fontFamily:'var(--font-mono)', fontWeight:600, fontSize:13 }}>
                      {fmt(b.montant_global)} F
                    </td>
                    <td style={{ minWidth:130 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:5, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min(taux,100)}%`, background:jaugeColor(taux), borderRadius:99 }} />
                        </div>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:jaugeColor(taux), minWidth:34, textAlign:'right' }}>
                          {taux}%
                        </span>
                      </div>
                    </td>
                    <td><StatutBadge statut={b.statut} /></td>
                    <td><AlerteBadge niveau={b.niveau_alerte} /></td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}