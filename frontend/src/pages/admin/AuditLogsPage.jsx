import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { ClipboardList, AlertTriangle, RotateCcw } from 'lucide-react'

const ACTION_STYLE = {
  CREATE:  { bg: 'var(--color-success-50)',  color: 'var(--color-success-700)', label: 'Création'      },
  UPDATE:  { bg: 'var(--color-gold-soft)',  color: 'var(--color-gold-dark)', label: 'Modification'  },
  DELETE:  { bg: 'var(--color-danger-50)',   color: 'var(--color-danger-700)',  label: 'Suppression'   },
  LOGIN:   { bg: '#f5f3ff',                  color: '#7c3aed',                  label: 'Connexion'     },
  LOGOUT:  { bg: 'var(--color-gray-100)',    color: 'var(--color-gray-600)',    label: 'Déconnexion'   },
  APPROVE: { bg: 'var(--color-success-50)',  color: 'var(--color-success-700)', label: 'Approbation'   },
  REJECT:  { bg: 'var(--color-danger-50)',   color: 'var(--color-danger-700)',  label: 'Rejet'         },
  SUBMIT:  { bg: 'var(--color-warning-50)',  color: 'var(--color-warning-700)', label: 'Soumission'    },
  VIEW:    { bg: 'rgba(14,42,71,0.07)',     color: 'var(--af-ink)',    label: 'Consultation'  },
  EXPORT:  { bg: '#fdf4ff',                  color: '#9333ea',                  label: 'Export'        },
}

const TABLE_LABEL = {
  budget_annuel:             'Budget annuel',
  allocation_departementale: 'Allocation dept.',
  budget:                    'Budget',
  ligne_budgetaire:          'Ligne budgétaire',
  utilisateur:               'Utilisateur',
  departement:               'Département',
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const PAGE_SIZE = 10

export default function AuditLogsPage({ embedded = false }) {
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [filter,       setFilter]       = useState({ action: '', table: '' })
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const load = () => {
    setLoading(true); setError('')
    api.get('/audit/', { params: { action: filter.action || undefined, table: filter.table || undefined } })
      .then(r => { setLogs(r.data.results ?? r.data); setVisibleCount(PAGE_SIZE) })
      .catch(err => setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement des logs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const tables       = [...new Set(logs.map(l => l.table))].sort()
  const actions      = Object.keys(ACTION_STYLE)
  const visibleLogs  = logs.slice(0, visibleCount)
  const hasMore      = visibleCount < logs.length

  return (
    <div>
      {!embedded && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Journal d'audit</h1>
            <p className="page-subtitle">Traçabilité de toutes les actions effectuées dans le système</p>
          </div>
          {!loading && !error && (
            <div className="flex items-center gap-[6px] px-[14px] py-[6px] rounded-[20px] bg-[#F3F4F6] text-[#4B5563] text-[13px] font-semibold">
              <ClipboardList size={14} strokeWidth={2} />
              {visibleCount < logs.length ? `${visibleCount} / ${logs.length}` : logs.length} entrée{logs.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="filter-bar mb-[20px]" style={{ flexWrap: 'nowrap' }}>
        <select
          className="form-select min-w-[180px] h-[38px]"
          value={filter.action}
          onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}
        >
          <option value="">Toutes les actions</option>
          {actions.map(a => <option key={a} value={a}>{ACTION_STYLE[a]?.label || a}</option>)}
        </select>
        <select
          className="form-select min-w-[180px] h-[38px]"
          value={filter.table}
          onChange={e => setFilter(f => ({ ...f, table: e.target.value }))}
        >
          <option value="">Toutes les tables</option>
          {tables.map(t => <option key={t} value={t}>{TABLE_LABEL[t] || t}</option>)}
        </select>
        {(filter.action || filter.table) && (
          <button
            onClick={() => setFilter({ action: '', table: '' })}
            className="btn btn-secondary btn-sm gap-[6px]"
          >
            <RotateCcw size={13} strokeWidth={2} /> Réinitialiser
          </button>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-[18px] py-[14px] mb-5">
          <AlertTriangle size={16} strokeWidth={2} className="text-[#EF4444] shrink-0 mt-[1px]" />
          <div>
            <p className="text-[#B91C1C] font-semibold text-[13px] mb-1">
              Erreur : {error}
            </p>
            <p className="text-[#EF4444] text-[12px]">
              Vérifiez que la migration audit est bien appliquée : <code className="font-mono bg-[#FEE2E2] px-[6px] py-[1px] rounded-[4px]">python manage.py migrate audit</code>
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="p-[60px] text-center">
          <div className="spinner mx-auto mb-3" />
          <p className="text-[13px] text-[#9CA3AF]">Chargement des logs…</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <ClipboardList size={28} strokeWidth={1.5} className="text-gray-400" />
              </div>
              <p className="empty-title">Aucun log d'audit trouvé</p>
              <p className="empty-body">
                {filter.action || filter.table ? 'Essayez d\'ajuster vos filtres.' : 'Les actions seront enregistrées ici.'}
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {['Date', 'Utilisateur', 'Action', 'Objet concerné', 'Détails'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map(log => {
                  const as         = ACTION_STYLE[log.action] || { bg: 'var(--color-gray-100)', color: 'var(--color-gray-600)', label: log.action }
                  const tableLabel = TABLE_LABEL[log.table] || log.table
                  return (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap text-[#9CA3AF] text-[12px] font-mono">
                        {fmtDate(log.date_action)}
                      </td>
                      <td className="font-semibold text-[13px]">
                        {log.utilisateur_str || '—'}
                      </td>
                      <td>
                        <span
                          className="px-[10px] py-[3px] rounded-[20px] text-[11px] font-bold whitespace-nowrap"
                          style={{ background: as.bg, color: as.color }}
                        >
                          {as.label}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold text-[13px] text-[#1F2937]">
                          {tableLabel}
                        </div>
                        {(log.valeur_apres || log.valeur_avant) && (
                          <div className="text-[11px] text-[#9CA3AF] mt-[2px] max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {log.valeur_apres || log.valeur_avant}
                          </div>
                        )}
                      </td>
                      <td>
                        {log.valeur_avant && log.valeur_apres && (
                          <details className="cursor-pointer">
                            <summary className="text-[12px] font-semibold select-none" style={{ color: 'var(--color-gold)' }}>
                              Voir tout
                            </summary>
                            <div className="mt-[6px] text-[11px] text-[#4B5563] whitespace-pre-wrap max-w-[280px] bg-[#F9FAFB] p-[8px_10px] rounded-[7px] border border-[#E5E7EB] font-mono">
                              {log.valeur_avant && <div><strong>Avant :</strong> {log.valeur_avant}</div>}
                              {log.valeur_apres && <div><strong>Après :</strong> {log.valeur_apres}</div>}
                            </div>
                          </details>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Charger plus */}
      {!loading && hasMore && (
        <div className="flex flex-col items-center gap-[6px] mt-[20px]">
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="btn btn-secondary btn-md gap-[7px]"
            style={{ minWidth: 180 }}
          >
            Charger plus
            <span style={{ background: 'var(--color-gray-200)', color: 'var(--color-gray-600)', fontSize: '11px', padding: '1px 7px', borderRadius: 8, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              +{Math.min(PAGE_SIZE, logs.length - visibleCount)}
            </span>
          </button>
          <p style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
            {visibleCount} sur {logs.length} entrées affichées
          </p>
        </div>
      )}
    </div>
  )
}
