import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getBudgets, getRapportCloture } from '../../api/budget'
import { StatutBadge, AlerteBadge } from '../../components/StatusBadge'
import { Search, FileText, TrendingUp, Building2, X, RotateCcw } from '../../components/AtlasIcons'
import { printPDF } from '../../utils/export'
import { formaterNombre } from '../../utils/formatters'
import { cn } from '../../lib/cn'

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })

const STATUTS = [
  { value: '',          label: 'Tous'      },
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'SOUMIS',    label: 'Soumis'    },
  { value: 'APPROUVE',  label: 'Approuvé'  },
  { value: 'REJETE',    label: 'Rejeté'    },
  { value: 'CLOTURE',   label: 'Clôturé'   },
]

const jaugeColor = (taux) => {
  if (taux > 75) return 'var(--color-danger-500)'
  if (taux > 50) return 'var(--color-gold)'
  return 'var(--color-success-600)'
}

export default function BudgetsPage() {
  const navigate       = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const deptId  = searchParams.get('departement') || ''
  const deptNom = searchParams.get('nom') || ''

  const [budgets,      setBudgets]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filtre,       setFiltre]       = useState('')
  const [search,       setSearch]       = useState('')
  const [actionBusy,   setActionBusy]   = useState(null)
  const [visibleCount, setVisibleCount] = useState(10)

  const handleRapport = async (b, e) => {
    e.stopPropagation()
    setActionBusy(b.id)
    try {
      const r = await getRapportCloture(b.id)
      const rpt = r.data
      const headers = ['Ligne', 'Alloué (FCFA)', 'Consommé (FCFA)', 'Disponible (FCFA)', 'Taux %']
      const rows = rpt.lignes.map(l => [
        l.libelle,
        formaterNombre(l.montant_alloue),
        formaterNombre(l.montant_consomme),
        formaterNombre(l.disponible),
        `${l.taux}%`,
      ])
      printPDF(`Rapport de clôture — ${rpt.budget.code}`, headers, rows, {
        subtitle: `${rpt.budget.nom} · Clôturé le ${rpt.date_cloture ? new Date(rpt.date_cloture).toLocaleDateString('fr-FR') : '—'}`,
        stats: [
          { value: formaterNombre(rpt.budget.montant_global) + ' FCFA', label: 'Budget global' },
          { value: formaterNombre(rpt.budget.montant_consomme) + ' FCFA', label: 'Consommé' },
          { value: `${rpt.budget.taux}%`, label: 'Taux consommation' },
          { value: rpt.nb_depenses, label: 'Dépenses' },
        ],
      })
    } catch { alert('Impossible de générer le rapport.') }
    finally { setActionBusy(null) }
  }

  useEffect(() => {
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setLoading(true)
      const params = {}
      if (filtre) params.statut = filtre
      if (deptId) params.departement = deptId
      getBudgets(params)
        .then(r => {
          if (cancelled) return
          setBudgets(r.data.results ?? r.data)
          setVisibleCount(10)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [filtre, deptId])

  const filtered = budgets.filter(b =>
    !search ||
    b.code?.toLowerCase().includes(search.toLowerCase()) ||
    b.nom?.toLowerCase().includes(search.toLowerCase()) ||
    b.departement_nom?.toLowerCase().includes(search.toLowerCase())
  )
  const visible  = filtered.slice(0, visibleCount)
  const hasMore  = visibleCount < filtered.length

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">Administration · Budgets</div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">
            {deptNom ? `Budgets — ${deptNom}` : 'Tous les budgets'}
          </h1>
          <div className="text-[13px] text-[#5A6B7E]">Supervision et gestion complète des budgets</div>
        </div>
        <div className="ml-auto flex gap-2.5 items-center">
          <span className="af-tag-method" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={13} strokeWidth={2} />
            {hasMore ? `${visibleCount} / ${filtered.length}` : filtered.length} budget{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Bandeau département actif ── */}
      {deptId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, marginBottom: 14, background: 'var(--af-gold-soft)', border: '1px solid var(--af-gold-line)' }}>
          <Building2 size={14} strokeWidth={2} style={{ color: 'var(--af-gold)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, flex: 1, color: 'var(--af-ink)' }}>
            Filtre actif : <strong>{deptNom}</strong>
          </span>
          <button
            onClick={() => setSearchParams({})}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--af-gold)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={13} strokeWidth={2.5} /> Effacer le filtre
          </button>
        </div>
      )}

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrapper" style={{ flex: '1 1 200px', minWidth: 200 }}>
          <Search size={15} strokeWidth={2} className="search-icon" />
          <input
            className="search-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(10) }}
            placeholder="Rechercher par code, nom, département…"
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          {STATUTS.map(s => (
            <button
              key={s.value}
              onClick={() => { setFiltre(s.value); setVisibleCount(10) }}
              className={cn(
                'inline-flex px-2.5 py-1 rounded-full text-[12px] border transition-all duration-150',
                filtre === s.value
                  ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
                  : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {(search || filtre) && (
          <button
            onClick={() => { setSearch(''); setFiltre(''); setVisibleCount(10) }}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6 }}
          >
            <RotateCcw size={13} strokeWidth={2} /> Réinitialiser
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]" style={{ overflow: 'hidden', padding: 0, marginBottom: hasMore ? 0 : undefined }}>
        {loading ? (
          <div className="af-loader">
            <div className="af-spinner" />
            <span>Chargement des budgets…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="af-loader">
            <FileText size={28} strokeWidth={1.5} style={{ color: 'var(--af-mute)' }} />
            <span>Aucun budget trouvé</span>
            <span style={{ fontSize: 12 }}>
              {search || filtre ? 'Essayez d\'ajuster vos filtres.' : 'Aucun budget n\'a encore été créé.'}
            </span>
          </div>
        ) : (
          <table className="af-table">
            <thead>
              <tr>
                {['Code', 'Nom', 'Département', 'Gestionnaire', 'Global', 'Consommé', 'Taux', 'Statut', 'Alerte', 'Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => {
                const taux = parseFloat(b.taux_consommation || 0)
                const color = jaugeColor(taux)
                return (
                  <tr
                    key={b.id}
                    className="clickable"
                    onClick={() => navigate(`/budgets/${b.id}`)}
                  >
                    <td>
                      <span className="ref">{b.code}</span>
                    </td>
                    <td style={{ fontWeight: 500, maxWidth: 180 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.nom}
                      </div>
                    </td>
                    <td className="muted">{b.departement_nom || '—'}</td>
                    <td className="muted">{b.gestionnaire_nom || '—'}</td>
                    <td className="num">
                      {fmt(b.montant_global)} <span style={{ fontSize: 10, color: 'var(--af-mute)' }}>FCFA</span>
                    </td>
                    <td className="num" style={{ color: 'var(--af-cream)' }}>
                      {fmt(b.montant_consomme)} <span style={{ fontSize: 10, color: 'var(--af-mute)' }}>FCFA</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="af-bar" style={{ width: 60 }}>
                          <div
                            className={`af-bar-fill${taux > 75 ? ' danger' : taux > 50 ? ' warn' : ' ok'}`}
                            style={{ width: `${Math.min(taux, 100)}%` }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            color: taux > 75 ? 'var(--color-danger-600)' : taux > 50 ? 'var(--color-warning-600)' : 'var(--af-ink)',
                          }}
                        >
                          {taux}%
                        </span>
                      </div>
                    </td>
                    <td><StatutBadge statut={b.statut} /></td>
                    <td><AlerteBadge niveau={b.niveau_alerte} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      {b.statut === 'CLOTURE' && (
                        <button
                          onClick={(e) => handleRapport(b, e)}
                          disabled={actionBusy === b.id}
                          className="btn btn-secondary btn-sm"
                          style={{ gap: 4 }}
                        >
                          Rapport
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && hasMore && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 20 }}>
          <button
            onClick={() => setVisibleCount(c => c + 10)}
            className="btn btn-secondary btn-sm"
            style={{ minWidth: 180 }}
          >
            Charger plus
            <span className="af-tag-method" style={{ marginLeft: 4 }}>
              +{Math.min(10, filtered.length - visibleCount)}
            </span>
          </button>
          <p style={{ fontSize: 11, color: 'var(--af-mute)' }}>
            {visibleCount} sur {filtered.length} budgets affichés
          </p>
        </div>
      )}
    </div>
  )
}
