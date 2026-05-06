import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getNotifications, marquerLue, marquerToutesLues } from '../api/notifications'
import {
  LayoutDashboard, Wallet, CalendarDays, Building2, Users,
  BarChart3, FileBarChart, CreditCard,
  CheckCircle2, ChevronRight, ChevronDown, LogOut, User,
  Menu, Bell, Settings, Sparkles,
  FileText, XCircle, Upload, DollarSign, Ban, Clock, X,
} from 'lucide-react'

/* ── Rôles ───────────────────────────────────────────────────────────────── */
const ROLE_BADGE = {
  ADMINISTRATEUR: { bg: 'rgba(184,134,74,.15)',  color: '#B8864A', label: 'Admin' },
  GESTIONNAIRE  : { bg: 'rgba(21,128,61,.15)',   color: '#15803D', label: 'Gestionnaire' },
  COMPTABLE     : { bg: 'rgba(14,42,71,.15)',    color: '#4A8CB0', label: 'Comptable' },
}

/* ── Navigation par rôle ─────────────────────────────────────────────────── */
function navItems(role, t) {
  if (role === 'ADMINISTRATEUR') return [
    { to: '/dashboard',          icon: LayoutDashboard, label: t('nav_dashboard')        },
    { to: '/budget-annuel',      icon: CalendarDays,    label: t('nav_budget_annuel')    },
    { to: '/departements',       icon: Building2,       label: t('nav_departements')     },
    { to: '/utilisateurs',       icon: Users,           label: t('nav_utilisateurs')     },
    { to: '/depenses',           icon: CreditCard,      label: t('nav_depenses') },
    { to: '/rapports',           icon: BarChart3,       label: t('nav_statistiques')     },
    { to: '/rapports-detailles', icon: FileBarChart,    label: t('nav_rapports_detail')  },
    { to: '/ia',                 icon: Sparkles,        label: t('nav_assistance_ia')    },
    { to: '/parametres',         icon: Settings,        label: t('nav_parametres')       },
  ]
  if (role === 'GESTIONNAIRE') return [
    { to: '/dashboard',    icon: LayoutDashboard, label: t('nav_dashboard')     },
    { to: '/mes-budgets',  icon: Wallet,          label: t('nav_mes_budgets')   },
    { to: '/mes-depenses', icon: CreditCard,      label: t('nav_mes_depenses')  },
    { to: '/ia',           icon: Sparkles,        label: t('nav_assistance_ia') },
    { to: '/parametres',   icon: Settings,        label: t('nav_parametres')    },
  ]
  if (role === 'COMPTABLE') return [
    { to: '/dashboard',  icon: LayoutDashboard, label: t('nav_dashboard')        },
    { to: '/validation', icon: CheckCircle2,    label: t('nav_validation')       },
    { to: '/depenses',   icon: CreditCard,      label: t('nav_depenses_valider') },
    { to: '/rapports',   icon: BarChart3,       label: t('nav_statistiques')     },
    { to: '/ia',         icon: Sparkles,        label: t('nav_assistance_ia')    },
    { to: '/parametres', icon: Settings,        label: t('nav_parametres')       },
  ]
  return []
}

/* ── Section labels ──────────────────────────────────────────────────────── */
function getSections(role, items, t) {
  if (role === 'ADMINISTRATEUR') {
    return [
      { label: t('section_principal'),  items: items.slice(0, 1) },
      { label: t('section_admin'),      items: items.slice(1, 5) },
      { label: t('section_rapports'),   items: items.slice(5, 7) },
      { label: t('section_assistance'), items: items.slice(7, 8) },
      { label: t('section_systeme'),    items: items.slice(8) },
    ]
  }
  if (role === 'GESTIONNAIRE') {
    return [
      { label: null,                    items: items.slice(0, 1) },
      { label: t('section_budgets'),    items: items.slice(1, 2) },
      { label: t('section_depenses'),   items: items.slice(2, 3) },
      { label: t('section_assistance'), items: items.slice(3, 4) },
      { label: t('section_systeme'),    items: items.slice(4) },
    ]
  }
  if (role === 'COMPTABLE') {
    return [
      { label: null,                    items: items.slice(0, 1) },
      { label: t('section_validation'), items: items.slice(1, 3) },
      { label: t('section_rapports'),   items: items.slice(3, 4) },
      { label: t('section_assistance'), items: items.slice(4, 5) },
      { label: t('section_systeme'),    items: items.slice(5) },
    ]
  }
  return [{ label: null, items }]
}

