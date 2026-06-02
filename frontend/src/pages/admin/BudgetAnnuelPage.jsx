import { useEffect, useState } from 'react'
import {
  getBudgetAnnuels, createBudgetAnnuel, updateBudgetAnnuel, deleteBudgetAnnuel,
  getAllocations,
} from '../../api/budget'
import { Plus, Pencil, Trash2, CalendarDays, AlertTriangle, ChevronDown, Building2 } from '../../components/AtlasIcons'
import { ConfirmModal } from '../../components/ui'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n ?? 0)

export default function BudgetAnnuelPage() {
  const [budgets,      setBudgets]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showNewBA,    setShowNewBA]    = useState(false)
  const [editBA,       setEditBA]       = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [expandedId,   setExpandedId]   = useState(null)

  const reloadBudgets = () => {
    setLoading(true)
    getBudgetAnnuels()
      .then(r => setBudgets(r.data.results ?? r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(() => {
      setLoading(true)
      getBudgetAnnuels()
        .then(r => { if (!cancelled) setBudgets(r.data.results ?? r.data) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [])

  return (
    <div>
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">Administration · Budget global</div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Budget annuel</h1>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button onClick={() => setShowNewBA(true)} className="btn btn-primary btn-sm" style={{ gap: 7 }}>
            <Plus size={14} strokeWidth={2.5} /> Voter le budget
          </button>
        </div>
      </div>

      {loading ? (
        <div className="af-loader"><div className="af-spinner" /></div>
      ) : budgets.length === 0 ? (
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <CalendarDays size={28} strokeWidth={1.5} style={{ color: 'var(--af-mute)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--af-ivory)', marginBottom: 6 }}>Aucun budget annuel voté</div>
          <div style={{ fontSize: 13, color: 'var(--af-mute)' }}>Votez un budget global pour démarrer l'exercice.</div>
        </div>
      ) : (
        <div style={{ maxWidth: 760 }}>
          {budgets.map(ba => (
            <div key={ba.id}>
              <BudgetAnnuelCard
                ba={ba}
                expanded={expandedId === ba.id}
                onToggle={() => setExpandedId(id => id === ba.id ? null : ba.id)}
                onEdit={() => setEditBA(ba)}
                onDelete={() => setConfirmModal({
                  title: 'Supprimer le budget annuel',
                  message: `Supprimer définitivement le budget annuel "${ba.periode_display ?? ba.annee}" ?`,
                  confirmLabel: 'Supprimer',
                  onConfirm: () => deleteBudgetAnnuel(ba.id).then(() => { if (expandedId === ba.id) setExpandedId(null); reloadBudgets() }),
                })}
              />
              {expandedId === ba.id && (
                <AllocationsInline key={`allocs-${ba.id}`} budgetAnnuelId={ba.id} />
              )}
            </div>
          ))}
        </div>
      )}

      {showNewBA && <BudgetAnnuelModal onClose={() => setShowNewBA(false)} onSaved={() => { setShowNewBA(false); reloadBudgets() }} />}
      {editBA    && <BudgetAnnuelModal initial={editBA} onClose={() => setEditBA(null)} onSaved={() => { setEditBA(null); reloadBudgets() }} />}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
}

/* ─── Carte budget annuel ──────────────────────────────────────────────────── */
function BudgetAnnuelCard({ ba, expanded, onToggle, onEdit, onDelete }) {
  const pct     = ba.montant_global > 0 ? Math.min(100, (ba.montant_alloue_depts / ba.montant_global) * 100) : 0
  const restant = ba.montant_disponible_global

  return (
    <div
      className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]"
      style={{
        marginBottom: expanded ? 0 : 8,
        border: expanded ? '1.5px solid var(--af-gold)' : undefined,
        borderBottomLeftRadius: expanded ? 0 : undefined,
        borderBottomRightRadius: expanded ? 0 : undefined,
        cursor: 'pointer',
      }}
      onClick={onToggle}
    >
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--af-ivory)' }}>
              Exercice {ba.periode_display ?? ba.annee}
            </div>
            {ba.description && (
              <div style={{ fontSize: 12, color: 'var(--af-mute)', marginTop: 3 }}>{ba.description}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} className="btn btn-secondary btn-sm" title="Modifier">
              <Pencil size={12} strokeWidth={2} />
            </button>
            <button onClick={onDelete} className="btn btn-danger btn-sm" title="Supprimer">
              <Trash2 size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--af-mute)', fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 3 }}>Budget global</div>
            <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: 'var(--af-gold)' }}>{fmt(ba.montant_global)} FCFA</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--af-mute)', fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 3 }}>Disponible</div>
            <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: restant < 0 ? '#DC2626' : '#15803D' }}>
              {fmt(restant)} FCFA
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--af-mute)', marginBottom: 5 }}>
            <span>Alloué aux départements</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--af-mono)', color: pct > 75 ? '#DC2626' : pct > 50 ? 'var(--af-gold)' : '#15803D' }}>{Math.round(pct)}%</span>
          </div>
          <div className="af-bar" style={{ marginBottom: 12 }}>
            <div className={`af-bar-fill${pct > 75 ? ' danger' : pct > 50 ? ' warn' : ''}`} style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: expanded ? 'var(--af-gold)' : 'var(--af-mute)' }}>
            <Building2 size={12} strokeWidth={2} />
            {expanded ? 'Masquer les allocations' : 'Voir les allocations'}
            <ChevronDown size={12} strokeWidth={2.5} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Allocations inline ──────────────────────────────────────────────────── */
