import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAnomalies, getPredictions,
  traiterAnomalie, detecterAnomalies, predireDepassement,
} from '../../api/ia'
import { getBudgets } from '../../api/budget'
import { printPDF } from '../../utils/export'
import { formaterMontant, formaterMontantSigne } from '../../utils/formatters'
import {
  AlertTriangle, TrendingUp,
  CheckCircle2, XCircle, Brain, Zap, Shield,
  ScanSearch, Download, Activity,
} from 'lucide-react'

const NIVEAU_CFG = {
  FAIBLE:   { color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B', glow: 'rgba(245,158,11,.3)'  },
  MOYEN:    { color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B', glow: 'rgba(245,158,11,.3)'  },
  ELEVE:    { color: '#C2410C', bg: '#FFF7ED', dot: '#F97316', glow: 'rgba(249,115,22,.3)'  },
  CRITIQUE: { color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444', glow: 'rgba(239,68,68,.35)' },
}

export default function IADashboard() {
  const [onglet,      setOnglet]      = useState('anomalies')
  const [scanning,    setScanning]    = useState(false)
  const [scanMsg,     setScanMsg]     = useState('')
  const [scanResult,  setScanResult]  = useState(null)
  const qc = useQueryClient()

  const { data: anomaliesData }   = useQuery({ queryKey: ['ia-anomalies'],   queryFn: () => getAnomalies({ statut: 'DETECTEE' }).then(r => r.data),   retry: false, staleTime: 0 })
  const { data: predictionsData } = useQuery({ queryKey: ['ia-predictions'], queryFn: () => getPredictions().then(r => r.data.data),                    retry: false })

  const anomalies   = Array.isArray(anomaliesData?.data) ? anomaliesData.data : (anomaliesData?.data?.results || [])
  const predictions = Array.isArray(predictionsData) ? predictionsData : []

  const critiques     = anomalies.filter(a => ['ELEVE', 'CRITIQUE'].includes(a.niveau))
  const risquesEleves = predictions.filter(p => p.probabilite_depassement >= 0.5)

  /* ── Charger tous les budgets (toutes statuts sauf BROUILLON) ── */
  const getAllBudgets = async () => {
    const [r1, r2, r3] = await Promise.all([
      getBudgets({ statut: 'APPROUVE' }),
      getBudgets({ statut: 'SOUMIS' }),
      getBudgets({ statut: 'CLOTURE' }),
    ])
    const b1 = Array.isArray(r1.data) ? r1.data : (r1.data.results ?? r1.data)
    const b2 = Array.isArray(r2.data) ? r2.data : (r2.data.results ?? r2.data)
    const b3 = Array.isArray(r3.data) ? r3.data : (r3.data.results ?? r3.data)
    return [...b1, ...b2, ...b3]
  }

  /* ── Détecter anomalies sur tous les budgets soumis + approuvés ── */
  const handleScanAnomalies = async () => {
    setScanning(true)
    setScanMsg('Chargement des budgets…')
    try {
      const budgets = await getAllBudgets()
      if (budgets.length === 0) {
        setScanMsg('Aucun budget à analyser')
        setTimeout(() => setScanMsg(''), 3000)
        return
      }
      setScanMsg(`Analyse de ${budgets.length} budget(s)…`)
      let done = 0
      let totalFound = 0
      for (const b of budgets) {
        try {
          const r = await detecterAnomalies(b.id)
          totalFound += r.data?.nb_anomalies || 0
        } catch (_) { /* continue */ }
        done++
        setScanMsg(`Analyse ${done}/${budgets.length}…`)
      }
      await qc.invalidateQueries({ queryKey: ['ia-anomalies'] })
      await qc.refetchQueries({ queryKey: ['ia-anomalies'] })
      setScanResult({ total: budgets.length, found: totalFound, timestamp: new Date().toLocaleTimeString('fr-FR') })
      setScanMsg(`✓ ${budgets.length} budget(s) analysé(s)`)
      setOnglet('anomalies')
      setTimeout(() => setScanMsg(''), 3000)
    } catch (e) {
      setScanMsg('Erreur lors du scan')
      setTimeout(() => setScanMsg(''), 3000)
    } finally {
      setScanning(false)
    }
  }

  /* ── Prédire dépassements sur tous les budgets ── */
  const handlePredireTous = async () => {
    setScanning(true)
    setScanMsg('Génération des prédictions…')
    try {
      const budgets = await getAllBudgets()
      if (budgets.length === 0) {
        setScanMsg('Aucun budget à analyser')
        setTimeout(() => setScanMsg(''), 3000)
        return
      }
      let done = 0
      for (const b of budgets) {
        try { await predireDepassement(b.id) } catch (_) { /* continue */ }
        done++
        setScanMsg(`Prédiction ${done}/${budgets.length}…`)
      }
      await qc.invalidateQueries({ queryKey: ['ia-predictions'] })
      await qc.refetchQueries({ queryKey: ['ia-predictions'] })
      setScanMsg(`✓ Prédictions générées pour ${budgets.length} budget(s)`)
      setOnglet('predictions')
      setTimeout(() => setScanMsg(''), 3000)
    } catch (e) {
      setScanMsg('Erreur lors des prédictions')
      setTimeout(() => setScanMsg(''), 3000)
    } finally {
      setScanning(false)
    }
  }


  /* ── Export PDF du rapport IA ── */
  const handleExportPDF = () => {
    const now = new Date().toLocaleDateString('fr-FR')

    // Anomalies
    const rowsAno = anomalies.map(a => [
      a.niveau,
      a.type_anomalie,
      a.budget_reference || '—',
      a.description?.slice(0, 80) || '—',
      `${Math.round(a.score_confiance * 100)}%`,
      new Date(a.created_at).toLocaleDateString('fr-FR'),
    ])

    // Prédictions
    const rowsPred = predictions.map(p => [
      p.budget_reference,
      `${Math.round(p.probabilite_depassement * 100)}%`,
      formaterMontant(p.montant_prevu_final),
      formaterMontantSigne(p.ecart_prevu),
    ])

    // Construire rapport combiné
    const headers = ['Niveau / Budget', 'Type / Probabilité', 'Description / Montant prévu', 'Confiance / Écart', 'Date']
    const rows = [
      ...rowsAno.map(r => [r[0], r[1], r[3], r[4], r[5]]),
      ...(rowsAno.length && rowsPred.length ? [['─── Prédictions ───', '', '', '', '']] : []),
      ...rowsPred.map(r => [r[0], r[1], r[2], r[3], now]),
    ]

    printPDF(
      `Rapport IA — ${now}`,
      headers,
      rows,
      {
        subtitle: 'Analyse des anomalies et prédictions budgétaires',
        filters: `Généré le ${now}`,
        stats: [
          { value: anomalies.length,      label: 'Anomalies détectées' },
          { value: critiques.length,      label: 'Critiques / Élevées'  },
          { value: predictions.length,    label: 'Prédictions actives'  },
          { value: risquesEleves.length,  label: 'Risques élevés (≥50%)'},
        ],
      }
    )
  }

  const ONGLETS = [
    { key: 'anomalies',   label: 'Anomalies',    icon: <AlertTriangle size={14} strokeWidth={2} />, count: anomalies.length   },
    { key: 'predictions', label: 'Prédictions',  icon: <TrendingUp    size={14} strokeWidth={2} />, count: predictions.length },
  ]

  const KPI_DATA = [
    { label: 'ANOMALIES CRITIQUES',  value: critiques.length,     icon: <Shield size={18} strokeWidth={1.8} />, accent: 'var(--color-danger-600)',  iconBg: 'var(--color-danger-50)',  iconColor: 'var(--color-danger-600)'  },
    { label: 'PRÉDICTIONS À RISQUE', value: risquesEleves.length, icon: <Zap    size={18} strokeWidth={1.8} />, accent: '#C2410C',                  iconBg: '#fff7ed',                 iconColor: '#C2410C'                  },
    { label: 'TOTAL ANOMALIES',      value: anomalies.length,     icon: <Brain  size={18} strokeWidth={1.8} />, accent: 'var(--af-ink)',    iconBg: 'rgba(14,42,71,0.07)',    iconColor: 'var(--af-ink)'    },
    { label: 'TOTAL PRÉDICTIONS',    value: predictions.length,   icon: <TrendingUp size={18} strokeWidth={1.8} />, accent: 'var(--color-success-600)', iconBg: 'var(--color-success-50)', iconColor: 'var(--color-success-600)' },
  ]

  return (
    <div style={{ animation: 'fadeIn .25s ease' }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(184,134,74,.25)',
          }}>
            <Brain size={22} strokeWidth={1.8} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title">Veille & Analyse Budgétaire</h1>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#F0FDF4', border: '1px solid #BBF7D0',
                borderRadius: 9999, padding: '3px 11px',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#16A34A', boxShadow: '0 0 5px rgba(22,163,74,.5)',
                  animation: 'ia-pulse 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803D' }}>En ligne</span>
              </div>
            </div>
            <p className="page-subtitle">Détection d'anomalies, prédictions de dépassement et rapports d'analyse avancée</p>
          </div>
        </div>

        {/* Boutons d'action rapide */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {scanMsg && (
            <span style={{
              fontSize: '12px', color: scanning ? 'var(--color-gold)' : 'var(--color-success-600)',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {scanning && <span className="spinner-sm" />}
              {scanMsg}
            </span>
          )}
          <button
            onClick={handleScanAnomalies}
            disabled={scanning}
            className="btn btn-md"
            style={{
              gap: 7, background: '#FEF2F2', color: '#DC2626',
              border: '1px solid #FECACA',
              opacity: scanning ? .6 : 1,
            }}
          >
            <ScanSearch size={15} strokeWidth={2} />
            Vérifier anomalies
          </button>
          <button
            onClick={handlePredireTous}
            disabled={scanning}
            className="btn btn-md"
            style={{
              gap: 7, background: '#F0FDF4', color: '#15803D',
              border: '1px solid #BBF7D0',
              opacity: scanning ? .6 : 1,
            }}
          >
            <Activity size={15} strokeWidth={2} />
            Prédire dépassements
          </button>
          <button
            onClick={handleExportPDF}
            className="btn btn-secondary btn-md"
            style={{ gap: 7 }}
          >
            <Download size={15} strokeWidth={2} />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {KPI_DATA.map(({ label, value, icon, accent, iconBg, iconColor }) => (
          <div key={label} className="card" style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
            transition: 'transform .15s, box-shadow .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 11, flexShrink: 0,
              background: iconBg, color: iconColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-gray-500)', letterSpacing: '.8px', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.6rem',
                color: value > 0 ? accent : '#1F2937', lineHeight: 1,
              }}>
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid #E5E7EB' }}>
        {ONGLETS.map(t => (
          <button
            key={t.key}
            onClick={() => setOnglet(t.key)}
            style={{
              padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              borderBottom: onglet === t.key ? '2px solid var(--color-gold)' : '2px solid transparent',
              color: onglet === t.key ? 'var(--color-gold)' : '#6B7280',
              fontWeight: onglet === t.key ? 700 : 500, fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: 7, transition: 'color .15s',
            }}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: onglet === t.key ? 'var(--color-gold)' : '#E5E7EB',
                color: onglet === t.key ? '#fff' : '#6B7280',
                fontSize: '10px', padding: '1px 7px', borderRadius: 9999, fontWeight: 700,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <div style={{ animation: 'fadeIn .2s ease' }}>
        {onglet === 'anomalies'   && <AnomaliesTab   anomalies={anomalies} onScan={handleScanAnomalies} scanning={scanning} scanResult={scanResult} />}
        {onglet === 'predictions' && <PredictionsTab predictions={predictions} onPredire={handlePredireTous} scanning={scanning} scanResult={scanResult} />}
      </div>
    </div>
  )
}

/* ── Onglet Anomalies ──────────────────────────────────────────────────────── */
function AnomaliesTab({ anomalies, onScan, scanning, scanResult }) {
  const qc = useQueryClient()
  const { mutate: traiter } = useMutation({
    mutationFn: ({ id, statut }) => traiterAnomalie(id, statut),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ia-anomalies'] }),
  })

  if (!anomalies.length) return (
    <div>
      {scanResult && (
        <div style={{
          background: '#F0FDF4', color: '#15803D',
          border: '1px solid #BBF7D0', borderRadius: 8,
          padding: '8px 14px', marginBottom: 16,
          fontSize: '12.5px', fontWeight: 600,
        }}>
          {scanResult.found > 0
            ? `✓ Scan du ${scanResult.timestamp} — ${scanResult.total} budget(s) analysé(s), ${scanResult.found} anomalie(s) détectée(s).`
            : `✓ Scan du ${scanResult.timestamp} — ${scanResult.total} budget(s) analysé(s). Aucune anomalie détectée.`
          }
        </div>
      )}
      <div className="empty-state">
        <div style={{
          width: 64, height: 64, borderRadius: '50%', marginBottom: 16,
          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle2 size={30} strokeWidth={1.5} style={{ color: '#16a34a' }} />
        </div>
        <p className="empty-title">Aucune anomalie détectée</p>
        <p className="empty-body">Le système surveille vos budgets en continu.</p>
        <button
          onClick={onScan}
          disabled={scanning}
          className="btn btn-primary btn-md"
          style={{ marginTop: 16, gap: 7, opacity: scanning ? .6 : 1 }}
        >
          <ScanSearch size={15} strokeWidth={2} />
          {scanning ? 'Analyse en cours…' : 'Lancer une analyse complète'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {scanResult && (
        <div style={{
          background: '#F0FDF4', color: '#15803D',
          border: '1px solid #BBF7D0', borderRadius: 8,
          padding: '8px 14px', marginBottom: 16,
          fontSize: '12.5px', fontWeight: 600,
        }}>
          {scanResult.found > 0
            ? `✓ Scan du ${scanResult.timestamp} — ${scanResult.total} budget(s) analysé(s), ${scanResult.found} anomalie(s) détectée(s).`
            : `✓ Scan du ${scanResult.timestamp} — ${scanResult.total} budget(s) analysé(s). Aucune anomalie détectée.`
          }
        </div>
      )}
      {anomalies.map(a => {
        const cfg      = NIVEAU_CFG[a.niveau] || NIVEAU_CFG.FAIBLE
        const confiance = Math.round(a.score_confiance * 100)
        return (
          <div
            key={a.id}
            className="card"
            style={{
              padding: '18px 20px',
              borderLeft: `4px solid ${cfg.dot}`,
              background: `linear-gradient(to right, ${cfg.bg}80, #fff 30%)`,
              transition: 'transform .15s, box-shadow .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${cfg.glow}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: cfg.bg, border: `1px solid ${cfg.dot}30`,
                    padding: '3px 10px', borderRadius: 9999,
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
                    <span style={{ fontSize: '10px', fontWeight: 800, color: cfg.color, letterSpacing: '.8px' }}>{a.niveau}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>{a.type_anomalie}</span>
                  {a.budget_reference && <span className="code-tag">{a.budget_reference}</span>}
                </div>
                <p style={{ fontSize: '12.5px', color: '#4B5563', lineHeight: 1.65, margin: '0 0 10px' }}>{a.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>Confiance</span>
                  <div style={{ flex: 1, height: 4, background: '#F3F4F6', borderRadius: 9999, overflow: 'hidden', maxWidth: 120 }}>
                    <div style={{
                      height: '100%', borderRadius: 9999,
                      width: `${confiance}%`,
                      background: `linear-gradient(90deg, ${cfg.dot}80, ${cfg.dot})`,
                      transition: 'width .6s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: cfg.color }}>{confiance}%</span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>· {new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              {a.statut === 'DETECTEE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => traiter({ id: a.id, statut: 'CONFIRMEE' })}
                    className="btn btn-sm"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', gap: 5, boxShadow: '0 2px 8px rgba(239,68,68,.3)' }}
                  >
                    <AlertTriangle size={12} strokeWidth={2} /> Confirmer
                  </button>
                  <button
                    onClick={() => traiter({ id: a.id, statut: 'FAUX_POSITIF' })}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 5 }}
                  >
                    <XCircle size={12} strokeWidth={2} /> Faux positif
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Onglet Prédictions ────────────────────────────────────────────────────── */
function PredictionsTab({ predictions, onPredire, scanning }) {
  const [expanded, setExpanded] = useState(null)
  const handleExportPredictions = () => {
    const rows = predictions.map(p => [
      p.budget_reference,
      `${Math.round(p.probabilite_depassement * 100)}%`,
      formaterMontant(p.montant_prevu_final),
      formaterMontantSigne(p.ecart_prevu),
    ])
    printPDF('Prédictions de dépassement', ['Budget', 'Probabilité dépassement', 'Montant prévu final', 'Écart prévu'], rows, {
      subtitle: 'Prédictions IA des budgets à risque',
      stats: [
        { value: predictions.length, label: 'Total prédictions' },
        { value: predictions.filter(p => p.probabilite_depassement >= 0.5).length, label: 'Risques élevés ≥50%' },
      ],
    })
  }

  if (!predictions.length) return (
    <div className="empty-state">
      <div style={{
        width: 64, height: 64, borderRadius: '50%', marginBottom: 16,
        background: 'linear-gradient(135deg, #FEF9EC, #F3D07A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TrendingUp size={30} strokeWidth={1.5} style={{ color: '#C9910A' }} />
      </div>
      <p className="empty-title">Aucune prédiction active</p>
      <p className="empty-body">Lancez une analyse pour prédire les risques de dépassement sur vos budgets.</p>
      <button
        onClick={onPredire}
        disabled={scanning}
        className="btn btn-primary btn-md"
        style={{ marginTop: 16, gap: 7, opacity: scanning ? .6 : 1 }}
      >
        <Activity size={15} strokeWidth={2} />
        {scanning ? 'Analyse en cours…' : 'Générer les prédictions'}
      </button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={handleExportPredictions} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          <Download size={13} strokeWidth={2} /> Exporter PDF
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {predictions.map(p => {
          const pct      = Math.round(p.probabilite_depassement * 100)
          const color    = pct >= 75 ? '#DC2626' : pct >= 50 ? '#C2410C' : pct >= 25 ? '#D97706' : '#16A34A'
          const bgColor  = pct >= 75 ? '#FEF2F2' : pct >= 50 ? '#FFF7ED' : pct >= 25 ? '#FFFBEB' : '#F0FDF4'
          const barGrad  = pct >= 50 ? 'linear-gradient(90deg, #f97316, #dc2626)' : pct >= 25 ? 'linear-gradient(90deg, #fbbf24, #f97316)' : 'linear-gradient(90deg, #34d399, #10b981)'
          const isOpen   = expanded === p.id
          const facteurs = Array.isArray(p.facteurs) ? p.facteurs : []
          return (
            <div key={p.id} className="card" style={{ borderTop: `3px solid ${color}`, overflow: 'hidden' }}>
              {/* Ligne principale cliquable */}
              <div
                style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
                onClick={() => setExpanded(isOpen ? null : p.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{p.budget_reference}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: bgColor, color, padding: '2px 8px', borderRadius: 9999 }}>
                      {p.niveau_risque || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                      Montant consommé :&nbsp;
                      <strong style={{ fontFamily: 'var(--font-mono)', color: '#1F2937' }}>
                        {formaterMontant(p.montant_prevu_final)}
                      </strong>
                    </span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                      Écart :&nbsp;
                      <strong style={{ fontFamily: 'var(--font-mono)', color }}>
                        {formaterMontantSigne(p.ecart_prevu)}
                      </strong>
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 68, background: bgColor, borderRadius: 10, padding: '8px 12px', border: `1px solid ${color}30` }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.4rem', color, lineHeight: 1 }}>{pct}%</div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color, marginTop: 2, letterSpacing: '.5px' }}>RISQUE</div>
                  </div>
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="exec-bar" style={{ height: 5, borderRadius: 0, margin: '0 22px 0' }}>
                <div className="exec-bar-fill" style={{ width: `${pct}%`, background: barGrad, boxShadow: `0 0 6px ${color}40` }} />
              </div>

              {/* Détail expandable */}
              {isOpen && (
                <div style={{ padding: '16px 22px', borderTop: '1px solid #F3F4F6', background: bgColor + '40', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Recommandation */}
                  {p.recommandation && (
                    <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#fff', borderRadius: 8, border: `1px solid ${color}20` }}>
                      <Brain size={14} style={{ color, flexShrink: 0, marginTop: 1 }} strokeWidth={2} />
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#374151', lineHeight: 1.6 }}>{p.recommandation}</p>
                    </div>
                  )}
                  {/* Facteurs */}
                  {facteurs.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.6px' }}>Facteurs analysés</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {facteurs.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: '#fff', borderRadius: 7, border: '1px solid #F3F4F6' }}>
                            <span style={{ fontSize: 14 }}>{f.impact === 'NEGATIF' ? '⚠️' : '✅'}</span>
                            <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{f.facteur}</span>
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: f.impact === 'NEGATIF' ? '#DC2626' : '#16A34A' }}>{f.valeur}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF' }}>
                    Taux actuel : {p.taux_actuel}% · Généré le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
