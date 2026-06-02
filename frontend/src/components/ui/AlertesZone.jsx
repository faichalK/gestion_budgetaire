import { formaterNombre } from '../../utils/formatters'
import { useNavigate } from 'react-router-dom'

const fmt = n => formaterNombre(parseFloat(n) || 0, { maximumFractionDigits: 0 })

const CFG = {
  CRITIQUE: { color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.2)', label: 'CRITIQUE' },
  ROUGE:    { color: '#C2410C', bg: 'rgba(194,65,12,0.06)',  border: 'rgba(194,65,12,0.2)',  label: 'ROUGE'    },
}

export default function AlertesZone({ budgets = [], budgetBasePath = '/budgets' }) {
  const navigate = useNavigate()
  const alertes  = budgets.filter(b => ['ROUGE', 'CRITIQUE'].includes(b.niveau_alerte))

  if (!alertes.length) return null

  const critiques = alertes.filter(b => b.niveau_alerte === 'CRITIQUE')

  return (
    <div style={{
      marginBottom: 20,
      border: `1.5px solid ${critiques.length > 0 ? 'rgba(220,38,38,0.35)' : 'rgba(194,65,12,0.25)'}`,
      borderRadius: 12,
      overflow: 'hidden',
      background: '#fff',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 18px',
        background: critiques.length > 0 ? 'rgba(220,38,38,0.06)' : 'rgba(194,65,12,0.06)',
        borderBottom: `1px solid ${critiques.length > 0 ? 'rgba(220,38,38,0.15)' : 'rgba(194,65,12,0.12)'}`,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: critiques.length > 0 ? '#DC2626' : '#C2410C',
          boxShadow: `0 0 0 3px ${critiques.length > 0 ? 'rgba(220,38,38,0.25)' : 'rgba(194,65,12,0.2)'}`,
        }} />
        <span style={{ fontWeight: 700, fontSize: 12, color: critiques.length > 0 ? '#DC2626' : '#C2410C', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {alertes.length} budget{alertes.length > 1 ? 's' : ''} en alerte
        </span>
        {critiques.length > 0 && (
          <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>
            · {critiques.length} critique{critiques.length > 1 ? 's' : ''} (100%+)
          </span>
        )}
      </div>

      {/* Liste */}
      <div>
        {alertes.map((b, i) => {
          const cfg   = CFG[b.niveau_alerte] || CFG.ROUGE
          const taux  = parseFloat(b.taux_consommation || 0)
          return (
            <div
              key={b.id}
              onClick={() => navigate(`${budgetBasePath}/${b.id}`)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 100px',
                padding: '10px 18px', alignItems: 'center', gap: 12,
                borderTop: i > 0 ? '1px solid rgba(14,42,71,0.06)' : 'none',
                cursor: 'pointer', transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = cfg.bg}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--af-mono)', fontSize: 10, fontWeight: 700, color: 'var(--af-mute)' }}>{b.code}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: cfg.bg, color: cfg.color, fontWeight: 700, border: `1px solid ${cfg.border}` }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.nom}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--af-mute)', marginBottom: 1 }}>Budget / Consommé</div>
                <div style={{ fontFamily: 'var(--af-mono)', fontSize: 12, fontWeight: 700, color: 'var(--af-ink)' }}>
                  {fmt(b.montant_consomme)} <span style={{ color: 'var(--af-mute)', fontWeight: 400 }}>/ {fmt(b.montant_global)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 20, color: cfg.color, fontFamily: 'var(--af-mono)', lineHeight: 1 }}>
                  {taux.toFixed(0)}%
                </div>
                <div style={{ fontSize: 9, color: 'var(--af-mute)', marginTop: 2 }}>consommé</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
