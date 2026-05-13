export default function FeatureHero({
  eyebrow,
  title,
  description,
  illustration,
  illustrationAlt = '',
  actions = null,
  badges = [],
  metrics = [],
  footer = null,
  children = null,
}) {
  return (
    <div className="af-page-head" style={{ flexWrap: 'wrap', rowGap: 16, marginBottom: 28 }}>
      <div style={{ flex: '1 1 400px', minWidth: 0 }}>
        {eyebrow && <div className="af-eyebrow">{eyebrow}</div>}
        <h1 className="title" style={{ marginBottom: description ? 6 : 0 }}>{title}</h1>
        {description && <div className="sub">{description}</div>}

        {/* Badges */}
        {badges.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {badges.map(badge => (
              <span key={badge.label} className="af-tag-method" style={{ color: badge.color, borderColor: badge.borderColor, background: badge.bg }}>
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Métriques KPI mini */}
        {metrics.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {metrics.map(metric => (
              <div key={metric.label} style={{
                background: metric.bg || '#fff',
                border: `1px solid ${metric.borderColor || 'var(--af-line)'}`,
                borderRadius: 8, padding: '10px 14px',
              }}>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: metric.accent || 'var(--af-mute)', marginBottom: 4 }}>
                  {metric.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: metric.valueColor || 'var(--af-ivory)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {metric.value}
                </div>
                {metric.hint && <div style={{ fontSize: 11, color: 'var(--af-cream)', marginTop: 2 }}>{metric.hint}</div>}
              </div>
            ))}
          </div>
        )}

        {children && <div style={{ marginTop: 14 }}>{children}</div>}
        {footer && <div style={{ marginTop: 12, fontSize: 11, color: 'var(--af-mute)', lineHeight: 1.6 }}>{footer}</div>}
      </div>

      {/* Illustration + Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14, flexShrink: 0 }}>
        {actions && <div className="actions">{actions}</div>}
        {illustration && (
          <img src={illustration} alt={illustrationAlt} style={{ height: 80, opacity: 0.7 }} />
        )}
      </div>
    </div>
  )
}
