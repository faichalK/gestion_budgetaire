export default function AtlasCard({ title, subtitle, right, children, bodyPadding = true }) {
  return (
    <div className="af-card">
      {title && (
        <div className="af-card-head">
          <div className="title">{title}</div>
          {subtitle && <div className="sub">{subtitle}</div>}
          {right    && <div className="right">{right}</div>}
        </div>
      )}
      {bodyPadding
        ? <div className="af-card-body">{children}</div>
        : children
      }
    </div>
  )
}
