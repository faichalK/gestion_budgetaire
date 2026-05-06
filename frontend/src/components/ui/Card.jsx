/**
 * Card — conteneur générique dashboard + sous-composants composables
 *
 * Le `.card` CSS a padding: 10px par défaut.
 * Card.Header / Card.Footer utilisent des marges négatives (-mx-[10px])
 * pour que leurs border-b / border-t couvrent bien toute la largeur.
 *
 * Sub-composants :
 *   Card.Header  — en-tête plein-bord avec titre / sous-titre / actions
 *   Card.Body    — corps (le padding de la card suffit comme base)
 *   Card.Footer  — pied plein-bord aligné à droite, fond gris léger
 *   Card.Stat    — carte KPI : icône ronde à gauche, valeur + label à droite
 *   Card.Table   — wrapper card + overflow-hidden + p-0 pour tableaux full-bleed
 *
 * Usage :
 *   <Card hover>
 *     <Card.Header title="Budgets" subtitle="Exercice 2025" actions={<Button size="sm">Exporter</Button>} />
 *     <Card.Body><p>Contenu</p></Card.Body>
 *     <Card.Footer><Button variant="ghost" size="sm">Annuler</Button></Card.Footer>
 *   </Card>
 *
 *   <Card.Stat icon="💰" label="Total alloué" value="42 M FCFA" trend={+8.3} />
 *
 *   <Card.Table>
 *     <Card.Header title="Dépenses" />
 *     <table className="data-table">…</table>
 *   </Card.Table>
 */

/* ── Racine ─────────────────────────────────────────────────────────────────── */
function Card({ children, className = '', hover = false, ...props }) {
  const cls = ['card', hover && 'card-hover', className].filter(Boolean).join(' ')
  return <div className={cls} {...props}>{children}</div>
}

/* ── Card.Header ─────────────────────────────────────────────────────────────
   Utilise -mx-[10px] -mt-[10px] pour annuler le padding de .card et couvrir
   toute la largeur, puis rajoute son propre padding.
   Le border-b couvre donc bord à bord comme attendu.
────────────────────────────────────────────────────────────────────────────── */
Card.Header = function CardHeader({
  title,
  subtitle,
  actions,
  children,
  className = '',
  border    = true,
  ...props
}) {
  const cls = [
    /* breakout du padding card (16px) */
    '-mx-[16px] -mt-[16px]',
    /* coins arrondis haut pour matcher la card */
    'rounded-t-[var(--radius-lg)]',
    /* padding propre */
    'px-4 pt-4 pb-4',
    border && 'border-b border-gray-100',
    /* disposition */
    'flex items-start justify-between gap-4',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} {...props}>
      {title ? (
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 leading-snug tracking-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5 font-normal">{subtitle}</p>
          )}
        </div>
      ) : (
        children
      )}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

/* ── Card.Body ──────────────────────────────────────────────────────────────
   La card a déjà padding: 10px. On ajoute juste un peu plus si padded=true.
────────────────────────────────────────────────────────────────────────────── */
Card.Body = function CardBody({ children, className = '', padded = false, ...props }) {
  const cls = [padded && 'p-4', className].filter(Boolean).join(' ')
  return <div className={cls || undefined} {...props}>{children}</div>
}

/* ── Card.Footer ─────────────────────────────────────────────────────────────
   Même technique que Header : breakout -mx-[10px] -mb-[10px].
────────────────────────────────────────────────────────────────────────────── */
Card.Footer = function CardFooter({
  children,
  className = '',
  align     = 'right',
  ...props
}) {
  const alignCls = align === 'between'
    ? 'justify-between'
    : align === 'left'
    ? 'justify-start'
    : 'justify-end'

  const cls = [
    /* breakout du padding card (16px) */
    '-mx-[16px] -mb-[16px]',
    /* coins arrondis bas */
    'rounded-b-[var(--radius-lg)]',
    /* padding propre */
    'px-4 py-3',
    /* visuel */
    'border-t border-gray-100 bg-gray-50',
    'flex items-center gap-3',
    alignCls,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} {...props}>
      {children}
    </div>
  )
}

/* ── Card.Stat (KPI) ────────────────────────────────────────────────────────
   Icône arrondie à gauche (44×44), valeur + label à droite.
   Utilise p-[10px] via Tailwind utility (> .card CSS) pour un padding net.
────────────────────────────────────────────────────────────────────────────── */
Card.Stat = function CardStat({
  icon,
  label,
  value,
  sub,
  trend,
  trendPositive,
  color    = 'var(--color-gold)',
  bgColor  = 'var(--color-gold-soft)',
  onClick,
  className = '',
}) {
  let trendLabel = null
  let trendColor = 'var(--color-gray-400)'

  if (trend != null) {
    trendLabel = `${trend >= 0 ? '↑' : '↓'} ${trend >= 0 ? '+' : ''}${trend}% vs mois dernier`
    trendColor = trend >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)'
  } else if (sub) {
    trendLabel = sub
    trendColor = trendPositive === false
      ? 'var(--color-danger-600)'
      : trendPositive === true
      ? 'var(--color-success-600)'
      : 'var(--color-gray-400)'
  }

  const cls = [
    'card p-[16px] flex items-center gap-4',  /* p-[16px] utility > .card CSS */
    onClick && 'card-hover cursor-pointer',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
    >
      {/* Icône ronde 44×44 */}
      <div
        className="flex items-center justify-center rounded-xl shrink-0 text-xl"
        style={{ width: 44, height: 44, background: bgColor, color }}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Valeur + label */}
      <div className="flex-1 min-w-0">
        <div className="stat-value leading-none">{value}</div>
        <div
          className="text-[13px] font-medium mt-1 truncate"
          style={{ color: 'var(--color-gray-500)' }}
        >
          {label}
        </div>
        {trendLabel && (
          <div
            className="text-[12px] font-semibold mt-1"
            style={{ color: trendColor }}
          >
            {trendLabel}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Card.Table ──────────────────────────────────────────────────────────────
   p-0 (Tailwind utility) annule le padding: 10px du .card CSS.
   overflow-hidden pour couper les bords arrondis sur la table.
────────────────────────────────────────────────────────────────────────────── */
Card.Table = function CardTable({ children, className = '', ...props }) {
  return (
    <div
      className={['card p-0 overflow-hidden', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
