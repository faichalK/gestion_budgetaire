import { useEffect, useRef } from 'react'

const TRUST_BADGES = [
  { label: 'BROUILLON', bg: 'rgba(14,42,71,0.1)',  color: '#0E2A47', dot: '#0E2A47' },
  { label: 'SOUMIS',    bg: 'rgba(245,158,11,0.1)', color: '#D97706', dot: '#F59E0B' },
  { label: 'APPROUVÉ',  bg: 'rgba(22,163,74,0.1)',  color: '#16A34A', dot: '#22C55E' },
  { label: 'REJETÉ',    bg: 'rgba(220,38,38,0.1)',  color: '#DC2626', dot: '#EF4444' },
]

const BUDGET_ROWS = [
  { name: 'Mission Afrique Subsaharienne', dept: 'Direction Générale', amount: '4 200 000 FCFA', status: 0 },
  { name: 'Programme Santé Communautaire', dept: 'Santé & Social',     amount: '1 850 000 FCFA', status: 2 },
  { name: 'Infrastructure SI 2024',        dept: 'Informatique',       amount: '730 000 FCFA',   status: 1 },
  { name: 'Formation & Renforcement',      dept: 'RH / Formation',     amount: '420 000 FCFA',   status: 2 },
]

export default function Hero() {
  const heroRef = useRef(null)

  useEffect(() => {
    const items = heroRef.current?.querySelectorAll('.hero-reveal')
    if (!items) return
    items.forEach((el, i) => setTimeout(() => el.classList.add('hero-active'), 100 + i * 130))
  }, [])

  return (
    <>
      <style>{`
        .hero-reveal { opacity:0; transform:translateY(24px); transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1); }
        .hero-active  { opacity:1 !important; transform:translateY(0) !important; }
        .hero-btn-primary:hover   { background:var(--color-gold-warm) !important; box-shadow:0 4px 20px rgba(184,134,74,0.4) !important; }
        .hero-btn-secondary:hover { background:rgba(184,134,74,0.08) !important; border-color:rgba(184,134,74,0.4) !important; color:var(--color-gold) !important; }
        .dash-perspective { perspective:1800px; }
        .dash-3d { transform:rotateX(8deg) rotateY(-3deg) scale(0.97); transition:transform .6s cubic-bezier(.16,1,.3,1); }
        .dash-perspective:hover .dash-3d { transform:rotateX(5deg) rotateY(-1.5deg) scale(0.99); }
        @keyframes pulseGlow { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.7;transform:scale(1.04)} }
      `}</style>

      <section ref={heroRef} style={{
        position:'relative', minHeight:'100vh', paddingTop:120, paddingBottom:80,
        overflow:'hidden', display:'flex', flexDirection:'column', alignItems:'center',
        background:'linear-gradient(160deg, #0A1628 0%, var(--af-ink) 60%, #163A5F 100%)',
      }} aria-label="Section principale">

        {/* Subtle grid overlay */}
        <div aria-hidden="true" style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize:'48px 48px',
        }} />

        {/* Glow bottom */}
        <div aria-hidden="true" style={{
          position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'80%', height:300,
          background:'radial-gradient(ellipse at center bottom, rgba(96,165,250,0.15) 0%, transparent 70%)',
          pointerEvents:'none',
        }} />

        {/* Badge */}
        <div className="hero-reveal" style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'5px 14px 5px 10px', borderRadius:999,
          background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)',
          marginBottom:28, backdropFilter:'blur(4px)',
        }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#F59E0B', display:'block' }} />
          <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.9)', letterSpacing:'.02em' }}>
            Pilotage financier · Transparence · Conformité
          </span>
        </div>

        {/* H1 */}
        <h1 className="hero-reveal" style={{
          fontSize:'clamp(2.4rem, 5.5vw, 4.5rem)',
          fontWeight:800, letterSpacing:'-0.04em', lineHeight:1.08,
          color:'#FFFFFF', textAlign:'center', maxWidth:820, marginBottom:20,
        }}>
          Pilotez vos budgets avec{' '}
          <span style={{ background:'linear-gradient(135deg, var(--color-gold-warm), #FFFFFF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            précision.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="hero-reveal" style={{ fontSize:'clamp(1rem,1.8vw,1.2rem)', color:'rgba(255,255,255,0.72)', lineHeight:1.7, textAlign:'center', maxWidth:600, marginBottom:36 }}>
          La plateforme de gestion financière conçue pour les institutions publiques et organisations de coopération internationale. Transparence totale, conformité garantie.
        </p>

        {/* CTAs */}
        <div className="hero-reveal" style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', marginBottom:72 }}>
          <a href="/login" className="hero-btn-primary" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'13px 28px', borderRadius:10,
            background:'#FFFFFF', color:'var(--af-ink)',
            fontWeight:700, fontSize:15, textDecoration:'none',
            boxShadow:'0 4px 24px rgba(0,0,0,0.25)',
            transition:'background .15s, box-shadow .15s',
          }}>
            Connexion
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>

        {/* Dashboard Mockup */}
        <div className="hero-reveal dash-perspective" style={{ width:'100%', maxWidth:1100, padding:'0 24px', position:'relative', zIndex:10 }}>
          <div aria-hidden="true" style={{
            position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)',
            width:'70%', height:'60%',
            background:'radial-gradient(ellipse at center, rgba(184,134,74,0.10) 0%, transparent 70%)',
            pointerEvents:'none', zIndex:0,
          }} />

          <div className="dash-3d" style={{
            borderRadius:16, overflow:'hidden',
            border:'1px solid rgba(15,23,42,0.12)',
            background:'#FFFFFF',
            boxShadow:'0 24px 64px -12px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.04)',
            position:'relative', zIndex:1,
          }}>
            {/* Window chrome */}
            <div style={{
              height:40, background:'#F8FAFC',
              borderBottom:'1px solid rgba(15,23,42,0.08)',
              display:'flex', alignItems:'center', padding:'0 16px', gap:8,
            }}>
              <div style={{ display:'flex', gap:6 }}>
                {['#FCA5A5','#FCD34D','#86EFAC'].map((c,i) => <div key={i} style={{ width:12, height:12, borderRadius:'50%', background:c }} />)}
              </div>
              <div style={{
                margin:'0 auto', padding:'4px 16px', borderRadius:6,
                background:'#FFFFFF', border:'1px solid rgba(15,23,42,0.1)',
                fontSize:11, color:'#94A3B8', fontFamily:'monospace', display:'flex', alignItems:'center', gap:6,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                gestion-budgetaire.bf/tableau-de-bord
              </div>
            </div>

            {/* Dashboard content */}
            <div style={{ display:'flex', minHeight:460 }}>
              {/* Sidebar */}
              <div className="hidden md:flex" style={{
                width:200, flexShrink:0, padding:16,
                borderRight:'1px solid rgba(15,23,42,0.07)',
                background:'#F8FAFC',
                flexDirection:'column', gap:4,
              }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'#94A3B8', padding:'4px 8px', marginBottom:4 }}>Navigation</div>
                {[{ label:"Vue d'ensemble", active:true },{ label:'Budgets', active:false },{ label:'Dépenses', active:false },{ label:'Rapports', active:false }].map(item => (
                  <div key={item.label} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8,
                    background:item.active ? 'rgba(184,134,74,0.12)' : 'transparent',
                    border:item.active ? '1px solid rgba(184,134,74,0.25)' : '1px solid transparent',
                    color:item.active ? 'var(--color-gold)' : '#64748B', fontSize:13,
                  }}>{item.label}</div>
                ))}
                <div style={{ marginTop:'auto', padding:'12px 10px', borderRadius:8, background:'var(--color-gold-soft)', border:'1px solid var(--color-gold-line)' }}>
                  <div style={{ fontSize:10, color:'#64748B', marginBottom:6 }}>Budget Annuel</div>
                  <div style={{ height:4, borderRadius:4, background:'rgba(14,42,71,0.1)', overflow:'hidden' }}>
                    <div style={{ width:'75%', height:'100%', background:'var(--color-gold)', borderRadius:4 }} />
                  </div>
                  <div style={{ fontSize:10, color:'#64748B', marginTop:4 }}>75% consommé</div>
                </div>
              </div>

              {/* Main area */}
              <div style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:20, overflow:'hidden', background:'#FFFFFF' }}>
                {/* KPI cards */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {[
                    { label:'Budget Total', value:'12 450 000 FCFA', sub:'+2.4% vs 2023', subColor:'#16A34A', accent:false },
                    { label:'Dépenses Engagées', value:'8 920 400 FCFA', sub:'3 alertes actives', subColor:'#D97706', accent:false },
                    { label:'Fonds Restants', value:'3 529 600 FCFA', sub:'Disponible', subColor:'#64748B', accent:true },
                  ].map(card => (
                    <div key={card.label} style={{
                      padding:'14px 16px', borderRadius:10,
                      background:card.accent ? 'var(--color-gold-soft)' : '#F8FAFC',
                      border:`1px solid ${card.accent ? 'var(--color-gold-line)' : 'rgba(15,23,42,0.08)'}`,
                    }}>
                      <div style={{ fontSize:11, color:'#94A3B8', marginBottom:6 }}>{card.label}</div>
                      <div style={{ fontSize:18, fontWeight:700, color:'#0F172A', letterSpacing:'-0.02em', marginBottom:4 }}>{card.value}</div>
                      <div style={{ fontSize:11, color:card.subColor }}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Budget table */}
                <div style={{ flex:1, borderRadius:10, background:'#F8FAFC', border:'1px solid rgba(15,23,42,0.08)', overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(15,23,42,0.07)', fontSize:12, fontWeight:600, color:'#334155' }}>Budgets récents</div>
                  {BUDGET_ROWS.map((row, i) => {
                    const badge = TRUST_BADGES[row.status]
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', padding:'10px 16px', gap:12, borderBottom:i<BUDGET_ROWS.length-1?'1px solid rgba(15,23,42,0.05)':'none', background:'#FFFFFF' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:500, color:'#1E293B', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.name}</div>
                          <div style={{ fontSize:11, color:'#94A3B8' }}>{row.dept}</div>
                        </div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#0F172A', flexShrink:0 }}>{row.amount}</div>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', borderRadius:999, flexShrink:0, background:badge.bg, border:`1px solid ${badge.dot}30` }}>
                          <div style={{ width:5, height:5, borderRadius:'50%', background:badge.dot }} />
                          <span style={{ fontSize:10, fontWeight:600, color:badge.color, letterSpacing:'.04em' }}>{badge.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