/* ── NavItem ─────────────────────────────────────────────────────────────── */
function NavItem({ item, collapsed }) {
  const IconComp = item.icon
  return (
    <NavLink
      to={item.to}
      viewTransition
      title={collapsed ? item.label : undefined}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center',
        gap: 10, padding: collapsed ? '10px 0' : '9px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 8, marginBottom: 2,
        color: isActive ? '#FFFFFF' : 'var(--af-side-mute)',
        background: isActive ? 'rgba(184,134,74,.14)' : 'transparent',
        fontWeight: isActive ? 600 : 400,
        fontSize: '13px',
        transition: 'all .12s',
        textDecoration: 'none',
        minHeight: 44,
        boxShadow: isActive ? 'inset 2px 0 0 var(--color-gold)' : 'none',
      })}
    >
      {({ isActive }) => (
        <>
          <IconComp
            size={16}
            strokeWidth={isActive ? 2 : 1.8}
            style={{ flexShrink: 0, color: isActive ? 'var(--color-gold-warm)' : 'rgba(232,238,245,.45)' }}
          />
          {!collapsed && <span style={{ flex: 1, color: isActive ? 'var(--af-side-text)' : 'var(--af-side-mute)' }}>{item.label}</span>}
          {!collapsed && isActive && (
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-gold)', flexShrink: 0 }} />
          )}
        </>
      )}
    </NavLink>
  )
}

