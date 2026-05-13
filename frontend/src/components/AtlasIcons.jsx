// Atlas Finance — Shared SVG icons (from prototype shared.jsx)
const s = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }

export const Icon = {
  /* ── Navigation ── */
  dashboard: <svg {...s}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  budget:    <svg {...s}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 5v14"/></svg>,
  expense:   <svg {...s}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  validate:  <svg {...s}><path d="M9 12l2 2 4-4M21 12c0 5-3.5 8-9 9-5.5-1-9-4-9-9V6l9-3 9 3v6z"/></svg>,
  ai:        <svg {...s}><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/><circle cx="12" cy="12" r="4"/></svg>,
  audit:     <svg {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6M9 9h2"/></svg>,
  kpi:       <svg {...s}><path d="M3 20h18"/><rect x="6" y="10" width="3" height="10"/><rect x="11" y="6" width="3" height="14"/><rect x="16" y="13" width="3" height="7"/></svg>,
  users:     <svg {...s}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  settings:  <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>,

  /* ── Actions ── */
  search:       <svg {...s}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  bell:         <svg {...s}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>,
  plus:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  arrow:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  filter:       <svg {...s}><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/></svg>,
  download:     <svg {...s}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  send:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  close:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  check:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  reject:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  more:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  paperclip:    <svg {...s}><path d="M21.4 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>,
  sparkle:      <svg {...s}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM4 4l.7 1.5L6 6l-1.5.7L4 8l-.7-1.5L2 6l1.5-.7L4 4z"/></svg>,

  /* ── Extended icons ── */
  alert:        <svg {...s}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  building:     <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  pencil:       <svg {...s}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:        <svg {...s}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  eye:          <svg {...s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  wallet:       <svg {...s}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M16 14h2"/></svg>,
  receipt:      <svg {...s}><path d="M4 2v20l3-3 2.5 3L12 19l2.5 3L17 19l3 3V2H4z"/><path d="M8 10h8M8 14h5"/></svg>,
  externalLink: <svg {...s}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  arrowLeft:    <svg {...s}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  chevronDown:  <svg {...s}><polyline points="6 9 12 15 18 9"/></svg>,
  chevronRight: <svg {...s}><polyline points="9 18 15 12 9 6"/></svg>,
  calendar:     <svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  refresh:      <svg {...s}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  lock:         <svg {...s}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  info:         <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  printer:      <svg {...s}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  userCheck:    <svg {...s}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  userX:        <svg {...s}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>,
  file:         <svg {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>,
  rotate:       <svg {...s}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>,
  eyeOff:       <svg {...s}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  key:          <svg {...s}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  alertCircle:  <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  trendingDown: <svg {...s}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
}

/* ── Lucide-compatible wrapper ──────────────────────────────────────────────
   Creates a React component with the same API as lucide-react components
   so existing usage like <Trash2 size={14} style={{color:'red'}}/> works. */
function icon(jsx) {
  return function Compat({ size = 16, strokeWidth, style, className, color }) {
    return (
      <span
        style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, color, ...style }}
        className={className}
      >
        {jsx}
      </span>
    )
  }
}

/* ── Named exports matching lucide-react ──────────────────────────────────── */
export const AlertTriangle  = icon(Icon.alert)
export const Building2      = icon(Icon.building)
export const Pencil         = icon(Icon.pencil)
export const Edit2          = icon(Icon.pencil)
export const Trash2         = icon(Icon.trash)
export const Eye            = icon(Icon.eye)
export const Wallet         = icon(Icon.wallet)
export const Receipt        = icon(Icon.receipt)
export const ExternalLink   = icon(Icon.externalLink)
export const ArrowLeft      = icon(Icon.arrowLeft)
export const ArrowRight     = icon(Icon.arrow)
export const ChevronDown    = icon(Icon.chevronDown)
export const ChevronRight   = icon(Icon.chevronRight)
export const CalendarDays   = icon(Icon.calendar)
export const CalendarRange  = icon(Icon.calendar)
export const Calendar       = icon(Icon.calendar)
export const RefreshCw      = icon(Icon.refresh)
export const RotateCcw      = icon(Icon.rotate)
export const Lock           = icon(Icon.lock)
export const Info           = icon(Icon.info)
export const Printer        = icon(Icon.printer)
export const UserCheck      = icon(Icon.userCheck)
export const UserX          = icon(Icon.userX)
export const FileText       = icon(Icon.file)
export const FileBarChart   = icon(Icon.kpi)
export const Brain          = icon(Icon.ai)
export const TrendingUp     = icon(Icon.kpi)
export const DollarSign     = icon(Icon.expense)
export const Coins          = icon(Icon.expense)
export const Paperclip      = icon(Icon.paperclip)
export const Download       = icon(Icon.download)
export const Search         = icon(Icon.search)
export const Plus           = icon(Icon.plus)
export const Send           = icon(Icon.send)
export const Check          = icon(Icon.check)
export const CheckCircle2   = icon(Icon.check)
export const X              = icon(Icon.close)
export const XCircle        = icon(Icon.reject)
export const Sparkles       = icon(Icon.sparkle)
export const Bell           = icon(Icon.bell)
export const Upload         = icon(Icon.arrow)
export const CreditCard     = icon(Icon.budget)
export const Ban            = icon(Icon.reject)
export const Clock          = icon(Icon.calendar)
export const User           = icon(Icon.users)
export const LogOut         = icon(Icon.arrow)
export const Menu           = icon(Icon.filter)
export const EyeOff         = icon(Icon.eyeOff)
export const KeyRound       = icon(Icon.key)
export const AlertCircle    = icon(Icon.alertCircle)
export const TrendingDown   = icon(Icon.trendingDown)

/* ── Domain components ──────────────────────────────────────────────────── */
export const DEPT_COLORS = {
  'Direction Générale': '#C9A961',
  'Marketing':          '#3B82F6',
  'R&D':                '#10B981',
  'Ressources Humaines':'#8B5CF6',
  'Opérations':         '#E5A53D',
  'Communication':      '#7DD3FC',
}

export function DeptChip({ name, color }) {
  return (
    <span className="af-dept-chip">
      <span className="d" style={{ background: color || '#B8864A' }}></span>
      {name}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    BROUILLON:              'draft',
    SOUMIS:                 'submit',
    APPROUVE:               'approve',
    REJETE:                 'reject',
    CLOTURE:                'close',
    MODIFICATION_AUTORISEE: 'submit',
    SAISIE:                 'submit',
    VALIDEE:                'approve',
    REJETEE:                'reject',
  }
  const labels = {
    BROUILLON:              'BROUILLON',
    SOUMIS:                 'SOUMIS',
    APPROUVE:               'APPROUVÉ',
    REJETE:                 'REJETÉ',
    CLOTURE:                'CLÔTURÉ',
    MODIFICATION_AUTORISEE: 'MODIF. AUTORISÉE',
    SAISIE:                 'SOUMIS',
    VALIDEE:                'APPROUVÉ',
    REJETEE:                'REJETÉ',
  }
  return <span className={`af-badge ${map[status] || 'draft'}`}>{labels[status] || status}</span>
}

export function BarChart({ data, labels }) {
  const max = Math.max(...data.flat(), 1)
  return (
    <div className="af-chart">
      <div className="af-chart-grid"><div/><div/><div/><div/></div>
      <div className="af-bars">
        {data.map((stacks, i) => (
          <div className="af-bar-col" key={i}>
            <div className="stack">
              {stacks.map((v, j) => (
                <div key={j} className={`seg ${j === 0 ? 'expense' : 'revenue'}`}
                     style={{ height: `${(v / max) * 160}px` }}/>
              ))}
            </div>
            <div className="label">{labels[i]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LineChart({ data, height = 180 }) {
  const max = Math.max(...data, 1)
  const w = 100, h = 100
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - (v / max) * h * 0.85 - 8])
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const area = `${path} L ${w} ${h} L 0 ${h} Z`
  return (
    <div className="af-line-chart" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="af-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A961" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#C9A961" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <g className="grid">
          {[0.25, 0.5, 0.75].map(p => <line key={p} x1="0" y1={h * p} x2={w} y2={h * p}/>)}
        </g>
        <path className="area" d={area}/>
        <path className="line" d={path} vectorEffect="non-scaling-stroke"/>
        {pts.map((p, i) => <circle key={i} className="dot" cx={p[0]} cy={p[1]} r="0.8" vectorEffect="non-scaling-stroke"/>)}
      </svg>
    </div>
  )
}
