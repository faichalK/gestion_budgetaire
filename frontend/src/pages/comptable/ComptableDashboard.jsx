import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getBudgets } from '../../api/budget'
import { getDepenses } from '../../api/depenses'
import KpiCard from '../../components/KpiCard'
import { Search, Clock, CheckCircle2, XCircle, LayoutList, ArrowRight, Sparkles, AlertTriangle, TrendingUp, MessageSquare, Receipt, BarChart2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })

export default function ComptableDashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [aValider,  setAValider]  = useState([])
  const [tous,      setTous]      = useState([])
  const [depSaisie, setDepSaisie] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    Promise.all([
      getBudgets({ statut: 'SOUMIS' }),
      getBudgets(),
      getDepenses({ statut: 'SAISIE' }),
    ])
      .then(([v, t, d]) => {
        setAValider(v.data.results ?? v.data)
        setTous(t.data.results ?? t.data)
        setDepSaisie(d.data?.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  const approuves = tous.filter(b => b.statut === 'APPROUVE').length
  const rejetes   = tous.filter(b => b.statut === 'REJETE').length

  /* ── Données graphiques ── */
  const STATUT_LABELS = { BROUILLON:'Brouillon', SOUMIS:'En attente', APPROUVE:'Approuvé', REJETE:'Rejeté', CLOTURE:'Clôturé', ARCHIVE:'Archivé' }
  const STATUT_COLORS_MAP = { BROUILLON:'#D1D5DB', SOUMIS:'#1E6B9E', APPROUVE:'#15803D', REJETE:'#C7263A', CLOTURE:'#B8864A', ARCHIVE:'#5A6B7E' }
  const statutData = Object.entries(
    tous.reduce((acc, b) => { acc[b.statut] = (acc[b.statut] || 0) + 1; return acc }, {})
  ).map(([statut, count]) => ({ name: STATUT_LABELS[statut] || statut, count, color: STATUT_COLORS_MAP[statut] || '#9CA3AF' }))

  const top5Budgets = [...tous]
    .filter(b => parseFloat(b.montant_global || 0) > 0)
    .sort((a, b) => parseFloat(b.montant_consomme || 0) - parseFloat(a.montant_consomme || 0))
    .slice(0, 5)
    .map(b => ({
      name: (b.nom || b.code || '—').slice(0, 14),
      alloue: Math.round(parseFloat(b.montant_global || 0) / 1e3),
      consomme: Math.round(parseFloat(b.montant_consomme || 0) / 1e3),
    }))

  /* ── Sparklines (6 derniers mois sur tous les budgets) ── */
  const sparkMois = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i))
    const m = d.getMonth(), y = d.getFullYear()
    return tous.filter(b => { const c = new Date(b.date_creation); return c.getMonth() === m && c.getFullYear() === y }).length
  })

  const q    = search.trim().toLowerCase()
  const rows = q
    ? aValider.filter(b =>
        b.nom?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.gestionnaire_nom?.toLowerCase().includes(q) ||
        b.departement_nom?.toLowerCase().includes(q)
      )
    : aValider

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Bonjour, {user?.prenom} {user?.nom} — {aValider.length > 0 ? `${aValider.length} budget${aValider.length > 1 ? 's' : ''} en attente de validation` : 'Tout est à jour ✓'}</p>
        </div>
        {aValider.length > 0 && (
          <button onClick={() => navigate('/validation')} className="btn btn-primary btn-sm">
            Voir les budgets à valider
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="kpi-grid mb-[28px]">
        <KpiCard
          icon={<Clock size={22} strokeWidth={1.8} />}
          label="Budgets En Attente"
          value={aValider.length}
          color="#D97706"
          bgColor="#FEF3C7"
          trendText={aValider.length > 0 ? `${aValider.length} à valider` : 'Aucun en attente'}
          onClick={aValider.length > 0 ? () => navigate('/validation') : undefined}
        />
        <KpiCard
          icon={<CheckCircle2 size={22} strokeWidth={1.8} />}
          label="Budgets Approuvés"
          value={approuves}
          color="#16A34A"
          bgColor="#DCFCE7"
          trendText={`${approuves} budget${approuves!==1?'s':''} validés`}
          sparklineData={sparkMois}
        />
        <KpiCard
          icon={<XCircle size={22} strokeWidth={1.8} />}
          label="Budgets Rejetés"
          value={rejetes}
          color="#DC2626"
          bgColor="#FEE2E2"
          trendText={rejetes > 0 ? `${rejetes} à revoir` : 'Aucun rejet'}
          trendPositive={rejetes === 0}
        />
        <KpiCard
          icon={<LayoutList size={22} strokeWidth={1.8} />}
          label="Total Budgets"
          value={tous.length}
          color="#C9910A"
          bgColor="#FEF9EC"
          trendText={`${tous.length} budget${tous.length!==1?'s':''} au total`}
          sparklineData={sparkMois}
        />
        <KpiCard
          icon={<Receipt size={22} strokeWidth={1.8} />}
          label="Dépenses En Attente"
          value={depSaisie.length}
          color="#0E2A47"
          bgColor="rgba(14,42,71,0.08)"
          trendText={depSaisie.length > 0 ? `${depSaisie.length} à examiner` : 'Tout traité'}
          onClick={depSaisie.length > 0 ? () => navigate('/depenses') : undefined}
        />
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {tous.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(300px,100%), 1fr))', gap:20, marginBottom:24 }}>

          {/* Répartition par statut */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <BarChart2 size={15} strokeWidth={2} color="var(--af-ink)" />
              <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Répartition par statut</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statutData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={3}>
                  {statutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ' budget' + (v > 1 ? 's' : ''), n]} contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }} />
                <Legend iconSize={7} iconType="circle" formatter={v => <span style={{ fontSize:11, color:'#6B7280' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 consommation */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <TrendingUp size={15} strokeWidth={2} color="var(--color-gold)" />
              <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Top 5 — Consommation</span>
              <span style={{ fontSize:11, color:'#9CA3AF' }}>(en milliers FCFA)</span>
            </div>
            {top5Budgets.length === 0 ? (
              <div className="empty-state" style={{ padding:'30px 0' }}><div className="empty-icon">📊</div><div className="empty-title">Aucune donnée</div></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top5Budgets} barSize={12} barGap={3} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'#6B7280' }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip formatter={(v, n) => [`${v} K FCFA`, n === 'alloue' ? 'Alloué' : 'Consommé']} contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }} />
                  <Legend iconSize={7} iconType="circle" formatter={v => <span style={{ fontSize:11, color:'#6B7280' }}>{v === 'alloue' ? 'Alloué' : 'Consommé'}</span>} />
                  <Bar dataKey="alloue"   name="alloue"   fill="rgba(14,42,71,.10)" radius={[0,3,3,0]} />
                  <Bar dataKey="consomme" name="consomme" fill="var(--af-ink)"      radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
                  Détection d'anomalies, prédictions et assistant intelligent
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
                desc: 'Dépassements, inactivité, pièces manquantes',
                action: () => navigate('/ia'),
                label: 'Détecter',
              },
              {
                icon: <TrendingUp size={19} strokeWidth={1.8} />,
                iconBg: 'var(--color-gold-soft)', iconColor: 'var(--color-gold)',
                title: 'Prédictions',
                desc: 'Projections de consommation et recommandations IA',
                action: () => navigate('/ia'),
                label: 'Voir les prédictions',
              },
              {
                icon: <MessageSquare size={19} strokeWidth={1.8} />,
                iconBg: 'rgba(14,42,71,0.07)', iconColor: 'var(--af-ink)',
                title: 'Assistant IA',
                desc: 'Posez vos questions budgétaires à Claude',
                action: () => window.dispatchEvent(new Event('open-chatbot')),
                label: 'Ouvrir le chatbot',
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
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                        {item.title}
                      </span>
                      {item.badge && (
                        <span style={{
                          background: 'var(--color-danger-600)',
                          color: '#fff', fontSize: '10px', fontWeight: 700,
                          padding: '1px 7px', borderRadius: 9999,
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
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

      {/* Dépenses en attente */}
      {depSaisie.length > 0 && (
        <div className="card p-0 overflow-hidden" style={{ marginBottom: 24 }}>
          <div className="px-6 py-[18px] border-b border-b-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-[10px]">
              <Receipt size={16} strokeWidth={2} style={{ color: 'var(--color-warning-600)' }} />
              <h3 className="font-display font-bold text-[15px] text-gray-900">Dépenses en attente</h3>
              <span className="bg-warning-50 text-warning-700 px-[9px] py-[2px] rounded-[20px] text-[12px] font-bold" style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-700)' }}>
                {depSaisie.length}
              </span>
            </div>
            <button
              onClick={() => navigate('/depenses')}
              className="inline-flex items-center gap-[5px] bg-none border-none font-semibold text-[13px] cursor-pointer"
              style={{ background: 'none', color: 'var(--color-gold)' }}
            >
              Voir tout <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                {['Montant', 'Budget', 'Saisi par', 'Date', 'Action'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depSaisie.slice(0, 5).map(d => (
                <tr key={d.id}>
                  <td className="font-mono font-semibold">
                    {fmt(d.montant)} <span className="text-[10px] text-gray-400">FCFA</span>
                  </td>
                  <td className="text-gray-600 text-[12px]">{d.budget_nom || d.budget_reference || '—'}</td>
                  <td className="text-gray-500 text-[12px]">{d.enregistre_par || '—'}</td>
                  <td className="text-gray-400 text-[12px] font-mono">
                    {d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => navigate('/depenses')}
                      className="btn btn-secondary btn-sm"
                    >
                      Examiner <ArrowRight size={11} strokeWidth={2.5} style={{ marginLeft: 4 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Budgets en attente */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-[18px] border-b border-b-gray-100">
          <div className={`flex justify-between items-center${aValider.length > 0 ? ' mb-[14px]' : ''}`}>
            <div className="flex items-center gap-[10px]">
              <h3 className="font-display font-bold text-[15px] text-gray-900">
                Budgets en attente de validation
              </h3>
              {aValider.length > 0 && (
                <span style={{ background:'rgba(184,134,74,0.15)', color:'var(--color-gold-dark)', padding:'2px 9px', borderRadius:9999, fontSize:12, fontWeight:700 }}>
                  {aValider.length}
                </span>
              )}
            </div>
            {aValider.length > 0 && (
              <button
                onClick={() => navigate('/validation')}
                className="inline-flex items-center gap-[5px] bg-none border-none font-semibold text-[13px] cursor-pointer"
                style={{ background:'none', color:'var(--color-gold)' }}
              >
                Voir tout <ArrowRight size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>
          {aValider.length > 0 && (
            <div className="search-wrapper">
              <Search size={14} strokeWidth={2} className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="Rechercher par nom, code, gestionnaire, département…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <CheckCircle2 size={28} strokeWidth={1.5} className="text-success-400" />
            </div>
            <p className="empty-title">
              {q ? `Aucun résultat pour « ${search} »` : 'Aucun budget en attente'}
            </p>
            <p className="empty-body">
              {q ? 'Essayez un autre terme de recherche.' : 'Tous les budgets soumis ont été traités.'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {['Code', 'Nom', 'Département', 'Gestionnaire', 'Montant global', 'Date soumission', 'Action'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(b => (
                <tr
                  key={b.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/validation/${b.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gold-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td><span className="code-tag">{b.code}</span></td>
                  <td className="font-medium">{b.nom}</td>
                  <td className="text-gray-500">{b.departement_nom || '—'}</td>
                  <td className="text-gray-500">{b.gestionnaire_nom || '—'}</td>
                  <td className="font-mono font-semibold">
                    {fmt(b.montant_global)} <span className="text-[10px] text-gray-400">FCFA</span>
                  </td>
                  <td className="text-gray-400 text-[12px]">
                    {b.date_soumission ? new Date(b.date_soumission).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/validation/${b.id}`)}
                      className="btn btn-primary btn-sm gap-[5px]"
                    >
                      Examiner <ArrowRight size={12} strokeWidth={2.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
