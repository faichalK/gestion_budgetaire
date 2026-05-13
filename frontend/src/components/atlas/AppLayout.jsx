import { Fragment } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  budget:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 5v14"/></svg>,
  expense:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  validate:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4M21 12c0 5-3.5 8-9 9-5.5-1-9-4-9-9V6l9-3 9 3v6z"/></svg>,
  ai:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>,
  kpi:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18"/><rect x="6" y="10" width="3" height="10"/><rect x="11" y="6" width="3" height="14"/><rect x="16" y="13" width="3" height="7"/></svg>,
  audit:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>,
  users:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  settings:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1-.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.5 1z"/></svg>,
  dept:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  calendar:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  report:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
}

const SearchIcon = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
const BellIcon   = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>

const NAV_ADMIN = [
  { id:'dashboard',  icon: Icons.dashboard, label:'Tableau de bord',    path:'/dashboard',         section:'Pilotage' },
  { id:'budgets',    icon: Icons.budget,    label:'Budgets',             path:'/budgets',           section:'Pilotage' },
  { id:'depenses',   icon: Icons.expense,   label:'Dépenses',            path:'/depenses',          section:'Pilotage' },
  { id:'annuel',     icon: Icons.calendar,  label:'Budget annuel',       path:'/budget-annuel',     section:'Pilotage' },
  { id:'depts',      icon: Icons.dept,      label:'Départements',        path:'/departements',      section:'Pilotage' },
  { id:'ai',         icon: Icons.ai,        label:'Assistant IA',        path:'/ia',                section:'Intelligence' },
  { id:'rapports',   icon: Icons.kpi,       label:'KPI & Rapports',      path:'/rapports',          section:'Intelligence' },
  { id:'audit',      icon: Icons.audit,     label:"Journal d'audit",     path:'/audit',             section:'Gouvernance' },
  { id:'users',      icon: Icons.users,     label:'Utilisateurs',        path:'/utilisateurs',      section:'Gouvernance' },
  { id:'settings',   icon: Icons.settings,  label:'Paramètres',          path:'/parametres',        section:'Compte' },
]
const NAV_GEST = [
  { id:'dashboard',  icon: Icons.dashboard, label:'Tableau de bord',    path:'/dashboard',         section:'Pilotage' },
  { id:'budgets',    icon: Icons.budget,    label:'Mes budgets',         path:'/mes-budgets',       section:'Pilotage', count: true },
  { id:'depenses',   icon: Icons.expense,   label:'Mes dépenses',        path:'/mes-depenses',      section:'Pilotage' },
  { id:'ai',         icon: Icons.ai,        label:'Assistant IA',        path:'/ia',                section:'Intelligence' },
  { id:'settings',   icon: Icons.settings,  label:'Paramètres',          path:'/parametres',        section:'Compte' },
]
const NAV_COMPT = [
  { id:'dashboard',  icon: Icons.dashboard, label:'Tableau de bord',    path:'/dashboard',         section:'Pilotage' },
  { id:'validation', icon: Icons.validate,  label:'Validation',          path:'/validation',        section:'Workflow', count: true },
  { id:'depenses',   icon: Icons.expense,   label:'Dépenses',            path:'/depenses',          section:'Workflow' },
  { id:'rapports',   icon: Icons.kpi,       label:'KPI & Rapports',      path:'/rapports',          section:'Intelligence' },
  { id:'ai',         icon: Icons.ai,        label:'Assistant IA',        path:'/ia',                section:'Intelligence' },
  { id:'settings',   icon: Icons.settings,  label:'Paramètres',          path:'/parametres',        section:'Compte' },
]

export default function AppLayout({ crumb = [], children, countBudgets, countValidation }) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user, logout }   = useAuth()

  const role = user?.role || 'ADMINISTRATEUR'
  const initials = user
    ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase()
    : 'U'

  const navItems = role === 'GESTIONNAIRE' ? NAV_GEST
                 : role === 'COMPTABLE'    ? NAV_COMPT
                 : NAV_ADMIN

  const sections = [...new Set(navItems.map(i => i.section))]

  const isActive = (path) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path)

  const roleLabel = role === 'ADMINISTRATEUR' ? 'Administrateur'
                  : role === 'GESTIONNAIRE'   ? 'Gestionnaire'
                  : 'Comptable'

  return (
    <div className="af-app">
      {/* ── Sidebar ── */}
      <aside className="af-sidebar">
        <div className="af-brand">
          <div className="mark">A</div>
          <div className="word">Atlas Finance</div>
        </div>

        {sections.map(section => (
          <Fragment key={section}>
            <div className="af-nav-section">{section}</div>
            {navItems.filter(i => i.section === section).map(item => (
              <div
                key={item.id}
                className={`af-nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.count && (
                  <span className="count">
                    {item.id === 'budgets'    ? (countBudgets    ?? '') : ''}
                    {item.id === 'validation' ? (countValidation ?? '') : ''}
                  </span>
                )}
              </div>
            ))}
          </Fragment>
        ))}

        <div className="af-user">
          <div className="avatar">{initials}</div>
          <div>
            <div className="name">{user?.prenom} {user?.nom}</div>
            <div className="role">{roleLabel}</div>
          </div>
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header className="af-topbar">
        <div className="af-crumb">
          {crumb.map((c, i) => (
            <Fragment key={i}>
              <span className={i === crumb.length - 1 ? 'last' : ''}>{c}</span>
              {i < crumb.length - 1 && <span className="sep">/</span>}
            </Fragment>
          ))}
        </div>
        <div className="af-search">
          {SearchIcon}
          <span>Rechercher un budget, une dépense…</span>
        </div>
        <button className="af-icon-btn" onClick={() => window.dispatchEvent(new Event('open-chatbot'))}>
          {BellIcon}
        </button>
      </header>

      {/* ── Main ── */}
      <main className="af-main">
        {children}
      </main>
    </div>
  )
}