/* ── Layout component ────────────────────────────────────────────────────── */
export default function Layout({ children }) {
  const { user, logout, t } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [collapsed, setCollapsed]         = useState(false)
  const [isMobile, setIsMobile]           = useState(() => window.innerWidth < 768)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen]     = useState(false)
  const items   = navItems(user?.role, t)
  const sections = getSections(user?.role, items, t)
  const roleInfo = ROLE_BADGE[user?.role] || { bg: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)', label: user?.role }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* Close mobile sidebar on route change */
  useEffect(() => { setMobileSidebarOpen(false) }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/') }

  const toggleSidebar = () => {
    if (isMobile) setMobileSidebarOpen(o => !o)
    else setCollapsed(c => !c)
  }

  /* Breadcrumb label from current path */
  const currentItem = items.find(i => i.to !== '/dashboard' && location.pathname.startsWith(i.to + '/'))
    || items.find(i => i.to !== '/dashboard' && location.pathname === i.to)
    || items.find(i => i.to === location.pathname)

  return (
    <div className="flex h-full" style={{ background: 'var(--af-night)' }}>

      {/* ── Mobile overlay ────────────────────────────────────────────── */}
      {isMobile && mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 98,
            background: 'rgba(14,42,71,.6)', backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col overflow-hidden shrink-0"
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 0 : undefined,
          left: isMobile ? 0 : undefined,
          height: isMobile ? '100%' : undefined,
          zIndex: isMobile ? 99 : 100,
          width: isMobile ? 'var(--sidebar-w)' : (collapsed ? 60 : 'var(--sidebar-w)'),
          minWidth: isMobile ? 'var(--sidebar-w)' : (collapsed ? 60 : 'var(--sidebar-w)'),
          transform: isMobile ? (mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: 'width .22s cubic-bezier(.4,0,.2,1), min-width .22s, transform .25s cubic-bezier(.4,0,.2,1)',
          background: 'var(--af-ink)',
          borderRight: '1px solid rgba(255,255,255,.06)',
        }}
      >

        {/* Logo */}
        <div
          className="shrink-0 flex items-center border-b gap-[10px]"
          style={{
            height: 'var(--topbar-h)',
            padding: collapsed ? '0' : '0 16px 0 18px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderBottomColor: 'rgba(255,255,255,.06)',
          }}
        >
          {/* Atlas Finance logo mark — gradient square */}
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '-.01em' }}>
              A
            </span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--af-side-text)', lineHeight: 1.2, fontFamily: 'var(--font-display)', letterSpacing: '-.01em' }}>
                {t('topbar_titre')}
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(232,238,245,.35)', letterSpacing: '.10em', marginTop: 2, textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
                {t('plateforme')}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ padding: collapsed ? '12px 6px' : '12px 10px' }}
        >
          {sections.map((section, si) => (
            <div key={si} className="mb-2">
              {!collapsed && section.label && (
                <div
                  style={{
                    fontSize: '9px', fontWeight: 500, letterSpacing: '.18em',
                    color: 'rgba(232,238,245,.25)', textTransform: 'uppercase',
                    padding: '0 12px 5px', marginTop: si > 0 ? 8 : 0,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {section.label}
                </div>
              )}
              {section.items.map(item => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          ))}
        </nav>

        {/* ── Sidebar bottom: profil accordéon ────────────────────────── */}
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>

          {/* Menu déroulant — visible quand profileOpen */}
          {profileOpen && !collapsed && (
            <div style={{ padding: '4px 10px 0' }}>
              <NavLink
                to="/profil"
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, marginBottom: 2,
                  color: isActive ? 'var(--af-side-text)' : 'var(--af-side-mute)',
                  background: isActive ? 'rgba(184,134,74,.14)' : 'transparent',
                  fontWeight: isActive ? 600 : 400, fontSize: '13px',
                  transition: 'all .12s', textDecoration: 'none', minHeight: 38,
                  boxShadow: isActive ? 'inset 2px 0 0 var(--color-gold)' : 'none',
                })}
              >
                {({ isActive }) => (
                  <>
                    <User size={14} strokeWidth={isActive ? 2 : 1.8} style={{ flexShrink: 0, color: isActive ? 'var(--color-gold-warm)' : 'rgba(232,238,245,.45)' }} />
                    <span style={{ flex: 1 }}>{t('mon_profil')}</span>
                  </>
                )}
              </NavLink>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                  color: 'rgba(232,238,245,.5)', background: 'transparent',
                  fontWeight: 400, fontSize: '13px', transition: 'all .12s',
                  border: 'none', cursor: 'pointer', minHeight: 38,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.15)'; e.currentTarget.style.color = '#FCA5A5' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(232,238,245,.5)' }}
              >
                <LogOut size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span>{t('deconnexion')}</span>
              </button>
            </div>
          )}

          {/* Bouton toggle quand sidebar réduite */}
          {collapsed && (
            <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavLink to="/profil" title="Mon profil"
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '8px 0', borderRadius: 8, minHeight: 36,
                  color: isActive ? 'var(--color-gold-warm)' : 'rgba(232,238,245,.45)',
                  background: isActive ? 'rgba(184,134,74,.14)' : 'transparent',
                  textDecoration: 'none',
                })}
              >
                {({ isActive }) => <User size={15} strokeWidth={isActive ? 2 : 1.8} />}
              </NavLink>
              <button
                onClick={handleLogout} title="Déconnexion"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '8px 0', borderRadius: 8, minHeight: 36,
                  color: 'rgba(232,238,245,.45)', background: 'transparent',
                  border: 'none', cursor: 'pointer', width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.15)'; e.currentTarget.style.color = '#FCA5A5' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(232,238,245,.45)' }}
              >
                <LogOut size={15} strokeWidth={1.8} />
              </button>
            </div>
          )}

          {/* En-tête utilisateur cliquable (toggle) */}
          {!collapsed && (
            <button
              onClick={() => setProfileOpen(o => !o)}
              aria-expanded={profileOpen}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                transition: 'background .12s', minHeight: 44,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Initiales */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(184,134,74,.25)', border: '1px solid rgba(184,134,74,.4)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-gold-warm)',
              }}>
                {((user?.prenom?.[0] || '') + (user?.nom?.[0] || '') || user?.email?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--af-side-text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.prenom} {user?.nom}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(232,238,245,.4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
              </div>
              <ChevronDown
                size={12} strokeWidth={2.5}
                style={{
                  color: 'rgba(232,238,245,.35)', flexShrink: 0,
                  transform: profileOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform .2s',
                }}
              />
            </button>
          )}
        </div>

      </aside>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header
          className="shrink-0 flex items-center px-5 gap-[12px] z-50"
          style={{
            height: 'var(--topbar-h)',
            background: 'var(--af-slate)',
            borderBottom: '1px solid var(--af-line)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          {/* Toggle sidebar */}
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
            style={{
              width: 34, height: 34, borderRadius: 9,
              border: '1px solid var(--af-line-2)', background: 'var(--af-night)',
              color: 'var(--af-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .12s', flexShrink: 0, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-gold-soft)'; e.currentTarget.style.borderColor = 'var(--color-gold-line)'; e.currentTarget.style.color = 'var(--color-gold)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--af-night)'; e.currentTarget.style.borderColor = 'var(--af-line-2)'; e.currentTarget.style.color = 'var(--af-cream)' }}
          >
            <Menu size={15} strokeWidth={2} />
          </button>

          {/* Breadcrumb */}
          {currentItem && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: 'var(--af-cream)' }}>
              <span style={{ fontWeight: 500 }}>Gestion Budgétaire</span>
              <ChevronRight size={12} strokeWidth={2.5} />
              <span style={{ color: 'var(--af-ink)', fontWeight: 700, letterSpacing: '-.01em' }}>{currentItem.label}</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Bouton Assistance (chatbot) */}
          <button
            onClick={() => window.dispatchEvent(new Event('open-chatbot'))}
            aria-label="Ouvrir l'assistant IA"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              height: 34, padding: '0 12px', borderRadius: 8,
              border: '1px solid var(--color-gold-line)',
              background: 'var(--color-gold-soft)',
              color: 'var(--color-gold)', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', transition: 'all .12s', flexShrink: 0,
              letterSpacing: '.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184,134,74,.2)'; e.currentTarget.style.borderColor = 'var(--color-gold)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-gold-soft)'; e.currentTarget.style.borderColor = 'var(--color-gold-line)' }}
          >
            <Sparkles size={13} strokeWidth={2} />
            {t('topbar_assistance')}
          </button>

          {/* Cloche de notifications */}
          <NotificationBell navigate={navigate} t={t} />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ padding: isMobile ? '16px 14px' : '28px 32px', background: 'var(--af-night)' }}>
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}

