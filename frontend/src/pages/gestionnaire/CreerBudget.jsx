import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBudget, getBudgetAnnuels, getAllocations } from '../../api/budget'
import { getDepartements } from '../../api/accounts'
import { ArrowLeft, ArrowRight, Info, AlertTriangle, Building2, Calendar } from 'lucide-react'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n ?? 0)

export default function CreerBudget() {
  const navigate = useNavigate()

  const [budgetAnnuels, setBudgetAnnuels] = useState([])
  const [allocations,   setAllocations]   = useState([])
  const [depts,         setDepts]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [loadingAllocs, setLoadingAllocs] = useState(false)

  const [form, setForm] = useState({
    budget_annuel: '',
    allocation:    '',
    departement:   '',
    nom:           '',
    date_debut:    '',
    date_fin:      '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    Promise.all([getBudgetAnnuels(), getDepartements()])
      .then(([r, d]) => {
        const bas  = r.data.results ?? r.data
        const deps = d.data.results ?? d.data
        setBudgetAnnuels(bas)
        setDepts(deps)
        const ba = bas[0]
        if (ba) {
          setForm(f => ({
            ...f,
            budget_annuel: String(ba.id),
            date_debut:    `${ba.annee}-01-01`,
            date_fin:      ba.date_fin_exercice,
          }))
          setLoadingAllocs(true)
          getAllocations(ba.id)
            .then(res => {
              const list = res.data.results ?? res.data
              setAllocations(list.filter(a => parseFloat(a.montant_disponible) > 0))
            })
            .catch(() => setAllocations([]))
            .finally(() => setLoadingAllocs(false))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAllocationChange = (id) => {
    const alloc = allocations.find(a => String(a.id) === id)
    setForm(f => ({
      ...f,
      allocation:   id,
      departement:  alloc ? String(alloc.departement) : '',
    }))
  }

  const exerciceChoisi = budgetAnnuels.find(b => String(b.id) === String(form.budget_annuel))
  const allocChoisie   = allocations.find(a => String(a.id) === String(form.allocation))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      const payload = {
        nom:                  form.nom,
        budget_annuel:        form.budget_annuel,
        date_debut:           form.date_debut,
        date_fin:             form.date_fin,
        technique_estimation: 'ASCENDANTE',
      }
      if (form.allocation)  payload.allocation  = form.allocation
      if (form.departement) payload.departement = form.departement
      const { data: budget } = await createBudget(payload)
      navigate(`/mes-budgets/${budget.id}`)
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.detail || d?.non_field_errors?.[0] || JSON.stringify(d))
    } finally { setSaving(false) }
  }

  const canSubmit = form.nom.trim() && form.budget_annuel && form.date_debut && form.date_fin

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: '1.5px solid var(--color-gray-200)',
            borderRadius: 9, padding: '8px 10px', cursor: 'pointer',
            color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center',
            flexShrink: 0, marginTop: 2,
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <div>
          <h1 className="page-title">Créer un budget</h1>
          <p className="page-subtitle">
            Remplissez l'en-tête puis enregistrez — vous ajouterez les lignes ensuite.
          </p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-gray-400)' }}>Chargement…</p>
          </div>
        ) : budgetAnnuels.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '14px 16px', borderRadius: 10,
            background: '#fff7ed', border: '1px solid #fed7aa',
          }}>
            <AlertTriangle size={16} strokeWidth={2} style={{ color: '#c2410c', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '13px', color: '#c2410c', margin: 0 }}>
              Aucun budget annuel voté. Demandez à l'administrateur de voter le budget avant de créer un budget.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* Exercice actif */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 10,
              background: 'var(--color-gold-soft)', border: '1px solid rgba(184,134,74,0.15)',
              marginBottom: 22,
            }}>
              <Calendar size={16} strokeWidth={2} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '12px', color: 'var(--color-gold)', fontWeight: 600 }}>Exercice budgétaire</span>
                <span style={{
                  marginLeft: 10, fontWeight: 700,
                  color: 'var(--color-gold-dark)', fontSize: '14px',
                }}>
                  {exerciceChoisi?.periode_display ?? exerciceChoisi?.annee}
                </span>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                color: 'var(--color-gold-dark)', fontSize: '13px',
              }}>
                {fmt(exerciceChoisi?.montant_disponible_global ?? 0)} FCFA disponibles
              </span>
            </div>

            {/* Allocation départementale */}
            <div style={{ marginBottom: 18 }}>
              <label className="form-label">
                Allocation départementale
                <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--color-gray-400)', marginLeft: 6 }}>(optionnel)</span>
              </label>
              {loadingAllocs ? (
                <p style={{ fontSize: '13px', color: 'var(--color-gray-400)' }}>Chargement des allocations…</p>
              ) : allocations.length === 0 ? (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px', borderRadius: 9,
                  background: 'var(--color-gold-soft)', border: '1px solid rgba(184,134,74,0.15)',
                }}>
                  <Info size={14} strokeWidth={2} style={{ color: 'var(--color-gold)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '12px', color: 'var(--color-gold)', margin: 0 }}>
                    Aucune allocation départementale — le budget sera imputé sur l'enveloppe globale.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    className="form-select"
                    value={form.allocation}
                    onChange={e => handleAllocationChange(e.target.value)}
                  >
                    <option value="">— Budget global (pas d'allocation spécifique) —</option>
                    {allocations.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.departement_nom} — {fmt(a.montant_disponible)} FCFA disponibles
                      </option>
                    ))}
                  </select>
                  {allocChoisie && (
                    <div style={{
                      marginTop: 8, padding: '10px 14px', borderRadius: 9,
                      background: 'var(--color-gold-soft)', border: '1px solid rgba(184,134,74,0.15)',
                      fontSize: '13px', display: 'flex', gap: 8, alignItems: 'center',
                    }}>
                      <span style={{ color: 'var(--color-gold)' }}>Disponible :</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-gold-dark)' }}>
                        {fmt(allocChoisie.montant_disponible)} FCFA
                      </span>
                      <span style={{ color: 'var(--color-gray-400)' }}>
                        / {fmt(allocChoisie.montant_alloue)} FCFA délégués
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Département */}
            <div style={{ marginBottom: 18 }}>
              <label className="form-label">
                Département
                <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--color-gray-400)', marginLeft: 6 }}>(optionnel)</span>
              </label>
              {allocChoisie ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 42, padding: '0 14px', borderRadius: 9,
                  border: '1.5px solid var(--color-gray-200)',
                  background: 'var(--color-gray-50)', color: 'var(--color-gray-500)',
                  fontSize: '14px', cursor: 'not-allowed',
                }}>
                  <Building2 size={14} strokeWidth={2} style={{ color: 'var(--color-gray-400)' }} />
                  {allocChoisie.departement_nom}
                </div>
              ) : (
                <select
                  className="form-select"
                  value={form.departement}
                  onChange={e => setForm(f => ({ ...f, departement: e.target.value }))}
                >
                  <option value="">— Aucun département (budget transversal) —</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              )}
            </div>

            {/* Nom du budget */}
            <div style={{ marginBottom: 18 }}>
              <label className="form-label">
                Nom du budget <span style={{ color: 'var(--color-danger-500)' }}>*</span>
              </label>
              <input
                className="form-input"
                required
                value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                placeholder="Ex : Budget Marketing 2026"
              />
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
              <div>
                <label className="form-label">Date de début</label>
                <input
                  className="form-input"
                  type="text"
                  required
                  value={form.date_debut}
                  placeholder="AAAA-MM-JJ"
                  pattern="\d{4}-\d{2}-\d{2}"
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.5px' }}
                  onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                  onBlur={e => {
                    const v = e.target.value.trim()
                    const slash = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
                    if (slash) setForm(f => ({ ...f, date_debut: `${slash[3]}-${slash[2]}-${slash[1]}` }))
                  }}
                />
                <p className="form-hint">Format : AAAA-MM-JJ</p>
              </div>
              <div>
                <label className="form-label">
                  Date de fin
                  <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--color-gray-400)', marginLeft: 6, fontSize: '10px' }}>
                    (fixée par l'exercice)
                  </span>
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  height: 42, padding: '0 14px', borderRadius: 9,
                  border: '1.5px solid var(--color-gray-200)',
                  background: 'var(--color-gray-50)', color: 'var(--color-gray-500)',
                  fontFamily: 'var(--font-mono)', letterSpacing: '.5px',
                  fontSize: '14px', cursor: 'not-allowed',
                }}>
                  {form.date_fin || <span style={{ color: 'var(--color-gray-300)' }}>—</span>}
                </div>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', borderRadius: 9,
                background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)',
                marginBottom: 16,
              }}>
                <AlertTriangle size={14} strokeWidth={2} style={{ color: 'var(--color-danger-500)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: '13px', color: 'var(--color-danger-700)', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--color-gray-100)' }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary btn-md"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="btn btn-primary btn-md"
                style={{ gap: 8, opacity: (!canSubmit || saving) ? 0.6 : 1 }}
              >
                {saving ? (
                  <><span className="spinner-sm" /> Enregistrement…</>
                ) : (
                  <>Enregistrer et continuer <ArrowRight size={15} strokeWidth={2.5} /></>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Aide */}
      <div style={{
        marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 18px', borderRadius: 10,
        background: 'var(--color-gold-soft)', border: '1px solid rgba(184,134,74,0.15)',
      }}>
        <Info size={15} strokeWidth={2} style={{ color: 'var(--color-gold)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: '13px', color: 'var(--color-gold-dark)', margin: 0 }}>
          <strong>Étapes suivantes :</strong> après l'enregistrement, vous serez redirigé vers la page du budget où vous pourrez ajouter les lignes budgétaires, puis soumettre avec une pièce justificative.
        </p>
      </div>
    </div>
  )
}
