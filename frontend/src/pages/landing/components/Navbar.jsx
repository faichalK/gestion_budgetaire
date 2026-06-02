import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { label: 'Comment ça marche', href: '#how-it-works' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    const onResize = () => setMobile(window.innerWidth < 768)
    onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const handleNavClick = (e, href) => {
    e.preventDefault()
    setDrawerOpen(false)
    const target = document.querySelector(href)
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' })
  }

  return (
    <>
      <style>{`
        .nav-bar {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(15,23,42,0.08);
          transition: box-shadow .2s, border-color .2s;
        }
        .nav-bar.scrolled {
          background: rgba(255,255,255,0.97);
          box-shadow: 0 1px 20px rgba(15,23,42,0.08);
          border-bottom-color: rgba(15,23,42,0.1);
        }
        .nav-link:hover { color: var(--color-gold) !important; background: var(--color-gold-soft) !important; }
        .nav-cta:hover  { background: var(--color-gold-dark) !important; }
      `}</style>

      <nav className={`nav-bar${scrolled ? ' scrolled' : ''}`} role="navigation" aria-label="Navigation principale"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 64 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>

          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }} aria-label="Gestion budgétaire — Accueil">
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(184,134,74,0.3)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.03em' }}>Gestion budgétaire</span>
          </a>

          {mobile ? (
            /* Mobile hamburger */
            <button
              style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 8, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setDrawerOpen(true)} aria-label="Ouvrir le menu" aria-expanded={drawerOpen}
            >
              {[0,1,2].map(i => <span key={i} style={{ width: 22, height: 2, background: '#475569', borderRadius: 2, display: 'block' }} />)}
            </button>
          ) : (
            <>
              {/* Desktop links */}
              <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
                {NAV_LINKS.map(link => (
                  <a key={link.href} href={link.href} className="nav-link"
                    style={{ fontSize: 14, fontWeight: 500, color: '#475569', padding: '8px 14px', borderRadius: 8, textDecoration: 'none', transition: 'color .15s, background .15s', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
                    onClick={e => handleNavClick(e, link.href)}
                  >{link.label}</a>
                ))}
              </div>

              {/* Desktop CTA */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <a href="/login" className="nav-cta"
                  style={{
                    fontSize: 14, fontWeight: 600, color: '#FFFFFF', textDecoration: 'none',
                    padding: '8px 20px', borderRadius: 8,
                    background: 'var(--af-ink)',
                    boxShadow: '0 2px 12px rgba(184,134,74,0.25)',
                    transition: 'background .15s',
                  }}
                >Connexion</a>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobile && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
          opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none', transition: 'opacity .25s',
        }} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      {mobile && (
        <div style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: 280,
          background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.1)',
          boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
          zIndex: 50, padding: 24, display: 'flex', flexDirection: 'column',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .3s cubic-bezier(.16,1,.3,1)',
        }} role="dialog" aria-modal="true" aria-label="Menu de navigation">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.03em' }}>Gestion budgétaire</span>
            <button onClick={() => setDrawerOpen(false)} aria-label="Fermer le menu"
              style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            >✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href}
                style={{ fontSize: 15, fontWeight: 500, color: '#334155', padding: '12px 16px', borderRadius: 10, textDecoration: 'none', minHeight: 44, display: 'flex', alignItems: 'center' }}
                onClick={e => handleNavClick(e, link.href)}
              >{link.label}</a>
            ))}
          </div>
          <a href="/login" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 24px', borderRadius: 10,
            background: 'var(--af-ink)', color: '#FFFFFF', textDecoration: 'none',
            fontWeight: 600, fontSize: 15,
          }}>Connexion</a>
        </div>
      )}
    </>
  )
}
