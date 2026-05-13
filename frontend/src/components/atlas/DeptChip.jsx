const DEPT_COLORS = {
  'Direction Générale':  '#C9A961',
  'Marketing':           '#3B82F6',
  'R&D':                 '#10B981',
  'Ressources Humaines': '#8B5CF6',
  'Opérations':          '#E5A53D',
  'Communication':       '#7DD3FC',
}
const DEFAULT_COLORS = ['#C9A961','#3B82F6','#10B981','#8B5CF6','#E5A53D','#7DD3FC']

export default function DeptChip({ name = '' }) {
  const color = DEPT_COLORS[name]
    || DEFAULT_COLORS[name.charCodeAt(0) % DEFAULT_COLORS.length]
  return (
    <span className="af-dept-chip">
      <span className="d" style={{ background: color }} />
      {name}
    </span>
  )
}
