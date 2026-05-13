import { useEffect, useRef, useState } from 'react'
import api from '../../api/axios'
import { cn } from '../../lib/cn'

/* ── Meta par action ─────────────────────────────────────────────────────── */
const ACTION_META = {
  CREATE:  { label: 'Création',     bg: 'rgba(21,128,61,0.1)',   color: '#15803D' },
  UPDATE:  { label: 'Modification', bg: 'rgba(37,99,235,0.10)',  color: '#1D4ED8' },
  DELETE:  { label: 'Suppression',  bg: 'rgba(220,38,38,0.1)',   color: '#B91C1C' },
  LOGIN:   { label: 'Connexion',    bg: 'rgba(90,107,126,0.10)', color: '#5A6B7E' },
  LOGOUT:  { label: 'Déconnexion',  bg: 'rgba(90,107,126,0.10)', color: '#5A6B7E' },
  APPROVE: { label: 'Approbation',  bg: 'rgba(184,134,74,0.12)', color: '#B8864A' },
  REJECT:  { label: 'Rejet',        bg: 'rgba(220,38,38,0.1)',   color: '#B91C1C' },
  SUBMIT:  { label: 'Soumission',   bg: 'rgba(37,99,235,0.10)',  color: '#2563EB' },
  VIEW:    { label: 'Consultation', bg: 'rgba(14,42,71,0.06)',   color: '#5A6B7E' },
  EXPORT:  { label: 'Export',       bg: 'rgba(109,40,217,0.10)', color: '#7C3AED' },
}

const TABLE_LABEL = {
  budget_annuel:             'Budget annuel',
  allocation_departementale: 'Allocation départ.',
  budget:                    'Budget',
  ligne_budgetaire:          'Ligne budgétaire',
  utilisateur:               'Utilisateur',
  departement:               'Département',
  consommation_ligne:        'Dépense',
  consommationligne:         'Dépense',
}

const PAGE_SIZE = 20

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function initials(str) {
  if (!str) return 'SY'
  const p = str.trim().split(' ')
  return ((p[0]?.[0] || '') + (p[1]?.[0] || p[0]?.[1] || '')).toUpperCase()
}

function ActionBadge({ action }) {
  const m = ACTION_META[action] || { label: action, bg: 'var(--af-steel)', color: 'var(--af-cream)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
      background: m.bg, color: m.color,
    }}>{m.label.toUpperCase()}</span>
  )
}

