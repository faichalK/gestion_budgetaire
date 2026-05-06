import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDepenses } from '../../api/depenses'
import {
  CreditCard, AlertTriangle, RotateCcw, FileText,
  Search, Eye, ChevronRight, Plus,
} from 'lucide-react'
import DepenseMultiModal from '../../components/budget/DepenseMultiModal'
import { formaterNombre, formaterPourcentage } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const STATUT = {
  SAISIE:  { bg: 'var(--color-warning-50)',  color: 'var(--color-warning-700)', label: 'En attente' },
  VALIDEE: { bg: 'var(--color-success-50)',  color: 'var(--color-success-700)', label: 'Validée'    },
  REJETEE: { bg: 'var(--color-danger-50)',   color: 'var(--color-danger-700)',  label: 'Rejetée'    },
}

const TABS = [
  { key: '',        label: 'Toutes',     color: 'var(--color-gold)' },
  { key: 'SAISIE',  label: 'En attente', color: '#D97706' },
  { key: 'VALIDEE', label: 'Validées',   color: '#059669' },
  { key: 'REJETEE', label: 'Rejetées',   color: '#DC2626' },
]

export default function MesDepenses() {
  const navigate = useNavigate()
  const [allDepenses,      setAllDepenses]      = useState([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState('')
  const [tab,              setTab]              = useState('SAISIE')
  const [search,           setSearch]           = useState('')
  const [showDepenseModal, setShowDepenseModal] = useState(false)

  const charger = () => {
    setLoading(true); setError('')
    getDepenses({})
      .then(r => setAllDepenses(r.data?.data ?? r.data?.results ?? r.data ?? []))
      .catch(err => setError(err.response?.data?.detail || err.message || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  // Grouper TOUS les items (non filtrés) pour les KPIs
  const allGroups = Object.values(
    allDepenses.reduce((acc, d) => {
      const k = d.budget_reference || '—'
      if (!acc[k]) acc[k] = { items: [] }
      acc[k].items.push(d)
      return acc
    }, {})
  )

  // KPIs comptent les groupes (budgets), pas les items individuels
  const countFor = (key) => {
    if (!key) return allGroups.length
    if (key === 'SAISIE')  return allGroups.filter(g => g.items.some(d => d.statut === 'SAISIE')).length
    if (key === 'VALIDEE') return allGroups.filter(g => g.items.every(d => d.statut === 'VALIDEE')).length
    if (key === 'REJETEE') return allGroups.filter(g => g.items.some(d => d.statut === 'REJETEE')).length
    return 0
  }

  const q = search.trim().toLowerCase()
  const filtered = allDepenses
    .filter(d => !tab || d.statut === tab)
    .filter(d => !q ||
      d.budget_reference?.toLowerCase().includes(q) ||
      d.budget_nom?.toLowerCase().includes(q) ||
      d.ligne_designation?.toLowerCase().includes(q) ||
      d.reference?.toLowerCase().includes(q)
    )

  const groups = Object.values(
    filtered.reduce((acc, d) => {
      const key = d.budget_reference || '—'
      if (!acc[key]) acc[key] = {
        reference: key,
        nom: (d.budget_nom && d.budget_nom !== '—') ? d.budget_nom : key,
        budget_id: d.budget_id || null,
        items: [],
      }
      acc[key].items.push(d)
      return acc
    }, {})
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes dépenses</h1>
          <p className="page-subtitle">Dépenses enregistrées sur vos budgets approuvés</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowDepenseModal(true)} className="btn btn-primary btn-md" style={{ gap: 7 }}>
            <Plus size={15} strokeWidth={2} /> Nouvelle dépense
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        {[
          { label: 'EN ATTENTE', val: countFor('SAISIE'),  sub: 'budget(s)', color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)'  },
          { label: 'VALIDÉES',   val: countFor('VALIDEE'), sub: 'budget(s)', color: 'var(--color-success-600)', bg: 'var(--color-success-50)'  },
          { label: 'REJETÉES',   val: countFor('REJETEE'), sub: 'budget(s)', color: 'var(--color-danger-600)',  bg: 'var(--color-danger-50)'   },
          { label: 'TOTAL',      val: countFor(''),        sub: 'budgets',   color: 'var(--color-gold)', bg: 'var(--color-gold-soft)'  },
        ].map(k => (
          <div key={k.label} className="card" style={{ borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '22px', color: 'var(--color-gray-900)' }}>{k.val}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--color-gray-200)' }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 18px 10px', fontSize: '13px',
              fontWeight: active ? 700 : 500,
              color: active ? t.color : 'var(--color-gray-500)',
              borderBottom: active ? `2.5px solid ${t.color}` : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'color .15s',
            }}>
              {t.label}
              <span style={{
                background: active ? t.color : 'var(--color-gray-200)',
                color: active ? '#fff' : 'var(--color-gray-600)',
                fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: 9,
              }}>
                {countFor(t.key)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Recherche */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="search-wrapper" style={{ maxWidth: 360 }}>
          <Search size={14} strokeWidth={2} className="search-icon" />
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher budget, ligne, référence…" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
            <RotateCcw size={12} strokeWidth={2} /> Effacer
          </button>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)' }}>
          <AlertTriangle size={15} style={{ color: 'var(--color-danger-500)', flexShrink: 0 }} />
          <span style={{ color: 'var(--color-danger-700)', fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-gray-400)' }}>Chargement…</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><CreditCard size={28} strokeWidth={1.5} style={{ color: 'var(--color-gray-400)' }} /></div>
          <p className="empty-title">Aucune dépense</p>
          <p className="empty-body">
            {q ? `Aucun résultat pour « ${search} »`
              : tab ? 'Aucune dépense pour ce filtre.'
              : 'Ouvrez un budget approuvé pour enregistrer vos premières dépenses.'}
          </p>
          {!q && !tab && (
            <button onClick={() => navigate('/mes-budgets')} className="btn btn-primary btn-md" style={{ marginTop: 16, gap: 7 }}>
              <FileText size={15} strokeWidth={2} /> Voir mes budgets
            </button>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden" style={{ overflowX: 'auto' }}>
          {/* Entêtes colonnes */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 180px 160px 130px',
            minWidth: 600, padding: '8px 20px',
            background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)',
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-gray-500)',
          }}>
            <span>Budget</span>
            <span style={{ textAlign: 'right' }}>Montant total</span>
            <span style={{ textAlign: 'center' }}>Avancement</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {groups.map((g, i) => {
            const total     = g.items.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
            const tauxValid = g.items.length > 0
              ? (g.items.filter(d => d.statut === 'VALIDEE').length / g.items.length) * 100
              : 0

            return (
              <div key={g.reference} style={{
                display: 'grid', gridTemplateColumns: '1fr 180px 160px 130px',
                minWidth: 600, padding: '14px 20px',
                borderBottom: i < groups.length - 1 ? '1px solid var(--color-gray-100)' : 'none',
                alignItems: 'center', cursor: 'pointer', transition: 'background .12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                onClick={() => navigate('/mes-depenses/budget/' + g.budget_id)}
              >
                {/* Info budget */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="code-tag">{g.reference}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                    {g.nom}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
                    {g.items.length} poste{g.items.length > 1 ? 's' : ''} de dépense
                  </div>
                </div>

                {/* Montant */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-900)' }}>{fmt(total)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-gray-400)', marginTop: 1 }}>FCFA</div>
                </div>

                {/* Jauge */}
                <div style={{ padding: '0 12px' }}>
                  <div className="progress-track">
                    <div className={`progress-fill ${tauxValid >= 100 ? 'progress-fill-green' : tauxValid > 0 ? 'progress-fill-orange' : ''}`} style={{ width: `${Math.min(tauxValid, 100)}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-gray-500)', textAlign: 'center', marginTop: 3, fontWeight: 600 }}>
                    {formaterPourcentage(tauxValid, { decimales: 0 })} validé
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate('/mes-depenses/budget/' + g.budget_id)} className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
                    <Eye size={12} strokeWidth={2} /> Examiner
                  </button>
                  <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--color-gray-300)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showDepenseModal && (
        <DepenseMultiModal
          onClose={() => setShowDepenseModal(false)}
          onSuccess={() => { setShowDepenseModal(false); charger() }}
        />
      )}
    </div>
  )
}