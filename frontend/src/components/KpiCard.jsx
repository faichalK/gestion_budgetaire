import { cn } from '../lib/cn'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

const DELTA_COLOR = {
  up:   'text-[#15803D]',
  down: 'text-[#B91C1C]',
  flat: 'text-[#5A6B7E]',
}

export default function KpiCard({
  icon,
  label,
  value,
  sub,
  color      = '#B8864A',
  bgColor    = 'rgba(184,134,74,0.12)',
  trend,
  trendText,
  trendPositive,
  onClick,
  sparklineData,
}) {
  const gradId = 'sg-' + String(label).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()

  let deltaClass = 'flat'
  let deltaText  = null

  if (trend != null) {
    deltaClass = trend >= 0 ? 'up' : 'down'
    deltaText  = `${trend >= 0 ? '↑ +' : '↓ '}${trend}% vs mois dernier`
  } else if (trendText) {
    deltaClass = trendPositive === false ? 'down' : 'up'
    deltaText  = trendText
  } else if (sub) {
    deltaClass = 'flat'
    deltaText  = sub
  }

  return (
    <div
      className={cn(
        'bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] py-[18px] px-5 shadow-[0_1px_0_rgba(14,42,71,0.02)] transition-[box-shadow,border-color] duration-150',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ background: `linear-gradient(180deg, ${bgColor} 0%, rgba(255,255,255,.98) 58%)` }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(14,42,71,.10)'; e.currentTarget.style.borderColor = 'rgba(14,42,71,0.16)' } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.boxShadow = '0 1px 0 rgba(14,42,71,0.02)'; e.currentTarget.style.borderColor = 'rgba(14,42,71,0.08)' } : undefined}
    >
      {/* Label */}
      <div className="flex items-center gap-2 text-[11px] tracking-[0.20em] uppercase text-[rgba(90,107,126,0.7)] mb-3 [&>svg]:w-3 [&>svg]:h-3">
        {icon && <span style={{ color }}>{icon}</span>}
        {label}
      </div>

      {/* Valeur */}
      <div
        className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] mb-1.5 tabular-nums"
        style={color !== '#B8864A' ? { color } : undefined}
      >
        {value}
      </div>

      {/* Delta */}
      {deltaText && !sparklineData && (
        <div className={cn('text-[11px] inline-flex items-center gap-1', DELTA_COLOR[deltaClass])}>
          {deltaText}
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div style={{ height: 44, margin: '6px -20px 0', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparklineData.map((v, i) => ({ v, i }))}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          {deltaText && (
            <div className={cn('absolute bottom-0.5 left-5 text-[11px] inline-flex items-center gap-1', DELTA_COLOR[deltaClass])}>
              {deltaText}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
