import { AlertTriangle, AlertCircle, Info } from '../AtlasIcons'
import { formaterNombre, formaterPourcentage } from '../../utils/formatters'

const NIVEAU_META = {
  CRITIQUE: { bg: '#FFF1F2', border: '#FECDD3', color: '#DC2626', icon: AlertCircle,   label: 'CRITIQUE' },
  ROUGE:    { bg: '#FFF7F0', border: '#FED7AA', color: '#EA580C', icon: AlertTriangle,  label: 'ROUGE'    },
  ORANGE:   { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', icon: Info,           label: 'ORANGE'   },
}

const fmt = (n) => formaterNombre(n, { maximumFractionDigits: 0 })

export default function AlertesSection({ alertes }) {
  if (!alertes?.length) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <AlertTriangle size={16} strokeWidth={2} style={{ color: '#DC2626' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#DC2626', margin: 0 }}>
          Alertes budgétaires
        </h2>
        <span style={{
          fontSize: '10px', fontWeight: 700,
          background: '#FFF1F2', color: '#DC2626', border: '1px solid #FECDD3',
          padding: '2px 8px', borderRadius: 20,
        }}>
          {alertes.length} budget{alertes.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alertes.map((a, i) => {
          const meta = NIVEAU_META[a.niveau] || NIVEAU_META.ORANGE
          const Icon = meta.icon
          return (
            <div
              key={i}
              style={{
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: '#fff', border: `1.5px solid ${meta.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} strokeWidth={2} style={{ color: meta.color }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span className="code-tag">{a.budget_code}</span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    color: meta.color, background: '#fff',
                    border: `1px solid ${meta.border}`,
                    padding: '1px 8px', borderRadius: 20,
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{a.budget_nom}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  {a.departement} · Consommé : <strong style={{ color: meta.color }}>{fmt(a.montant_consomme)} FCFA</strong> sur {fmt(a.montant_global)} FCFA
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px',
                  color: meta.color,
                }}>
                  {formaterPourcentage(a.taux, { decimales: 1 })}
                </div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: 2 }}>taux consommation</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
