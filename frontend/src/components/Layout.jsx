import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getNotifications, marquerLue, marquerToutesLues } from '../api/notifications'
import { Icon } from './AtlasIcons'
import { cn } from '../lib/cn'

/* ── Navigation par rôle ─────────────────────────────────────────────────── */
function navItems(role, t) {
  if (role === 'ADMINISTRATEUR') return [
    { to: '/dashboard',          icon: Icon.dashboard, label: t('nav_dashboard')        },
    { to: '/budget-annuel',      icon: Icon.budget,    label: t('nav_budget_annuel')    },
    { to: '/budgets',            icon: Icon.budget,    label: 'Budgets'                 },
    { to: '/departements',       icon: Icon.users,     label: t('nav_departements')     },
    { to: '/utilisateurs',       icon: Icon.users,     label: t('nav_utilisateurs')     },
    { to: '/depenses',           icon: Icon.expense,   label: t('nav_depenses')         },
    { to: '/rapports',           icon: Icon.kpi,       label: t('nav_statistiques')     },
    { to: '/rapports-detailles', icon: Icon.audit,     label: t('nav_rapports_detail')  },
    { to: '/ia',                 icon: Icon.ai,        label: t('nav_assistance_ia')    },
    { to: '/parametres',         icon: Icon.settings,  label: t('nav_parametres')       },
  ]
  if (role === 'GESTIONNAIRE') return [
    { to: '/dashboard',    icon: Icon.dashboard, label: t('nav_dashboard')     },
    { to: '/mes-budgets',  icon: Icon.budget,    label: t('nav_mes_budgets')   },
    { to: '/mes-depenses', icon: Icon.expense,   label: t('nav_mes_depenses')  },
    { to: '/ia',           icon: Icon.ai,        label: t('nav_assistance_ia') },
    { to: '/parametres',   icon: Icon.settings,  label: t('nav_parametres')    },
  ]
  if (role === 'COMPTABLE') return [
    { to: '/dashboard',  icon: Icon.dashboard, label: t('nav_dashboard')        },
    { to: '/validation', icon: Icon.validate,  label: t('nav_validation')       },
    { to: '/depenses',   icon: Icon.expense,   label: t('nav_depenses_valider') },
    { to: '/rapports',   icon: Icon.kpi,       label: t('nav_statistiques')     },
    { to: '/ia',         icon: Icon.ai,        label: t('nav_assistance_ia')    },
    { to: '/parametres', icon: Icon.settings,  label: t('nav_parametres')       },
  ]
  return []
}

function getSections(role, items, t) {
  if (role === 'ADMINISTRATEUR') return [
    { label: t('section_principal'),  items: items.slice(0, 1) },
    { label: t('section_admin'),      items: items.slice(1, 5) },
    { label: t('section_rapports'),   items: items.slice(5, 7) },
    { label: t('section_assistance'), items: items.slice(7, 8) },
    { label: t('section_systeme'),    items: items.slice(8) },
  ]
  if (role === 'GESTIONNAIRE') return [
    { label: null,                    items: items.slice(0, 1) },
    { label: t('section_budgets'),    items: items.slice(1, 2) },
    { label: t('section_depenses'),   items: items.slice(2, 3) },
    { label: t('section_assistance'), items: items.slice(3, 4) },
    { label: t('section_systeme'),    items: items.slice(4) },
  ]
  if (role === 'COMPTABLE') return [
    { label: null,                    items: items.slice(0, 1) },
    { label: t('section_validation'), items: items.slice(1, 3) },
    { label: t('section_rapports'),   items: items.slice(3, 4) },
    { label: t('section_assistance'), items: items.slice(4, 5) },
    { label: t('section_systeme'),    items: items.slice(5) },
  ]
  return [{ label: null, items }]
}

