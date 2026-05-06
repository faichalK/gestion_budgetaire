import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepenses, validerDepense, rejeterDepense } from '../../api/depenses'
import {
  Search, CheckCircle2, XCircle, Receipt, Eye,
  Paperclip, ChevronRight, X,
} from 'lucide-react'
import { notifRefresh } from '../../utils/notifRefresh'
import { formaterNombre, formaterPourcentage } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '-'

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

/* ---------------------------------------------------
   Page principale
--------------------------------------------------- */
export default function DepensesPage() {
  const navigate = useNavigate()
  const [tab,    setTab]    = useState('SAISIE')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data: allData, isLoading } = useQuery({
    queryKey: ['depenses-all'],
    queryFn: () => getDepenses({}).then(r => r.data),
  })

  const allDepenses = Array.isArray(allData?.data) ? allData.data
    : (allData?.data?.results || allData?.results || [])

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
      d.reference?.toLowerCase().includes(q) ||
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

  const refreshGroup = () => {
    qc.invalidateQueries(['depenses-all'])
    notifRefresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Suivi des dépenses</h1>
          <p className="page-subtitle">Examinez et validez les dépenses soumises par les gestionnaires</p>
        </div>
        <div />
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
        <div className="search-wrapper" style={{ maxWidth: 380 }}>
          <Search size={14} strokeWidth={2} className="search-icon" />
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher budget, fournisseur, ligne…" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
            <X size={12} strokeWidth={2} /> Effacer
          </button>
        )}
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-gray-400)' }}>Chargement</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Receipt size={28} strokeWidth={1.5} style={{ color: 'var(--color-gray-400)' }} /></div>
          <p className="empty-title">Aucune dépense</p>
          <p className="empty-body">{tab ? 'Aucune dépense avec ce statut.' : 'Aucune dépense enregistrée.'}</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden" style={{ overflowX: 'auto' }}>
          {/* Entêtes */}
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
                onClick={() => navigate('/depenses/budget/' + g.budget_id)}
              >
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

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-900)' }}>{fmt(total)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-gray-400)', marginTop: 1 }}>FCFA</div>
                </div>

                <div style={{ padding: '0 12px' }}>
                  <div className="progress-track">
                    <div className={`progress-fill ${tauxValid >= 100 ? 'progress-fill-green' : tauxValid > 0 ? 'progress-fill-orange' : ''}`} style={{ width: `${Math.min(tauxValid, 100)}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-gray-500)', textAlign: 'center', marginTop: 3, fontWeight: 600 }}>
                    {formaterPourcentage(tauxValid, { decimales: 0 })} validé
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate('/depenses/budget/' + g.budget_id)} className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
                    <Eye size={12} strokeWidth={2} /> Examiner
                  </button>
                  <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--color-gray-300)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

/* ---------------------------------------------------
   Modal détail d'un groupe — version Comptable (avec actions)
--------------------------------------------------- */
function DepenseGroupDetail({ group, onClose, onRefresh }) {
  const navigate = useNavigate()
  const [items,      setItems]      = useState(group.items)
  const [rejetModal, setRejetModal] = useState(null)
  const [busy,       setBusy]       = useState(null)

  const total          = items.reduce((s, d) => s + parseFloat(d.montant || 0), 0)
  const validated      = items.filter(d => d.statut === 'VALIDEE')
  const pending        = items.filter(d => d.statut === 'SAISIE')
  const rejected       = items.filter(d => d.statut === 'REJETEE')
  const totalValidated = validated.reduce((s, d) => s + parseFloat(d.montant || 0), 0)

  const updateItem = (id, patch) =>
    setItems(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))

  const handleValider = async (d) => {
    setBusy(d.id)
    try {
      await validerDepense(d.id, {})
      updateItem(d.id, { statut: 'VALIDEE' })
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de la validation')
    } finally {
      setBusy(null)
    }
  }

  const handleRejeter = async (id, motif) => {
    setBusy(id)
    try {
      await rejeterDepense(id, { motif })
      updateItem(id, { statut: 'REJETEE', motif_rejet: motif })
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors du rejet')
    } finally {
      setBusy(null)
      setRejetModal(null)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, padding: 0, overflow: 'hidden' }}>

          {/* ── Header navy — même couleur que BudgetDetail ── */}
          <div style={{ background: 'var(--af-ink)', padding: '20px 24px 16px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
            <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
              <X size={15} strokeWidth={2} />
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingRight: 36 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ background: 'rgba(255,255,255,.18)', borderRadius: 7, padding: '3px 10px', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.5px' }}>
                    {group.reference}
                  </div>
                  <span style={{ fontSize: '11px', opacity: .75 }}>{items.length} poste{items.length > 1 ? 's' : ''} de dépense</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 6, lineHeight: 1.3 }}>{group.nom}</div>
                <div style={{ display: 'flex', gap: 14, fontSize: '12px', opacity: .85 }}>
                  <span>✓ {validated.length} validée{validated.length !== 1 ? 's' : ''}</span>
                  <span>⏳ {pending.length} en attente</span>
                  {rejected.length > 0 && <span>• {rejected.length} rejeté{rejected.length > 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', opacity: .6, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Total</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.5rem', lineHeight: 1 }}>{fmt(total)}</div>
                <div style={{ fontSize: '11px', opacity: .65, marginTop: 2 }}>FCFA</div>
              </div>
            </div>
          </div>

          {/* Mini KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--color-gray-100)' }}>
            {[
              { label: 'Validé',     val: fmt(totalValidated) + ' FCFA',                                     color: 'var(--color-success-700)', bg: 'var(--color-success-50)' },
              { label: 'En attente', val: pending.length + ' dépense' + (pending.length !== 1 ? 's' : ''),   color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
              { label: 'Rejeté',     val: rejected.length + ' dépense' + (rejected.length !== 1 ? 's' : ''), color: 'var(--color-danger-700)',  bg: 'var(--color-danger-50)'  },
            ].map((k, idx, arr) => (
              <div key={k.label} style={{ padding: '12px 20px', background: k.bg, borderRight: idx < arr.length - 1 ? '1px solid var(--color-gray-100)' : 'none', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px', color: k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* ── Hint clic ── */}
          <div style={{ padding: '6px 24px', background: 'var(--color-gold-soft)', borderBottom: '1px solid var(--color-gold-line)' }}>
            <span style={{ fontSize: '11px', color: 'var(--af-ink)' }}>
              💡 Cliquez sur une dépense pour voir son détail complet avec les pièces justificatives.
            </span>
          </div>

          {/* Liste des lignes */}
          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {items.map((d, i) => {
              const s = STATUT[d.statut] || { bg: 'var(--color-gray-100)', color: 'var(--color-gray-600)', label: d.statut }
              const isBusy = busy === d.id
              return (
                <div key={d.id}
                  onClick={() => { onClose(); navigate(`/depenses/${d.id}`) }}
                  style={{
                    padding: '12px 24px',
                    borderBottom: i < items.length - 1 ? '1px solid var(--color-gray-100)' : 'none',
                    display: 'grid', gridTemplateColumns: '1fr 110px 140px',
                    alignItems: 'center', gap: 16,
                    cursor: 'pointer', transition: 'background .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gold-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = d.statut === 'SAISIE' ? 'rgba(245,158,11,.03)' : 'transparent'}
                >
                  {/* Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>
                        {d.reference}
                      </span>
                      <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '10px', fontWeight: 700, background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                      {d.piece_justificative_url && (
                        <Paperclip size={10} strokeWidth={2} style={{ color: 'var(--color-gold)' }} />
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-gray-800)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.ligne_designation || '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
                      {fmtDate(d.date_depense)}
                      {d.enregistre_par && ` · ${d.enregistre_par}`}
                      {d.fournisseur && d.fournisseur !== '—' && ` · ${d.fournisseur}`}
                    </div>
                    {d.statut === 'REJETEE' && d.motif_rejet && (
                      <div style={{ marginTop: 3, fontSize: '11px', color: 'var(--color-danger-600)', fontStyle: 'italic' }}>
                        Motif : {d.motif_rejet}
                      </div>
                    )}
                  </div>

                  {/* Montant */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-900)' }}>{fmt(d.montant)}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>FCFA</div>
                  </div>

                  {/* Actions — stopPropagation pour ne pas déclencher la navigation */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    {d.statut === 'SAISIE' && (
                      <>
                        <button
                          onClick={() => setRejetModal(d.id)}
                          disabled={isBusy}
                          className="btn btn-sm"
                          style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', border: '1px solid var(--color-danger-200)', gap: 4, padding: '5px 10px' }}
                        >
                          <XCircle size={12} strokeWidth={2} /> Rejeter
                        </button>
                        <button
                          onClick={() => handleValider(d)}
                          disabled={isBusy}
                          className="btn btn-sm"
                          style={{ background: 'var(--color-success-600)', color: '#fff', border: 'none', gap: 4, padding: '5px 10px' }}
                        >
                          {isBusy ? <span className="spinner-sm" /> : <CheckCircle2 size={12} strokeWidth={2} />}
                          Valider
                        </button>
                      </>
                    )}
                    {d.statut === 'VALIDEE' && (
                      <span style={{ fontSize: '11px', color: 'var(--color-success-600)', fontWeight: 700 }}>
                        {d.validateur_nom ? `✓ ${d.validateur_nom}` : '✓ Validée'}
                      </span>
                    )}
                    {d.statut === 'REJETEE' && (
                      <span style={{ fontSize: '11px', color: 'var(--color-danger-600)', fontWeight: 700 }}>
                        {d.validateur_nom ? `✕ ${d.validateur_nom}` : '✕ Rejetée'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--color-gray-100)', background: 'var(--color-gray-50)' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
              {pending.length > 0 ? `${pending.length} poste${pending.length > 1 ? 's' : ''} en attente de validation` : 'Tous les postes ont été traités'}
            </span>
            <button onClick={onClose} className="btn btn-primary btn-md">Fermer</button>
          </div>
        </div>
      </div>

      {/* Modal rejet */}
      {rejetModal && (
        <RejetModal
          onConfirm={(motif) => handleRejeter(rejetModal, motif)}
          onClose={() => setRejetModal(null)}
        />
      )}
    </>
  )
}

/* ---------------------------------------------------
   Modal de rejet avec motif
--------------------------------------------------- */
function RejetModal({ onConfirm, onClose }) {
  const [motif, setMotif] = useState('')
  const valid = motif.length >= 10

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-panel" style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(135deg, #7F1D1D, #DC2626)', padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XCircle size={18} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>Rejeter la dépense</div>
            <div style={{ fontSize: '12px', opacity: .75 }}>Indiquez la raison du rejet</div>
          </div>
        </div>
        <div style={{ padding: '22px 24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-gray-600)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Motif du rejet
          </label>
          <textarea
            value={motif}
            onChange={e => setMotif(e.target.value)}
            placeholder="Ex : Pièce justificative illisible, montant non justifié…"
            rows={4}
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              border: `1.5px solid ${motif && !valid ? 'var(--color-danger-400)' : 'var(--color-gray-200)'}`,
              borderRadius: 9, padding: '10px 14px', fontSize: '13px', resize: 'vertical',
              outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '11px' }}>
            <span style={{ color: valid ? 'var(--color-success-600)' : 'var(--color-gray-400)' }}>
              {valid ? '✓ Longueur suffisante' : 'Minimum 10 caractères'}
            </span>
            <span style={{ color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)' }}>{motif.length} / 10+</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--color-gray-100)', background: 'var(--color-gray-50)' }}>
          <button onClick={onClose} className="btn btn-secondary btn-md">Annuler</button>
          <button
            onClick={() => valid && onConfirm(motif)}
            disabled={!valid}
            className="btn btn-danger btn-md"
            style={{ gap: 7, opacity: valid ? 1 : 0.5 }}
          >
            <XCircle size={14} strokeWidth={2} /> Confirmer le rejet
          </button>
        </div>
      </div>
    </div>
  )
}