import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { getDepenses } from '../../api/depenses'
import {
  Search, Receipt, Eye, ChevronRight, X,
} from '../../components/AtlasIcons'
import Card from '../../components/ui/Card'
import { formaterNombre, formaterPourcentage } from '../../utils/formatters'

const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })


const TABS = [
  { key: '',        label: 'Toutes',     color: 'var(--af-gold)' },
  { key: 'SAISIE',  label: 'En attente', color: 'var(--color-warning-600)' },
  { key: 'VALIDEE', label: 'Validées',   color: 'var(--color-success-600)' },
  { key: 'REJETEE', label: 'Rejetées',   color: 'var(--color-danger-600)'  },
]

export default function DepensesPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [tab,    setTab]    = useState('SAISIE')
  const [search, setSearch] = useState('')

  const { data: allData, isLoading } = useQuery({
    queryKey: ['depenses-all'],
    queryFn: () => getDepenses({}).then(r => r.data),
  })

  const allDepenses = Array.isArray(allData?.data) ? allData.data
    : (allData?.data?.results || allData?.results || [])

  const allGroups = Object.values(
    allDepenses.reduce((acc, d) => {
      const k = d.budget_code || '—'
      if (!acc[k]) {
        acc[k] = {
          reference: k,
          nom: (d.budget_nom && d.budget_nom !== '—') ? d.budget_nom : k,
          budget_id: d.budget_id || null,
          items: [],
        }
      }
      acc[k].items.push(d)
      return acc
    }, {})
  )

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
      d.budget_code?.toLowerCase().includes(q) ||
      d.budget_nom?.toLowerCase().includes(q) ||
      d.note?.toLowerCase().includes(q) ||
      d.fournisseur?.toLowerCase().includes(q)
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
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">
            Comptable · Dépenses
          </div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">
            Suivi des engagements
          </h1>
          <div className="text-[13px] text-[#5A6B7E]">
            {allDepenses.length} dépense{allDepenses.length > 1 ? 's' : ''} · {allGroups.length} budget{allGroups.length > 1 ? 's' : ''} suivis
          </div>
        </div>
        <div className="ml-auto flex gap-2.5">
          {!isAdmin && (
            <button onClick={() => navigate('/validation')} className="btn btn-primary btn-sm">
              Voir les validations
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-5">
        {[
          { label: 'En attente', val: countFor('SAISIE'),  delta: 'flat', sub: 'budget(s)' },
          { label: 'Validées',   val: countFor('VALIDEE'), delta: 'up',   sub: 'budget(s)' },
          { label: 'Rejetées',   val: countFor('REJETEE'), delta: 'down', sub: 'budget(s)' },
          { label: 'Total',      val: countFor(''),        delta: 'flat', sub: 'budgets'   },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">{k.label}</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{k.val}</div>
            <div className={cn('text-[11px] inline-flex items-center gap-1', DELTA[k.delta])}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--af-line)' }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 18px 10px', fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? t.color : 'var(--af-cream)',
              borderBottom: active ? `2.5px solid ${t.color}` : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'color .15s',
            }}>
              {t.label}
              <span style={{
                background: active ? t.color : 'var(--af-line)',
                color: active ? '#fff' : 'var(--af-mute)',
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9,
              }}>
                {countFor(t.key)}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Recherche ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div className="search-wrapper" style={{ maxWidth: 380 }}>
          <Search size={14} strokeWidth={2} className="search-icon" />
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher budget, fournisseur, ligne…" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn btn-ghost btn-sm">
            <X size={12} strokeWidth={2} /> Effacer
          </button>
        )}
      </div>

      {/* ── Contenu ── */}
      {isLoading ? (
        <div className="af-loader">
          <div className="af-spinner" />
          <span>Chargement…</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="af-loader">
          <Receipt size={28} strokeWidth={1.5} style={{ color: 'var(--af-mute)' }} />
          <span>Aucune dépense</span>
          <span style={{ fontSize: 12 }}>{tab ? 'Aucune dépense avec ce statut.' : 'Aucune dépense enregistrée.'}</span>
        </div>
      ) : (
        <Card.Table className="overflow-x-auto">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 180px 160px 130px',
            minWidth: 600, padding: '8px 20px',
            background: '#EDE7DA', borderBottom: '1px solid rgba(14,42,71,0.08)',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'rgba(90,107,126,0.7)',
          }}>
            <span>Budget</span>
            <span style={{ textAlign: 'right' }}>Montant total</span>
            <span style={{ textAlign: 'center' }}>Avancement</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {groups.map((g, i) => {
            const total     = g.items.reduce((s, d) => s + parseFloat(d.montant_total || 0), 0)
            const tauxValid = g.items.length > 0
              ? (g.items.filter(d => d.statut === 'VALIDEE').length / g.items.length) * 100
              : 0

            return (
              <div key={g.reference} style={{
                display: 'grid', gridTemplateColumns: '1fr 180px 160px 130px',
                minWidth: 600, padding: '14px 20px',
                borderBottom: i < groups.length - 1 ? '1px solid var(--af-line)' : 'none',
                alignItems: 'center', cursor: 'pointer', transition: 'background .12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--af-gold-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                onClick={() => g.budget_id && navigate('/depenses/budget/' + g.budget_id)}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="ref">{g.reference}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--af-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                    {g.nom}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--af-mute)' }}>
                    {g.items.length} dépense{g.items.length > 1 ? 's' : ''}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--af-ink)' }}>{fmt(total)}</div>
                  <div style={{ fontSize: 10, color: 'var(--af-mute)', marginTop: 1 }}>FCFA</div>
                </div>

                <div style={{ padding: '0 12px' }}>
                  <div className="af-bar">
                    <div
                      className={`af-bar-fill${tauxValid >= 100 ? ' ok' : tauxValid > 0 ? ' warn' : ''}`}
                      style={{ width: `${Math.min(tauxValid, 100)}%` }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--af-cream)', textAlign: 'center', marginTop: 3, fontWeight: 600 }}>
                    {formaterPourcentage(tauxValid, { decimales: 0 })} validé
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => g.budget_id && navigate('/depenses/budget/' + g.budget_id)} className="btn btn-secondary btn-xs" style={{ gap: 5 }}>
                    <Eye size={12} strokeWidth={2} /> Examiner
                  </button>
                  <ChevronRight size={14} strokeWidth={2} className="text-[rgba(14,42,71,0.16)]" />
                </div>
              </div>
            )
          })}
        </Card.Table>
      )}
    </div>
  )
}

