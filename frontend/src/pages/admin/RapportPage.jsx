import { useState } from 'react'
import {
  FileBarChart, Calendar, CalendarDays, CalendarRange,
  Download, RefreshCw, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { useGenererRapport, useExportRapport } from '../../hooks/useRapport'
import ResumeExecutif           from '../../components/rapports/ResumeExecutif'
import AlertesSection           from '../../components/rapports/AlertesSection'
import ExerciceBudgetaire       from '../../components/rapports/ExerciceBudgetaire'
import {
  DepensesParDepartement,
  TopDepenses,
  RepartitionBudgets,
} from '../../components/rapports/TableauDepenses'
import { formaterNombre } from '../../utils/formatters'

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const THIS_YEAR  = new Date().getFullYear()
const THIS_MONTH = new Date().getMonth() + 1
const THIS_Q     = Math.ceil(THIS_MONTH / 3)
const YEARS      = Array.from({ length: 5 }, (_, i) => THIS_YEAR - i)
const MOIS_FR    = ['Janvier','Février','Mars','Avril','Mai','Juin',
                    'Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const TABS = [
  { key: 'MENSUEL',     label: 'Mensuel',     icon: Calendar      },
  { key: 'TRIMESTRIEL', label: 'Trimestriel', icon: CalendarDays  },
  { key: 'ANNUEL',      label: 'Annuel',      icon: CalendarRange },
]

/* ── Petits composants formulaire ─────────────────────────────────────────── */
function Select({ label, value, onChange, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', letterSpacing: '.3px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            appearance: 'none', width: '100%',
            padding: '8px 36px 8px 12px',
            border: '1.5px solid #E5E7EB', borderRadius: 8,
            fontSize: '13px', color: '#111827', background: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {children}
        </select>
        <ChevronDown size={14} strokeWidth={2} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: '#9CA3AF', pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}


/* ── Panneau de résultats ──────────────────────────────────────────────────── */
function ResultPanel({ rapport, isLoading, error }) {
  if (isLoading) return (
    <div style={{ padding: '72px 0', textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto 14px' }} />
      <p style={{ fontSize: '13px', color: '#9CA3AF' }}>Génération du rapport en cours…</p>
    </div>
  )

  if (error) return (
    <div style={{
      background: '#FFF1F2', border: '1px solid #FECDD3',
      borderRadius: 10, padding: '16px 20px',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <AlertTriangle size={18} strokeWidth={2} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#DC2626' }}>Erreur de chargement</div>
        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: 3 }}>
          {error.response?.data?.detail || error.message || 'Une erreur inattendue s\'est produite.'}
        </div>
      </div>
    </div>
  )

  if (!rapport) return (
    <div style={{
      background: '#F9FAFB', border: '1.5px dashed #E5E7EB',
      borderRadius: 12, padding: '56px 24px', textAlign: 'center',
    }}>
      <FileBarChart size={36} strokeWidth={1.5} style={{ color: '#D1D5DB', margin: '0 auto 12px', display: 'block' }} />
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', margin: '0 0 6px' }}>
        Aucun rapport généré
      </p>
      <p style={{ fontSize: '12px', color: '#D1D5DB', margin: 0 }}>
        Sélectionnez les paramètres et cliquez sur <strong style={{ color: '#9CA3AF' }}>Générer</strong>
      </p>
    </div>
  )

  const meta = rapport.meta || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* En-tête du rapport */}
      <div style={{
        background: 'var(--af-ink)',
        borderRadius: 12, padding: '20px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(201,168,76,.8)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>
            Rapport {meta.type}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-.3px' }}>
            {meta.label_periode}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.45)', marginTop: 4 }}>
            {meta.date_debut} → {meta.date_fin}
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', textAlign: 'right' }}>
          Généré le<br />
          <span style={{ color: 'rgba(255,255,255,.65)', fontWeight: 600 }}>
            {meta.genere_le ? new Date(meta.genere_le).toLocaleString('fr-FR') : '—'}
          </span>
        </div>
      </div>

      <ResumeExecutif
        resume={rapport.resume}
        totalDepenses={rapport.total_depenses_periode}
        nbDepenses={rapport.nb_depenses_periode}
        comparaison={rapport.comparaison}
      />

      {(rapport.budget_annuel || rapport.detail_trimestres?.length > 0) && (
        <ExerciceBudgetaire
          budgetAnnuel={rapport.budget_annuel}
          detailTrimestres={rapport.detail_trimestres}
        />
      )}

      {rapport.detail_mois?.length > 0 && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--af-ink)', marginBottom: 14 }}>
            Détail mensuel
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {rapport.detail_mois.map((m) => {
              const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })
              return (
                <div key={m.mois} style={{
                  background: '#fff', borderRadius: 10, padding: '14px 16px',
                  boxShadow: '0 1px 4px rgba(0,0,0,.06)', borderTop: '3px solid #C9910A',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                    {MOIS_FR[m.mois - 1]}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 4 }}>
                    {fmt(m.total)} FCFA
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: 2 }}>
                    {m.nb} dépense{m.nb !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <DepensesParDepartement
        data={rapport.depenses_par_departement}
        totalPeriode={rapport.total_depenses_periode}
      />
      <TopDepenses data={rapport.top_depenses} />
      <RepartitionBudgets data={rapport.repartition_par_budget} />
      <AlertesSection alertes={rapport.alertes} />
    </div>
  )
}


/* ── Page principale ──────────────────────────────────────────────────────── */
export default function RapportPage() {
  const [tab,      setTab]      = useState('MENSUEL')
  const [mois,     setMois]     = useState(String(THIS_MONTH))
  const [trim,     setTrim]     = useState(String(THIS_Q))
  const [annee,    setAnnee]    = useState(String(THIS_YEAR))

  const generer      = useGenererRapport()
  const exportMut    = useExportRapport()

  // Le rapport courant est celui retourné par la mutation
  const rapport   = generer.data
  const isLoading = generer.isPending
  const error     = generer.error

  const handleGenerer = () => {
    switch (tab) {
      case 'MENSUEL':
        generer.mutate({ type: 'MENSUEL', mois: parseInt(mois), annee: parseInt(annee) })
        break
      case 'TRIMESTRIEL':
        generer.mutate({ type: 'TRIMESTRIEL', trimestre: parseInt(trim), annee: parseInt(annee) })
        break
      case 'ANNUEL':
        generer.mutate({ type: 'ANNUEL', annee: parseInt(annee) })
        break
    }
  }

  const handleExport = (format) => {
    if (!rapport) return
    const params = (() => {
      switch (tab) {
        case 'MENSUEL':     return { mois: parseInt(mois), annee: parseInt(annee) }
        case 'TRIMESTRIEL': return { trimestre: parseInt(trim), annee: parseInt(annee) }
        default:            return { annee: parseInt(annee) }
      }
    })()
    exportMut.mutate({ type: tab, format, params })
  }

  const canGenerate = () => {
    if (tab === 'MENSUEL')     return mois && annee
    if (tab === 'TRIMESTRIEL') return trim && annee
    return !!annee
  }

  const handleTabChange = (key) => {
    setTab(key)
    generer.reset()
  }

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports détaillés</h1>
          <p className="page-subtitle">Génération de rapports budgétaires par période</p>
        </div>
        {rapport && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleExport('EXCEL')}
              disabled={exportMut.isPending}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6 }}
            >
              <Download size={13} strokeWidth={2} /> Excel
            </button>
            <button
              onClick={() => handleExport('PDF')}
              disabled={exportMut.isPending}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6 }}
            >
              <Download size={13} strokeWidth={2} /> PDF
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--color-gray-200)' }}>
        {TABS.map(t => {
          const active = tab === t.key
          const IconComp = t.icon
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 18px 10px',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                color: active ? 'var(--af-ink)' : 'var(--color-gray-500)',
                borderBottom: active ? '2.5px solid var(--af-ink)' : '2.5px solid transparent',
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'color .15s',
              }}
            >
              <IconComp size={14} strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Panneau paramètres ───────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '20px',
          boxShadow: '0 1px 6px rgba(0,0,0,.07)',
          position: 'sticky', top: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: '#F8FAFC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileBarChart size={14} strokeWidth={2} style={{ color: 'var(--af-ink)' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Paramètres</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'MENSUEL' && <>
              <Select label="Mois" value={mois} onChange={setMois}>
                {MOIS_FR.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
              </Select>
              <Select label="Année" value={annee} onChange={setAnnee}>
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </Select>
            </>}

            {tab === 'TRIMESTRIEL' && <>
              <Select label="Trimestre" value={trim} onChange={setTrim}>
                <option value="1">T1 — Janv. / Mars</option>
                <option value="2">T2 — Avr. / Juin</option>
                <option value="3">T3 — Juil. / Sept.</option>
                <option value="4">T4 — Oct. / Déc.</option>
              </Select>
              <Select label="Année" value={annee} onChange={setAnnee}>
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </Select>
            </>}

            {tab === 'ANNUEL' && (
              <Select label="Année" value={annee} onChange={setAnnee}>
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </Select>
            )}
          </div>

          <button
            onClick={handleGenerer}
            disabled={!canGenerate() || isLoading}
            className="btn btn-primary btn-md"
            style={{ width: '100%', marginTop: 20, gap: 8, justifyContent: 'center' }}
          >
            {isLoading
              ? <><span className="spinner-sm" style={{ width: 14, height: 14 }} /> Génération…</>
              : <><RefreshCw size={14} strokeWidth={2} /> Générer le rapport</>
            }
          </button>

          {rapport && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleExport('EXCEL')}
                disabled={exportMut.isPending}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, gap: 5, justifyContent: 'center' }}
              >
                <Download size={12} strokeWidth={2} /> Excel
              </button>
              <button
                onClick={() => handleExport('PDF')}
                disabled={exportMut.isPending}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, gap: 5, justifyContent: 'center' }}
              >
                <Download size={12} strokeWidth={2} /> PDF
              </button>
            </div>
          )}
        </div>

        {/* ── Résultats ────────────────────────────────────────────────────── */}
        <ResultPanel rapport={rapport} isLoading={isLoading} error={error} />
      </div>
    </div>
  )
}
