import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getBudgets, getRapportCloture } from '../../api/budget'
import { StatutBadge, AlerteBadge } from '../../components/StatusBadge'
import { Search, FileText, TrendingUp, Building2, X } from 'lucide-react'
import { printPDF } from '../../utils/export'
import { formaterNombre } from '../../utils/formatters'

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
    } catch (err) { alert('Impossible de générer le rapport.') }
    finally { setActionBusy(null) }
  }

  const load = (statut = filtre) => {
    setLoading(true)
    const params = {}
    if (statut)  params.statut      = statut
    if (deptId)  params.departement = deptId
    getBudgets(params)
      .then(r => { setBudgets(r.data.results ?? r.data); setVisibleCount(10) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filtre, deptId])

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
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {deptNom ? `Budgets — ${deptNom}` : 'Tous les budgets'}
          </h1>
          <p className="page-subtitle">Supervision et gestion complète des budgets</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-[6px] px-[14px] py-[6px] rounded-[20px] bg-[#FEF9EC] text-[#78350F] text-[13px] font-semibold">
            <TrendingUp size={14} strokeWidth={2} />
            {hasMore ? `${visibleCount} / ${filtered.length}` : filtered.length} budget{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Bandeau département actif */}
      {deptId && (
        <div className="flex items-center gap-[10px] px-4 py-[10px] rounded-[10px] mb-[14px]" style={{ background: '#FEF9EC', border: '1px solid #F3D07A' }}>
          <Building2 size={14} strokeWidth={2} className="shrink-0" style={{ color: '#C9910A' }} />
          <span className="text-[13px] flex-1" style={{ color: '#78350F' }}>
            Filtre actif : <strong>{deptNom}</strong>
          </span>
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1 text-[12px] font-semibold cursor-pointer"
            style={{ color: '#C9910A' }}
          >
            <X size={13} strokeWidth={2.5} /> Effacer le filtre
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="filter-bar mb-[20px]" style={{ flexWrap: 'nowrap' }}>
        <div className="search-wrapper flex-1 min-w-[200px]">
          <Search size={15} strokeWidth={2} className="search-icon" />
          <input
            className="search-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(10) }}
            placeholder="Rechercher par code, nom, département…"
          />
        </div>
        <div className="flex gap-[6px]" style={{ flexShrink: 0 }}>
          {STATUTS.map(s => (
            <button
              key={s.value}
              onClick={() => { setFiltre(s.value); setVisibleCount(10) }}
              className={`filter-pill${filtre === s.value ? ' active' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden" style={{ marginBottom: hasMore ? 0 : undefined }}>
        {loading ? (
          <div className="p-[60px] text-center">
            <div className="spinner mx-auto mb-3" />
            <p className="text-[13px] text-[#9CA3AF]">Chargement des budgets…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FileText size={28} strokeWidth={1.5} className="text-gray-400" />
            </div>
            <p className="empty-title">Aucun budget trouvé</p>
            <p className="empty-body">
              {search || filtre ? 'Essayez d\'ajuster vos filtres de recherche.' : 'Aucun budget n\'a encore été créé.'}
            </p>
          </div>
        ) : (
          <table className="data-table">
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
                    className="cursor-pointer"
                    onClick={() => navigate(`/budgets/${b.id}`)}
                  >
                    <td>
                      <span className="code-tag">{b.code}</span>
                    </td>
                    <td className="font-medium max-w-[180px]">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {b.nom}
                      </div>
                    </td>
                    <td className="text-[#6B7280]">{b.departement_nom || '—'}</td>
                    <td className="text-[#6B7280]">{b.gestionnaire_nom || '—'}</td>
                    <td className="font-mono font-semibold whitespace-nowrap">
                      {fmt(b.montant_global)} <span className="text-[10px] text-[#9CA3AF]">FCFA</span>
                    </td>
                    <td className="font-mono text-[#4B5563] whitespace-nowrap">
                      {fmt(b.montant_consomme)} <span className="text-[10px] text-[#9CA3AF]">FCFA</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="exec-bar w-[60px]">
                          <div
                            className="exec-bar-fill"
                            style={{
                              width: `${Math.min(taux, 100)}%`,
                              background: `linear-gradient(90deg, ${jaugeColor(Math.max(0, taux - 20))}, ${color})`,
                            }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-bold font-mono"
                          style={{ color: taux > 75 ? 'var(--color-danger-600)' : taux > 50 ? 'var(--color-warning-600)' : '#374151' }}
                        >
                          {taux}%
                        </span>
                      </div>
                    </td>
                    <td><StatutBadge statut={b.statut} /></td>
                    <td><AlerteBadge niveau={b.niveau_alerte} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          onClick={() => navigate(`/budgets/${b.id}`)}
                          className="btn btn-secondary btn-sm"
                        >
                          Voir
                        </button>
                        {b.statut === 'CLOTURE' && (
                          <button
                            onClick={(e) => handleRapport(b, e)}
                            disabled={actionBusy === b.id}
                            className="btn btn-sm"
                            style={{ background: 'var(--af-ink)', color: '#fff', border: 'none', gap: 4 }}
                          >
                            Rapport
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && hasMore && (
        <div className="flex flex-col items-center gap-[6px] mt-[20px]">
          <button
            onClick={() => setVisibleCount(c => c + 10)}
            className="btn btn-secondary btn-md gap-[7px]"
            style={{ minWidth: 180 }}
          >
            Charger plus
            <span style={{ background: 'var(--color-gray-200)', color: 'var(--color-gray-600)', fontSize: '11px', padding: '1px 7px', borderRadius: 8, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              +{Math.min(10, filtered.length - visibleCount)}
            </span>
          </button>
          <p style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
            {visibleCount} sur {filtered.length} budgets affichés
          </p>
        </div>
      )}
    </div>
  )
}
