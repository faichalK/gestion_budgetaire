import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAnomalies, getPredictions,
  traiterAnomalie, detecterAnomalies, predireDepassement,
} from '../../api/ia'
import { getBudgets } from '../../api/budget'
import { printPDF } from '../../utils/export'
import { formaterMontant, formaterMontantSigne } from '../../utils/formatters'
import { Icon } from '../../components/AtlasIcons'

const NIVEAU_CFG = {
  FAIBLE:   { color: '#D97706', dot: '#F59E0B', r: '245,158,11', label: 'Faible'   },
  MOYEN:    { color: '#D97706', dot: '#F59E0B', r: '245,158,11', label: 'Moyen'    },
  ELEVE:    { color: '#C2410C', dot: '#F97316', r: '249,115,22', label: 'Élevé'    },
  CRITIQUE: { color: '#DC2626', dot: '#EF4444', r: '239,68,68',  label: 'Critique' },
}

export default function IADashboard() {
  const [onglet,     setOnglet]     = useState('anomalies')
  const [scanning,   setScanning]   = useState(false)
  const [scanMsg,    setScanMsg]    = useState('')
  const [scanResult, setScanResult] = useState(null)
  const qc = useQueryClient()

  const { data: anomaliesData }   = useQuery({
    queryKey: ['ia-anomalies'],
    queryFn:  () => getAnomalies({ statut: 'DETECTEE' }).then(r => r.data),
    retry: false, staleTime: 0,
  })
  const { data: predictionsData } = useQuery({
    queryKey: ['ia-predictions'],
    queryFn:  () => getPredictions().then(r => r.data.data),
    retry: false,
  })

  const anomalies     = Array.isArray(anomaliesData?.data) ? anomaliesData.data : (anomaliesData?.data?.results || [])
  const predictions   = Array.isArray(predictionsData) ? predictionsData : []
  const critiques     = anomalies.filter(a => ['ELEVE', 'CRITIQUE'].includes(a.niveau))
  const risquesEleves = predictions.filter(p => p.probabilite_depassement >= 0.5)

  /* ── Alertes budgétaires (budgets avec niveau_alerte critique) ── */
  const { data: budgetsData, refetch: refetchAlertes, isFetching: alertesFetching, isError: alertesError } = useQuery({
    queryKey: ['budgets-alertes'],
    queryFn:  () => getBudgets().then(r => r.data.results ?? r.data ?? []),
    staleTime: 0,
    retry: 1,
  })
  const tousLesBudgets = Array.isArray(budgetsData) ? budgetsData : []
  const alertes          = tousLesBudgets.filter(b => ['ROUGE', 'CRITIQUE'].includes(b.niveau_alerte))
  const alertesCritiques = alertes.filter(b => b.niveau_alerte === 'CRITIQUE')
  const alertesRouge     = alertes.filter(b => b.niveau_alerte === 'ROUGE')

  const ALERTE_CFG = {
    CRITIQUE: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Critique (≥100%)' },
    ROUGE:    { color: '#C2410C', bg: 'rgba(194,65,12,0.08)',  label: 'Rouge (≥90%)'    },
  }

  /* ── Charger tous les budgets actifs ── */
  const getAllBudgets = async () => {
    const [r1, r2, r3] = await Promise.all([
      getBudgets({ statut: 'APPROUVE' }),
      getBudgets({ statut: 'SOUMIS' }),
      getBudgets({ statut: 'CLOTURE' }),
    ])
    const flat = r => Array.isArray(r.data) ? r.data : (r.data.results ?? r.data)
    return [...flat(r1), ...flat(r2), ...flat(r3)]
  }

  /* ── Détecter anomalies ── */
  const handleScanAnomalies = async () => {
    setScanning(true)
    setScanMsg('Chargement des budgets…')
    try {
      const budgets = await getAllBudgets()
      if (!budgets.length) { setScanMsg('Aucun budget à analyser'); setTimeout(() => setScanMsg(''), 3000); return }
      setScanMsg(`Analyse de ${budgets.length} budget(s)…`)
      let done = 0, totalFound = 0
      for (const b of budgets) {
        try { const r = await detecterAnomalies(b.id); totalFound += r.data?.nb_anomalies || 0 } catch { /* continue */ }
        setScanMsg(`Analyse ${++done}/${budgets.length}…`)
      }
      await qc.invalidateQueries({ queryKey: ['ia-anomalies'] })
      await qc.refetchQueries({ queryKey: ['ia-anomalies'] })
      setScanResult({ total: budgets.length, found: totalFound, timestamp: new Date().toLocaleTimeString('fr-FR') })
      setScanMsg(`✓ ${budgets.length} budget(s) analysé(s)`)
      setOnglet('anomalies')
      setTimeout(() => setScanMsg(''), 3000)
    } catch { setScanMsg('Erreur lors du scan'); setTimeout(() => setScanMsg(''), 3000) }
    finally { setScanning(false) }
  }

  /* ── Prédire dépassements ── */
  const handlePredireTous = async () => {
    setScanning(true)
    setScanMsg('Génération des prédictions…')
    try {
      const budgets = await getAllBudgets()
      if (!budgets.length) { setScanMsg('Aucun budget à analyser'); setTimeout(() => setScanMsg(''), 3000); return }
      let done = 0
      for (const b of budgets) {
        try { await predireDepassement(b.id) } catch { /* continue */ }
        setScanMsg(`Prédiction ${++done}/${budgets.length}…`)
      }
      await qc.invalidateQueries({ queryKey: ['ia-predictions'] })
      await qc.refetchQueries({ queryKey: ['ia-predictions'] })
      setScanMsg(`✓ Prédictions générées pour ${budgets.length} budget(s)`)
      setOnglet('predictions')
      setTimeout(() => setScanMsg(''), 3000)
    } catch { setScanMsg('Erreur lors des prédictions'); setTimeout(() => setScanMsg(''), 3000) }
    finally { setScanning(false) }
  }

  /* ── Export PDF ── */
  const handleExportPDF = () => {
    const now = new Date().toLocaleDateString('fr-FR')
    printPDF(
      `Rapport IA — ${now}`,
      ['Niveau', 'Type', 'Description', 'Confiance', 'Date'],
      anomalies.map(a => [
        a.niveau,
        a.type_anomalie,
        a.description?.slice(0, 80) || '—',
        `${Math.round(a.score_confiance * 100)}%`,
        new Date(a.created_at).toLocaleDateString('fr-FR'),
      ]),
      {
        subtitle: 'Analyse IA des anomalies et prédictions budgétaires',
        filters: `Généré le ${now}`,
        stats: [
          { value: anomalies.length,     label: 'Anomalies détectées' },
          { value: critiques.length,     label: 'Critiques / Élevées' },
          { value: predictions.length,   label: 'Prédictions actives' },
          { value: risquesEleves.length, label: 'Risques ≥ 50%'       },
        ],
      }
    )
  }

  const TABS = [
    { key: 'anomalies',   label: 'Anomalies',   icon: Icon.ai,    count: anomalies.length },
    { key: 'predictions', label: 'Prédictions', icon: Icon.kpi,   count: predictions.length },
    { key: 'alertes',     label: 'Alertes',     icon: Icon.alert, count: alertes.length, danger: alertesCritiques.length > 0 },
  ]

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="mb-7 flex items-end gap-6">
        <div>
          <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">Intelligence artificielle · analyse & recommandations</div>
          <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Analyse budgétaire IA</h1>
          <div className="text-[13px] text-[#5A6B7E]">
            {anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} · {predictions.length} prédiction{predictions.length > 1 ? 's' : ''}
          </div>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button onClick={handleExportPDF} className="btn btn-secondary btn-sm" style={{ gap: 7 }}>
            {Icon.download} Rapport PDF
          </button>
          <button onClick={handlePredireTous} disabled={scanning} className="btn btn-secondary btn-sm" style={{ gap: 7, opacity: scanning ? 0.65 : 1 }}>
            {Icon.sparkle} Prédictions
          </button>
          <button onClick={handleScanAnomalies} disabled={scanning} className="btn btn-primary btn-sm" style={{ gap: 7, opacity: scanning ? 0.65 : 1 }}>
            {scanning
              ? <><span className="spinner-sm" /> Analyse…</>
              : <>{Icon.ai} Lancer un scan</>
            }
          </button>
        </div>
      </div>

      {/* ── Barre de progression scan ── */}
      {scanMsg && (
        <div style={{
          marginBottom: 20, padding: '10px 16px',
          background: '#fff', border: '1px solid var(--af-line)',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {scanning && <span className="af-spinner" style={{ width: 14, height: 14, flexShrink: 0 }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: scanning ? 'var(--af-gold)' : 'var(--af-st-approve)' }}>
            {scanMsg}
          </span>
        </div>
      )}

      {/* ── KPI ── */}
      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">{Icon.alert} Anomalies critiques</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{critiques.length}</div>
          <div className={critiques.length > 0 ? 'text-[11px] text-[#B91C1C]' : 'text-[11px] text-[#5A6B7E]'}>
            {critiques.length > 0 ? 'Attention requise' : 'Aucune alerte'}
          </div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">{Icon.sparkle} Risques ≥ 50 %</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{risquesEleves.length}</div>
          <div className={risquesEleves.length > 0 ? 'text-[11px] text-[#B91C1C]' : 'text-[11px] text-[#5A6B7E]'}>
            {risquesEleves.length > 0 ? 'Dépassement probable' : 'Risque maîtrisé'}
          </div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">{Icon.ai} Total anomalies</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{anomalies.length}</div>
          <div className="text-[11px] text-[#5A6B7E]">{anomalies.length} signal{anomalies.length > 1 ? 'aux' : ''} détecté{anomalies.length > 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)]">
          <div className="text-[10px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 flex items-center gap-2 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#B8864A]">{Icon.kpi} Prédictions actives</div>
          <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums">{predictions.length}</div>
          <div className="text-[11px] text-[#5A6B7E]">{predictions.length} budget{predictions.length > 1 ? 's' : ''} analysé{predictions.length > 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--af-line)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setOnglet(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 18px 11px', fontFamily: 'var(--af-sans)',
              fontSize: 14, fontWeight: onglet === t.key ? 700 : 500,
              color: onglet === t.key ? 'var(--af-gold)' : 'var(--af-cream)',
              borderBottom: onglet === t.key ? '2.5px solid var(--af-gold)' : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'color .15s',
            }}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: t.danger ? '#DC2626' : onglet === t.key ? 'var(--af-gold)' : 'var(--af-line)',
                color: '#fff',
                fontSize: 11, padding: '1px 7px', borderRadius: 9999, fontWeight: 700,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenu onglets ── */}
      {onglet === 'anomalies'   && <AnomaliesTab   anomalies={anomalies}     onScan={handleScanAnomalies} scanning={scanning} scanResult={scanResult} />}
      {onglet === 'predictions' && <PredictionsTab predictions={predictions} onPredire={handlePredireTous} scanning={scanning} />}
      {onglet === 'alertes'     && <AlertesTab alertes={alertes} critiques={alertesCritiques} rouge={alertesRouge} cfg={ALERTE_CFG} onRefresh={refetchAlertes} fetching={alertesFetching} erreur={alertesError} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   Onglet Anomalies
══════════════════════════════════════════════════════════════════════════════ */
function AnomaliesTab({ anomalies, onScan, scanning, scanResult }) {
  const qc = useQueryClient()
  const { mutate: traiter } = useMutation({
    mutationFn: ({ id, statut }) => traiterAnomalie(id, statut),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['ia-anomalies'] }),
  })

  if (!anomalies.length) return (
    <div>
      {scanResult && <ScanBanner scanResult={scanResult} />}
      <div className="af-loader" style={{ padding: '56px 24px', border: '1.5px dashed var(--af-line-2)', borderRadius: 12 }}>
        <span style={{ fontSize: 32, color: 'var(--color-success-600)' }}>{Icon.check}</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Aucune anomalie détectée</span>
        <span style={{ fontSize: 13, color: 'var(--af-mute)' }}>Le système surveille vos budgets en continu.</span>
        <button onClick={onScan} disabled={scanning} className="btn btn-primary btn-sm" style={{ marginTop: 8, gap: 7, opacity: scanning ? .6 : 1 }}>
          {Icon.search} {scanning ? 'Analyse en cours…' : 'Lancer une analyse complète'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {scanResult && <ScanBanner scanResult={scanResult} />}
      {anomalies.map(a => {
        const cfg      = NIVEAU_CFG[a.niveau] || NIVEAU_CFG.FAIBLE
        const confiance = Math.round(a.score_confiance * 100)
        return (
          <div key={a.id} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]" style={{ borderLeft: `4px solid ${cfg.dot}` }}>
            <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                {/* Niveau + type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: `rgba(${cfg.r},0.10)`, border: `1px solid rgba(${cfg.r},0.30)`,
                    padding: '3px 10px', borderRadius: 9999,
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, letterSpacing: '.8px' }}>{cfg.label}</span>
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--af-ink)' }}>{a.type_anomalie}</span>
                  {a.budget_reference && <span className="ref" style={{ fontFamily: 'var(--af-mono)', fontSize: 12, color: 'var(--af-gold)' }}>{a.budget_reference}</span>}
                </div>
                {/* Description */}
                <p style={{ fontSize: 13, color: 'var(--af-cream)', lineHeight: 1.65, margin: '0 0 12px' }}>{a.description}</p>
                {/* Barre de confiance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--af-mute)' }}>Confiance</span>
                  <div style={{ width: 100, height: 4, background: 'var(--af-line)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 9999, width: `${confiance}%`, background: cfg.dot, transition: 'width .6s ease' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--af-mono)', color: cfg.color }}>{confiance}%</span>
                  <span style={{ fontSize: 12, color: 'var(--af-mute)' }}>
                    · {new Date(a.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              {/* Actions */}
              {a.statut === 'DETECTEE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => traiter({ id: a.id, statut: 'CONFIRMEE' })} className="btn btn-danger btn-sm" style={{ gap: 5 }}>
                    {Icon.ai} Confirmer
                  </button>
                  <button onClick={() => traiter({ id: a.id, statut: 'FAUX_POSITIF' })} className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
                    {Icon.reject} Faux positif
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

/* ══════════════════════════════════════════════════════════════════════════════
   Onglet Prédictions
══════════════════════════════════════════════════════════════════════════════ */
function PredictionsTab({ predictions, onPredire, scanning }) {
  const [expanded, setExpanded] = useState(null)

  const handleExportPredictions = () => {
    printPDF(
      'Prédictions de dépassement',
      ['Budget', 'Probabilité', 'Montant prévu', 'Écart'],
      predictions.map(p => [
        p.budget_reference,
        `${Math.round(p.probabilite_depassement * 100)}%`,
        formaterMontant(p.montant_prevu_final),
        formaterMontantSigne(p.ecart_prevu),
      ]),
      {
        subtitle: 'Prédictions IA des budgets à risque',
        stats: [
          { value: predictions.length, label: 'Total prédictions' },
          { value: predictions.filter(p => p.probabilite_depassement >= 0.5).length, label: 'Risques ≥ 50 %' },
        ],
      }
    )
  }

  if (!predictions.length) return (
    <div className="af-loader" style={{ padding: '56px 24px', border: '1.5px dashed var(--af-line-2)', borderRadius: 12 }}>
      <span style={{ fontSize: 32, color: 'var(--af-gold)' }}>{Icon.kpi}</span>
      <span style={{ fontSize: 16, fontWeight: 600 }}>Aucune prédiction active</span>
      <span style={{ fontSize: 13, color: 'var(--af-mute)' }}>Lancez une analyse pour prédire les risques de dépassement.</span>
      <button onClick={onPredire} disabled={scanning} className="btn btn-primary btn-sm" style={{ marginTop: 8, gap: 7, opacity: scanning ? .6 : 1 }}>
        {Icon.sparkle} {scanning ? 'Analyse en cours…' : 'Générer les prédictions'}
      </button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={handleExportPredictions} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          {Icon.download} Exporter PDF
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {predictions.map(p => {
          const pct    = Math.round(p.probabilite_depassement * 100)
          const color  = pct >= 75 ? '#DC2626' : pct >= 50 ? '#C2410C' : pct >= 25 ? '#D97706' : '#16A34A'
          const isOpen = expanded === p.id
          const facteurs = Array.isArray(p.facteurs) ? p.facteurs : []

          return (
            <div key={p.id} className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]" style={{ borderTop: `3px solid ${color}`, overflow: 'hidden' }}>
              {/* Ligne principale cliquable */}
              <div
                style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
                onClick={() => setExpanded(isOpen ? null : p.id)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--af-steel)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--af-ink)' }}>{p.budget_reference}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      background: `${color}18`, color,
                      padding: '2px 8px', borderRadius: 9999,
                      border: `1px solid ${color}30`,
                    }}>
                      {p.niveau_risque || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--af-cream)' }}>
                      Montant prévu : <strong style={{ fontFamily: 'var(--af-mono)', color: 'var(--af-ivory)' }}>{formaterMontant(p.montant_prevu_final)}</strong>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--af-cream)' }}>
                      Écart : <strong style={{ fontFamily: 'var(--af-mono)', color }}>{formaterMontantSigne(p.ecart_prevu)}</strong>
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    textAlign: 'center', flexShrink: 0, minWidth: 68,
                    background: `${color}12`, borderRadius: 10,
                    padding: '8px 14px', border: `1px solid ${color}25`,
                  }}>
                    <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 900, fontSize: '1.5rem', color, lineHeight: 1 }}>{pct}%</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color, marginTop: 2, letterSpacing: '.5px' }}>RISQUE</div>
                  </div>
                  <span style={{ color: 'var(--af-mute)', fontSize: 13 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Barre progression */}
              <div className="af-bar" style={{ height: 4, borderRadius: 0, margin: '0 22px' }}>
                <div className="af-bar-fill" style={{
                  width: `${pct}%`,
                  background: pct >= 50 ? `linear-gradient(90deg, #f97316, ${color})` : 'linear-gradient(90deg, #34d399, #10b981)',
                }} />
              </div>

              {/* Détail expandable */}
              {isOpen && (
                <div style={{ padding: '16px 22px', borderTop: '1px solid var(--af-line)', background: 'var(--af-steel)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {p.recommandation && (
                    <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid var(--af-line)' }}>
                      <span style={{ color: 'var(--af-gold)', flexShrink: 0 }}>{Icon.ai}</span>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--af-cream)', lineHeight: 1.6 }}>{p.recommandation}</p>
                    </div>
                  )}
                  {facteurs.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--af-mute)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
                        Facteurs analysés
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {facteurs.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 7, border: '1px solid var(--af-line)' }}>
                            <span style={{ fontSize: 14 }}>{f.impact === 'NEGATIF' ? '⚠️' : '✅'}</span>
                            <span style={{ fontSize: 13, color: 'var(--af-ivory)', flex: 1 }}>{f.facteur}</span>
                            <span style={{ fontSize: 12, fontFamily: 'var(--af-mono)', fontWeight: 700, color: f.impact === 'NEGATIF' ? '#DC2626' : '#16A34A' }}>{f.valeur}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--af-mute)' }}>
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

function ScanBanner({ scanResult }) {
  return (
    <div style={{
      background: 'var(--color-success-50)', color: 'var(--color-success-700)',
      border: '1px solid var(--color-success-200)', borderRadius: 8,
      padding: '10px 16px', marginBottom: 12, fontSize: 13, fontWeight: 600,
    }}>
      {scanResult.found > 0
        ? `✓ Scan du ${scanResult.timestamp} — ${scanResult.total} budget(s) analysé(s), ${scanResult.found} anomalie(s) détectée(s).`
        : `✓ Scan du ${scanResult.timestamp} — ${scanResult.total} budget(s) analysé(s). Aucune anomalie.`
      }
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   Onglet Alertes
══════════════════════════════════════════════════════════════════════════════ */
function AlertesTab({ alertes, critiques, rouge, cfg, onRefresh, fetching, erreur }) {
  const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(parseFloat(n) || 0))

  const BtnActualiser = () => (
    <button
      onClick={onRefresh}
      disabled={fetching}
      style={{ marginTop: 16, fontSize: 12, color: 'var(--color-gold)', background: 'none', border: 'none', cursor: fetching ? 'default' : 'pointer', fontWeight: 600, opacity: fetching ? 0.6 : 1 }}
    >
      {fetching ? 'Actualisation…' : '↻ Actualiser'}
    </button>
  )

  if (fetching && !alertes.length) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--af-mute)', fontSize: 13 }}>
      Chargement des alertes…
    </div>
  )

  if (erreur) return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: '#DC2626', marginBottom: 6 }}>Erreur lors du chargement des alertes.</div>
      <BtnActualiser />
    </div>
  )

  if (!alertes.length) return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-success-600)', marginBottom: 6 }}>Aucune alerte active</div>
      <div style={{ fontSize: 13, color: 'var(--af-mute)' }}>Tous les budgets sont dans les seuils normaux (taux &lt; 90%).</div>
      <BtnActualiser />
    </div>
  )

  const GROUPS = [
    { key: 'CRITIQUE', label: cfg.CRITIQUE.label, items: critiques, color: cfg.CRITIQUE.color, bg: cfg.CRITIQUE.bg },
    { key: 'ROUGE',    label: cfg.ROUGE.label,    items: rouge,     color: cfg.ROUGE.color,    bg: cfg.ROUGE.bg    },
  ].filter(g => g.items.length > 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={onRefresh}
          disabled={fetching}
          style={{ fontSize: 12, color: 'var(--color-gold)', background: 'none', border: '1px solid rgba(201,169,97,.3)', borderRadius: 6, padding: '4px 12px', cursor: fetching ? 'default' : 'pointer', fontWeight: 600, opacity: fetching ? 0.6 : 1 }}
        >
          {fetching ? 'Actualisation…' : '↻ Actualiser'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Critique (≥100%)', count: critiques.length, color: '#DC2626' },
          { label: 'Rouge (≥90%)',     count: rouge.length,     color: '#C2410C' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid var(--af-line)', borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--af-mute)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.count}</div>
            <div style={{ fontSize: 11, color: 'var(--af-mute)', marginTop: 4 }}>budget{k.count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {GROUPS.map(g => (
        <div key={g.key} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: g.bg, borderRadius: 8, marginBottom: 10, border: `1px solid ${g.color}30` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: g.color }}>{g.label}</span>
            <span style={{ fontSize: 12, color: 'var(--af-mute)' }}>— {g.items.length} budget{g.items.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.items.map(b => (
              <div key={b.id} style={{ background: '#fff', border: '1px solid var(--af-line)', borderLeft: `3px solid ${g.color}`, borderRadius: 8, padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 160px 140px 120px', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--af-mono)', fontSize: 11, fontWeight: 700, color: 'var(--af-mute)' }}>{b.code}</span>
                    <span style={{ fontSize: 11, color: 'var(--af-mute)' }}>· {b.departement_nom || '—'}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--af-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.nom}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--af-mute)', marginBottom: 2 }}>Budget global</div>
                  <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13 }}>{fmt(b.montant_global)}</div>
                  <div style={{ fontSize: 10, color: 'var(--af-mute)' }}>FCFA</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--af-mute)', marginBottom: 2 }}>Consommé</div>
                  <div style={{ fontFamily: 'var(--af-mono)', fontWeight: 700, fontSize: 13, color: g.color }}>{fmt(b.montant_consomme)}</div>
                  <div style={{ fontSize: 10, color: 'var(--af-mute)' }}>FCFA</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--af-mute)', marginBottom: 4 }}>Taux</div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: g.color, fontFamily: 'var(--af-mono)' }}>
                    {parseFloat(b.taux_consommation || 0).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
