import { useEffect, useState } from 'react'
import {
  getBudgetAnnuels, createBudgetAnnuel, updateBudgetAnnuel, deleteBudgetAnnuel,
  getAllocations,
} from '../../api/budget'
import { Plus, Pencil, Trash2, CalendarDays, AlertTriangle, ChevronDown, Building2 } from 'lucide-react'
import { ConfirmModal } from '../../components/ui'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n ?? 0)

const jaugeColor = (pct) => {
  if (pct > 75) return 'var(--color-danger-600)'
  if (pct > 50) return 'var(--color-warning-600)'
  return 'var(--color-success-600)'
}

/* ─── Page principale ──────────────────────────────────────────────────────── */
export default function BudgetAnnuelPage() {
  const [budgets,      setBudgets]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showNewBA,    setShowNewBA]    = useState(false)
  const [editBA,       setEditBA]       = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [expandedId,   setExpandedId]   = useState(null)

  const load = () => {
    setLoading(true)
    getBudgetAnnuels()
      .then(r => setBudgets(r.data.results ?? r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget annuel</h1>
          <p className="page-subtitle">Budget global voté par l'entreprise</p>
        </div>
        <div className="flex gap-[10px]">
          <button onClick={() => setShowNewBA(true)} className="btn btn-primary btn-md gap-[7px]">
            <Plus size={16} strokeWidth={2.5} /> Voter le budget annuel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : budgets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <CalendarDays size={28} strokeWidth={1.5} className="text-gray-400" />
          </div>
          <p className="empty-title">Aucun budget annuel voté</p>
          <p className="empty-body">
            L'entreprise vote un budget global unique par exercice.
          </p>
          <button onClick={() => setShowNewBA(true)} className="btn btn-primary btn-md mt-4 gap-[7px]">
            <Plus size={16} strokeWidth={2.5} /> Voter le budget annuel
          </button>
        </div>
      ) : (
        <div className="max-w-[760px]">
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
                  onConfirm: () => deleteBudgetAnnuel(ba.id).then(() => { if (expandedId === ba.id) setExpandedId(null); load() }),
                })}
              />
              {expandedId === ba.id && (
                <AllocationsInline key={`allocs-${ba.id}`} budgetAnnuelId={ba.id} />
              )}
            </div>
          ))}
        </div>
      )}

      {showNewBA && <BudgetAnnuelModal onClose={() => setShowNewBA(false)} onSaved={() => { setShowNewBA(false); load() }} />}
      {editBA    && <BudgetAnnuelModal initial={editBA} onClose={() => setEditBA(null)} onSaved={() => { setEditBA(null); load() }} />}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
}

