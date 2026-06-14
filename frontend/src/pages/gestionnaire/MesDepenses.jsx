import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDepenses } from '../../api/depenses'
import { DepenseBadge } from '../../components/StatusBadge'
import Card from '../../components/ui/Card'
import { formaterNombre } from '../../utils/formatters'
import DepenseMultiModal from '../../components/budget/DepenseMultiModal'
import { Search, Eye, ChevronRight, Plus, Paperclip } from '../../components/AtlasIcons'
import { cn } from '../../lib/cn'

const fmt  = n => formaterNombre(parseFloat(n) || 0, { maximumFractionDigits: 0 })
const fmtM = n => formaterNombre((parseFloat(n) || 0) / 1e6, { maximumFractionDigits: 2 })
const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—'

const DELTA = { up: 'text-[#15803D]', down: 'text-[#B91C1C]', flat: 'text-[#5A6B7E]' }

const TABS = [
  { key: 'ALL',     label: 'Toutes',     color: '#5A6B7E' },
  { key: 'SAISIE',  label: 'En attente', color: '#D97706' },
  { key: 'VALIDEE', label: 'Validées',   color: '#059669' },
  { key: 'REJETEE', label: 'Rejetées',   color: '#DC2626' },
]

function btnStyle(color) {
  return {
    background: 'none',
    border: `1px solid ${color}30`,
    borderRadius: 7,
    padding: '5px 7px',
    cursor: 'pointer',
    color,
    display: 'flex',
    alignItems: 'center',
    transition: 'background .12s',
  }
}

