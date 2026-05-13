import { useState, useEffect, useRef } from 'react'
import { getBudgets, getBudgetArbre, getLignesSelecteur, depenseMultiLigne } from '../../api/budget'
import { notifRefresh } from '../../utils/notifRefresh'
import { formaterNombre, getCouleurExecution } from '../../utils/formatters'
import {
  DollarSign, Paperclip, Check, AlertTriangle,
  ChevronDown, ChevronRight, Search,
} from '../AtlasIcons'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })

export default function DepenseMultiModal({ budgetId: propBudgetId = null, onClose, onSuccess }) {

  /* ── Étapes ─────────────────────────────────────────────────────── */
  const [step,             setStep]             = useState(propBudgetId ? 2 : 1)
  const [selectedBudgetId, setSelectedBudgetId] = useState(propBudgetId)

  /* ── Étape 1 : sélection du budget ──────────────────────────────── */
  const [budgets,        setBudgets]        = useState([])
  const [budgetsLoading, setBudgetsLoading] = useState(false)
  const [budgetSearch,   setBudgetSearch]   = useState('')

  /* ── Étape 2 : lignes ────────────────────────────────────────────── */
  const [categories,  setCategories]  = useState([])   // arbre getBudgetArbre
  const [dispoMap,    setDispoMap]    = useState({})    // id → { montant_disponible, taux_consommation }
  const [loading,     setLoading]     = useState(false)
  const [openCats,    setOpenCats]    = useState(new Set())
  const [selection,   setSelection]   = useState({})   // { ligne_id: montant_string }
  const [note,        setNote]        = useState('')
  const [files,       setFiles]       = useState([])
  const [dragOver,    setDragOver]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const fileRef = useRef(null)

  /* ── Chargement budgets approuvés ────────────────────────────────── */
  useEffect(() => {
    if (step !== 1) return
    setBudgetsLoading(true)
    getBudgets()
      .then(r => {
        const all = r.data?.results ?? r.data ?? []
        setBudgets(all.filter(b => b.statut === 'APPROUVE'))
      })
      .finally(() => setBudgetsLoading(false))
  }, [step])

  /* ── Chargement lignes du budget sélectionné ─────────────────────── */
  useEffect(() => {
    if (!selectedBudgetId) return
    setLoading(true)
    Promise.all([
      getBudgetArbre(selectedBudgetId),
      getLignesSelecteur(selectedBudgetId),
    ])
      .then(([arbreRes, selRes]) => {
        const cats = arbreRes.data?.data ?? []
        setCategories(cats)
        setOpenCats(new Set(cats.map(c => c.id)))
        const map = {}
        for (const l of selRes.data?.data ?? []) {
          map[l.ligne_id] = l
        }
        setDispoMap(map)
      })
      .catch(() => setError('Impossible de charger les lignes budgétaires.'))
      .finally(() => setLoading(false))
  }, [selectedBudgetId])

  /* ── Lignes sélectionnées (liste plate enrichie) ─────────────────── */
  const allLignes = categories.flatMap(c =>
    (c.sous_categories ?? []).flatMap(sc =>
      (sc.lignes ?? []).map(l => ({
        ...l,
        catCode: c.code, catLib: c.libelle,
        scCode: sc.code, scLib: sc.libelle,
      }))
    )
  )
  const lignesSel = allLignes.filter(l => selection[l.id] !== undefined)
  const total = lignesSel.reduce((s, l) => s + (parseFloat(selection[l.id]) || 0), 0)

  /* ── Toggle catégorie ────────────────────────────────────────────── */
  const toggleCat = (id) => setOpenCats(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  /* ── Toggle ligne ────────────────────────────────────────────────── */
  const toggleLigne = (ligneId) => {
    const dispo = dispoMap[ligneId]
    if (dispo && dispo.montant_disponible <= 0) return
    setSelection(prev => {
      const next = { ...prev }
      if (next[ligneId] !== undefined) delete next[ligneId]
      else next[ligneId] = ''
      return next
    })
  }

  /* ── Gestion fichiers ────────────────────────────────────────────── */
  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f =>
      /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i.test(f.name)
    )
    setFiles(prev => [...prev, ...valid])
  }
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx))

  /* ── Soumission ──────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const valides = lignesSel.filter(l => parseFloat(selection[l.id]) > 0)
    if (!valides.length) { setError('Saisissez un montant pour au moins une ligne.'); return }
    for (const l of valides) {
      const m = parseFloat(selection[l.id])
      const dispo = dispoMap[l.id]
      if (dispo && m > dispo.montant_disponible) {
        setError(`Le montant de « ${l.libelle} » dépasse le disponible (${fmt(dispo.montant_disponible)} FCFA).`)
        return
      }
    }
    setError(''); setSaving(true)
    try {
      const payload = valides.map(l => ({ ligne_id: l.id, montant: parseFloat(selection[l.id]) }))
      await depenseMultiLigne(selectedBudgetId, payload, note, files)
      notifRefresh()
      onSuccess()
    } catch (err) {
      const erreurs = err.response?.data?.erreurs
      setError(err.response?.data?.detail || (erreurs ? erreurs.join(' | ') : "Erreur lors de l'enregistrement."))
    } finally { setSaving(false) }
  }

  const selectedBudget   = budgets.find(b => b.id === selectedBudgetId)
  const filteredBudgets  = budgets.filter(b =>
    !budgetSearch ||
    b.nom?.toLowerCase().includes(budgetSearch.toLowerCase()) ||
    b.code?.toLowerCase().includes(budgetSearch.toLowerCase())
  )
  const totalGeneral = categories.reduce((s, c) => s + (c.total || 0), 0)

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} style={{
        maxWidth: step === 1 ? 560 : 960,
        width: '96vw', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        transition: 'max-width .2s',
      }}>

        {/* ── Header ── */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={16} strokeWidth={2} style={{ color: 'var(--color-success-600)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', margin: 0 }}>
              Enregistrer une dépense
            </h2>
            {step === 2 && selectedBudget && (
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--af-mute)' }}>
                — {selectedBudget.nom || selectedBudget.code}
              </span>
            )}
          </div>
          {/* Indicateur d'étapes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px' }}>
            <span style={{ fontWeight: step === 1 ? 700 : 400, color: step === 1 ? 'var(--color-gold)' : 'var(--af-mute)' }}>
              1. Budget
            </span>
            <span style={{ color: 'var(--af-line-2)' }}>→</span>
            <span style={{ fontWeight: step === 2 ? 700 : 400, color: step === 2 ? 'var(--color-gold)' : 'var(--af-mute)' }}>
              2. Lignes & montants
            </span>
          </div>
        </div>

        {/* ══════════════ ÉTAPE 1 : sélection du budget ══════════════ */}
        {step === 1 && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div style={{ marginBottom: 12 }}>
              <div className="search-wrapper">
                <Search size={13} strokeWidth={2} className="search-icon" />
                <input
                  className="search-input"
                  value={budgetSearch}
                  onChange={e => setBudgetSearch(e.target.value)}
                  placeholder="Rechercher un budget approuvé…"
                  autoFocus
                />
              </div>
            </div>

            {budgetsLoading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div className="spinner" />
                <p style={{ fontSize: '12px', color: 'var(--af-mute)' }}>Chargement…</p>
              </div>
            ) : filteredBudgets.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--af-mute)', fontSize: '13px' }}>
                <span style={{ fontSize: '28px' }}>📋</span>
                <span>Aucun budget approuvé disponible.</span>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredBudgets.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBudgetId(b.id); setStep(2) }}
                    style={{
                      textAlign: 'left', padding: '14px 16px', borderRadius: 10,
                      border: '1.5px solid var(--af-line)',
                      background: '#fff', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all .12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-gold)'; e.currentTarget.style.background = 'var(--color-gold-soft)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--af-line)'; e.currentTarget.style.background = '#fff' }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="code-tag">{b.code}</span>
                        <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: 9999, background: 'var(--color-success-100)', color: 'var(--color-success-700)', fontWeight: 700, letterSpacing: '.3px' }}>
                          APPROUVÉ
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--af-ink)' }}>{b.nom}</div>
                      <div style={{ fontSize: '11px', color: 'var(--af-mute)', marginTop: 2 }}>{b.departement_nom}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--af-ink)' }}>
                        {fmt(b.montant_disponible ?? b.montant_global)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--af-mute)' }}>FCFA disponible</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="modal-footer" style={{ flexShrink: 0, marginTop: 12 }}>
              <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Annuler</button>
            </div>
          </div>
        )}

        {/* ══════════════ ÉTAPE 2 : lignes + montants ══════════════ */}
        {step === 2 && (
          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* ── Panneau gauche : arbre LignesBudgetaires ── */}
              <div style={{
                width: '57%', minWidth: 320,
                borderRight: '1px solid var(--af-line)',
                overflowY: 'auto',
                display: 'flex', flexDirection: 'column',
              }}>

                {/* En-tête du panneau */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px', background: 'var(--af-steel)',
                  borderBottom: '1px solid var(--af-line)',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--af-ink)' }}>
                    Lignes budgétaires
                  </span>
                  {!propBudgetId && (
                    <button
                      type="button"
                      onClick={() => { setStep(1); setSelection({}); setCategories([]) }}
                      style={{ fontSize: '11px', color: 'var(--color-gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ← Changer de budget
                    </button>
                  )}
                </div>

                {loading ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
                    <div className="spinner" />
                    <p style={{ fontSize: '12px', color: 'var(--af-mute)' }}>Chargement…</p>
                  </div>
                ) : (
                  <>
                    {categories.map(cat => {
                      const isOpen = openCats.has(cat.id)
                      const catSel = (cat.sous_categories ?? []).flatMap(sc => sc.lignes ?? []).filter(l => selection[l.id] !== undefined).length
                      return (
                        <div key={cat.id}>

                          {/* ── Catégorie ── */}
                          <div
                            onClick={() => toggleCat(cat.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 14px',
                              background: 'var(--af-steel)',
                              borderBottom: '0.5px solid var(--af-line)',
                              cursor: 'pointer', userSelect: 'none',
                            }}
                          >
                            {isOpen
                              ? <ChevronDown  size={13} strokeWidth={2.5} style={{ color: 'var(--af-mute)', flexShrink: 0 }} />
                              : <ChevronRight size={13} strokeWidth={2.5} style={{ color: 'var(--af-mute)', flexShrink: 0 }} />
                            }
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: 'var(--af-ink)' }}>
                              {cat.code}&ensp;{cat.libelle}
                            </span>
                            <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: '12px', color: 'var(--af-cream)', flexShrink: 0 }}>
                              {fmt(cat.total)} FCFA
                            </span>
                            {catSel > 0 && (
                              <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: 9999,
                                background: 'rgba(184,134,74,0.15)', color: 'var(--color-gold-dark)',
                                marginLeft: 4, flexShrink: 0,
                              }}>
                                {catSel} ✓
                              </span>
                            )}
                          </div>

                          {isOpen && (cat.sous_categories ?? []).map(sc => (
                            <div key={sc.id}>

                              {/* ── Sous-catégorie ── */}
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 14px 6px 30px', background: '#fff',
                                borderBottom: '0.5px solid var(--af-line)',
                              }}>
                                <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--af-cream)' }}>
                                  {sc.code}&ensp;{sc.libelle}
                                </span>
                                <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 600, fontSize: '11px', color: 'var(--af-mute)', flexShrink: 0 }}>
                                  {fmt(sc.total)} FCFA
                                </span>
                              </div>

                              {/* En-têtes colonnes */}
                              {(sc.lignes ?? []).length > 0 && (
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: '22px 1fr 110px 44px 68px',
                                  padding: '4px 14px 4px 46px', gap: 6,
                                  background: '#FAFAFA',
                                  borderBottom: '0.5px solid var(--af-line)',
                                  fontSize: '9px', fontWeight: 700,
                                  textTransform: 'uppercase', letterSpacing: '.4px',
                                  color: 'var(--af-mute)',
                                }}>
                                  <span />
                                  <span>Désignation</span>
                                  <span style={{ textAlign: 'right' }}>Montant alloué</span>
                                  <span style={{ textAlign: 'right' }}>Qté</span>
                                  <span>Unité</span>
                                </div>
                              )}

                              {/* ── Lignes ── */}
                              {(sc.lignes ?? []).map(ligne => {
                                const dispo    = dispoMap[ligne.id]
                                const epuisee  = dispo ? dispo.montant_disponible <= 0 : false
                                const isSel    = selection[ligne.id] !== undefined
                                const taux     = dispo?.taux_consommation ?? 0
                                const couleur  = getCouleurExecution(taux)

                                return (
                                  <div
                                    key={ligne.id}
                                    onClick={() => !epuisee && toggleLigne(ligne.id)}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '22px 1fr 110px 44px 68px',
                                      padding: '7px 14px 7px 46px', gap: 6,
                                      borderBottom: '0.5px solid var(--af-steel)',
                                      cursor: epuisee ? 'not-allowed' : 'pointer',
                                      background: isSel ? 'var(--color-gold-soft)' : epuisee ? '#fafafa' : '#fff',
                                      opacity: epuisee ? 0.5 : 1,
                                      borderLeft: isSel ? '3px solid var(--color-gold)' : '3px solid transparent',
                                      alignItems: 'center',
                                      transition: 'background .1s',
                                    }}
                                  >
                                    {/* Checkbox */}
                                    <div style={{
                                      width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                                      border: isSel ? 'none' : '2px solid var(--af-line-2)',
                                      background: isSel ? 'var(--color-gold)' : '#fff',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                      {isSel && <Check size={9} strokeWidth={3} color="#fff" />}
                                    </div>

                                    {/* Désignation */}
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{
                                        fontSize: '12px', fontWeight: isSel ? 600 : 400,
                                        color: epuisee ? 'var(--af-mute)' : 'var(--af-ink)',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      }}>
                                        {ligne.libelle}
                                      </div>
                                      {dispo && (
                                        <div style={{ height: 2, background: 'var(--af-line)', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
                                          <div style={{ width: `${Math.min(taux, 100)}%`, height: '100%', background: couleur, borderRadius: 2 }} />
                                        </div>
                                      )}
                                    </div>

                                    {/* Montant alloué */}
                                    <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: '11px', color: 'var(--af-ink)', textAlign: 'right' }}>
                                      {fmt(ligne.montant_alloue)}
                                    </div>

                                    {/* Qté */}
                                    <div style={{ fontSize: '11px', color: 'var(--af-mute)', textAlign: 'right' }}>
                                      {ligne.quantite != null ? parseFloat(ligne.quantite) : '—'}
                                    </div>

                                    {/* Unité */}
                                    <div style={{ fontSize: '11px', color: 'var(--af-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {ligne.unite || '—'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      )
                    })}

                    {/* Total général */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 16px', background: 'var(--af-steel)',
                      borderTop: '0.5px solid var(--af-line)', flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--af-mute)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                        Total général
                      </span>
                      <span style={{ fontFamily: 'var(--af-mono)', fontWeight: 800, fontSize: '13px', color: 'var(--af-ink)' }}>
                        {fmt(totalGeneral)} FCFA
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* ── Panneau droit : montants + note + fichiers ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '16px' }}>

                {lignesSel.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--af-mute)', textAlign: 'center', gap: 10 }}>
                    <div style={{ fontSize: '32px' }}>☑️</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--af-mute)' }}>Cochez les lignes à dépenser</div>
                    <div style={{ fontSize: '12px' }}>Cliquez sur une ligne dans le panneau gauche.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--af-mute)', letterSpacing: '.5px', marginBottom: 10 }}>
                      MONTANTS PAR LIGNE
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {lignesSel.map(l => {
                        const dispo      = dispoMap[l.id]
                        const montantVal = parseFloat(selection[l.id]) || 0
                        const depasse    = dispo && montantVal > dispo.montant_disponible && montantVal > 0
                        return (
                          <div key={l.id} style={{
                            padding: '10px 12px', borderRadius: 8,
                            border: `1px solid ${depasse ? 'var(--color-danger-200)' : 'var(--af-line)'}`,
                            background: depasse ? 'var(--color-danger-50)' : '#fff',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--af-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {l.libelle}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--af-mute)' }}>
                                  {l.catCode} {l.catLib} › {l.scCode} {l.scLib}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleLigne(l.id)}
                                style={{ fontSize: '10px', color: 'var(--color-danger-500)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 6px' }}
                              >
                                ✕ Retirer
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                type="number" min={0.01} step="0.01" required
                                className="form-input"
                                style={{ fontFamily: 'var(--af-mono)', flex: 1 }}
                                placeholder="Montant (FCFA)"
                                value={selection[l.id]}
                                onChange={e => setSelection(prev => ({ ...prev, [l.id]: e.target.value }))}
                                onClick={e => e.stopPropagation()}
                              />
                              {dispo && (
                                <span style={{ fontSize: '11px', color: 'var(--af-mute)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  / {fmt(dispo.montant_disponible)} FCFA
                                </span>
                              )}
                            </div>
                            {depasse && (
                              <p style={{ fontSize: '11px', color: 'var(--color-danger-600)', marginTop: 4, fontWeight: 600 }}>
                                ⚠ Dépasse le disponible de {fmt(montantVal - dispo.montant_disponible)} FCFA
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Total */}
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                      background: 'var(--color-gold-soft)', border: '1px solid rgba(184,134,74,0.30)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-gold-dark)' }}>Total dépense</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--af-mono)', color: 'var(--color-gold-dark)' }}>
                        {fmt(total)} FCFA
                      </span>
                    </div>

                    {/* Note */}
                    <div style={{ marginBottom: 14 }}>
                      <label className="form-label">Note / Référence de facture</label>
                      <input
                        className="form-input"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Ex : Facture N°2025-042 — Fournisseur ABC"
                      />
                    </div>

                    {/* Pièces justificatives */}
                    <div>
                      <label className="form-label">
                        Pièce(s) justificative(s)
                        <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--af-mute)', marginLeft: 6 }}>
                          (requises avant validation)
                        </span>
                      </label>
                      <input
                        ref={fileRef} type="file" multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        style={{ display: 'none' }}
                        onChange={e => { addFiles(e.target.files); e.target.value = '' }}
                      />
                      <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
                        onClick={() => fileRef.current?.click()}
                        style={{
                          border: `1.5px dashed ${dragOver ? 'var(--color-gold)' : 'var(--af-line-2)'}`,
                          borderRadius: 8, padding: '14px 12px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          background: dragOver ? 'var(--color-gold-soft)' : 'var(--af-steel)',
                          cursor: 'pointer', transition: 'all .15s', textAlign: 'center',
                        }}
                      >
                        <Paperclip size={16} strokeWidth={2} style={{ color: dragOver ? 'var(--color-gold)' : 'var(--af-mute)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--af-mute)' }}>
                          Déposer les fichiers ici ou <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>parcourir</span>
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--af-mute)' }}>
                          PDF, image, Word, Excel — max 5 Mo/fichier
                        </span>
                      </div>
                      {files.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {files.map((f, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '5px 10px', borderRadius: 6,
                              background: '#fff', border: '1px solid var(--af-line)',
                            }}>
                              <Paperclip size={11} strokeWidth={2} style={{ color: 'var(--af-mute)', flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: '11.5px', color: 'var(--af-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.name}
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'var(--af-mute)', flexShrink: 0 }}>
                                {f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)} Ko` : `${(f.size / 1024 / 1024).toFixed(1)} Mo`}
                              </span>
                              <button
                                type="button" onClick={e => { e.stopPropagation(); removeFile(i) }}
                                style={{ fontSize: '11px', color: 'var(--color-danger-500)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {error && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 8, marginTop: 12, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)' }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-danger-500)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: 'var(--color-danger-700)', fontSize: '12px' }}>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Annuler</button>
              <button
                type="submit"
                disabled={saving || lignesSel.length === 0 || !lignesSel.some(l => parseFloat(selection[l.id]) > 0)}
                className="btn btn-success btn-md" style={{ gap: 6 }}
              >
                {saving
                  ? <><span className="spinner-sm" /> Enregistrement…</>
                  : <><Check size={14} strokeWidth={2.5} /> Confirmer la dépense</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
