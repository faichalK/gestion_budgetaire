/**
 * KpiCard — Premium floating card style
 * Layout: label (top-left) | icon box (top-right) | large value | trend text (bottom)
 */
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

export default function KpiCard({
  icon,
  label,
  value,
  sub,
  color      = 'var(--color-gold)',
  bgColor    = 'var(--color-gold-soft)',
  trend,          // number → auto "↑ +X%" label
  trendText,      // string → custom trend label e.g. "2 nouveaux"
  trendPositive,  // bool override for color when trendText is provided
  onClick,
  sparklineData,
}) {
  const gradId = 'sg-' + String(label).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()

  /* Resolve trend display */
  let trendLabel = null
  let trendColor = '#6B7280'

  if (trend != null) {
    trendLabel = `${trend >= 0 ? '↑' : '↓'} ${trend >= 0 ? '+' : ''}${trend}% vs mois dernier`
    trendColor = trend >= 0 ? '#16A34A' : '#DC2626'
  } else if (trendText) {
    trendLabel = trendText.startsWith('↑') || trendText.startsWith('↓') ? trendText : `↑ ${trendText}`
    trendColor = trendPositive === false ? '#DC2626' : '#16A34A'
  } else if (sub) {
    trendLabel = sub
    trendColor = '#9CA3AF'
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        background: '#FFFFFF',
        borderRadius: 18,
        padding: '20px 22px 0',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,.05)',
        boxShadow: '0 4px 6px -2px rgba(0,0,0,.06), 0 12px 28px -4px rgba(0,0,0,.09)',
        transition: 'all .2s cubic-bezier(.4,0,.2,1)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={onClick ? e => {
        e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0,0,0,.1), 0 24px 48px -8px rgba(0,0,0,.14)'
        e.currentTarget.style.transform = 'translateY(-3px)'
      } : undefined}
      onMouseLeave={onClick ? e => {
        e.currentTarget.style.boxShadow = '0 4px 6px -2px rgba(0,0,0,.06), 0 12px 28px -4px rgba(0,0,0,.09)'
        e.currentTarget.style.transform = 'translateY(0)'
      } : undefined}
    >
      {/* ── Top row: label + icon box ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        {/* Label */}
        <span style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: '#6B7280',
          lineHeight: 1.4,
          flex: 1,
        }}>
          {label}
        </span>

        {/* Icon box */}
        <div style={{
          width: 48, height: 48,
          borderRadius: 14,
          flexShrink: 0,
          background: bgColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem',
          color: color,
          boxShadow: `0 2px 8px ${color}33`,
        }}>
          {icon}
        </div>
      </div>

      {/* ── Value ── */}
      <div style={{
        fontWeight: 800,
        fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
        color: color,
        lineHeight: 1.05,
        letterSpacing: '-.04em',
        fontSize: typeof value === 'string' && value.length > 12 ? '1.35rem'
               : typeof value === 'string' && value.length > 7  ? '1.6rem'
               : '1.9rem',
        wordBreak: 'break-word',
      }}>
        {value}
      </div>

      {/* ── Trend / sub ── */}
      {trendLabel && !sparklineData && (
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: trendColor,
          paddingBottom: 18,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {trendLabel}
        </div>
      )}

      {/* ── Sparkline (replaces trend bottom area) ── */}
      {sparklineData && sparklineData.length > 1 && (
        <div style={{ height: 50, marginLeft: -22, marginRight: -22, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparklineData.map((v, i) => ({ v, i }))}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Trend below sparkline */}
          {trendLabel && (
            <div style={{
              fontSize: 12, fontWeight: 600, color: trendColor,
              padding: '4px 22px 12px',
              marginLeft: 22,
            }}>
              {trendLabel}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
