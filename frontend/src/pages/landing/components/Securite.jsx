import { useScrollAnimation } from '../hooks/useScrollAnimation'

const SECURITY_ITEMS = [
  {
    wide: true,
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    title: 'Audit Trail Cryptographique',
    description: 'Chaque action — modification budgétaire, validation, rejet — est horodatée et enregistrée dans un registre immuable. Consultable par les auditeurs externes via un portail dédié en lecture seule.',
    badge: 'Conformité Institutionnelle',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    title: 'Chiffrement AES-256',
    description: 'Données chiffrées au repos et en transit. Pièces justificatives stockées de manière sécurisée avec clés gérées par HSM.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    title: 'RBAC Granulaire',
    description: 'Trois rôles distincts (Admin, Gestionnaire, Comptable) avec permissions précises sur chaque ressource de la plateforme.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    title: 'Disponibilité 99.9%',
    description: 'Infrastructure redondante avec sauvegardes automatiques. Données persistantes et récupérables en cas d\'incident.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    title: 'Hébergement Souverain',
    description: 'Option de déploiement sur serveurs européens isolés. Conformité RGPD et réglementations institutionnelles internationales.',
  },
]

export default function Securite() {
  const [headerRef, headerVisible] = useScrollAnimation(0.1)
  const [gridRef, gridVisible] = useScrollAnimation(0.06)

  return (
    <section id="securite" style={{ padding:'96px 24px', background:'#FFFFFF', position:'relative', overflow:'hidden' }} aria-labelledby="securite-title">

      <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
        <div ref={headerRef} style={{ marginBottom:56, opacity:headerVisible?1:0, transform:headerVisible?'translateY(0)':'translateY(24px)', transition:'all .7s cubic-bezier(.16,1,.3,1)' }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'4px 12px', borderRadius:6,
            background:'rgba(220,38,38,0.07)', border:'1px solid rgba(220,38,38,0.15)',
            color:'#DC2626', fontSize:11, fontWeight:700, letterSpacing:'.08em',
            textTransform:'uppercase', marginBottom:20,
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#EF4444' }} />
            Standard Institutionnel
          </div>
          <h2 id="securite-title" style={{ fontSize:'clamp(1.8rem,3.5vw,3rem)', fontWeight:800, letterSpacing:'-0.04em', color:'#0F172A', marginBottom:14, lineHeight:1.15 }}>
            Sécurité sans compromis.
          </h2>
          <p style={{ fontSize:16, color:'#64748B', maxWidth:520, lineHeight:1.6, margin:0 }}>
            Vos données financières méritent une protection de niveau institutionnel. Notre infrastructure est conçue pour résister aux audits les plus exigeants.
          </p>
        </div>

        <div ref={gridRef} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {SECURITY_ITEMS.map((item, i) => (
            <div key={item.title}
              style={{
                gridColumn: item.wide ? 'span 2' : 'span 1',
                padding:28, borderRadius:14,
                background:'#F8FAFC',
                border:'1px solid rgba(15,23,42,0.08)',
                opacity:gridVisible?1:0, transform:gridVisible?'translateY(0)':'translateY(20px)',
                transition:`all .65s cubic-bezier(.16,1,.3,1) ${i*.08}s`,
                position:'relative', overflow:'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(184,134,74,0.25)'; e.currentTarget.style.background='#FFFFFF'; e.currentTarget.style.boxShadow='0 4px 20px rgba(184,134,74,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(15,23,42,0.08)'; e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.boxShadow='none' }}
            >
              <div style={{ color:'var(--af-ink)', marginBottom:16 }}>{item.icon}</div>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                <h3 style={{ fontSize:item.wide?18:15, fontWeight:600, color:'#0F172A', margin:0, letterSpacing:'-0.02em' }}>{item.title}</h3>
                {item.badge && (
                  <span style={{ flexShrink:0, padding:'3px 10px', borderRadius:999, background:'var(--color-gold-soft)', border:'1px solid var(--color-gold-line)', color:'var(--color-gold)', fontSize:10, fontWeight:600, letterSpacing:'.04em' }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <p style={{ fontSize:13, color:'#64748B', lineHeight:1.65, margin:0, maxWidth:item.wide?520:'100%' }}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
