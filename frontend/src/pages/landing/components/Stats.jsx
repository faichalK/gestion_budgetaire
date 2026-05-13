import { useEffect } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const ORGS = [
  {
    name: 'PNUD',
    logo: (
      <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="22" stroke="#009EDB" strokeWidth="2.5" fill="none"/>
        <path d="M24 4C24 4 16 12 16 24s8 20 8 20" stroke="#009EDB" strokeWidth="1.8" fill="none"/>
        <path d="M24 4C24 4 32 12 32 24s-8 20-8 20" stroke="#009EDB" strokeWidth="1.8" fill="none"/>
        <line x1="4" y1="18" x2="44" y2="18" stroke="#009EDB" strokeWidth="1.5"/>
        <line x1="4" y1="30" x2="44" y2="30" stroke="#009EDB" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    name: 'Banque Mondiale',
    logo: (
      <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="6" y="14" width="36" height="24" rx="3" stroke="#009CAB" strokeWidth="2.5" fill="none"/>
        <line x1="6" y1="22" x2="42" y2="22" stroke="#009CAB" strokeWidth="2"/>
        <circle cx="24" cy="10" r="4" stroke="#009CAB" strokeWidth="2.2" fill="none"/>
      </svg>
    ),
  },
  {
    name: 'Union Africaine',
    logo: (
      <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" stroke="#1A9E3F" strokeWidth="2.5" fill="none"/>
        <path d="M16 28 C16 20 20 16 24 14 C28 16 32 20 32 28" stroke="#1A9E3F" strokeWidth="2" fill="none"/>
        <line x1="24" y1="14" x2="24" y2="36" stroke="#1A9E3F" strokeWidth="1.8"/>
        <line x1="12" y1="24" x2="36" y2="24" stroke="#1A9E3F" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    name: 'AFD',
    logo: (
      <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="4" y="10" width="40" height="28" rx="4" stroke="#E2001A" strokeWidth="2.5" fill="none"/>
        <text x="24" y="29" textAnchor="middle" fontSize="14" fontWeight="800" fill="#E2001A" fontFamily="system-ui">AFD</text>
      </svg>
    ),
  },
  {
    name: 'Trésor Public',
    logo: (
      <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 4L6 14v6c0 13 7.6 22 18 26 10.4-4 18-13 18-26v-6L24 4z" stroke="#0E2A47" strokeWidth="2.5" fill="none"/>
        <path d="M17 24l5 5 9-9" stroke="#0E2A47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

const METRICS = [
  { value: 70,  suffix: '%', label: 'Gain de temps',  sub: 'Sur la consolidation financière trimestrielle', accent: 'var(--af-ink)' },
  { value: 100, suffix: '%', label: 'Traçabilité',    sub: 'Chaque dépense liée à un projet et un validateur', accent: 'var(--color-gold)' },
  { value: 0,   suffix: '%', label: 'Dépassement',    sub: 'Blocage système avant engagement hors budget', accent: 'var(--color-success-600)' },
]

function MetricItem({ value, suffix, label, sub, accent }) {
  const [count, activate] = useCountUp(value, 1800)
  const [ref, visible] = useScrollAnimation(0.1)
  useEffect(() => { if (visible) activate() }, [visible, activate])

  return (
    <div ref={ref} style={{ textAlign:'center', padding:'32px 24px', opacity:visible?1:0, transform:visible?'translateY(0)':'translateY(20px)', transition:'all .7s cubic-bezier(.16,1,.3,1)' }}>
      <div style={{ fontSize:'clamp(2.8rem,5vw,4.2rem)', fontWeight:800, letterSpacing:'-0.04em', color:'#0F172A', lineHeight:1, marginBottom:10 }}>
        {count}<span style={{ color:accent }}>{suffix}</span>
      </div>
      <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#64748B', marginBottom:6 }}>{label}</div>
      <p style={{ fontSize:13, color:'#94A3B8', margin:0, maxWidth:200, lineHeight:1.5 }}>{sub}</p>
    </div>
  )
}

export default function Stats() {
  const [ref] = useScrollAnimation(0.1)

  return (
    <>
      {/* Trust band */}
      <section style={{ padding:'28px 24px', background:'var(--af-ink)' }} aria-label="Organisations partenaires">
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
          <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.18em', color:'rgba(255,255,255,0.5)', fontWeight:600, margin:0 }}>
            Ils structurent leurs finances avec Gestion budgétaire
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'16px 40px' }}>
            {ORGS.map(org => (
              <div key={org.name} style={{ display:'flex', alignItems:'center', gap:10, color:'rgba(255,255,255,0.8)', fontWeight:600, fontSize:13, letterSpacing:'0.01em', opacity:0.85 }}>
                <span style={{ opacity:0.9 }}>{org.logo}</span>
                {org.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section ref={ref} style={{ padding:'80px 24px', position:'relative', overflow:'hidden', background:'var(--af-night)' }} aria-label="Chiffres clés Gestion budgétaire">
        <div aria-hidden="true" style={{
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width:'80%', height:300,
          background:'radial-gradient(ellipse at center, rgba(184,134,74,0.05) 0%, transparent 70%)',
          pointerEvents:'none',
        }} />
        <div style={{
          maxWidth:960, margin:'0 auto',
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))',
          borderTop:'1px solid rgba(15,23,42,0.08)', borderBottom:'1px solid rgba(15,23,42,0.08)',
          position:'relative', zIndex:1,
        }}>
          {METRICS.map((m, i) => (
            <div key={m.label} style={{ borderRight:i<METRICS.length-1?'1px solid rgba(15,23,42,0.08)':'none' }}>
              <MetricItem {...m} />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