/* ─── Carte budget annuel ──────────────────────────────────────────────────── */
function BudgetAnnuelCard({ ba, expanded, onToggle, onEdit, onDelete }) {
  const pct     = ba.montant_global > 0 ? Math.min(100, (ba.montant_alloue_depts / ba.montant_global) * 100) : 0
  const restant = ba.montant_disponible_global
  const color   = jaugeColor(pct)

  return (
    <div
      className="card mb-[4px]"
      style={{
        border: `1.5px solid ${expanded ? 'var(--color-gold)' : 'var(--color-gray-200)'}`,
        borderBottom: expanded ? 'none' : undefined,
        borderBottomLeftRadius: expanded ? 0 : undefined,
        borderBottomRightRadius: expanded ? 0 : undefined,
        cursor: 'pointer',
      }}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-[14px]">
        <div>
          <div className="font-display font-extrabold text-[15px] text-gray-900">
            Exercice {ba.periode_display ?? ba.annee}
          </div>
          {ba.description && (
            <div className="text-[#9CA3AF] text-[12px] mt-[3px]">{ba.description}</div>
          )}
        </div>
        <div className="flex gap-[5px]" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="btn btn-secondary btn-sm" title="Modifier">
            <Pencil size={12} strokeWidth={2} />
          </button>
          <button onClick={onDelete} className="btn btn-danger btn-sm" title="Supprimer">
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[10px] mb-[14px]">
        <div>
          <div className="text-[10px] text-[#9CA3AF] font-semibold tracking-[.4px] mb-[3px]">BUDGET GLOBAL</div>
          <div className="font-mono font-bold text-[13px]" style={{ color: 'var(--color-gold)' }}>{fmt(ba.montant_global)} FCFA</div>
        </div>
        <div>
          <div className="text-[10px] text-[#9CA3AF] font-semibold tracking-[.4px] mb-[3px]">DISPONIBLE</div>
          <div
            className="font-mono font-bold text-[13px]"
            style={{ color: restant < 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}
          >
            {fmt(restant)} FCFA
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-[#6B7280] mb-[5px]">
          <span>Alloué aux départements</span>
          <span className="font-bold font-mono" style={{ color }}>{Math.round(pct)}%</span>
        </div>
        <div className="exec-bar mb-[12px]">
          <div className="exec-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${jaugeColor(Math.max(0, pct - 20))}, ${color})` }} />
        </div>
        <div className="flex items-center justify-center gap-[5px] text-[11px] font-semibold" style={{ color: expanded ? 'var(--color-gold)' : '#9CA3AF' }}>
          <Building2 size={12} strokeWidth={2} />
          {expanded ? 'Masquer les départements' : 'Voir les départements'}
          <ChevronDown size={12} strokeWidth={2.5} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </div>
      </div>
    </div>
  )
}

/* ─── Allocations inline (panneau expansible) ─────────────────────────────── */
function AllocationsInline({ budgetAnnuelId }) {
  const [allocs,  setAllocs]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getAllocations(budgetAnnuelId)
      .then(r => setAllocs(r.data.results ?? r.data))
      .finally(() => setLoading(false))
  }, [budgetAnnuelId])

  return (
    <div className="card mb-[16px]" style={{
      border: '1.5px solid var(--color-gold)',
      borderTop: 'none',
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      padding: 0,
      overflow: 'hidden',
    }}>
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div className="spinner mx-auto" style={{ width: 20, height: 20 }} />
        </div>
      ) : allocs.length === 0 ? (
        <div style={{ padding: '20px 24px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>
          <Building2 size={20} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', color: '#D1D5DB' }} />
          Aucune allocation pour cet exercice.
          <br />
          <span style={{ fontSize: 12 }}>Rendez-vous sur la page <strong>Départements</strong> pour allouer.</span>
        </div>
      ) : (
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Département', 'Alloué', 'Consommé', 'Disponible', 'Taux'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allocs.map(a => {
              const pct   = parseFloat(a.montant_alloue) > 0
                ? Math.min(100, (parseFloat(a.montant_consomme) / parseFloat(a.montant_alloue)) * 100)
                : 0
              const color = jaugeColor(pct)
              return (
                <tr key={a.id}>
                  <td className="font-semibold text-[13px]">{a.departement_nom}</td>
                  <td className="font-mono font-semibold">{fmt(a.montant_alloue)} <span className="text-[10px] text-[#9CA3AF]">FCFA</span></td>
                  <td className="font-mono text-[#6B7280]">{fmt(a.montant_consomme)} <span className="text-[10px] text-[#9CA3AF]">FCFA</span></td>
                  <td>
                    <span className="font-mono font-bold" style={{ color: parseFloat(a.montant_disponible) < 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
                      {fmt(a.montant_disponible)} <span className="text-[10px] font-normal text-[#9CA3AF]">FCFA</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="exec-bar" style={{ width: 60 }}>
                        <div className="exec-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="text-[11px] font-bold font-mono" style={{ color }}>{Math.round(pct)}%</span>
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
    ? (form.annee_fin && form.annee_fin !== form.annee ? `${form.annee}-${form.annee_fin}` : String(form.annee))
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
      <div className="modal-panel max-w-[460px]" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="font-display font-bold text-[15px]">
            {initial ? 'Modifier le budget annuel' : 'Voter le budget annuel'}
          </h2>
        </div>
        <form onSubmit={handle}>
          <div className="modal-body">
            {periodeLabel && (
              <div className="mb-4 px-[14px] py-2 rounded-[9px] bg-[#FEF9EC] border border-[#F3D07A] text-[13px] font-bold text-[#78350F] font-mono tracking-[.5px]">
                Exercice : {periodeLabel}
              </div>
            )}
            <div className="grid form-grid-2 gap-[14px] mb-[14px]" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div>
                <label className="form-label">Année de début</label>
                <input className="form-input" type="number" required min="2000" max="2099" value={form.annee}
                  onChange={e => setForm(f => ({ ...f, annee: e.target.value }))} placeholder="Ex : 2026" />
              </div>
              <div>
                <label className="form-label">
                  Année de fin <span className="font-normal normal-case text-[#9CA3AF]">(optionnel)</span>
                </label>
                <input className="form-input" type="number" min={form.annee || 2000} max="2099" value={form.annee_fin}
                  onChange={e => setForm(f => ({ ...f, annee_fin: e.target.value }))}
                  placeholder={form.annee ? `Ex : ${parseInt(form.annee) + 1}` : '2027'} />
                <p className="form-hint">Laisser vide si l'exercice tient sur 1 an</p>
              </div>
            </div>
            <div className="mb-[14px]">
              <label className="form-label">Budget global (FCFA)</label>
              <input className="form-input font-mono" type="number" required min="0" step="0.01" value={form.montant_global}
                onChange={e => setForm(f => ({ ...f, montant_global: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Description <span className="font-normal normal-case text-[#9CA3AF]">(optionnel)</span></label>
              <textarea className="form-input h-auto px-[14px] py-[10px]" value={form.description} rows={2}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {error && (
              <div className="flex items-start gap-[9px] px-[14px] py-[10px] rounded-[9px] bg-[#FEF2F2] border border-[#FECACA] mt-[14px]">
                <AlertTriangle size={14} strokeWidth={2} className="text-[#EF4444] shrink-0 mt-[1px]" />
                <p className="text-[12px] text-[#B91C1C] m-0">{error}</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Annuler</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-md">
              {saving ? <><span className="spinner-sm" /> Enregistrement…</> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
