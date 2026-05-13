// Atlas Finance — Shared UI primitives & icons
const Icon = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  budget: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 5v14"/></svg>,
  expense: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  validate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4M21 12c0 5-3.5 8-9 9-5.5-1-9-4-9-9V6l9-3 9 3v6z"/></svg>,
  ai: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/><circle cx="12" cy="12" r="4"/></svg>,
  audit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6M9 9h2"/></svg>,
  kpi: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18"/><rect x="6" y="10" width="3" height="10"/><rect x="11" y="6" width="3" height="14"/><rect x="16" y="13" width="3" height="7"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  filter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  reject: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  more: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  paperclip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21.4 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>,
  sparkle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM4 4l.7 1.5L6 6l-1.5.7L4 8l-.7-1.5L2 6l1.5-.7L4 4z"/></svg>,
};

const DEPTS = [
  { name: "Direction Générale", color: "#C9A961", short: "DG" },
  { name: "Marketing", color: "#3B82F6", short: "MK" },
  { name: "R&D", color: "#10B981", short: "RD" },
  { name: "Ressources Humaines", color: "#8B5CF6", short: "RH" },
  { name: "Opérations", color: "#E5A53D", short: "OP" },
  { name: "Communication", color: "#7DD3FC", short: "CO" },
];

function Sidebar({ active, role = "Administrateur", user = "Pauline Lefèvre", initials = "PL" }) {
  const items = [
    { id: "dashboard", icon: Icon.dashboard, label: "Tableau de bord", section: "Pilotage" },
    { id: "budgets", icon: Icon.budget, label: "Budgets", count: "12", section: "Pilotage" },
    { id: "depenses", icon: Icon.expense, label: "Dépenses", count: "47", section: "Pilotage" },
    { id: "validation", icon: Icon.validate, label: "Validation", count: "8", section: "Workflow" },
    { id: "ia", icon: Icon.ai, label: "Assistant IA", section: "Intelligence" },
    { id: "kpi", icon: Icon.kpi, label: "KPI Analytics", section: "Intelligence" },
    { id: "audit", icon: Icon.audit, label: "Journal d'audit", section: "Gouvernance" },
    { id: "users", icon: Icon.users, label: "Utilisateurs", section: "Gouvernance" },
    { id: "settings", icon: Icon.settings, label: "Paramètres", section: "Compte" },
  ];
  const sections = [...new Set(items.map(i => i.section))];
  return (
    <aside className="af-sidebar">
      <div className="af-brand">
        <div className="mark">A</div>
        <div className="word">Atlas Finance</div>
      </div>
      {sections.map(s => (
        <React.Fragment key={s}>
          <div className="af-nav-section">{s}</div>
          {items.filter(i => i.section === s).map(i => (
            <div key={i.id} className={`af-nav-item ${active === i.id ? "active" : ""}`}>
              {i.icon}
              <span>{i.label}</span>
              {i.count && <span className="count">{i.count}</span>}
            </div>
          ))}
        </React.Fragment>
      ))}
      <div className="af-user">
        <div className="avatar">{initials}</div>
        <div className="info">
          <div className="name">{user}</div>
          <div className="role">{role}</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumb = ["Pilotage", "Tableau de bord"], showSearch = true }) {
  return (
    <header className="af-topbar">
      <div className="af-crumb">
        {crumb.map((c, i) => (
          <React.Fragment key={i}>
            <span className={i === crumb.length - 1 ? "last" : ""}>{c}</span>
            {i < crumb.length - 1 && <span className="sep">/</span>}
          </React.Fragment>
        ))}
      </div>
      {showSearch && (
        <div className="af-search">{Icon.search}<span>Rechercher un budget, une dépense…</span></div>
      )}
      <button className="af-icon-btn">{Icon.bell}<span className="pip"></span></button>
      <button className="af-icon-btn">{Icon.settings}</button>
    </header>
  );
}

function Badge({ status }) {
  const labels = { draft: "BROUILLON", submit: "SOUMIS", approve: "APPROUVÉ", reject: "REJETÉ", close: "CLÔTURÉ" };
  return <span className={`af-badge ${status}`}>{labels[status]}</span>;
}

function DeptChip({ idx }) {
  const d = DEPTS[idx % DEPTS.length];
  return <span className="af-dept-chip"><span className="d" style={{ background: d.color }}></span>{d.name}</span>;
}

// CSS line chart helper
function LineChart({ data, height = 180 }) {
  const max = Math.max(...data);
  const w = 100, h = 100;
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - (v / max) * h * 0.85 - 8]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
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
  );
}

function BarChart({ data, labels }) {
  const max = Math.max(...data.flat());
  return (
    <div className="af-chart">
      <div className="af-chart-grid"><div/><div/><div/><div/></div>
      <div className="af-bars">
        {data.map((stacks, i) => (
          <div className="af-bar-col" key={i}>
            <div className="stack">
              {stacks.map((v, j) => (
                <div key={j} className={`seg ${j === 0 ? "expense" : "revenue"}`}
                     style={{ height: `${(v / max) * 160}px` }}></div>
              ))}
            </div>
            <div className="label">{labels[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Icon, DEPTS, Sidebar, Topbar, Badge, DeptChip, LineChart, BarChart });
