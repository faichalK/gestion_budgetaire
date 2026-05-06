const NAV_COLUMNS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités',     href: '#features' },
      { label: 'Comment ça marche',   href: '#how-it-works' },
      { label: 'Sécurité',            href: '#securite' },
      { label: 'Tarifs',              href: '/' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Documentation',  href: '/' },
      { label: 'Guide utilisateur', href: '/' },
      { label: 'API',            href: '/' },
      { label: 'Blog',           href: '/' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos',         href: '/' },
      { label: 'Contact',          href: '/contact' },
      { label: 'Mentions légales', href: '/' },
      { label: 'Conformité RGPD',  href: '/' },
    ],
  },
]

const LEGAL_LINKS = [
  { label: 'Politique de confidentialité', href: '/' },
  { label: "Conditions d'utilisation",     href: '/' },
  { label: 'Mentions légales',             href: '/' },
  { label: 'Cookies',                      href: '/' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer style={{ background:'#0F172A', borderTop:'1px solid rgba(255,255,255,0.07)', padding:'64px 24px 32px' }} aria-label="Pied de page">
      <div style={{ maxWidth:1100, margin:'0 auto' }}>

        {/* Top grid */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
          gap:'48px 32px', paddingBottom:48,
          borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:32,
        }}>
          {/* Brand */}
          <div style={{ gridColumn:'span 2', minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 10px rgba(184,134,74,0.3)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <span style={{ fontSize:16, fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.03em' }}>Gestion budgétaire</span>
            </div>
            <p style={{ fontSize:13, color:'#64748B', lineHeight:1.6, maxWidth:240, marginBottom:20 }}>
              Le standard logiciel pour la structuration financière des ONG et institutions de coopération internationale.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              {[
                { label:'LinkedIn', path:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                { label:'Twitter / X', path:'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
              ].map(({ label, path }) => (
                <a key={label} href="/" aria-label={label} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', textDecoration:'none', transition:'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color='#FFFFFF'; e.currentTarget.style.background='rgba(184,134,74,0.3)'; e.currentTarget.style.borderColor='rgba(184,134,74,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.color='#475569'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLUMNS.map(col => (
            <div key={col.title}>
              <h3 style={{ fontSize:12, fontWeight:700, color:'#FFFFFF', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:16 }}>{col.title}</h3>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
                {col.links.map(link => (
                  <li key={link.label}>
                    <a href={link.href} style={{ fontSize:13, color:'#475569', textDecoration:'none', transition:'color .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.color='var(--color-gold)' }}
                      onMouseLeave={e => { e.currentTarget.style.color='#475569' }}
                    >{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:'12px 24px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 8px', alignItems:'center', fontSize:12, color:'#334155' }}>
            <span>© {currentYear} Gestion budgétaire. Tous droits réservés.</span>
            <span style={{ color:'#1E293B' }}>·</span>
            <span>Développé par <span style={{ color:'var(--color-gold-warm)', fontWeight:600 }}>KONATÉ Stanislas</span></span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#22C55E' }} />
            <span style={{ fontSize:11, color:'#334155', fontFamily:'monospace' }}>Systèmes opérationnels</span>
          </div>
        </div>

        {/* Legal */}
        <nav style={{ marginTop:16, display:'flex', flexWrap:'wrap', gap:'8px 20px' }} aria-label="Liens légaux">
          {LEGAL_LINKS.map(link => (
            <a key={link.label} href={link.href} style={{ fontSize:11, color:'#334155', textDecoration:'none', transition:'color .15s' }}
              onMouseEnter={e => { e.currentTarget.style.color='#94A3B8' }}
              onMouseLeave={e => { e.currentTarget.style.color='#334155' }}
            >{link.label}</a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
