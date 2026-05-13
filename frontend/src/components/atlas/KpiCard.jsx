export default function KpiCard({ icon, label, value, unit, delta, deltaType = 'flat' }) {
  return (
    <div className="af-kpi">
      <div className="lbl">
        {icon}
        {label}
      </div>
      <div className="val">
        {value}
        {unit && <span className="unit"> {unit}</span>}
      </div>
      {delta && <div className={`delta ${deltaType}`}>{delta}</div>}
    </div>
  )
}