function AllocationsInline({ budgetAnnuelId }) {
  const [allocs,  setAllocs]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(() => {
      setLoading(true)
      getAllocations(budgetAnnuelId)
        .then(r => { if (!cancelled) setAllocs(r.data.results ?? r.data) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [budgetAnnuelId])

  return (
    <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]" style={{
      marginBottom: 12,
      border: '1.5px solid var(--af-gold)',
      borderTop: 'none',
      borderTopLeftRadius: 0, borderTopRightRadius: 0,
      padding: 0, overflow: 'hidden',
    }}>
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div className="af-spinner" style={{ margin: '0 auto', width: 20, height: 20 }} />
        </div>
      ) : allocs.length === 0 ? (
        <div style={{ padding: '20px 24px', textAlign: 'center', fontSize: 13, color: 'var(--af-mute)' }}>
          <Building2 size={20} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--af-line)' }} />
          Aucune allocation — allouez depuis la page <strong>Départements</strong>.
        </div>
      ) : (
        <table className="af-table">
          <thead>
            <tr>
              {['Département', 'Alloué', 'Consommé', 'Disponible', 'Taux'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {allocs.map(a => {
              const pct = parseFloat(a.montant_alloue) > 0
                ? Math.min(100, (parseFloat(a.montant_consomme) / parseFloat(a.montant_alloue)) * 100)
                : 0
              return (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.departement_nom}</td>
                  <td className="num">{fmt(a.montant_alloue)} <span style={{ fontSize: 10, color: 'var(--af-mute)' }}>FCFA</span></td>
                  <td className="num muted">{fmt(a.montant_consomme)} <span style={{ fontSize: 10, color: 'var(--af-mute)' }}>FCFA</span></td>
                  <td>
                    <span className="num" style={{ fontWeight: 700, color: parseFloat(a.montant_disponible) < 0 ? '#DC2626' : '#15803D' }}>
                      {fmt(a.montant_disponible)} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--af-mute)' }}>FCFA</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="af-bar" style={{ width: 60 }}>
                        <div className={`af-bar-fill${pct > 75 ? ' danger' : pct > 50 ? ' warn' : ''}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--af-mono)', color: pct > 75 ? '#DC2626' : pct > 50 ? 'var(--af-gold)' : '#15803D' }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ─── Modal budget annuel ──────────────────────────────────────────────────── */
function BudgetAnnuelModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    annee:          initial?.annee ?? '',
    annee_fin:      initial?.annee_fin ?? '',
    montant_global: initial?.montant_global ?? '',
    description:    initial?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const periodeLabel = form.annee
    ? (form.annee_fin && form.annee_fin !== form.annee ? `${form.annee}–${form.annee_fin}` : String(form.annee))
    : ''

  const handle = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const payload = { ...form, annee_fin: form.annee_fin || null }
      initial ? await updateBudgetAnnuel(initial.id, payload) : await createBudgetAnnuel(payload)
      onSaved()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.detail || d?.annee?.[0] || d?.montant_global?.[0] || JSON.stringify(d))
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-panel" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: 15 }}>
            {initial ? 'Modifier le budget annuel' : 'Voter le budget annuel'}
          </h2>
        </div>
        <form onSubmit={handle}>
          <div className="modal-body">
            {periodeLabel && (
              <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 9, background: 'rgba(184,134,74,0.08)', border: '1px solid rgba(184,134,74,0.25)', fontSize: 13, fontWeight: 700, color: 'var(--af-gold)', fontFamily: 'var(--af-mono)', letterSpacing: '.5px' }}>
                Exercice {periodeLabel}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="mb-[18px]" style={{ marginBottom: 0 }}>
                <label className="form-label">Année de début</label>
                <input className="form-input" type="number" required min="2000" max="2099" value={form.annee}
                  onChange={e => setForm(f => ({ ...f, annee: e.target.value }))} placeholder="Ex : 2026" />
              </div>
              <div className="mb-[18px]" style={{ marginBottom: 0 }}>
                <label className="form-label">Année de fin <span style={{ fontWeight: 400, color: 'var(--af-mute)', textTransform: 'none' }}>(optionnel)</span></label>
                <input className="form-input" type="number" min={form.annee || 2000} max="2099" value={form.annee_fin}
                  onChange={e => setForm(f => ({ ...f, annee_fin: e.target.value }))}
                  placeholder={form.annee ? `Ex : ${parseInt(form.annee) + 1}` : '2027'} />
              </div>
            </div>
            <div className="mb-[18px]">
              <label className="form-label">Budget global (FCFA)</label>
              <input className="form-input" style={{ fontFamily: 'var(--af-mono)' }} type="number" required min="0" step="0.01" value={form.montant_global}
                onChange={e => setForm(f => ({ ...f, montant_global: e.target.value }))} />
            </div>
            <div className="mb-[18px]" style={{ marginBottom: 0 }}>
              <label className="form-label">Description <span style={{ fontWeight: 400, color: 'var(--af-mute)', textTransform: 'none' }}>(optionnel)</span></label>
              <textarea className="form-input" value={form.description} rows={2}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ height: 'auto', padding: '10px 14px', resize: 'vertical' }} />
            </div>
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 14px', borderRadius: 9, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', marginTop: 14 }}>
                <AlertTriangle size={14} strokeWidth={2} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{error}</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Annuler</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? <><span className="spinner-sm" /> Enregistrement…</> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
