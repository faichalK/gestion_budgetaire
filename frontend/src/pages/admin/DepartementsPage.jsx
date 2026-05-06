import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDepartements, createDepartement, updateDepartement, deleteDepartement } from '../../api/accounts'
import { getBudgetAnnuels, createAllocation, updateAllocation } from '../../api/budget'
import { Plus, Building2, Pencil, Trash2, UserCheck, UserX, FileText, Coins, AlertTriangle } from 'lucide-react'
import { ConfirmModal } from '../../components/ui'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n ?? 0)

const jaugeColor = (taux) => {
  if (taux > 75) return 'var(--color-danger-600)'
  if (taux > 50) return 'var(--color-warning-600)'
  return 'var(--color-success-600)'
}

export default function DepartementsPage() {
  const navigate = useNavigate()
  const [depts,          setDepts]          = useState([])
  const [enveloppes,     setEnveloppes]     = useState([])
  const [budgetActuelId, setBudgetActuelId] = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [showModal,      setShowModal]      = useState(false)
  const [editTarget,     setEditTarget]     = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')
  const [form,           setForm]           = useState({ nom: '', description: '' })
  const [confirmModal,   setConfirmModal]   = useState(null)
  const [allouerTarget,  setAllouerTarget]  = useState(null) // { dept, existingAlloc }

  const load = () => {
    setLoading(true)
    Promise.all([getDepartements(), getBudgetAnnuels()])
      .then(([d, a]) => {
        setDepts(d.data.results ?? d.data)
        const annuels      = a.data.results ?? a.data
        const currentYear  = new Date().getFullYear()
        const budgetActuel = annuels.find(ba => {
          const start = Number(ba.annee)
          const end   = ba.annee_fin ? Number(ba.annee_fin) : start
          return currentYear >= start && currentYear <= end
        }) ?? annuels[0] ?? null
        setEnveloppes(budgetActuel?.allocations ?? [])
        setBudgetActuelId(budgetActuel?.id ?? null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditTarget(null); setForm({ nom: '', description: '' }); setError(''); setShowModal(true) }
  const openEdit   = (dept) => { setEditTarget(dept); setForm({ nom: dept.nom, description: dept.description || '' }); setError(''); setShowModal(true) }

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      editTarget ? await updateDepartement(editTarget.id, form) : await createDepartement(form)
      setShowModal(false); load()
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erreur serveur')
    } finally { setSaving(false) }
  }

  const handleToggle = async (dept) => {
    try { await updateDepartement(dept.id, { actif: !dept.actif }); load() }
    catch (err) { alert(err.response?.data?.detail || 'Erreur') }
  }

  const handleDelete = (id, nom) => {
    setConfirmModal({
      title: 'Supprimer le département',
      message: `Supprimer définitivement le département "${nom}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try { await deleteDepartement(id); load() }
        catch (err) { alert(err.response?.data?.detail || 'Impossible de supprimer ce département.') }
      },
    })
  }

  const anneeActuelle    = new Date().getFullYear()
  const enveloppeParDept = (deptId) => enveloppes.find(e => String(e.departement) === String(deptId))

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Départements</h1>
          <p className="page-subtitle">
            {depts.length} département{depts.length !== 1 ? 's' : ''} enregistré{depts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary btn-md gap-[7px]">
          <Plus size={16} strokeWidth={2.5} /> Nouveau département
        </button>
      </div>

      {depts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Building2 size={28} strokeWidth={1.5} className="text-gray-400" />
          </div>
          <p className="empty-title">Aucun département</p>
          <p className="empty-body">Créez votre premier département pour commencer.</p>
          <button onClick={openCreate} className="btn btn-primary btn-md mt-4 gap-[7px]">
            <Plus size={16} strokeWidth={2.5} /> Nouveau département
          </button>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {depts.map(dept => {
            const env  = enveloppeParDept(dept.id)
            const taux = env && parseFloat(env.montant_alloue) > 0
              ? Math.round(parseFloat(env.montant_consomme) / parseFloat(env.montant_alloue) * 100)
              : null
            const color = taux != null ? jaugeColor(taux) : 'var(--color-gray-400)'

            return (
              <div
                key={dept.id}
                className="card"
                style={{
                  borderTop: `3px solid ${dept.actif ? 'var(--color-gold)' : 'var(--color-gray-300)'}`,
                  opacity: dept.actif ? 1 : 0.65,
                }}
              >
                {/* En-tête */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-[11px] shrink-0 flex items-center justify-center"
                    style={{
                      background: dept.actif ? 'var(--color-gold-soft)' : 'var(--color-gray-100)',
                      color: dept.actif ? 'var(--color-gold)' : 'var(--color-gray-400)',
                    }}
                  >
                    <Building2 size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[7px] flex-wrap mb-[2px]">
                      <span className="font-display font-bold text-[15px] text-gray-900">
                        {dept.nom}
                      </span>
                      {!dept.actif && (
                        <span className="text-[9px] font-bold tracking-[.3px] px-[7px] py-[1px] rounded-[20px] bg-[#E5E7EB] text-[#6B7280]">
                          INACTIF
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#9CA3AF] font-mono">
                      {dept.code}
                    </div>
                    {dept.description && (
                      <div className="text-[12px] text-[#6B7280] mt-[3px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {dept.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Enveloppe */}
                {env ? (
                  <div className="bg-[#F9FAFB] rounded-[9px] px-[14px] py-3 mb-[14px] border border-[#F3F4F6]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-[#6B7280] tracking-[.4px]">
                        ENVELOPPE {anneeActuelle}
                      </span>
                      <span className="text-[11px] font-bold font-mono" style={{ color }}>
                        {taux}%
                      </span>
                    </div>
                    <div className="font-mono font-bold text-[15px] text-gray-900 mb-2">
                      {fmt(env.montant_disponible)} <span className="text-[10px] font-medium text-[#9CA3AF]">FCFA disponibles</span>
                    </div>
                    <div className="exec-bar mb-[6px]">
                      <div
                        className="exec-bar-fill"
                        style={{
                          width: `${Math.min(taux ?? 0, 100)}%`,
                          background: `linear-gradient(90deg, ${jaugeColor(Math.max(0, (taux ?? 0) - 20))}, ${color})`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#9CA3AF] font-mono">
                      <span>Alloué : {fmt(env.montant_alloue)}</span>
                      <span>Consommé : {fmt(env.montant_consomme)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#F9FAFB] rounded-[9px] px-[14px] py-[10px] text-center text-[#9CA3AF] text-[12px] mb-[14px] border border-dashed border-[#E5E7EB]">
                    Aucune enveloppe pour {anneeActuelle}
                  </div>
                )}

                {/* Actions */}
                <div className="card-footer">
                  <button
                    onClick={() => navigate(`/budgets?departement=${dept.id}&nom=${encodeURIComponent(dept.nom)}`)}
                    className="btn btn-primary btn-sm flex-1 gap-[5px]"
                  >
                    <FileText size={12} strokeWidth={2} /> Voir les budgets
                  </button>
                  {budgetActuelId && (
                    <button
                      onClick={() => setAllouerTarget({ dept, existingAlloc: env ?? null })}
                      className="btn btn-secondary btn-sm gap-[5px]"
                      title={env ? "Modifier l'enveloppe" : 'Allouer un montant'}
                    >
                      <Coins size={12} strokeWidth={2} />
                      {env ? 'Enveloppe' : 'Allouer'}
                    </button>
                  )}
                  <button onClick={() => openEdit(dept)} className="btn btn-secondary btn-sm" title="Modifier">
                    <Pencil size={12} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleToggle(dept)}
                    className={`btn btn-sm ${dept.actif ? 'btn-warning' : 'btn-success'}`}
                    title={dept.actif ? 'Désactiver' : 'Activer'}
                  >
                    {dept.actif ? <UserX size={12} strokeWidth={2} /> : <UserCheck size={12} strokeWidth={2} />}
                  </button>
                  <button onClick={() => handleDelete(dept.id, dept.nom)} className="btn btn-danger btn-sm" title="Supprimer">
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-panel max-w-[440px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-display font-bold text-[15px]">
                {editTarget ? 'Modifier le département' : 'Créer un département'}
              </h2>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="mb-4">
                  <label className="form-label">Nom du département</label>
                  <input className="form-input" required value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Ex : Direction Financière" />
                </div>
                <div>
                  <label className="form-label">
                    Description <span className="font-normal normal-case text-[#9CA3AF]">(optionnel)</span>
                  </label>
                  <textarea
                    className="form-input h-auto px-[14px] py-[10px] resize-y"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description du département…"
                    rows={3}
                  />
                </div>
                {error && <p className="text-[#DC2626] text-[12px] mt-[10px]">{error}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-md">Annuler</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-md">
                  {saving ? <><span className="spinner-sm" /> Enregistrement…</> : (editTarget ? 'Modifier' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
      {allouerTarget && (
        <AllouerModal
          dept={allouerTarget.dept}
          existingAlloc={allouerTarget.existingAlloc}
          budgetActuelId={budgetActuelId}
          onClose={() => setAllouerTarget(null)}
          onSaved={() => { setAllouerTarget(null); load() }}
        />
      )}
    </div>
  )
}

/* ─── Modal allocation enveloppe ───────────────────────────────────────────── */
function AllouerModal({ dept, existingAlloc, budgetActuelId, onClose, onSaved }) {
  const [montant, setMontant] = useState(existingAlloc?.montant_alloue ?? '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const handle = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (existingAlloc) {
        await updateAllocation(budgetActuelId, existingAlloc.id, { montant_alloue: montant })
      } else {
        await createAllocation(budgetActuelId, { departement: dept.id, montant_alloue: montant })
      }
      onSaved()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.detail || d?.non_field_errors?.[0] || JSON.stringify(d))
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-panel max-w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="font-display font-bold text-[15px]">
            {existingAlloc ? "Modifier l'enveloppe" : 'Allouer un montant'}
          </h2>
        </div>
        <form onSubmit={handle}>
          <div className="modal-body">
            <div className="mb-[14px] px-[14px] py-[10px] rounded-[9px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px]">
              <span className="text-[#4B5563]">Département : </span>
              <span className="font-bold text-[#111827]">{dept.nom}</span>
            </div>
            <div>
              <label className="form-label">Montant alloué (FCFA)</label>
              <input
                className="form-input font-mono"
                type="number" required min="0" step="0.01" autoFocus
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex : 5 000 000"
              />
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