export default function MesDepenses() {
  const navigate = useNavigate()
  const [depenses,  setDepenses]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('ALL')
  const [search,    setSearch]    = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const charger = () => {
    setLoading(true)
    getDepenses()
      .then(r => setDepenses(r.data?.data ?? r.data?.results ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  const countFor = (key) => key === 'ALL' ? depenses.length : depenses.filter(d => d.statut === key).length

  const validees   = depenses.filter(d => d.statut === 'VALIDEE')
  const enAttente  = depenses.filter(d => d.statut === 'SAISIE')
  const rejetees   = depenses.filter(d => d.statut === 'REJETEE')
  const totalEngage  = depenses.reduce((s, d) => s + (parseFloat(d.montant_total) || 0), 0)
  const totalValide  = validees.reduce((s, d) => s + (parseFloat(d.montant_total) || 0), 0)
  const totalAttente = enAttente.reduce((s, d) => s + (parseFloat(d.montant_total) || 0), 0)
  const totalRejete  = rejetees.reduce((s, d) => s + (parseFloat(d.montant_total) || 0), 0)

  const q = search.trim().toLowerCase()
  const visible = depenses.filter(d => {
    const matchTab    = tab === 'ALL' || d.statut === tab
    const matchSearch = !q
      || (d.reference || '').toLowerCase().includes(q)
      || (d.note || '').toLowerCase().includes(q)
      || (d.fournisseur || '').toLowerCase().includes(q)
      || (d.budget_code || '').toLowerCase().includes(q)
      || (d.budget_nom || '').toLowerCase().includes(q)
    return matchTab && matchSearch
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  if (loading) return (
    <div className="af-loader"><div className="af-spinner" /><span>Chargement…</span></div>
  )

  return (
    <div>
      {/* ── En-tête page ────────────────────────────────────────────────────── */}
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">
            Gestionnaire
          </div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">
            Mes dépenses
          </h1>
          <div className="text-[13px] text-[#5A6B7E]">
            {depenses.length} dépense{depenses.length !== 1 ? 's' : ''} enregistrée{depenses.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="ml-auto">
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} strokeWidth={2.5} /> Saisir une dépense
          </button>
        </div>
      </div>

      {/* ── 4 KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-[14px] mb-6">
        {[
          { label: 'Total engagé',  value: fmtM(totalEngage),  unit: ' M FCFA', delta: 'up',   sub: `${depenses.length} dépense${depenses.length !== 1 ? 's' : ''}` },
          { label: 'Validé',        value: fmtM(totalValide),  unit: ' M FCFA', delta: 'flat', sub: `${validees.length} validée${validees.length !== 1 ? 's' : ''}` },
          { label: 'En attente',    value: fmtM(totalAttente), unit: ' M FCFA', delta: 'flat', sub: `${enAttente.length} en attente` },
          { label: 'Rejeté',        value: fmtM(totalRejete),  unit: ' M FCFA', delta: rejetees.length > 0 ? 'down' : 'flat', sub: `${rejetees.length} rejetée${rejetees.length !== 1 ? 's' : ''}` },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">{k.label}</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">
              {k.value}<span className="text-[#B8864A] text-[16px] ml-0.5">{k.unit}</span>
            </div>
            <div className={cn('text-[11px] inline-flex items-center gap-1', DELTA[k.delta])}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs statut ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--af-line)', paddingBottom: 0 }}>
        {TABS.map(t => {
          const cnt    = countFor(t.key)
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 18px 10px',
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? t.color : 'var(--af-mute)',
                borderBottom: active ? `2.5px solid ${t.color}` : '2.5px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color .15s',
              }}
            >
              {t.label}
              <span style={{
                background: active ? t.color : 'var(--af-line)',
                color: active ? '#fff' : 'var(--af-cream)',
                fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 9,
              }}>
                {cnt}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Barre de recherche ──────────────────────────────────────────────── */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="search-wrapper" style={{ flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={15} strokeWidth={2} className="search-icon" />
          <input
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par référence, fournisseur, budget…"
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn btn-secondary btn-sm">✕ Effacer</button>
        )}
      </div>

      {/* ── Liste des dépenses ──────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Paperclip size={28} strokeWidth={1.5} style={{ color: 'var(--af-mute)' }} />
          </div>
          <p className="empty-title">Aucune dépense</p>
          <p className="empty-body">
            {search
              ? 'Aucun résultat pour votre recherche.'
              : tab !== 'ALL'
                ? `Aucune dépense au statut « ${TABS.find(t => t.key === tab)?.label} ».`
                : 'Aucune dépense enregistrée. Cliquez sur « Saisir une dépense » pour commencer.'}
          </p>
        </div>
      ) : (
        <Card.Table className="overflow-x-auto">
          {/* En-tête colonnes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 220px 160px 120px',
            minWidth: 580,
            padding: '8px 20px',
            background: '#EDE7DA',
            borderBottom: '1px solid rgba(14,42,71,0.08)',
            fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
            color: 'rgba(90,107,126,0.7)',
          }}>
            <span>Dépense</span>
            <span>Budget</span>
            <span style={{ textAlign: 'right' }}>Montant total</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {visible.map((dep, i) => (
            <div
              key={dep.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 220px 160px 120px',
                minWidth: 580,
                padding: '14px 20px',
                borderBottom: i < visible.length - 1 ? '1px solid rgba(14,42,71,0.08)' : 'none',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--af-steel)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              onClick={() => navigate(`/mes-depenses/${dep.id}`)}
            >
              {/* Référence + statut + description + date */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--af-mono)', fontSize: 11, fontWeight: 700, background: '#EDE7DA', color: '#0E2A47', padding: '2px 8px', borderRadius: 5 }}>
                    {dep.reference || String(dep.id).slice(0, 8).toUpperCase()}
                  </span>
                  <DepenseBadge statut={dep.statut} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--af-ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dep.note || dep.fournisseur || dep.reference || '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--af-mute)' }}>
                  {fmtDate(dep.date)}
                  {dep.lignes?.length > 0 && ` · ${dep.lignes.length} ligne${dep.lignes.length !== 1 ? 's' : ''}`}
                  {dep.nombre_pieces > 0 && (
                    <span style={{ marginLeft: 6 }}>
                      · 📎 {dep.nombre_pieces} pièce{dep.nombre_pieces > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {dep.statut === 'REJETEE' && dep.motif_rejet && (
                  <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ✕ {dep.motif_rejet}
                  </div>
                )}
              </div>

              {/* Budget */}
              <div style={{ minWidth: 0 }}>
                {dep.budget_code ? (
                  <>
                    <div style={{ fontFamily: 'var(--af-mono)', fontSize: 11, fontWeight: 700, color: '#B8864A', marginBottom: 2 }}>
                      {dep.budget_code}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--af-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dep.budget_nom || ''}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--af-mute)', fontStyle: 'italic' }}>Hors budget</div>
                )}
              </div>

              {/* Montant */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 14, color: 'var(--af-ink)' }}>
                  {fmt(dep.montant_total)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--af-mute)', marginTop: 1 }}>FCFA</div>
              </div>

              {/* Actions */}
              <div
                style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  title="Voir le détail"
                  onClick={() => navigate(`/mes-depenses/${dep.id}`)}
                  style={btnStyle('#B8864A')}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,134,74,0.10)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Eye size={13} strokeWidth={2} />
                </button>
                <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--af-line-2)', marginLeft: 2 }} />
              </div>
            </div>
          ))}
        </Card.Table>
      )}

      {modalOpen && (
        <DepenseMultiModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); charger() }}
        />
      )}
    </div>
  )
}