/* ── helpers notifications ───────────────────────────────────────────────── */
const NOTIF_META = {
  BUDGET_CREE:      { Icon: FileText,    color: 'var(--af-ink)',          bg: 'var(--color-gold-soft)', border: 'var(--color-gold-line)', label: 'Nouveau budget'    },
  BUDGET_APPROUVE:  { Icon: CheckCircle2,color: '#15803D',                bg: 'rgba(21,128,61,.08)',    border: 'rgba(21,128,61,.25)',     label: 'Budget approuvé'   },
  BUDGET_REJETE:    { Icon: XCircle,     color: '#B91C1C',                bg: 'rgba(220,38,38,.06)',    border: 'rgba(220,38,38,.2)',      label: 'Budget rejeté'     },
  BUDGET_SOUMIS:    { Icon: Upload,      color: 'var(--color-gold)',      bg: 'var(--color-gold-soft)', border: 'var(--color-gold-line)', label: 'Budget soumis'     },
  DEPENSE_SAISIE:   { Icon: DollarSign,  color: '#0F766E',                bg: 'rgba(15,118,110,.08)',   border: 'rgba(15,118,110,.25)',    label: 'Dépense enregistrée' },
  DEPENSE_VALIDEE:  { Icon: CreditCard,  color: '#0891B2',                bg: 'rgba(8,145,178,.08)',    border: 'rgba(8,145,178,.25)',     label: 'Dépense validée'   },
  DEPENSE_REJETEE:  { Icon: Ban,         color: '#B91C1C',                bg: 'rgba(220,38,38,.06)',    border: 'rgba(220,38,38,.2)',      label: 'Dépense rejetée'   },
  DEFAULT:          { Icon: Bell,        color: 'var(--color-gold)',      bg: 'var(--color-gold-soft)', border: 'var(--color-gold-line)', label: 'Info'              },
}
const notifMeta = (type) => NOTIF_META[type] || NOTIF_META.DEFAULT

function fmtDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60)  return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/* ── NotificationBell ────────────────────────────────────────────────────── */
function NotificationBell({ navigate, t }) {

  const [notifs,    setNotifs]    = useState([])
  const [nbNonLues, setNbNonLues] = useState(0)
  const [open,      setOpen]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const btnRef   = useRef(null)
  const panelRef = useRef(null)

  /* ── Préférences notifications ── */
  const prefBudget  = () => { try { return JSON.parse(localStorage.getItem('notif_budget')  ?? 'true') } catch { return true } }
  const prefDepense = () => { try { return JSON.parse(localStorage.getItem('notif_depense') ?? 'true') } catch { return true } }
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
    } catch {}
  }

  const BUDGET_TYPES  = ['BUDGET_CREE', 'BUDGET_APPROUVE', 'BUDGET_REJETE', 'BUDGET_SOUMIS']
  const DEPENSE_TYPES = ['DEPENSE_SAISIE', 'DEPENSE_VALIDEE', 'DEPENSE_REJETEE']

  const filterNotifs = (list) => list.filter(n => {
    if (BUDGET_TYPES.includes(n.type_notif)  && !prefBudget())  return false
    if (DEPENSE_TYPES.includes(n.type_notif) && !prefDepense()) return false
    return true
  })

  const loadNotifs = () => {
    getNotifications().then(r => {
      const all = r.data?.data ?? []
      const prevCount = nbNonLues
      const newNbNonLues = r.data?.nb_non_lues ?? 0
      if (newNbNonLues > prevCount) playSound()
      setNotifs(filterNotifs(all))
      setNbNonLues(newNbNonLues)
    }).catch(() => {})
  }

  const loadBadge = () => {
    getNotifications({ non_lues: '1' }).then(r => {
      setNbNonLues(r.data?.nb_non_lues ?? 0)
    }).catch(() => {})
  }

  useEffect(() => {
    loadNotifs()
    const badgeTimer = setInterval(loadBadge, 5000)
    const fullTimer  = setInterval(loadNotifs, 30000)
    const onRefresh = () => loadNotifs()
    window.addEventListener('budgetflow:notif-refresh', onRefresh)
    return () => {
      clearInterval(badgeTimer)
      clearInterval(fullTimer)
      window.removeEventListener('budgetflow:notif-refresh', onRefresh)
    }
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    loadNotifs()
  }

  const handleLireTout = async () => {
    setLoading(true)
    await marquerToutesLues()
    setNotifs(ns => ns.map(n => ({ ...n, lu: true })))
    setNbNonLues(0)
    setLoading(false)
  }

  const handleClick = async (notif) => {
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
      {/* ── Bouton cloche ── */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        aria-label="Notifications"
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 8,
          border: '1px solid var(--af-line-2)',
          background: open ? 'var(--color-gold-soft)' : 'var(--af-night)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--af-cream)', transition: 'all .12s', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-gold-soft)'; e.currentTarget.style.borderColor = 'var(--color-gold-line)'; e.currentTarget.style.color = 'var(--color-gold)' }}
        onMouseLeave={e => { e.currentTarget.style.background = open ? 'var(--color-gold-soft)' : 'var(--af-night)'; e.currentTarget.style.borderColor = 'var(--af-line-2)'; e.currentTarget.style.color = 'var(--af-cream)' }}
      >
        <Bell size={16} strokeWidth={2} />
        {nbNonLues > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 17, height: 17, borderRadius: 9999,
            background: '#C0392B', border: '2px solid var(--af-slate)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', fontWeight: 800, color: '#fff', padding: '0 3px',
          }}>
            {nbNonLues > 9 ? '9+' : nbNonLues}
          </span>
        )}
      </button>

      {/* ── Panel fixe en haut à droite ── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: 'calc(var(--topbar-h) + 8px)',
            right: 8,
            width: 'min(400px, calc(100vw - 16px))',
            maxHeight: 'calc(100vh - var(--topbar-h) - 24px)',
            background: 'var(--af-slate)',
            borderRadius: 16,
            border: '1px solid var(--af-line)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideDown .2s cubic-bezier(.4,0,.2,1)',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: '16px 18px 14px',
            background: 'var(--af-ink)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,255,255,.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bell size={16} strokeWidth={2} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{t('notif_titre')}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.55)', marginTop: 1 }}>
                    {nbNonLues > 0 ? `${nbNonLues} non lue${nbNonLues > 1 ? 's' : ''}` : t('notif_a_jour')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {nbNonLues > 0 && (
                  <button
                    onClick={handleLireTout}
                    disabled={loading}
                    style={{
                      fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.85)',
                      background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
                      borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                    }}
                  >
                    {loading ? '…' : t('notif_tout_lire')}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: 'rgba(255,255,255,.1)', border: 'none',
                    color: 'rgba(255,255,255,.7)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Badge compteur ── */}
          {nbNonLues > 0 && (
            <div style={{
              padding: '8px 18px',
              background: 'var(--color-gold-soft)',
              borderBottom: '1px solid var(--color-gold-line)',
              fontSize: '12px', color: 'var(--af-ink)', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
              <Bell size={13} strokeWidth={2} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
              {nbNonLues} {t('notif_attente')}
            </div>
          )}

          {/* ── Liste ── */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <Bell size={32} strokeWidth={1.2} style={{ color: 'var(--color-gray-150)' }} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--af-ink)', marginBottom: 4 }}>{t('notif_aucune')}</div>
                <div style={{ fontSize: '12px', color: 'var(--af-cream)' }}>{t('notif_vous_a_jour')}</div>
              </div>
            ) : notifs.map((n, i) => {
              const meta = notifMeta(n.type_notif)
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 18px',
                    background: n.lu ? 'var(--af-slate)' : meta.bg,
                    border: 'none',
                    borderBottom: i < notifs.length - 1 ? '1px solid var(--af-line)' : 'none',
                    cursor: 'pointer', transition: 'background .1s',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.lu ? 'var(--af-slate)' : meta.bg}
                >
                  {/* Icône type */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: meta.bg, border: `1px solid ${meta.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <meta.Icon size={16} strokeWidth={2} style={{ color: meta.color }} />
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        color: meta.color, background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        padding: '1px 7px', borderRadius: 9999,
                        letterSpacing: '.3px',
                      }}>
                        {meta.label}
                      </span>
                      {!n.lu && (
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: 'var(--color-gold)', flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <div style={{
                      fontSize: '12.5px',
                      fontWeight: n.lu ? 400 : 600,
                      color: 'var(--af-ink)',
                      lineHeight: 1.5,
                      marginBottom: 4,
                    }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--af-cream)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} strokeWidth={2} style={{ flexShrink: 0 }} />
                      {fmtDate(n.date)}
                      {n.lien && (
                        <span style={{ marginLeft: 6, color: 'var(--color-gold)', fontWeight: 600 }}>
                          Voir →
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--af-line)',
            background: 'var(--color-gray-50)',
            flexShrink: 0,
            fontSize: '11px', color: 'var(--af-cream)', textAlign: 'center',
          }}>
            {t('notif_rafraich')}
          </div>
        </div>
      )}
    </>
  )
}

/* ── AvatarMenu ──────────────────────────────────────────────────────────── */
function AvatarMenu({ user, roleInfo, onLogout, navigate }) {
  const [open, setOpen]       = useState(false)
  const [isSmall, setIsSmall] = useState(() => window.innerWidth < 480)
  const ref = useRef(null)
  useEffect(() => {
    const check = () => setIsSmall(window.innerWidth < 480)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const initials = ((user?.prenom?.[0] || '') + (user?.nom?.[0] || '') || user?.email?.[0] || '?').toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menu profil"
        aria-expanded={open}
        className="flex items-center gap-[9px] px-[10px] py-[5px] pl-[5px] rounded-[10px] cursor-pointer transition-all"
        style={{
          border: '1.5px solid rgba(255,255,255,.25)',
          background: open ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.1)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'}
        onMouseLeave={e => e.currentTarget.style.background = open ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.1)'}
      >
        <div
          className="w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[11px]"
          style={{ background: 'rgba(184,134,74,.3)', color: 'var(--color-gold-warm)' }}
        >
          {initials}
        </div>
        {!isSmall && (
          <div className="text-left">
            <div className="font-semibold text-[13px] leading-[1.2]" style={{ color: '#fff' }}>
              {user?.prenom} {user?.nom}
            </div>
            <div className="text-[11px] mt-[1px]" style={{ color: 'rgba(255,255,255,.6)' }}>
              {user?.email}
            </div>
          </div>
        )}
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          color="rgba(255,255,255,.7)"
          style={{ marginLeft: 2, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] bg-white rounded-[12px] border border-[#E5E7EB] min-w-[210px] z-[200] overflow-hidden"
          style={{ boxShadow: 'var(--shadow-xl)', animation: 'fadeIn .15s ease' }}
        >
          {/* Header */}
          <div className="px-4 py-[14px] border-b border-[#F3F4F6] bg-[#F9FAFB]">
            <div className="font-bold text-[13.5px] text-[#111827] mb-[5px]">
              {user?.prenom} {user?.nom}
            </div>
            <div className="text-[12px] text-[#6B7280] mb-[6px]">
              {user?.email}
            </div>
            <span className="inline-block text-[10px] font-bold px-2 py-[2px] rounded-[20px] tracking-[.3px]" style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)', border: '1px solid var(--color-gold-line)' }}>
              {roleInfo?.label || user?.role}
            </span>
          </div>

          {/* Mon profil */}
          <button
            className="dropdown-item"
            onClick={() => { setOpen(false); navigate('/profil') }}
          >
            <User size={15} strokeWidth={1.8} color="#6B7280" />
            Mon profil
          </button>

          <div className="dropdown-divider" />

          {/* Déconnexion */}
          <button
            className="dropdown-item danger"
            onClick={() => { setOpen(false); onLogout() }}
          >
            <LogOut size={15} strokeWidth={1.8} />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}