/* ── Classes de nav réutilisables ────────────────────────────────────────── */
const NAV_ITEM_BASE = [
  'relative flex items-center gap-[10px] px-[10px] py-2 rounded-[6px]',
  'text-[12.5px] text-[rgba(232,238,245,0.78)] cursor-pointer no-underline',
  'transition-[background,color] duration-150',
  'hover:text-[#E8EEF5] hover:bg-[rgba(232,238,245,0.06)]',
].join(' ')

const NAV_ITEM_ACTIVE = [
  'text-[#E8EEF5] bg-[rgba(232,238,245,0.10)]',
  "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5",
  'before:bg-[#B8864A] before:rounded-sm before:content-[\'\']',
].join(' ')

/* ── NavItem ─────────────────────────────────────────────────────────────── */
function NavItem({ item, collapsed, isMobile }) {
  return (
    <NavLink
      to={item.to}
      viewTransition
      className={({ isActive }) => cn(
        NAV_ITEM_BASE,
        isActive && NAV_ITEM_ACTIVE,
        collapsed && !isMobile && 'justify-center px-0 py-[10px]'
      )}
    >
      {() => (
        <>
          <span className="flex w-[15px] h-[15px] shrink-0">{item.icon}</span>
          {(!collapsed || isMobile) && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
export default function Layout({ children }) {
  const { user, logout, t } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [collapsed, setCollapsed]                 = useState(false)
  const [isMobile, setIsMobile]                   = useState(() => window.innerWidth < 768)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen]             = useState(false)
  const items    = navItems(user?.role, t)
  const sections = getSections(user?.role, items, t)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setMobileSidebarOpen(false), 0)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/') }
  const toggleSidebar = () => {
    if (isMobile) setMobileSidebarOpen(o => !o)
    else setCollapsed(c => !c)
  }

  const currentItem = items.find(i => i.to !== '/dashboard' && location.pathname.startsWith(i.to + '/'))
    || items.find(i => i.to !== '/dashboard' && location.pathname === i.to)
    || items.find(i => i.to === location.pathname)

  const sidebarWidth = isMobile ? '220px' : (collapsed ? '60px' : '220px')
  const initials = ((user?.prenom?.[0] || '') + (user?.nom?.[0] || '') || user?.email?.[0] || '?').toUpperCase()
  const roleLabel = user?.role === 'ADMINISTRATEUR' ? 'Administrateur'
                  : user?.role === 'GESTIONNAIRE'   ? 'Gestionnaire'
                  : 'Comptable'

  return (
    <div style={{
      display: 'grid', width: '100%', height: '100vh', overflow: 'hidden',
      gridTemplateColumns: isMobile ? '1fr' : `${sidebarWidth} 1fr`,
      gridTemplateRows: '56px 1fr',
      gridTemplateAreas: isMobile ? '"topbar" "main"' : '"sidebar topbar" "sidebar main"',
      background: '#F7F5F0',
    }}>

      {/* ── Mobile overlay ─────────────────────────────────────────────── */}
      {isMobile && mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-[98] bg-[rgba(14,42,71,0.6)] backdrop-blur-[4px]"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'bg-[#0E2A47] border-r border-black/[.06] flex flex-col text-[#E8EEF5] overflow-y-auto',
          collapsed && !isMobile ? 'px-2 py-[18px]' : 'px-[14px] py-[18px]'
        )}
        style={{
          gridArea: 'sidebar',
          position:  isMobile ? 'fixed'  : undefined,
          top:       isMobile ? 0        : undefined,
          left:      isMobile ? 0        : undefined,
          height:    isMobile ? '100%'   : undefined,
          width:     sidebarWidth,
          zIndex:    isMobile ? 99       : undefined,
          transform: isMobile ? (mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: 'width .22s ease, transform .25s ease',
          overflow:  collapsed && !isMobile ? 'hidden' : undefined,
        }}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-[10px] px-[10px] pb-[22px] pt-1 border-b border-[rgba(232,238,245,0.10)] mb-4',
          collapsed && !isMobile && 'justify-center px-0'
        )}>
          <div className="w-[26px] h-[26px] rounded-[6px] bg-gradient-to-br from-[#B8864A] to-[#8C6534] grid place-items-center text-white font-bold text-[14px] shrink-0">
            A
          </div>
          {(!collapsed || isMobile) && (
            <div className="font-medium text-[16px] tracking-[0.01em] text-[#E8EEF5]">
              {t('topbar_titre')}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden">
          {sections.map((section, si) => (
            <div key={si} className="mb-1">
              {(!collapsed || isMobile) && section.label && (
                <div className="text-[9px] tracking-[0.22em] uppercase text-[rgba(232,238,245,0.55)] px-[10px] pt-[14px] pb-[6px] font-medium">
                  {section.label}
                </div>
              )}
              {section.items.map(item => (
                <NavItem key={item.to} item={item} collapsed={collapsed} isMobile={isMobile} />
              ))}
            </div>
          ))}
        </nav>

        {/* Profil bas de sidebar */}
        <div className="border-t border-[rgba(232,238,245,0.10)] mt-auto pt-0">
          {/* Menu déroulant profil */}
          {profileOpen && (!collapsed || isMobile) && (
            <div className="pt-1">
              <NavLink
                to="/profil"
                className={({ isActive }) => cn(NAV_ITEM_BASE, isActive && NAV_ITEM_ACTIVE)}
              >
                {() => (
                  <>
                    <span className="flex w-[14px] h-[14px] shrink-0">{Icon.users}</span>
                    <span>{t('mon_profil')}</span>
                  </>
                )}
              </NavLink>
              <button
                onClick={handleLogout}
                className={cn(NAV_ITEM_BASE, 'w-full bg-transparent border-none hover:bg-[rgba(239,68,68,0.15)] hover:text-[#FCA5A5]')}
              >
                <span className="flex w-[14px] h-[14px] shrink-0">{Icon.arrow}</span>
                <span>{t('deconnexion')}</span>
              </button>
            </div>
          )}

          {/* Sidebar réduite : icônes profil + déconnexion */}
          {collapsed && !isMobile ? (
            <div className="flex flex-col gap-0.5 py-2">
              <NavLink to="/profil" title="Mon profil"
                className={({ isActive }) => cn(NAV_ITEM_BASE, isActive && NAV_ITEM_ACTIVE, 'justify-center px-0 py-[10px]')}>
                {() => <span className="flex w-[15px] h-[15px]">{Icon.users}</span>}
              </NavLink>
              <button
                onClick={handleLogout} title="Déconnexion"
                className={cn(NAV_ITEM_BASE, 'justify-center px-0 py-[10px] w-full bg-transparent border-none hover:bg-[rgba(239,68,68,0.15)] hover:text-[#FCA5A5]')}
              >
                <span className="flex w-[15px] h-[15px]">{Icon.arrow}</span>
              </button>
            </div>
          ) : (
            /* Bouton utilisateur */
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="w-full flex items-center gap-[10px] px-[10px] py-3 bg-transparent border-none cursor-pointer text-left"
            >
              <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#B8864A] to-[#8C6534] grid place-items-center text-[11px] font-semibold text-white shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[#E8EEF5] truncate">
                  {user?.prenom} {user?.nom}
                </div>
                <div className="text-[10px] tracking-[0.12em] uppercase text-[#E8B86E]">
                  {roleLabel}
                </div>
              </div>
              <span
                className="text-[rgba(232,238,245,0.35)] shrink-0 text-[10px] leading-none transition-transform duration-200 inline-block"
                style={{ transform: profileOpen ? 'rotate(180deg)' : 'none' }}
              >▾</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <header
        className="bg-white border-b border-[rgba(14,42,71,0.08)] flex items-center px-6 gap-5 shadow-[0_1px_2px_rgba(14,42,71,0.04)]"
        style={{ gridArea: 'topbar' }}
      >
        {/* Toggle sidebar */}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          className="w-[34px] h-[34px] rounded-lg shrink-0 border border-[rgba(14,42,71,0.16)] bg-[#F7F5F0] text-[#5A6B7E] flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-[rgba(184,134,74,0.12)] hover:border-[rgba(184,134,74,0.30)] hover:text-[#B8864A] focus-visible:outline-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[15px] h-[15px]">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>

        {/* Breadcrumb */}
        {currentItem && (
          <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[rgba(90,107,126,0.7)]">
            <span>Atlas Finance</span>
            <span className="text-[#B8864A] opacity-80">/</span>
            <span className="text-[#0E2A47]">{currentItem.label}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Assistance IA */}
        <button
          onClick={() => window.dispatchEvent(new Event('open-chatbot'))}
          className="flex items-center gap-[7px] h-8 px-3 rounded-[6px] border border-[rgba(184,134,74,0.30)] bg-[rgba(184,134,74,0.12)] text-[#B8864A] text-xs font-semibold cursor-pointer transition-all duration-150 shrink-0 hover:bg-[rgba(184,134,74,0.20)] hover:border-[#B8864A] focus-visible:outline-none"
        >
          <span className="flex w-[13px] h-[13px]">{Icon.sparkle}</span>
          {t('topbar_assistance')}
        </button>

        {/* Cloche notifications */}
        <NotificationBell navigate={navigate} t={t} />
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main
        className="overflow-auto"
        style={{
          gridArea: 'main',
          padding: isMobile ? '16px 14px' : '28px 32px 40px',
          background: '#F7F5F0',
          backgroundImage: 'radial-gradient(ellipse 60% 40% at 90% -10%, rgba(184,134,74,0.06), transparent 60%)',
        }}
      >
        {children}
      </main>

    </div>
  )
}

/* ── helpers notifications ───────────────────────────────────────────────── */
const NOTIF_META = {
  BUDGET_CREE:      { icon: Icon.audit,    color: '#0E2A47',        bg: 'rgba(184,134,74,0.12)', border: 'rgba(184,134,74,0.30)', label: 'Nouveau budget'      },
  BUDGET_APPROUVE:  { icon: Icon.check,    color: '#15803D',        bg: 'rgba(21,128,61,0.08)',  border: 'rgba(21,128,61,0.25)',  label: 'Budget approuvé'     },
  BUDGET_REJETE:    { icon: Icon.reject,   color: '#B91C1C',        bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.2)',   label: 'Budget rejeté'       },
  BUDGET_SOUMIS:    { icon: Icon.budget,   color: '#B8864A',        bg: 'rgba(184,134,74,0.12)', border: 'rgba(184,134,74,0.30)', label: 'Budget soumis'       },
  DEPENSE_SAISIE:   { icon: Icon.expense,  color: '#0F766E',        bg: 'rgba(15,118,110,0.08)', border: 'rgba(15,118,110,0.25)', label: 'Dépense enregistrée' },
  DEPENSE_VALIDEE:  { icon: Icon.validate, color: '#0891B2',        bg: 'rgba(8,145,178,0.08)',  border: 'rgba(8,145,178,0.25)', label: 'Dépense validée'     },
  DEPENSE_REJETEE:  { icon: Icon.reject,   color: '#B91C1C',        bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.2)',   label: 'Dépense rejetée'     },
  DEFAULT:          { icon: Icon.bell,     color: '#B8864A',        bg: 'rgba(184,134,74,0.12)', border: 'rgba(184,134,74,0.30)', label: 'Info'                },
}
const notifMeta = type => NOTIF_META[type] || NOTIF_META.DEFAULT

function fmtDate(iso) {
  const d    = new Date(iso)
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 60)    return "À l'instant"
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/* ── NotificationBell ────────────────────────────────────────────────────── */
function NotificationBell({ navigate, t }) {
  const [notifs,    setNotifs]    = useState([])
  const [nbNonLues, setNbNonLues] = useState(0)
  const [open,      setOpen]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const btnRef        = useRef(null)
  const panelRef      = useRef(null)
  const loadNotifsRef = useRef(() => {})

  const prefBudget  = () => { try { return JSON.parse(localStorage.getItem('notif_budget')  ?? 'true')  } catch { return true  } }
  const prefDepense = () => { try { return JSON.parse(localStorage.getItem('notif_depense') ?? 'true')  } catch { return true  } }
  const prefSon     = () => { try { return JSON.parse(localStorage.getItem('notif_son')     ?? 'false') } catch { return false } }

  const playSound = () => {
    if (!prefSon()) return
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
    } catch { /* ignore */ }
  }

  const BUDGET_TYPES  = ['BUDGET_CREE','BUDGET_APPROUVE','BUDGET_REJETE','BUDGET_SOUMIS']
  const DEPENSE_TYPES = ['DEPENSE_SAISIE','DEPENSE_VALIDEE','DEPENSE_REJETEE']
  const filterNotifs  = list => list.filter(n => {
    if (BUDGET_TYPES.includes(n.type_notif)  && !prefBudget())  return false
    if (DEPENSE_TYPES.includes(n.type_notif) && !prefDepense()) return false
    return true
  })

  const loadNotifs = () => {
    getNotifications().then(r => {
      const all   = r.data?.data ?? []
      const newNb = r.data?.nb_non_lues ?? 0
      if (newNb > nbNonLues) playSound()
      setNotifs(filterNotifs(all))
      setNbNonLues(newNb)
    }).catch(() => {})
  }
  useEffect(() => { loadNotifsRef.current = loadNotifs })
  useEffect(() => {
    const run = () => loadNotifsRef.current?.()
    run()
    const timer = setInterval(run, 60000)
    window.addEventListener('budgetflow:notif-refresh', run)
    return () => { clearInterval(timer); window.removeEventListener('budgetflow:notif-refresh', run) }
  }, [])

  useEffect(() => {
    const h = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)
       && btnRef.current   && !btnRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleLireTout = async () => {
    setLoading(true)
    await marquerToutesLues()
    setNotifs(ns => ns.map(n => ({ ...n, lu: true })))
    setNbNonLues(0)
    setLoading(false)
  }

  const handleClick = async notif => {
    if (!notif.lu) {
      await marquerLue(notif.id)
      setNotifs(ns => ns.map(n => n.id === notif.id ? { ...n, lu: true } : n))
      setNbNonLues(c => Math.max(0, c - 1))
    }
    setOpen(false)
    if (notif.lien) navigate(notif.lien)
  }

  return (
    <>
      {/* Bouton cloche */}
      <button
        ref={btnRef}
        onClick={() => { setOpen(o => !o); loadNotifsRef.current?.() }}
        aria-label="Notifications"
        className={cn(
          'relative w-[34px] h-[34px] rounded-lg border border-[rgba(14,42,71,0.16)] flex items-center justify-center cursor-pointer text-[#5A6B7E] transition-all duration-150 shrink-0 focus-visible:outline-none',
          'hover:bg-[rgba(184,134,74,0.12)] hover:border-[rgba(184,134,74,0.30)] hover:text-[#B8864A]',
          open ? 'bg-[rgba(184,134,74,0.12)]' : 'bg-[#F7F5F0]'
        )}
      >
        <span className="flex w-4 h-4">{Icon.bell}</span>
        {nbNonLues > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full bg-[#C0392B] border-2 border-white flex items-center justify-center text-[9px] font-extrabold text-white px-[3px]">
            {nbNonLues > 9 ? '9+' : nbNonLues}
          </span>
        )}
      </button>

      {/* Panel notifications */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-[rgba(14,42,71,0.08)] bg-white shadow-[0_8px_20px_rgba(14,42,71,0.10),0_28px_64px_rgba(14,42,71,0.10)] animate-[slideDown_.2s_cubic-bezier(.4,0,.2,1)]"
          style={{
            top: 'calc(56px + 8px)', right: 8,
            width: 'min(400px, calc(100vw - 16px))',
            maxHeight: 'calc(100vh - 56px - 24px)',
          }}
        >
          {/* Header panel */}
          <div className="px-[18px] py-4 bg-[#0E2A47] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[10px]">
                <div className="w-8 h-8 rounded-lg bg-white/[.12] flex items-center justify-center text-white">
                  <span className="flex w-4 h-4">{Icon.bell}</span>
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{t('notif_titre')}</div>
                  <div className="text-[11px] text-white/55 mt-px">
                    {nbNonLues > 0 ? `${nbNonLues} non lue${nbNonLues > 1 ? 's' : ''}` : t('notif_a_jour')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {nbNonLues > 0 && (
                  <button
                    onClick={handleLireTout} disabled={loading}
                    className="text-[11px] font-semibold text-white/85 bg-white/[.12] border border-white/20 rounded-[6px] px-[10px] py-1 cursor-pointer"
                  >
                    {loading ? '…' : t('notif_tout_lire')}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-[26px] h-[26px] rounded-[6px] bg-white/10 border-none text-white/70 cursor-pointer flex items-center justify-center"
                >
                  <span className="flex w-[14px] h-[14px]">{Icon.close}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Badge compteur non lues */}
          {nbNonLues > 0 && (
            <div className="px-[18px] py-2 bg-[rgba(184,134,74,0.12)] border-b border-[rgba(184,134,74,0.30)] text-xs text-[#0E2A47] font-semibold flex items-center gap-1.5 shrink-0">
              <span className="flex w-[13px] h-[13px] text-[#B8864A] shrink-0">{Icon.bell}</span>
              {nbNonLues} {t('notif_attente')}
            </div>
          )}

          {/* Liste */}
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <span className="flex w-8 h-8 text-[rgba(14,42,71,0.16)] mx-auto mb-3">{Icon.bell}</span>
                <div className="text-[13px] font-semibold text-[#0E2A47] mb-1">{t('notif_aucune')}</div>
                <div className="text-xs text-[#5A6B7E]">{t('notif_vous_a_jour')}</div>
              </div>
            ) : notifs.map((n, i) => {
              const meta = notifMeta(n.type_notif)
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-[18px] py-3 flex gap-3 items-start border-none cursor-pointer transition-colors duration-100 hover:bg-[#EDE7DA]"
                  style={{
                    background: n.lu ? '#fff' : meta.bg,
                    borderBottom: i < notifs.length - 1 ? '1px solid rgba(14,42,71,0.08)' : 'none',
                  }}
                >
                  <div className="w-9 h-9 rounded-[9px] shrink-0 flex items-center justify-center"
                    style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
                    <span className="flex w-4 h-4">{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-[3px]">
                      <span className="text-[10px] font-bold px-[7px] py-[1px] rounded-full tracking-[0.3px]"
                        style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                        {meta.label}
                      </span>
                      {!n.lu && <span className="w-[7px] h-[7px] rounded-full bg-[#B8864A] shrink-0" />}
                    </div>
                    <div className="text-[12.5px] leading-[1.5] text-[#0E2A47] mb-1" style={{ fontWeight: n.lu ? 400 : 600 }}>
                      {n.message}
                    </div>
                    <div className="text-[11px] text-[#5A6B7E] flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[11px] h-[11px] shrink-0">
                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                      </svg>
                      {fmtDate(n.date)}
                      {n.lien && <span className="ml-1.5 text-[#B8864A] font-semibold">Voir →</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-[18px] py-[10px] border-t border-[rgba(14,42,71,0.08)] bg-[#EDE7DA] shrink-0 text-[11px] text-[#5A6B7E] text-center">
            {t('notif_rafraich')}
          </div>
        </div>
      )}
    </>
  )
}
