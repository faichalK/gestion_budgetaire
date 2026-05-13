/**
 * LignesBudgetaires — Composant hiérarchique 3 niveaux
 * Catégorie (A, B…) → Sous-catégorie (A.1, A.2…) → Ligne (libellé + montant)
 *
 * Design épuré, sobre, formulaires inline (jamais de modale).
 * readOnly=true masque tous les boutons d'édition.
 */
import { useState, useEffect, useRef } from 'react'
import { ChevronRight, ChevronDown, Plus, Trash2, Check, X } from '../AtlasIcons'
import { ConfirmModal } from '../ui'
import {
  getBudgetArbre,
  createCategorie,
  deleteCategorie,
  createSousCategorie,
  deleteSousCategorie,
  createLigneHierarchie,
  deleteLigneHierarchie,
} from '../../api/budget'
import { formaterMontant } from '../../utils/formatters'

const fmt = (n) => formaterMontant(n, { avecDevise: false })

export default function LignesBudgetaires({ budgetId, readOnly = false, onTotalChange }) {
  const [categories,    setCategories]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [openCats,      setOpenCats]      = useState(new Set())
  const [showNewCat,    setShowNewCat]    = useState(false)
  const [newCatLabel,   setNewCatLabel]   = useState('')
  const [showSubForm,   setShowSubForm]   = useState(null)   // catId
  const [subLabel,      setSubLabel]      = useState('')
  const [showLigneForm, setShowLigneForm] = useState(null)   // sousCatId
  const [newLigne,      setNewLigne]      = useState({ libelle: '', montant: '', qte: '1', unite: '' })
  const [saving,        setSaving]        = useState(false)
  const [confirmModal,  setConfirmModal]  = useState(null)

  const newCatRef = useRef(null)
  const subRef    = useRef(null)
  const ligneRef  = useRef(null)
  const chargerRef = useRef(() => {})

  /* ── Chargement ─────────────────────────────────────────────────────────── */
  const charger = async () => {
    try {
      const r    = await getBudgetArbre(budgetId)
      const data = r.data.data || []
      setCategories(data)
      setOpenCats(new Set(data.map(c => c.id)))
    } catch (e) {
      console.error('LignesBudgetaires:', e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    chargerRef.current = charger
  })

  useEffect(() => {
    const timeoutId = window.setTimeout(() => chargerRef.current?.(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [budgetId])

  useEffect(() => { if (showNewCat)    setTimeout(() => newCatRef.current?.focus(), 50) }, [showNewCat])
  useEffect(() => { if (showSubForm)   setTimeout(() => subRef.current?.focus(), 50)    }, [showSubForm])
  useEffect(() => { if (showLigneForm) setTimeout(() => ligneRef.current?.focus(), 50)  }, [showLigneForm])

  const totalGeneral = categories.reduce((s, c) => s + (c.total || 0), 0)
  useEffect(() => { onTotalChange?.(totalGeneral) }, [onTotalChange, totalGeneral])

  /* ── Toggle catégorie ───────────────────────────────────────────────────── */
  const toggleCat = (id) =>
    setOpenCats(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  /* ── Fermer tous les formulaires ────────────────────────────────────────── */
  const fermerFormulaies = () => {
    setShowNewCat(false); setNewCatLabel('')
    setShowSubForm(null); setSubLabel('')
    setShowLigneForm(null); setNewLigne({ libelle: '', montant: '', qte: '1', unite: '' })
  }

  /* ── Actions CRUD ───────────────────────────────────────────────────────── */
  const ajouterCategorie = async () => {
    if (!newCatLabel.trim() || saving) return
    setSaving(true)
    try {
      await createCategorie(budgetId, { libelle: newCatLabel.trim() })
      fermerFormulaies()
      await charger()
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur lors de la création.')
    } finally { setSaving(false) }
  }

  const supprimerCategorie = (catId, libelle) => {
    setConfirmModal({
      title: 'Supprimer la catégorie',
      message: `Supprimer la catégorie "${libelle}" et toutes ses sous-catégories / lignes ?`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => { await deleteCategorie(catId); await charger() },
    })
  }

  const ajouterSousCategorie = async (catId) => {
    if (!subLabel.trim() || saving) return
    setSaving(true)
    try {
      await createSousCategorie(catId, { libelle: subLabel.trim() })
      setShowSubForm(null); setSubLabel('')
      await charger()
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur.')
    } finally { setSaving(false) }
  }

  const supprimerSousCategorie = (scId, libelle) => {
    setConfirmModal({
      title: 'Supprimer la sous-catégorie',
      message: `Supprimer la sous-catégorie "${libelle}" et toutes ses lignes budgétaires ?`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => { await deleteSousCategorie(scId); await charger() },
    })
  }

  const ajouterLigne = async (scId) => {
    if (!newLigne.libelle.trim() || !newLigne.montant || saving) return
    setSaving(true)
    try {
      await createLigneHierarchie(scId, {
        libelle:      newLigne.libelle.trim(),
        montantPrevu: parseFloat(newLigne.montant) || 0,
        quantite:     parseInt(newLigne.qte) || 1,
        unite:        newLigne.unite || '',
      })
      setNewLigne({ libelle: '', montant: '', qte: '1', unite: '' })
      setShowLigneForm(null)
      await charger()
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur.')
    } finally { setSaving(false) }
  }

  const supprimerLigne = async (ligneId) => {
    await deleteLigneHierarchie(ligneId)
    await charger()
  }

  /* ── Gestion clavier ────────────────────────────────────────────────────── */
  const keyDown = (e, onEnter, onEsc) => {
    if (e.key === 'Enter')  { e.preventDefault(); onEnter() }
    if (e.key === 'Escape') { e.preventDefault(); onEsc?.() }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="p-[40px] text-center">
      <div className="spinner mx-auto mb-[10px]" />
      <p className="text-[13px] text-gray-400">Chargement…</p>
    </div>
  )

  return (
    <div className="border-[0.5px] border-gray-200 rounded-[10px] overflow-hidden bg-white">

      {/* ── En-tête ── */}
      <div className="flex justify-between items-center px-[16px] py-[11px] border-b border-b-gray-200 bg-gray-50">
        <span className="font-bold text-[13px] text-gray-800">
          Lignes budgétaires
        </span>
        {!readOnly && (
          <button
            onClick={() => { fermerFormulaies(); setShowNewCat(true) }}
            className="btn btn-primary btn-sm gap-[5px]"
          >
            <Plus size={13} strokeWidth={2.5} /> Nouvelle catégorie
          </button>
        )}
      </div>

      {/* ── Corps ── */}
      <div>
        {categories.length === 0 && !showNewCat && (
          <div className="px-[20px] py-[32px] text-center text-gray-400 text-[13px]">
            {readOnly
              ? 'Aucune ligne budgétaire.'
              : 'Commencez par créer une catégorie principale (ex : Formation, Équipements…)'}
          </div>
        )}

        {categories.map(cat => (
          <div key={cat.id}>

            {/* ── Catégorie ── */}
            <div
              className="flex items-center gap-[8px] px-[14px] py-[8px] bg-gray-50 cursor-pointer"
              style={{ borderBottom: '0.5px solid var(--af-line)' }}
            >
              <span onClick={() => toggleCat(cat.id)} className="flex items-center gap-[6px] flex-1 min-w-0">
                {openCats.has(cat.id)
                  ? <ChevronDown  size={14} strokeWidth={2.5} className="text-gray-400 shrink-0" />
                  : <ChevronRight size={14} strokeWidth={2.5} className="text-gray-400 shrink-0" />
                }
                <span className="font-bold text-[13px] text-gray-800">
                  {cat.code}&ensp;{cat.libelle}
                </span>
              </span>
              <span className="font-mono font-bold text-[13px] text-gray-700 shrink-0">
                {fmt(cat.total)} FCFA
              </span>
              {!readOnly && (
                <>
                  <button
                    onClick={() => { fermerFormulaies(); setShowSubForm(cat.id) }}
                    className="bg-none border-none cursor-pointer px-[6px] py-[2px] rounded-[4px] text-[11px] font-semibold text-primary-600"
                  >
                    + Sous-cat.
                  </button>
                  <button
                    onClick={() => supprimerCategorie(cat.id, cat.libelle)}
                    className="bg-none border-none cursor-pointer px-[4px] py-[2px] rounded-[4px] leading-none text-danger-400"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>

            {/* ── Form : nouvelle sous-catégorie ── */}
            {!readOnly && showSubForm === cat.id && (
              <div
                className="flex gap-[6px] px-[14px] pl-[34px] py-[7px] bg-[#fafafa]"
                style={{ borderBottom: '0.5px solid var(--af-line)' }}
              >
                <input
                  ref={subRef}
                  value={subLabel}
                  onChange={e => setSubLabel(e.target.value)}
                  onKeyDown={e => keyDown(e,
                    () => ajouterSousCategorie(cat.id),
                    () => { setShowSubForm(null); setSubLabel('') }
                  )}
                  placeholder="Libellé de la sous-catégorie…"
                  className="flex-1 text-[12px] px-[8px] py-[4px] h-[28px] rounded-[6px] border border-gray-200 outline-none"
                />
                <button onClick={() => ajouterSousCategorie(cat.id)} disabled={saving} className="btn btn-primary btn-sm">
                  <Check size={12} strokeWidth={2.5} />
                </button>
                <button onClick={() => { setShowSubForm(null); setSubLabel('') }} className="btn btn-secondary btn-sm">
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* ── Sous-catégories ── */}
            {openCats.has(cat.id) && (cat.sous_categories || []).map(sc => (
              <div key={sc.id}>

                {/* Ligne sous-catégorie */}
                <div
                  className="flex items-center gap-[8px] px-[14px] pl-[30px] py-[6px] bg-white"
                  style={{ borderBottom: '0.5px solid var(--af-line)' }}
                >
                  <span className="flex-1 text-[12px] font-semibold text-gray-600">
                    {sc.code}&ensp;{sc.libelle}
                  </span>
                  <span className="font-mono font-bold text-[12px] text-gray-500 shrink-0">
                    {fmt(sc.total)} FCFA
                  </span>
                  {!readOnly && (
                    <>
                      <button
                        onClick={() => { fermerFormulaies(); setShowLigneForm(sc.id) }}
                        className="bg-none border-none cursor-pointer px-[6px] py-[2px] rounded-[4px] text-[11px] font-semibold text-primary-600"
                      >
                        + Ligne
                      </button>
                      <button
                        onClick={() => supprimerSousCategorie(sc.id, sc.libelle)}
                        className="bg-none border-none cursor-pointer px-[4px] py-[2px] rounded-[4px] leading-none text-danger-400"
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </div>

                {/* Lignes budgétaires */}
                {(sc.lignes || []).length > 0 && (
                  <div
                    className="px-[14px] pl-[50px] py-[3px] text-[10px] font-semibold uppercase tracking-[.4px] text-gray-400 grid gap-[8px]"
                    style={{
                      gridTemplateColumns: readOnly ? '1fr 130px 55px 75px' : '1fr 130px 55px 75px 28px',
                      borderBottom: '0.5px solid var(--af-line)',
                      background: '#FAFAFA',
                    }}
                  >
                    <span>Désignation</span>
                    <span className="text-right">Montant alloué</span>
                    <span className="text-right">Qté</span>
                    <span>Unité</span>
                    {!readOnly && <span />}
                  </div>
                )}
                {(sc.lignes || []).map(ligne => (
                  <div
                    key={ligne.id}
                    className="px-[14px] pl-[50px] py-[5px] text-[12px] grid items-center gap-[8px]"
                    style={{
                      gridTemplateColumns: readOnly ? '1fr 130px 55px 75px' : '1fr 130px 55px 75px 28px',
                      borderBottom: '0.5px solid var(--af-steel)',
                    }}
                  >
                    <span className="text-gray-700 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={ligne.libelle}>
                      {ligne.libelle}
                    </span>
                    <span className="font-mono font-bold text-[12px] text-gray-800 text-right">
                      {fmt(ligne.montant_alloue)}
                    </span>
                    <span className="text-gray-400 text-right">
                      {ligne.quantite != null ? parseFloat(ligne.quantite) : '—'}
                    </span>
                    <span className="text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                      {ligne.unite || '—'}
                    </span>
                    {!readOnly && (
                      <button
                        onClick={() => supprimerLigne(ligne.id)}
                        className="bg-none border-none cursor-pointer px-[4px] py-[2px] rounded-[4px] leading-none text-danger-300"
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))}

                {/* Form : nouvelle ligne */}
                {!readOnly && showLigneForm === sc.id && (
                  <div
                    className="px-[14px] pl-[50px] py-[6px] grid items-center gap-[5px] bg-primary-50"
                    style={{
                      gridTemplateColumns: '1fr 110px 50px 70px auto',
                      borderBottom: '0.5px solid var(--af-line)',
                    }}
                  >
                    <input
                      ref={ligneRef}
                      value={newLigne.libelle}
                      onChange={e => setNewLigne(p => ({ ...p, libelle: e.target.value }))}
                      onKeyDown={e => keyDown(e, () => ajouterLigne(sc.id), () => { setShowLigneForm(null); setNewLigne({ libelle: '', montant: '', qte: '1', unite: '' }) })}
                      placeholder="Libellé…"
                      className="w-full text-[12px] px-[8px] py-[4px] h-[28px] rounded-[6px] border border-gray-200 outline-none"
                    />
                    <input
                      type="number" min="0"
                      value={newLigne.montant}
                      onChange={e => setNewLigne(p => ({ ...p, montant: e.target.value }))}
                      onKeyDown={e => keyDown(e, () => ajouterLigne(sc.id))}
                      placeholder="Montant"
                      className="w-full text-[12px] px-[8px] py-[4px] h-[28px] rounded-[6px] border border-gray-200 outline-none font-mono font-bold"
                    />
                    <input
                      type="number" min="1"
                      value={newLigne.qte}
                      onChange={e => setNewLigne(p => ({ ...p, qte: e.target.value }))}
                      onKeyDown={e => keyDown(e, () => ajouterLigne(sc.id))}
                      placeholder="Qté"
                      className="w-full text-[12px] px-[8px] py-[4px] h-[28px] rounded-[6px] border border-gray-200 outline-none"
                    />
                    <input
                      value={newLigne.unite}
                      onChange={e => setNewLigne(p => ({ ...p, unite: e.target.value }))}
                      onKeyDown={e => keyDown(e, () => ajouterLigne(sc.id))}
                      placeholder="Unité"
                      className="w-full text-[12px] px-[8px] py-[4px] h-[28px] rounded-[6px] border border-gray-200 outline-none"
                    />
                    <div className="flex gap-[4px]">
                      <button
                        onClick={() => ajouterLigne(sc.id)}
                        disabled={saving}
                        className="btn btn-primary btn-sm px-[8px] py-[3px]"
                        title="Valider (Entrée)"
                      >
                        <Check size={12} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => { setShowLigneForm(null); setNewLigne({ libelle: '', montant: '', qte: '1', unite: '' }) }}
                        className="btn btn-secondary btn-sm px-[8px] py-[3px]"
                        title="Annuler (Échap)"
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Form : nouvelle catégorie */}
        {!readOnly && showNewCat && (
          <div
            className="flex gap-[6px] px-[14px] py-[8px] bg-primary-50"
            style={{ borderTop: '0.5px solid var(--af-line)' }}
          >
            <input
              ref={newCatRef}
              value={newCatLabel}
              onChange={e => setNewCatLabel(e.target.value)}
              onKeyDown={e => keyDown(e, ajouterCategorie, () => { setShowNewCat(false); setNewCatLabel('') })}
              placeholder="Libellé de la catégorie (ex : Formation, Équipements…)"
              className="flex-1 h-[32px] text-[12px] px-[8px] py-[4px] rounded-[6px] border border-gray-200 outline-none"
            />
            <button onClick={ajouterCategorie} disabled={saving} className="btn btn-primary btn-sm gap-[4px]">
              <Check size={13} strokeWidth={2.5} /> Ajouter
            </button>
            <button onClick={() => { setShowNewCat(false); setNewCatLabel('') }} className="btn btn-secondary btn-sm gap-[4px]">
              <X size={13} strokeWidth={2.5} /> Annuler
            </button>
          </div>
        )}
      </div>

      {/* ── Total général ── */}
      <div
        className="flex justify-between items-center px-[16px] py-[10px] bg-gray-50"
        style={{ borderTop: '0.5px solid var(--af-line)' }}
      >
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[.5px]">
          Total général
        </span>
        <span className="font-mono font-bold text-[15px] text-gray-900">
          {fmt(totalGeneral)} FCFA
        </span>
      </div>
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
}