/* ── Ligne expandable ────────────────────────────────────────────────────── */
function AuditRow({ log }) {
  const [open, setOpen] = useState(false)
  const meta  = ACTION_META[log.action] || {}
  const tbl   = TABLE_LABEL[log.table] || log.table || '—'
  const detail = log.valeur_apres || log.valeur_avant || ''
  const hasDetail = Boolean(log.valeur_avant || log.valeur_apres)

  return (
    <>
      <tr
        style={{ cursor: hasDetail ? 'pointer' : 'default', background: open ? 'var(--af-steel)' : undefined }}
        onClick={() => hasDetail && setOpen(o => !o)}
      >
        <td style={{ paddingLeft: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--af-cream)', fontFamily: 'var(--af-mono)', whiteSpace: 'nowrap' }}>
            {fmtDate(log.date_action)}
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #0E2A47, #B8864A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: '#fff',
            }}>{initials(log.utilisateur_str)}</div>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--af-ivory)' }}>
              {log.utilisateur_str || 'Système'}
            </span>
          </div>
        </td>
        <td><ActionBadge action={log.action} /></td>
        <td>
          <div style={{ fontSize: 12, color: 'var(--af-ivory)', fontWeight: 600 }}>{tbl}</div>
          {log.enregistrement_id && (
            <div style={{ fontSize: 10, color: 'var(--af-mute)', fontFamily: 'var(--af-mono)', marginTop: 2 }}>
              #{String(log.enregistrement_id).slice(0, 12)}
            </div>
          )}
        </td>
        <td style={{ maxWidth: 240 }}>
          <div style={{ fontSize: 11, color: 'var(--af-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {detail ? String(detail).slice(0, 60) : <span style={{ color: 'var(--af-mute)' }}>—</span>}
          </div>
        </td>
        <td style={{ paddingRight: 16, textAlign: 'right' }}>
          {hasDetail && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 6,
              background: 'var(--af-steel)', color: 'var(--af-cream)',
              fontSize: 10, transition: 'transform .2s',
              transform: open ? 'rotate(180deg)' : 'none',
            }}>▾</span>
          )}
        </td>
      </tr>

      {open && hasDetail && (
        <tr>
          <td colSpan={6} style={{ padding: '0 18px 16px', background: 'var(--af-steel)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12 }}>
              {[['Avant', log.valeur_avant], ['Après', log.valeur_apres]].map(([lbl, val]) => (
                <div key={lbl} style={{
                  border: '1px solid var(--af-line)', borderRadius: 8, padding: '10px 14px',
                  background: 'var(--af-slate)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--af-mute)', marginBottom: 6 }}>{lbl}</div>
                  <pre style={{ fontSize: 11, color: 'var(--af-ivory)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, fontFamily: 'var(--af-mono)', maxHeight: 160, overflow: 'auto' }}>
                    {val ? (() => { try { return JSON.stringify(JSON.parse(val), null, 2) } catch { return val } })() : '—'}
                  </pre>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function AuditLogsPage({ embedded = false }) {
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (cancelRef.current) cancelRef.current()
    let cancelled = false
    cancelRef.current = () => { cancelled = true }

    setLoading(true); setError(''); setPage(1)
    api.get('/audit/', { params: { action: actionFilter || undefined } })
      .then(r => { if (!cancelled) setLogs(r.data.results ?? r.data ?? []) })
      .catch(err => { if (!cancelled) setError(err.response?.data?.detail || 'Erreur de chargement') })
      .finally(() => { if (!cancelled) setLoading(false) })
  }, [actionFilter])

  const searchLower = search.toLowerCase()
  const filtered = searchLower
    ? logs.filter(l =>
        (l.utilisateur_str || '').toLowerCase().includes(searchLower) ||
        (l.table || '').toLowerCase().includes(searchLower) ||
        (l.valeur_apres || '').toLowerCase().includes(searchLower) ||
        (l.valeur_avant || '').toLowerCase().includes(searchLower)
      )
    : logs

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const todayStr = new Date().toDateString()
  const todayCount = logs.filter(l => l.date_action && new Date(l.date_action).toDateString() === todayStr).length
  const uniqueUsers = new Set(logs.map(l => l.utilisateur_str).filter(Boolean)).size

  return (
    <div>
      {!embedded && (
        <div className="mb-7 flex items-end gap-6">
          <div>
            <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">{logs.length} entrée{logs.length !== 1 ? 's' : ''} · Immuable</div>
            <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Journal d'audit</h1>
            <div className="text-[13px] text-[#5A6B7E]">Traçabilité complète — toutes les actions horodatées.</div>
          </div>
        </div>
      )}

      {!embedded && (
        <div className="grid grid-cols-4 gap-[14px] mb-6">
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Total entrées</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{logs.length}</div>
            <div className="text-[11px] text-[#5A6B7E]">depuis le début</div>
          </div>
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Aujourd'hui</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{todayCount}</div>
            <div className="text-[11px] text-[#15803D]">actions</div>
          </div>
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Utilisateurs actifs</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{uniqueUsers}</div>
            <div className="text-[11px] text-[#5A6B7E]">distincts</div>
          </div>
          <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
            <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3">Approbations</div>
            <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{logs.filter(l => l.action === 'APPROVE').length}</div>
            <div className="text-[11px] text-[#15803D]">validations</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
        {/* ── Header avec filtre + recherche ─────────────────────────────── */}
        <div style={{ padding: '14px 18px 0', borderBottom: '1px solid var(--af-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ width: 13, height: 13, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--af-mute)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Rechercher utilisateur, table, contenu…"
                className="form-input"
                style={{ paddingLeft: 32, fontSize: 12, height: 32 }}
              />
            </div>
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }}
                style={{ fontSize: 12, color: 'var(--af-cream)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Filtres par action */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 12 }}>
            <button
              onClick={() => { setActionFilter(''); setPage(1) }}
              className={cn(
                'inline-flex px-2.5 py-1 rounded-full text-[11px] border transition-all duration-150',
                actionFilter === ''
                  ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
                  : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
              )}
            >Tous ({logs.length})</button>
            {Object.entries(ACTION_META).map(([key, m]) => {
              const count = logs.filter(l => l.action === key).length
              if (count === 0) return null
              return (
                <button
                  key={key}
                  onClick={() => { setActionFilter(key); setPage(1) }}
                  className={cn(
                    'inline-flex px-2.5 py-1 rounded-full text-[11px] border transition-all duration-150',
                    actionFilter === key
                      ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
                      : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
                  )}
                >
                  {m.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Contenu ─────────────────────────────────────────────────────── */}
        {error ? (
          <div style={{ padding: '24px 18px', color: '#DC2626', fontSize: 13 }}>
            Erreur : {error}
          </div>
        ) : loading ? (
          <div className="af-loader" style={{ minHeight: 200 }}>
            <div className="af-spinner" /><span>Chargement du journal…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 18px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
            {search ? `Aucun résultat pour « ${search} »` : 'Aucune entrée dans le journal.'}
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 18 }}>Date / heure</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Entité</th>
                <th>Détail</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginated.map(log => <AuditRow key={log.id} log={log} />)}
            </tbody>
          </table>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--af-line)' }}>
            <span style={{ fontSize: 12, color: 'var(--af-mute)' }}>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 12px', fontSize: 12 }}
              >← Préc.</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1
                  : safePage <= 4 ? i + 1
                  : safePage >= totalPages - 3 ? totalPages - 6 + i
                  : safePage - 3 + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn('btn btn-sm', p === safePage ? 'btn-primary' : 'btn-secondary')}
                    style={{ padding: '4px 10px', fontSize: 12, minWidth: 34 }}>
                    {p}
                  </button>
                )
              })}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 12px', fontSize: 12 }}
              >Suiv. →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
