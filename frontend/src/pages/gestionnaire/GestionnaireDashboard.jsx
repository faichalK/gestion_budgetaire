import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getBudgets } from '../../api/budget'
import { getDepartements } from '../../api/accounts'
import KpiCard from '../../components/KpiCard'
import { StatutBadge, AlerteBadge } from '../../components/StatusBadge'
import { ChevronRight, Plus, ArrowRight, Building2, Sparkles, AlertTriangle, TrendingUp, MessageSquare, LayoutList, CheckCircle2, Clock, XCircle, Wallet, ShieldAlert } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtMillions = (n) => `${formaterNombre(n / 1e6, { maximumFractionDigits: 1 })}M`

function jaugeColor(taux) {
  if (taux > 75) return 'var(--color-danger-500)'
  if (taux > 50) return 'var(--color-gold)'
  return 'var(--color-success-600)'
}

export default function GestionnaireDashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [budgets,      setBudgets]      = useState([])
  const [departements, setDepartements] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [expanded,     setExpanded]     = useState({})
  const [selectedDept, setSelectedDept] = useState(null)
  const [search,       setSearch]       = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')

  useEffect(() => {
    Promise.all([getBudgets(), getDepartements()])
      .then(([bRes, dRes]) => {
        setBudgets(bRes.data.results ?? bRes.data)
        setDepartements(dRes.data.results ?? dRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-loader"><div className="spinner" /><span>Chargement…</span></div>
  )

  const total        = budgets.length
  const rejetes      = budgets.filter(b => b.statut === 'REJETE').length
  const soumis       = budgets.filter(b => b.statut === 'SOUMIS').length
  const approuves    = budgets.filter(b => b.statut === 'APPROUVE').length
  const montantTotal = budgets.reduce((s, b) => s + parseFloat(b.montant_global || 0), 0)
  const critiques    = budgets.filter(b => b.niveau_alerte === 'CRITIQUE').length
  const alertes      = budgets.filter(b => ['ROUGE', 'ORANGE'].includes(b.niveau_alerte)).length

  /* ── Données graphiques ── */
  const chartBudgets = [...budgets]
    .filter(b => parseFloat(b.montant_global || 0) > 0)
    .sort((a, b) => parseFloat(b.montant_global || 0) - parseFloat(a.montant_global || 0))
    .slice(0, 7)
    .map(b => ({
      name: (b.nom || b.code || '—').slice(0, 13),
      alloue:   Math.round(parseFloat(b.montant_global   || 0) / 1e3),
      consomme: Math.round(parseFloat(b.montant_consomme || 0) / 1e3),
      taux:     b.montant_global > 0 ? Math.round(parseFloat(b.montant_consomme || 0) / parseFloat(b.montant_global) * 100) : 0,
    }))

  /* ── Sparklines (6 derniers mois) ── */
  const sparkMois = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i))
    const m = d.getMonth(), y = d.getFullYear()
    const bm = budgets.filter(b => { const c = new Date(b.date_creation); return c.getMonth() === m && c.getFullYear() === y })
    return { count: bm.length, montant: Math.round(bm.reduce((s, b) => s + parseFloat(b.montant_global || 0), 0) / 1e6) }
  })

  const budgetsByDept = budgets.reduce((acc, b) => {
    const key = b.departement
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {})

  const toggle = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
    setSelectedDept(prev => prev === id ? null : id)
  }

  const q = search.trim().toLowerCase()
  const displayedBudgets = (selectedDept
    ? (budgetsByDept[selectedDept] || [])
    : [...budgets].sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
  ).filter(b =>
    (!filtreStatut || b.statut === filtreStatut) &&
    (!q || b.nom?.toLowerCase().includes(q) || b.code?.toLowerCase().includes(q))
  )

  const selectedDeptNom = departements.find(d => d.id === selectedDept)?.nom

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Bonjour, {user?.prenom} — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: 24 }}>
        <KpiCard icon={<LayoutList size={22} strokeWidth={1.8}/>}  label="Mes budgets"     value={total}                                                                   color="#C9910A"  bgColor="#FEF9EC" sparklineData={sparkMois.map(m => m.count)} trendText={`${total} au total`} />
        <KpiCard icon={<CheckCircle2 size={22} strokeWidth={1.8}/>} label="Approuvés"      value={approuves}                                                               color="#16A34A"  bgColor="#DCFCE7" trendText={approuves > 0 ? `${approuves} budget${approuves>1?'s':''} actifs` : 'Aucun approuvé'} />
        <KpiCard icon={<Clock size={22} strokeWidth={1.8}/>}        label="En validation"  value={soumis}                                                                  color="#D97706"  bgColor="#FEF3C7" trendText={soumis > 0 ? `${soumis} en attente` : 'Tout traité'} />
        <KpiCard icon={<XCircle size={22} strokeWidth={1.8}/>}      label="Rejetés"        value={rejetes}                                                                 color="#DC2626"  bgColor="#FEE2E2" trendText={rejetes > 0 ? `${rejetes} à corriger` : 'Aucun rejet'} trendPositive={rejetes === 0} />
        <KpiCard icon={<Wallet size={22} strokeWidth={1.8}/>}       label="Montant total"  value={montantTotal >= 1e6 ? fmtMillions(montantTotal) : `${fmt(montantTotal)} F`} color="#0E2A47" bgColor="rgba(14,42,71,0.08)" sparklineData={sparkMois.map(m => m.montant)} trendText="FCFA alloués" />
        <KpiCard icon={<ShieldAlert size={22} strokeWidth={1.8}/>}  label="Alertes"        value={critiques}                                                               color="#DC2626"  bgColor="#FEE2E2" trendText={alertes > 0 ? `+${alertes} avertissements` : 'Aucune alerte'} trendPositive={alertes === 0} />
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {chartBudgets.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(300px,100%), 1fr))', gap:20, marginBottom:24 }}>

          {/* Alloué vs Consommé */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <TrendingUp size={15} strokeWidth={2} color="var(--color-gold)" />
              <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Alloué vs Consommé</span>
              <span style={{ fontSize:11, color:'#9CA3AF' }}>(K FCFA)</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartBudgets} barSize={13} barGap={3} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'#6B7280' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v, n) => [`${v} K FCFA`, n === 'alloue' ? 'Alloué' : 'Consommé']} contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }} />
                <Legend iconSize={7} iconType="circle" formatter={v => <span style={{ fontSize:11, color:'#6B7280' }}>{v === 'alloue' ? 'Alloué' : 'Consommé'}</span>} />
                <Bar dataKey="alloue"   name="alloue"   fill="#F3D07A" radius={[0,3,3,0]} />
                <Bar dataKey="consomme" name="consomme" fill="#C9910A" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Taux d'exécution */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <Building2 size={15} strokeWidth={2} color="var(--af-ink)" />
              <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Taux d'exécution (%)</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartBudgets} barSize={16} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'#6B7280' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={v => [`${v}%`, 'Taux d\'exécution']} contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }} />
                <Bar dataKey="taux" name="taux" radius={[0,3,3,0]}>
                  {chartBudgets.map((e, i) => (
                    <Cell key={i} fill={e.taux > 75 ? 'var(--color-danger-500)' : e.taux > 50 ? 'var(--color-gold)' : 'var(--color-success-500)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Renseignements IA ─────────────────────────────────────────────── */}
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
                  Analyse intelligente de vos budgets par Claude
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/ia')} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
              Explorer <ArrowRight size={12} strokeWidth={2.5} />
            </button>
          </div>

          {/* 3 action cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))' }}>
            {[
              {
                icon: <AlertTriangle size={19} strokeWidth={1.8} />,
                iconBg: 'var(--color-danger-50)', iconColor: 'var(--color-danger-600)',
                title: 'Anomalies',
                desc: 'Dépassements, sous-utilisations et pièces manquantes',
                action: () => navigate('/ia'),
                label: 'Détecter',
                badge: critiques > 0 ? critiques : null,
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

      {/* Layout département + table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(248px,100%), 1fr))', gap: 16, alignItems: 'start' }}>

        {/* Panneau départements */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--color-gray-100)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Building2 size={15} strokeWidth={1.8} color="var(--color-gray-500)" />
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-gray-800)' }}>Départements</span>
          </div>

          {/* Tous */}
          <button
            onClick={() => { setSelectedDept(null) }}
            style={{
              width: '100%', textAlign: 'left', padding: '10px 16px',
              background: selectedDept === null ? 'var(--color-gold-soft)' : 'transparent',
              border: 'none', borderBottom: '1px solid var(--color-gray-100)',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'background .1s',
            }}
          >
            <span style={{
              fontSize: '13px', fontWeight: selectedDept === null ? 700 : 500,
              color: selectedDept === null ? 'var(--color-gold)' : 'var(--color-gray-700)',
            }}>
              Tous mes budgets
            </span>
            <span style={{
              background: 'var(--color-gray-100)', borderRadius: 9999,
              padding: '1px 7px', fontSize: '11px', fontWeight: 700, color: 'var(--color-gray-600)',
            }}>{total}</span>
          </button>

          {/* Départements */}
          {departements.map(dept => {
            const deptBudgets = budgetsByDept[dept.id] || []
            const isOpen      = !!expanded[dept.id]
            const isSelected  = selectedDept === dept.id
            return (
              <div key={dept.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                <button
                  onClick={() => toggle(dept.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 16px',
                    background: isSelected ? 'var(--color-gold-soft)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-gray-50)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                    <ChevronRight
                      size={12} strokeWidth={2.5}
                      style={{ transition: 'transform .18s', transform: isOpen ? 'rotate(90deg)' : 'none', flexShrink: 0, color: isSelected ? 'var(--color-gold)' : 'var(--color-gray-400)' }}
                    />
                    <span style={{
                      fontSize: '13px', fontWeight: isSelected ? 700 : 400,
                      color: isSelected ? 'var(--color-gold)' : 'var(--color-gray-700)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {dept.nom}
                    </span>
                  </div>
                  <span style={{
                    background: deptBudgets.length > 0 ? 'rgba(184,134,74,0.15)' : 'var(--color-gray-100)',
                    color: deptBudgets.length > 0 ? 'var(--color-gold-dark)' : 'var(--color-gray-500)',
                    borderRadius: 9999, padding: '1px 7px', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {deptBudgets.length}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ background: 'var(--color-gray-50)', borderTop: '1px solid var(--color-gray-100)' }}>
                    {deptBudgets.length === 0 ? (
                      <div style={{ padding: '8px 16px 8px 36px', fontSize: '12px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>
                        Aucun budget
                      </div>
                    ) : deptBudgets.map((b, idx) => (
                      <button
                        key={b.id}
                        onClick={() => navigate(`/mes-budgets/${b.id}`)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '7px 14px 7px 34px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          borderTop: idx > 0 ? '1px solid var(--color-gray-100)' : 'none',
                          display: 'flex', flexDirection: 'column', gap: 3,
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gold-soft)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <span className="code-tag" style={{ background: 'rgba(184,134,74,0.15)', color: 'var(--color-gold-dark)' }}>{b.code}</span>
                          <StatutBadge statut={b.statut} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--color-gray-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.nom}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {departements.length === 0 && (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-body">Aucun département</div>
            </div>
          )}
        </div>

        {/* Table budgets */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-800)' }}>
                  {selectedDept ? `Budgets — ${selectedDeptNom}` : 'Mes budgets récents'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: 2 }}>
                  {displayedBudgets.length} budget{displayedBudgets.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button onClick={() => navigate('/mes-budgets')} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
                Voir tout <ArrowRight size={13} strokeWidth={2} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div className="search-wrapper" style={{ maxWidth: 280 }}>
                <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="search" className="search-input"
                  placeholder="Rechercher par nom ou code…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  aria-label="Rechercher un budget"
                />
              </div>
              <select
                value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
                className="form-select" style={{ width: 'auto', height: 38, fontSize: '13px' }}
                aria-label="Filtrer par statut"
              >
                <option value="">Tous les statuts</option>
                <option value="BROUILLON">Brouillon</option>
                <option value="SOUMIS">Soumis</option>
                <option value="APPROUVE">Approuvé</option>
                <option value="REJETE">Rejeté</option>
              </select>
            </div>
          </div>

          <table className="data-table" aria-label="Liste des budgets">
            <thead>
              <tr>
                {['Code', 'Nom', 'Montant global', 'Taux', 'Statut', 'Alerte'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedBudgets.map(b => {
                const taux = parseFloat(b.taux_consommation || 0)
                return (
                  <tr key={b.id} className="clickable" onClick={() => navigate(`/mes-budgets/${b.id}`)}>
                    <td><span className="code-tag">{b.code}</span></td>
                    <td style={{ fontWeight: 500, color: 'var(--color-gray-900)', maxWidth: 180 }}>
                      <div className="truncate">{b.nom}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-gray-800)' }}>
                      {fmt(b.montant_global)} FCFA
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="exec-bar" style={{ flex: 1, height: 5 }}>
                          <div className="exec-bar-fill" style={{ width: `${Math.min(taux, 100)}%`, background: jaugeColor(taux) }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: jaugeColor(taux), minWidth: 32 }}>{taux}%</span>
                      </div>
                    </td>
                    <td><StatutBadge statut={b.statut} /></td>
                    <td><AlerteBadge niveau={b.niveau_alerte} /></td>
                  </tr>
                )
              })}
              {displayedBudgets.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <div className="empty-title">
                        {selectedDept ? 'Aucun budget pour ce département' : 'Aucun budget'}
                      </div>
                      {!selectedDept && (
                        <button onClick={() => navigate('/creer-budget')} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                          <Plus size={14} /> Créer mon premier budget
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
