import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getBudget, updateBudget, soumettreBudget,
  exportBudgetExcel, exportBudgetPdf, exportDepensesExcel, exportDepensesPdf,
} from '../../api/budget'
import { getDepenses } from '../../api/depenses'
import { StatutBadge, AlerteBadge } from '../../components/StatusBadge'
import LignesBudgetaires from '../../components/budget/LignesBudgetaires'
import DepenseMultiModal from '../../components/budget/DepenseMultiModal'
import { notifRefresh } from '../../utils/notifRefresh'
import { ConfirmModal } from '../../components/ui'
import {
  ArrowLeft, Pencil, Send, DollarSign,
  CheckCircle2, AlertTriangle, Info,
  FileText, Receipt,
  Download, Printer, Paperclip, ChevronDown,
} from 'lucide-react'
import { formaterNombre, formaterPourcentage } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })

const jaugeColor = (taux) => {
  if (taux > 75) return 'var(--color-danger-500)'
  if (taux > 50) return 'var(--color-gold)'
  return 'var(--color-success-600)'
}

export default function BudgetDetail({ basePath = '/mes-budgets' }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [budget,    setBudget]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [hasLignes, setHasLignes] = useState(false)

  const [showDepenseModal, setShowDepenseModal] = useState(false)

  const [showEdit,   setShowEdit]   = useState(false)
  const [editForm,   setEditForm]   = useState({ nom: '', date_debut: '', date_fin: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState('')

  const [showSoumission,   setShowSoumission]   = useState(false)
  const [soumissionSaving, setSoumissionSaving] = useState(false)
  const [soumissionError,  setSoumissionError]  = useState('')

  const [depenses,       setDepenses]       = useState([])
  const [depensesLoaded, setDepensesLoaded] = useState(false)

  const [confirmModal, setConfirmModal] = useState(null)

  const [exporting,   setExporting]   = useState('')
  const [exportOpen,  setExportOpen]  = useState(false)
  const exportRef = useRef(null)

  const load = () => {
    getBudget(id)
      .then(b => setBudget(b.data))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const loadDepenses = () => {
    getDepenses({ budget: id })
      .then(r => setDepenses(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setDepensesLoaded(true))
  }

  const openEdit = () => {
    setEditForm({ nom: budget.nom, date_debut: budget.date_debut, date_fin: budget.date_fin })
    setEditError(''); setShowEdit(true)
  }
  const handleEdit = async (e) => {
    e.preventDefault(); setEditError(''); setEditSaving(true)
    try { await updateBudget(id, editForm); setShowEdit(false); load() }
    catch (err) { setEditError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erreur') }
    finally { setEditSaving(false) }
  }

  const openSoumission = () => { setSoumissionError(''); setShowSoumission(true) }
  const handleSoumettre = async (e) => {
    e.preventDefault()
    setSoumissionSaving(true); setSoumissionError('')
    try {
      await soumettreBudget(id)
      notifRefresh()
      setShowSoumission(false); load()
    } catch (err) {
      setSoumissionError(err.response?.data?.detail || 'Erreur lors de la soumission')
    } finally { setSoumissionSaving(false) }
  }

  const openDepense  = () => setShowDepenseModal(true)
  const closeDepense = () => setShowDepenseModal(false)
  const onDepenseSuccess = () => { setShowDepenseModal(false); load(); loadDepenses() }

  useEffect(() => {
    if (budget?.statut === 'APPROUVE' && !depensesLoaded) loadDepenses()
  }, [budget?.statut])

  useEffect(() => {
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading || !budget) return <div className="page-loader"><div className="spinner" /></div>

  const editable  = ['BROUILLON', 'REJETE'].includes(budget.statut)
  const brouillon = budget.statut === 'BROUILLON'
  const approuve  = budget.statut === 'APPROUVE'

  const handleExport = async (fn, key) => {
    if (exporting) return
    setExporting(key)
    try { await fn(id, budget.code) }
    catch (e) { alert(e?.response?.data?.detail || 'Erreur lors de l\'export') }
    finally { setExporting('') }
  }

  const alloc           = budget.allocation_detail
  const allocAlloue     = parseFloat(alloc?.montant_alloue    || 0)
  const allocConsomme   = parseFloat(alloc?.montant_consomme  || 0)
  const allocDisponible = parseFloat(alloc?.montant_disponible || 0)
  const allocTaux       = allocAlloue > 0 ? Math.min(Math.round(allocConsomme / allocAlloue * 100), 100) : 0

  const montantGlobal     = parseFloat(budget.montant_global    || 0)
  const montantConsomme   = parseFloat(budget.montant_consomme  || 0)
  const montantDisponible = parseFloat(budget.montant_disponible || 0)
  const taux              = parseFloat(budget.taux_consommation  || 0)

  return (
    <div>

      {/* ── Barre top : retour ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate(basePath)} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          <ArrowLeft size={14} strokeWidth={2} /> Retour
        </button>
      </div>

      {/* ── Carte principale (même style que DepenseGroupDetail) ─────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>

        {/* Header navy — identique à DepenseGroupDetail */}
        <div style={{
          background: 'var(--af-ink)', padding: '24px 28px 20px',
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 80, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingRight: 8 }}>
            <div style={{ minWidth: 0 }}>
              {/* Tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{
                  background: 'rgba(255,255,255,.18)', borderRadius: 7,
                  padding: '4px 10px', fontSize: '12px', fontWeight: 700,
                  fontFamily: 'var(--font-mono)', letterSpacing: '.5px',
                }}>
                  {budget.code}
                </div>
                <StatutBadge statut={budget.statut} />
                <AlerteBadge niveau={budget.niveau_alerte} />
              </div>

              {/* Nom */}
              <div style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 8, lineHeight: 1.25 }}>
                {budget.nom}
              </div>

              {/* Méta */}
              <div style={{ display: 'flex', gap: 16, fontSize: '12px', opacity: .85, flexWrap: 'wrap' }}>
                <span>📁 {budget.departement_nom}</span>
                {budget.date_debut && (
                  <span>📅 {budget.date_debut} → {budget.date_fin}</span>
                )}
                {budget.annee && <span>Exercice {budget.annee}</span>}
                {budget.gestionnaire_detail && (
                  <span>👤 {budget.gestionnaire_detail.prenom} {budget.gestionnaire_detail.nom}</span>
                )}
                {budget.comptable_detail && (
                  <span>
                    {budget.statut === 'APPROUVE' ? '✅ Approuvé par' : budget.statut === 'REJETE' ? '❌ Rejeté par' : '🔍 Traité par'} {budget.comptable_detail.prenom} {budget.comptable_detail.nom}
                  </span>
                )}
              </div>
            </div>

            {/* Montant global — droite */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', opacity: .6, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
                Budget global
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.6rem', lineHeight: 1 }}>
                {fmt(montantGlobal)}
              </div>
              <div style={{ fontSize: '11px', opacity: .65, marginTop: 3 }}>FCFA</div>
            </div>
          </div>
        </div>

        {/* Mini KPI — identique à DepenseGroupDetail */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--color-gray-100)' }}>
          {[
            { label: 'Budget global',  val: fmt(montantGlobal) + ' FCFA',     color: 'var(--color-gold-dark)', bg: 'var(--color-gold-soft)' },
            { label: 'Consommé',       val: fmt(montantConsomme) + ' FCFA',   color: '#6a2fa0',                  bg: '#f5f0fd' },
            { label: 'Disponible',     val: fmt(montantDisponible) + ' FCFA', color: montantDisponible <= 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)', bg: montantDisponible <= 0 ? 'var(--color-danger-50)' : 'var(--color-success-50)' },
            { label: "Taux d'exéc.",   val: formaterPourcentage(taux, { decimales: 1 }), color: jaugeColor(taux), bg: taux > 75 ? 'var(--color-danger-50)' : taux > 50 ? 'var(--color-warning-50)' : 'var(--color-success-50)' },
          ].map((k, idx, arr) => (
            <div key={k.label} style={{
              padding: '12px 20px', background: k.bg,
              borderRight: idx < arr.length - 1 ? '1px solid var(--color-gray-100)' : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>
                {k.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px', color: k.color }}>
                {k.val}
              </div>
            </div>
          ))}
        </div>

        {/* Enveloppe département — même style que la bande "pièces justificatives" */}
        {alloc && (
          <div style={{
            padding: '12px 24px', borderBottom: '1px solid var(--color-gray-100)',
            background: 'var(--color-gray-50)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '.4px', flexShrink: 0 }}>
              Enveloppe {budget.departement_nom} – Exercice {budget.annee}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="exec-bar" style={{ marginBottom: 4 }}>
                <div className="exec-bar-fill" style={{
                  width: `${allocTaux}%`,
                  background: `linear-gradient(90deg, ${jaugeColor(Math.max(0, allocTaux - 20))}, ${jaugeColor(allocTaux)})`,
                }} />
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '11px', color: 'var(--color-gray-500)', fontFamily: 'var(--font-mono)' }}>
                <span>Alloué : <strong style={{ color: 'var(--color-gray-700)' }}>{fmt(allocAlloue)} F</strong></span>
                <span>Consommé : <strong style={{ color: 'var(--color-gray-700)' }}>{fmt(allocConsomme)} F</strong></span>
                <span style={{ color: allocDisponible <= 0 ? 'var(--color-danger-600)' : 'var(--color-success-700)', fontWeight: 700 }}>
                  Dispo : {fmt(allocDisponible)} F
                </span>
              </div>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: allocTaux >= 100 ? 'var(--color-danger-50)' : allocTaux >= 90 ? 'var(--color-warning-50)' : 'var(--color-success-50)',
              color:      allocTaux >= 100 ? 'var(--color-danger-700)' : allocTaux >= 90 ? 'var(--color-warning-700)' : 'var(--color-success-700)',
              flexShrink: 0,
            }}>
              {allocTaux}% utilisé
            </span>
          </div>
        )}

        {/* Bandeaux de statut */}
        <div style={{ padding: '0 24px' }}>
          {!isAdmin && brouillon && !hasLignes && (
            <StatusBanner type="info" icon={<FileText size={15} strokeWidth={2} />}>
              Budget en brouillon — ajoutez au moins une ligne budgétaire pour pouvoir le soumettre.
            </StatusBanner>
          )}
          {!isAdmin && brouillon && hasLignes && (
            <StatusBanner type="primary" icon={<Info size={15} strokeWidth={2} />}>
              Budget prêt — cliquez sur <strong>Soumettre</strong> pour l'envoyer en validation.
            </StatusBanner>
          )}
          {budget.statut === 'SOUMIS' && (
            <StatusBanner type="primary" icon={<Info size={15} strokeWidth={2} />}>
              Budget soumis — en attente de validation par le comptable.
            </StatusBanner>
          )}
          {!isAdmin && approuve && (
            <StatusBanner type="success" icon={<CheckCircle2 size={15} strokeWidth={2} />}>
              Budget approuvé — enregistrez les dépenses réelles avec leurs pièces justificatives.
            </StatusBanner>
          )}
          {budget.statut === 'REJETE' && (
            <>
              <StatusBanner type="danger" icon={<AlertTriangle size={15} strokeWidth={2} />}>
                Budget rejeté — corrigez les lignes puis soumettez à nouveau.
              </StatusBanner>
              {budget.motif_rejet && (
                <div style={{
                  marginBottom: 12, padding: '12px 16px',
                  background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)',
                  borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-danger-500)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-danger-700)', marginBottom: 4 }}>
                    Motif de rejet
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-danger-800)', lineHeight: 1.55 }}>
                    {budget.motif_rejet}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lignes budgétaires */}
        <div style={{ padding: '0 24px 24px' }}>
          <LignesBudgetaires
            budgetId={budget.id}
            readOnly={isAdmin || !editable}
            onTotalChange={(total) => setHasLignes(total > 0)}
          />
        </div>

        {/* Dépenses enregistrées (budget approuvé) */}
        {approuve && (
          <div style={{ borderTop: '1px solid var(--color-gray-100)' }}>
            <div style={{
              padding: '14px 24px', background: '#F8FAFF',
              borderBottom: '1px solid var(--color-gray-100)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Receipt size={16} strokeWidth={2} style={{ color: 'var(--color-gold)' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-900)' }}>
                  Dépenses enregistrées
                </span>
                {depenses.length > 0 && (
                  <span style={{
                    background: 'rgba(184,134,74,0.15)', color: 'var(--color-gold-dark)',
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  }}>
                    {depenses.length}
                  </span>
                )}
              </div>
            </div>

            {!depensesLoaded ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Chargement…</p>
              </div>
            ) : depenses.length === 0 ? (
              <div style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: '13px' }}>
                Aucune dépense enregistrée sur ce budget.
              </div>
            ) : (
              <div>
                {depenses.map((d, i) => {
                  const STATUT_STYLE = {
                    SAISIE:  { bg: 'var(--color-warning-50)',  color: 'var(--color-warning-700)', label: 'En attente' },
                    VALIDEE: { bg: 'var(--color-success-50)',  color: 'var(--color-success-700)', label: 'Validée'    },
                    REJETEE: { bg: 'var(--color-danger-50)',   color: 'var(--color-danger-700)',  label: 'Rejetée'    },
                  }
                  const s = STATUT_STYLE[d.statut] || { bg: '#f3f4f6', color: '#374151', label: d.statut }
                  return (
                    <div key={d.id} style={{
                      padding: '14px 24px',
                      borderBottom: i < depenses.length - 1 ? '1px solid var(--color-gray-100)' : 'none',
                      display: 'grid', gridTemplateColumns: '1fr 130px',
                      alignItems: 'center', gap: 16,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>
                            {d.reference}
                          </span>
                          <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '10px', fontWeight: 700, background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-gray-800)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.ligne_designation || '—'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span>{d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR') : '—'}</span>
                          {d.statut === 'REJETEE' && d.motif_rejet && (
                            <span style={{ color: 'var(--color-danger-600)', fontStyle: 'italic' }}>
                              Motif : {d.motif_rejet}
                            </span>
                          )}
                          {d.note && d.statut !== 'REJETEE' && (
                            <span style={{ fontStyle: 'italic' }}>{d.note}</span>
                          )}
                          {d.piece_justificative_url && (
                            <a href={d.piece_justificative_url} target="_blank" rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-gold)', fontWeight: 600, textDecoration: 'none' }}
                              onClick={e => e.stopPropagation()}>
                              <Paperclip size={11} strokeWidth={2} /> Justificatif
                            </a>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-900)' }}>{fmt(d.montant)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>FCFA</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Barre export dropdown ──────────────────────────────────────────── */}
        <div style={{
          padding: '10px 24px', borderTop: '1px solid var(--color-gray-100)',
          background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        }}>
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={!!exporting}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6 }}
            >
              {exporting
                ? <><span className="spinner-sm" /> Export…</>
                : <><Download size={13} strokeWidth={2} /> Exporter <ChevronDown size={10} strokeWidth={2.5} /></>
              }
            </button>
            {exportOpen && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, zIndex: 50,
                background: '#fff', border: '1px solid var(--color-gray-200)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.12)',
                minWidth: 210, overflow: 'hidden',
              }}>
                <div style={{ padding: '4px 12px', borderBottom: '1px solid var(--color-gray-100)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-gray-400)', paddingTop: 8 }}>
                  Budget
                </div>
                <div style={{ padding: '4px 0' }}>
                  {[
                    { fn: exportBudgetExcel, key: 'bxls', icon: '📊', label: 'Budget Excel', sub: '.xlsx — compatible Excel' },
                    { fn: exportBudgetPdf,   key: 'bpdf', icon: '📄', label: 'Budget PDF',   sub: 'Document imprimable' },
                  ].map(item => (
                    <button key={item.key}
                      onClick={() => { handleExport(item.fn, item.key); setExportOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-gray-700)', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '15px' }}>{item.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>{item.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {approuve && (
                  <>
                    <div style={{ padding: '4px 12px', borderTop: '1px solid var(--color-gray-100)', borderBottom: '1px solid var(--color-gray-100)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-gray-400)', paddingTop: 8 }}>
                      Dépenses
                    </div>
                    <div style={{ padding: '4px 0' }}>
                      {[
                        { fn: exportDepensesExcel, key: 'dxls', icon: '📊', label: 'Dépenses Excel', sub: '.xlsx — compatible Excel' },
                        { fn: exportDepensesPdf,   key: 'dpdf', icon: '📄', label: 'Dépenses PDF',   sub: 'Document imprimable' },
                      ].map(item => (
                        <button key={item.key}
                          onClick={() => { handleExport(item.fn, item.key); setExportOpen(false) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-gray-700)', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <span style={{ fontSize: '15px' }}>{item.icon}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>{item.sub}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer / barre d'actions */}
        {!isAdmin && (editable || approuve) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid var(--color-gray-100)',
            background: 'var(--color-gray-50)',
          }}>
            <div />
            <div style={{ display: 'flex', gap: 8 }}>
              {editable && (
                <button onClick={openEdit} className="btn btn-secondary btn-md" style={{ gap: 6 }}>
                  <Pencil size={14} strokeWidth={2} /> Modifier
                </button>
              )}
              {brouillon && hasLignes && (
                <button onClick={openSoumission} className="btn btn-primary btn-md" style={{ gap: 6 }}>
                  <Send size={14} strokeWidth={2} /> Soumettre
                </button>
              )}
              {approuve && (
                <button onClick={openDepense} className="btn btn-success btn-md" style={{ gap: 6 }}>
                  <DollarSign size={14} strokeWidth={2} /> Enregistrer une dépense
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal dépense ─────────────────────────────────────────────────────── */}
      {showDepenseModal && (
        <DepenseMultiModal
          budgetId={budget.id}
          onClose={closeDepense}
          onSuccess={onDepenseSuccess}
        />
      )}

      {/* ── Modal soumission ─────────────────────────────────────────────────── */}
      {showSoumission && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSoumission(false) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={15} strokeWidth={2} style={{ color: 'var(--color-gold)' }} />
                Soumettre le budget
              </h2>
            </div>
            <form onSubmit={handleSoumettre}>
              <div className="modal-body">
                <div style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '12px 14px', borderRadius: 9,
                  background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)',
                  marginBottom: 12,
                }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-warning-600)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '13px', color: 'var(--color-warning-800)' }}>
                    Une fois soumis, ce budget <strong>ne pourra plus être modifié</strong>. Il sera transmis au comptable pour validation.
                  </p>
                </div>
                <div style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '12px 14px', borderRadius: 9,
                  background: 'var(--color-success-50)', border: '1px solid var(--color-success-200)',
                }}>
                  <Info size={14} style={{ color: 'var(--color-success-600)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '13px', color: 'var(--color-success-800)' }}>
                    Après approbation, vous pourrez enregistrer les dépenses réelles avec leurs pièces justificatives.
                  </p>
                </div>
                {soumissionError && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', marginTop: 12 }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-danger-500)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-danger-700)', fontSize: '12px' }}>{soumissionError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowSoumission(false)} className="btn btn-secondary btn-md">Annuler</button>
                <button type="submit" disabled={soumissionSaving} className="btn btn-primary btn-md" style={{ gap: 6 }}>
                  {soumissionSaving ? <><span className="spinner-sm" /> Soumission…</> : <><Send size={14} strokeWidth={2} /> Confirmer la soumission</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal édition ────────────────────────────────────────────────────── */}
      {showEdit && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEdit(false) }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>Modifier le budget</h2>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Nom du budget</label>
                  <input required className="form-input" value={editForm.nom}
                    onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Date début</label>
                    <input type="date" required className="form-input" value={editForm.date_debut}
                      onChange={e => setEditForm(f => ({ ...f, date_debut: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Date fin</label>
                    <input type="date" required className="form-input" value={editForm.date_fin}
                      onChange={e => setEditForm(f => ({ ...f, date_fin: e.target.value }))} />
                  </div>
                </div>
                {editError && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', marginTop: 12 }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-danger-500)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-danger-700)', fontSize: '12px' }}>{editError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEdit(false)} className="btn btn-secondary btn-md">Annuler</button>
                <button type="submit" disabled={editSaving} className="btn btn-primary btn-md">
                  {editSaving ? <><span className="spinner-sm" /> Enregistrement…</> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
}

/* ── StatusBanner ─────────────────────────────────────────────────────────── */
function StatusBanner({ type, icon, children }) {
  const cfg = {
    info:    { bg: 'var(--color-gray-50)',    border: 'var(--color-gray-200)',    color: 'var(--color-gray-700)'    },
    primary: { bg: 'var(--color-gold-soft)', border: 'rgba(184,134,74,0.3)', color: 'var(--color-gold-dark)' },
    success: { bg: 'var(--color-success-50)', border: 'var(--color-success-200)', color: 'var(--color-success-800)' },
    danger:  { bg: 'var(--color-danger-50)',  border: 'var(--color-danger-200)',  color: 'var(--color-danger-800)'  },
  }[type] || {}
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '10px 16px', borderRadius: 10, marginTop: 14, marginBottom: 0,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      fontSize: '13px',
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span>{children}</span>
    </div>
  )
}
