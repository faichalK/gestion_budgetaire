import { Link } from 'react-router-dom'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export default function CTAFinal() {
  const [ref, visible] = useScrollAnimation(0.1)

  return (
    <section style={{ padding:'96px 24px', background:'linear-gradient(180deg, var(--af-night) 0%, #EDE7DA 100%)', position:'relative', overflow:'hidden' }} aria-label="Appel à l'action final">

      {/* Decorative circles */}
      <div aria-hidden="true" style={{ position:'absolute', top:'-20%', right:'-5%', width:400, height:400, borderRadius:'50%', background:'rgba(184,134,74,0.06)', pointerEvents:'none' }} />
      <div aria-hidden="true" style={{ position:'absolute', bottom:'-20%', left:'-5%', width:300, height:300, borderRadius:'50%', background:'rgba(184,134,74,0.04)', pointerEvents:'none' }} />

      <div ref={ref} style={{
        maxWidth:780, margin:'0 auto', textAlign:'center',
        padding:'64px 48px',
        background:'#FFFFFF',
        border:'1px solid var(--af-line)',
        borderRadius:24,
        boxShadow:'var(--shadow-xl)',
        position:'relative', zIndex:1,
        opacity:visible?1:0, transform:visible?'translateY(0)':'translateY(28px)',
        transition:'all .8s cubic-bezier(.16,1,.3,1)',
      }}>
        {/* Top accent line — gold gradient */}
        <div aria-hidden="true" style={{ position:'absolute', top:0, left:'15%', right:'15%', height:3, borderRadius:'0 0 3px 3px', background:'linear-gradient(90deg, var(--color-gold), var(--color-gold-warm))', }} />

        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'4px 14px', borderRadius:999,
          background:'var(--color-gold-soft)', border:'1px solid var(--color-gold-line)',
          fontSize:11, fontWeight:700, color:'var(--color-gold)', letterSpacing:'.08em',
          textTransform:'uppercase', marginBottom:24,
        }}>
          Prêt à commencer ?
        </div>

        <h2 style={{ fontSize:'clamp(2rem,4vw,3.2rem)', fontWeight:800, letterSpacing:'-0.04em', color:'var(--af-ink)', lineHeight:1.1, marginBottom:20 }}>
          Prêt à moderniser votre<br />gestion budgétaire ?
        </h2>

        <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', marginBottom:36 }}>
          <Link to="/contact" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'14px 28px', borderRadius:10,
            background:'transparent', color:'var(--color-gold)',
            fontWeight:600, fontSize:15, textDecoration:'none',
            border:'1px solid var(--color-gold-line)',
            transition:'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--color-gold-soft)'; e.currentTarget.style.borderColor='var(--color-gold)' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='var(--color-gold-line)' }}
          >Contacter l'équipe</Link>
        </div>

      </div>
    </section>
  )
}
