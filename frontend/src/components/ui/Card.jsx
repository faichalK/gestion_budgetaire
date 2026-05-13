import { cn } from '../../lib/cn'

const CARD_BASE = 'bg-white border border-[rgba(14,42,71,0.08)] rounded-[10px] shadow-[0_1px_0_rgba(14,42,71,0.02)] transition-[box-shadow,border-color] duration-150'
const CARD_HOVER = 'hover:shadow-[0_4px_16px_rgba(14,42,71,0.08)] hover:-translate-y-0.5 hover:border-[rgba(184,134,74,0.30)]'

function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={cn(CARD_BASE, 'p-5', hover && CARD_HOVER, className)}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({
  title,
  subtitle,
  actions,
  children,
  className = '',
  border    = true,
  ...props
}) {
  return (
    <div
      className={cn(
        '-mx-5 -mt-5 rounded-t-[10px] px-5 py-4',
        'flex items-start justify-between gap-4',
        border && 'border-b border-[rgba(14,42,71,0.08)]',
        className
      )}
      {...props}
    >
      {title ? (
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#0E2A47] leading-snug tracking-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-[#5A6B7E] mt-0.5 font-normal">{subtitle}</p>
          )}
        </div>
      ) : (
        children
      )}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}

Card.Body = function CardBody({ children, className = '', padded = false, ...props }) {
  return (
    <div className={cn(padded && 'p-4', className) || undefined} {...props}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({
  children,
  className = '',
  align     = 'right',
  ...props
}) {
  const alignCls = {
    between: 'justify-between',
    left:    'justify-start',
    right:   'justify-end',
  }[align] ?? 'justify-end'

  return (
    <div
      className={cn(
        '-mx-5 -mb-5 rounded-b-[10px] px-5 py-3',
        'border-t border-[rgba(14,42,71,0.08)] bg-[#FAF8F3]',
        'flex items-center gap-3',
        alignCls,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Stat = function CardStat({
  icon,
  label,
  value,
  sub,
  trend,
  trendPositive,
  color    = '#B8864A',
  bgColor  = 'rgba(184,134,74,0.12)',
  onClick,
  className = '',
}) {
  let trendLabel = null
  let trendColor = '#5A6B7E'

  if (trend != null) {
    trendLabel = `${trend >= 0 ? '↑' : '↓'} ${trend >= 0 ? '+' : ''}${trend}% vs mois dernier`
    trendColor = trend >= 0 ? '#15803D' : '#B91C1C'
  } else if (sub) {
    trendLabel = sub
    trendColor = trendPositive === false ? '#B91C1C' : trendPositive === true ? '#15803D' : '#5A6B7E'
  }

  return (
    <div
      className={cn(
        CARD_BASE, 'p-4 flex items-center gap-4',
        onClick && cn(CARD_HOVER, 'cursor-pointer'),
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick(e) : undefined}
    >
      <div
        className="flex items-center justify-center rounded-xl shrink-0 text-xl"
        style={{ width: 44, height: 44, background: bgColor, color }}
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[28px] leading-none tracking-[-0.02em] text-[#0E2A47] tabular-nums">
          {value}
        </div>
        <div className="text-[13px] font-medium mt-1 truncate text-[rgba(90,107,126,0.7)]">
          {label}
        </div>
        {trendLabel && (
          <div className="text-[12px] font-semibold mt-1" style={{ color: trendColor }}>
            {trendLabel}
          </div>
        )}
      </div>
    </div>
  )
}

Card.Table = function CardTable({ children, className = '', ...props }) {
  return (
    <div className={cn(CARD_BASE, 'p-0 overflow-hidden', className)} {...props}>
      {children}
    </div>
  )
}

export default Card
