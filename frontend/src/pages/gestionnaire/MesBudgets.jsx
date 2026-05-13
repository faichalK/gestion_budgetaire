import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBudgets, soumettreBudget } from '../../api/budget'
import { StatutBadge } from '../../components/StatusBadge'
import {
  Search, Plus, Wallet, Eye, Send, Edit2, Receipt,
  ChevronRight,
} from '../../components/AtlasIcons'
import { cn } from '../../lib/cn'
import Card from '../../components/ui/Card'
import { notifRefresh } from '../../utils/notifRefresh'
import { ConfirmModal } from '../../components/ui'
import { formaterNombre } from '../../utils/formatters'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })

const TABS = [
  { key: 'BROUILLON', label: 'Brouillons',  color: '#6B7280' },
  { key: 'SOUMIS',    label: 'Soumis',      color: '#D97706' },
  { key: 'APPROUVE',  label: 'Approuvés',   color: '#059669' },
  { key: 'REJETE',    label: 'Rejetés',     color: '#DC2626' },
  { key: 'CLOTURE',   label: 'Clôturés',    color: '#0E2A47' },
]

export default function MesBudgets() {
  const navigate = useNavigate()

  const [budgets,  setBudgets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [tab,      setTab]      = useState('BROUILLON')
  const [busy,         setBusy]         = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  const load = () => {
    setLoading(true)
    getBudgets()
      .then(r => setBudgets(r.data.results ?? r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const countFor = (key) => budgets.filter(b => b.statut === key).length

  const q = search.trim().toLowerCase()
  const visible = budgets.filter(b => {
    const matchTab    = b.statut === tab
    const matchSearch = !q || b.code?.toLowerCase().includes(q) || b.nom?.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const handleSoumettre = (id, nom, e) => {
    e.stopPropagation()
    setConfirmModal({
      title: 'Soumettre pour validation',
      message: `Soumettre le budget "${nom}" au comptable pour validation ? Vous ne pourrez plus le modifier après soumission.`,
      confirmLabel: 'Soumettre',
      variant: 'warning',
      onConfirm: async () => {
        setBusy(id)
        try { await soumettreBudget(id); notifRefresh(); load() }
        catch (err) { alert(err.response?.data?.detail || 'Erreur lors de la soumission') }
        finally { setBusy(null) }
      },
    })
  }

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div>
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">Gestionnaire</div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Mes budgets</h1>
          <div className="text-[13px] text-[#5A6B7E]">{budgets.length} budget{budgets.length !== 1 ? 's' : ''} au total</div>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button onClick={() => navigate('/creer-budget')} className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={2.5} /> Créer un budget
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--af-line)', paddingBottom: 0 }}>
        {TABS.map(t => {
          const cnt   = countFor(t.key)
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 18px 10px',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                color: active ? t.color : 'var(--af-mute)',
                borderBottom: active ? `2.5px solid ${t.color}` : '2.5px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color .15s',
              }}
            >
              {t.label}
              <span style={{
                background: active ? t.color : 'var(--af-line)',
                color: active ? '#fff' : 'var(--af-cream)',
                fontSize: '10px', fontWeight: 700,
                padding: '1px 6px', borderRadius: 9,
              }}>
                {cnt}
              </span>
            </button>
          )
        })}
      </div>

      {/* Barre de recherche */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="search-wrapper" style={{ flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={15} strokeWidth={2} className="search-icon" />
          <input
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou code…"
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn btn-secondary btn-sm">
            ✕ Effacer
          </button>
        )}
      </div>

      {/* Contenu */}
      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Wallet size={28} strokeWidth={1.5} style={{ color: 'var(--af-mute)' }} />
          </div>
          <p className="empty-title">Aucun budget</p>
          <p className="empty-body">
            {search
              ? 'Aucun résultat pour votre recherche.'
              : tab === 'BROUILLON'
                ? 'Créez votre premier budget pour commencer.'
                : `Aucun budget en statut « ${TABS.find(t => t.key === tab)?.label} ».`}
          </p>
        </div>
      ) : (
        <Card.Table className="overflow-x-auto">
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 140px 160px',
            minWidth: 560,
            padding: '8px 20px',
            background: '#EDE7DA',
            borderBottom: '1px solid rgba(14,42,71,0.08)',
            fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
            color: 'rgba(90,107,126,0.7)',
          }}>
            <span>Budget</span>
            <span style={{ textAlign: 'right' }}>Montant global</span>
            <span style={{ textAlign: 'center' }}>Consommation</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {visible.map((b, i) => {
            const taux   = parseFloat(b.taux_consommation || 0)
            const isBusy = busy === b.id

            return (
              <div
                key={b.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 140px 160px',
                  minWidth: 560,
                  padding: '14px 20px',
                  borderBottom: i < visible.length - 1 ? '1px solid rgba(14,42,71,0.08)' : 'none',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--af-steel)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                onClick={() => navigate(`/mes-budgets/${b.id}`)}
              >
                {/* Colonne Budget */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="code-tag">{b.code}</span>
                    <StatutBadge statut={b.statut} />
                  </div>
                  <div style={{
                    fontWeight: 600, fontSize: '14px',
                    color: 'var(--af-ink)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: 2,
                  }}>
                    {b.nom}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--af-mute)' }}>
                    {b.departement_nom} · {b.date_debut} → {b.date_fin}
                  </div>
                  {b.comptable_nom && (
                    <div style={{ fontSize: '11px', color: b.statut === 'REJETE' ? 'var(--color-danger-600)' : 'var(--color-success-600)', marginTop: 2 }}>
                      {b.statut === 'APPROUVE' ? '✓ Approuvé' : b.statut === 'REJETE' ? '✕ Rejeté'  : '→ Traité'} par {b.comptable_nom}
                    </div>
                  )}
                </div>

                {/* Montant */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--af-ink)' }}>
                    {fmt(b.montant_global)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--af-mute)', marginTop: 1 }}>FCFA</div>
                </div>

                {/* Jauge */}
                <div style={{ padding: '0 12px' }}>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${taux > 75 ? 'progress-fill-red' : taux > 50 ? 'progress-fill-orange' : 'progress-fill-green'}`}
                      style={{ width: `${Math.min(taux, 100)}%` }}
                    />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--af-mute)', textAlign: 'center', marginTop: 3, fontWeight: 600 }}>
                    {taux}%
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Voir */}
                  <button
                    title="Voir le détail"
                    onClick={() => navigate(`/mes-budgets/${b.id}`)}
                    style={btnStyle('#B8864A')}
                  >
                    <Eye size={13} strokeWidth={2} />
                  </button>

                  {/* Modifier (BROUILLON + REJETE) */}
                  {['BROUILLON', 'REJETE'].includes(b.statut) && (
                    <button
                      title="Modifier"
                      onClick={() => navigate(`/mes-budgets/${b.id}?edit=1`)}
                      style={btnStyle('#D97706')}
                    >
                      <Edit2 size={13} strokeWidth={2} />
                    </button>
                  )}

                  {/* Soumettre (BROUILLON + REJETE) */}
                  {['BROUILLON', 'REJETE'].includes(b.statut) && (
                    <button
                      title="Soumettre pour validation"
                      onClick={e => handleSoumettre(b.id, b.nom, e)}
                      disabled={isBusy}
                      style={btnStyle('#059669')}
                    >
                      {isBusy ? <span style={{ width: 13, height: 13 }} className="spinner-sm" /> : <Send size={13} strokeWidth={2} />}
                    </button>
                  )}

                  {/* Enregistrer dépense (APPROUVE) */}
                  {b.statut === 'APPROUVE' && (
                    <button
                      title="Enregistrer une dépense"
                      onClick={() => navigate(`/mes-budgets/${b.id}?depense=1`)}
                      style={btnStyle('#059669')}
                    >
                      <Receipt size={13} strokeWidth={2} />
                    </button>
                  )}

                  <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--af-line-2)', marginLeft: 2 }} />
                </div>
              </div>
            )
          })}
        </Card.Table>
      )}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </div>
  )
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
