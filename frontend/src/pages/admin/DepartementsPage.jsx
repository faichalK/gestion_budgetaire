import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDepartements, createDepartement, updateDepartement, deleteDepartement } from '../../api/accounts'
import { getBudgetAnnuels, createAllocation, updateAllocation } from '../../api/budget'
import { Plus, Building2, Pencil, Trash2, UserCheck, UserX, Coins, AlertTriangle, Eye } from '../../components/AtlasIcons'
import { ConfirmModal } from '../../components/ui'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n ?? 0, { maximumFractionDigits: 0 })

const jaugeColor = (taux) => {
  if (taux > 75) return '#DC2626'
  if (taux > 50) return '#D97706'
  return '#059669'
}

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

export default function DepartementsPage() {
  const navigate = useNavigate()
  const [depts,         setDepts]         = useState([])
  const [enveloppes,    setEnveloppes]    = useState([])
  const [budgetActuelId,setBudgetActuelId]= useState(null)
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [editTarget,    setEditTarget]    = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [form,          setForm]          = useState({ nom: '', description: '' })
  const [confirmModal,  setConfirmModal]  = useState(null)
  const [allouerTarget, setAllouerTarget] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([getDepartements(), getBudgetAnnuels()])
      .then(([d, a]) => {
        setDepts(d.data.results ?? d.data)
        const annuels     = a.data.results ?? a.data
        const yr          = new Date().getFullYear()
        const budgetActuel = annuels.find(ba => {
          const start = Number(ba.annee)
          const end   = ba.annee_fin ? Number(ba.annee_fin) : start
          return yr >= start && yr <= end
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
      message: `Supprimer définitivement "${nom}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try { await deleteDepartement(id); load() }
        catch (err) { alert(err.response?.data?.detail || 'Impossible de supprimer ce département.') }
      },
    })
  }

  const [search, setSearch] = useState('')

  const annee            = new Date().getFullYear()
  const enveloppeParDept = (id) => enveloppes.find(e => String(e.departement) === String(id))
  const actifsCount      = depts.filter(d => d.actif).length
  const q                = search.toLowerCase().trim()
  const deptsFiltres     = q ? depts.filter(d =>
    d.nom?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
  ) : depts

  if (loading) return <div className="af-loader"><div className="af-spinner" /></div>

  return (
    <div>
      {/* En-tête */}
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">Administration · exercice {annee}</div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Départements</h1>
          <div className="text-[13px] text-[#5A6B7E]">
            {depts.length} département{depts.length !== 1 ? 's' : ''} · {actifsCount} actif{actifsCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button onClick={openCreate} className="btn btn-primary btn-sm" style={{ gap: 7 }}>
            <Plus size={15} strokeWidth={2.5} />
            Nouveau département
          </button>
          <button onClick={() => navigate('/budgets')} className="btn btn-secondary btn-sm">
            Voir les budgets
          </button>
        </div>
      </div>

      {depts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Building2 size={28} strokeWidth={1.5} style={{ color: 'var(--af-mute)' }} />
          </div>
          <p className="empty-title">Aucun département</p>
          <p className="empty-body">Créez votre premier département pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]" style={{ overflowX: 'auto' }}>
          {/* Barre de recherche */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--af-line)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ width: 13, height: 13, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--af-mute)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Rechercher un département…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 32, fontSize: 12, height: 34 }}
              />
            </div>
            {search && (
              <button onClick={() => setSearch('')} className="btn btn-ghost btn-sm" style={{ fontSize: 12, height: 34 }}>
                ✕ Effacer
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--af-mute)' }}>
              {deptsFiltres.length} / {depts.length} département{depts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* En-tête tableau */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px,1.4fr) minmax(130px,.6fr) minmax(130px,.6fr) minmax(200px,1fr) 175px',
            padding: '10px 20px',
            background: 'var(--af-steel)',
            borderBottom: '1px solid var(--af-line)',
            fontSize: 10, fontWeight: 700,
            letterSpacing: '.16em', textTransform: 'uppercase',
            color: 'var(--af-mute)',
            minWidth: 895,
          }}>
            <span>Département</span>
            <span style={{ textAlign: 'right' }}>Alloué</span>
            <span style={{ textAlign: 'right' }}>Disponible</span>
            <span style={{ paddingLeft: 8 }}>Progression</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {deptsFiltres.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
              Aucun département ne correspond à « {search} ».
            </div>
          )}
          {deptsFiltres.map((dept, i) => {
            const env  = enveloppeParDept(dept.id)
            const taux = env && parseFloat(env.montant_alloue) > 0
              ? Math.round(parseFloat(env.montant_consomme) / parseFloat(env.montant_alloue) * 100)
              : null
            const color = taux != null ? jaugeColor(taux) : 'var(--af-mute)'

            return (
              <div
                key={dept.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px,1.4fr) minmax(130px,.6fr) minmax(130px,.6fr) minmax(200px,1fr) 175px',
                  alignItems: 'center',
                  padding: '14px 20px',
                  minWidth: 895,
                  borderBottom: i < deptsFiltres.length - 1 ? '1px solid var(--af-line)' : 'none',
                  background: dept.actif ? 'transparent' : 'rgba(237,231,218,0.3)',
                  gap: 12,
                }}
              >
                {/* Nom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: dept.actif ? 'var(--color-gold-soft)' : 'var(--af-line)',
                    color: dept.actif ? 'var(--color-gold-dark)' : 'var(--af-mute)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 size={16} strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--af-ink)' }}>{dept.nom}</span>
                      {!dept.actif && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '.3px',
                          padding: '1px 6px', borderRadius: 20,
                          background: 'var(--af-line)', color: 'var(--af-mute)',
                        }}>INACTIF</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--af-cream)', fontFamily: 'var(--af-mono)' }}>
                      {dept.code}{dept.description ? ` · ${dept.description}` : ''}
                    </div>
                  </div>
                </div>

                {/* Alloué */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: 'var(--af-ink)' }}>
                    {env ? fmt(env.montant_alloue) : '—'}
                  </div>
                  {env && <div style={{ fontSize: 10, color: 'var(--af-mute)', marginTop: 1 }}>FCFA</div>}
                </div>

                {/* Disponible */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color }}>
                    {env ? fmt(env.montant_disponible) : '—'}
                  </div>
                  {env && <div style={{ fontSize: 10, color: 'var(--af-mute)', marginTop: 1 }}>FCFA</div>}
                </div>

                {/* Progression */}
                <div style={{ paddingLeft: 8 }}>
                  {env && taux != null ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                        <span style={{ color: 'var(--af-cream)' }}>{fmt(env.montant_consomme)} consommés</span>
                        <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, color }}>{taux}%</span>
                      </div>
                      <div className="af-bar">
                        <div
                          className={`af-bar-fill ${taux > 75 ? 'danger' : taux > 50 ? 'warn' : 'ok'}`}
                          style={{ width: `${Math.min(taux, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--af-cream)', fontStyle: 'italic' }}>
                      Aucune enveloppe
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', alignItems: 'center' }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    title="Voir les budgets"
                    onClick={() => navigate(`/budgets?departement=${dept.id}&nom=${encodeURIComponent(dept.nom)}`)}
                    style={btnStyle('#C9910A')}
                  >
                    <Eye size={13} strokeWidth={2} />
                  </button>

                  {budgetActuelId && (
                    <button
                      title={env ? "Modifier l'enveloppe" : 'Allouer un montant'}
                      onClick={() => setAllouerTarget({ dept, existingAlloc: env ?? null })}
                      style={btnStyle('#C9910A')}
                    >
                      <Coins size={13} strokeWidth={2} />
                    </button>
                  )}

                  <button title="Modifier" onClick={() => openEdit(dept)} style={btnStyle('#D97706')}>
                    <Pencil size={13} strokeWidth={2} />
                  </button>

                  <button
                    title={dept.actif ? 'Désactiver' : 'Activer'}
                    onClick={() => handleToggle(dept)}
                    style={btnStyle(dept.actif ? '#D97706' : '#059669')}
                  >
                    {dept.actif
                      ? <UserX size={13} strokeWidth={2} />
                      : <UserCheck size={13} strokeWidth={2} />}
                  </button>

                  <button
                    title="Supprimer"
                    onClick={() => handleDelete(dept.id, dept.nom)}
                    style={btnStyle('#DC2626')}
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal créer / modifier */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, margin: 0 }}>
                {editTarget ? 'Modifier le département' : 'Nouveau département'}
              </h2>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Nom du département</label>
                  <input
                    className="form-input"
                    required
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Ex : Direction Financière"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Description{' '}
                    <span style={{ fontWeight: 400, color: 'var(--af-mute)', textTransform: 'none', letterSpacing: 0 }}>
                      (optionnel)
                    </span>
                  </label>
                  <textarea
                    className="form-input"
                    style={{ height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description du département…"
                    rows={3}
                  />
                </div>
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 9,
                    padding: '10px 14px', borderRadius: 9, marginTop: 14,
                    background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
                  }}>
                    <AlertTriangle size={14} strokeWidth={2} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>{error}</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving
                    ? <><span className="spinner-sm" style={{ marginRight: 6 }} /> Enregistrement…</>
                    : editTarget ? 'Modifier' : 'Créer'}
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

/* ─── Modal allocation ──────────────────────────────────────────────────────── */
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
      <div className="modal-panel" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, margin: 0 }}>
            {existingAlloc ? "Modifier l'enveloppe" : 'Allouer un montant'}
          </h2>
        </div>
        <form onSubmit={handle}>
          <div className="modal-body">
            <div style={{
              marginBottom: 14, padding: '10px 14px', borderRadius: 9,
              background: 'var(--af-steel)', border: '1px solid var(--af-line)', fontSize: 13,
            }}>
              <span style={{ color: 'var(--af-cream)' }}>Département : </span>
              <span style={{ fontWeight: 700, color: 'var(--af-ink)' }}>{dept.nom}</span>
            </div>
            <div>
              <label className="form-label">Montant alloué (FCFA)</label>
              <input
                className="form-input"
                style={{ fontFamily: 'var(--af-mono)' }}
                type="number" required min="0" step="0.01" autoFocus
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex : 5 000 000"
              />
            </div>
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                padding: '10px 14px', borderRadius: 9, marginTop: 14,
                background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
              }}>
                <AlertTriangle size={14} strokeWidth={2} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>{error}</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Annuler</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving
                ? <><span className="spinner-sm" style={{ marginRight: 6 }} /> Enregistrement…</>
                : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
