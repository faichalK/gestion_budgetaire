export default function ProgressBar({ value, max = 100, variant = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const cls  = variant || (pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '')
  return (
    <div className="af-bar">
      <div className={`af-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
