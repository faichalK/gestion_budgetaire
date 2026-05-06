import { useScrollAnimation } from '../hooks/useScrollAnimation'

const STEPS = [
  {
    number: '01', title: 'Créez un budget', active: true,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
    description: 'Structurez vos enveloppes par département et par projet. Importez vos données via CSV ou saisissez manuellement avec pièces justificatives.',
  },
  {
    number: '02', title: 'Soumettez pour validation', active: false,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    description: 'D\'un clic, soumettez le budget au circuit d\'approbation. Le comptable examine, valide ou rejette avec motif. Notifications automatiques à chaque étape.',
  },
  {
    number: '03', title: 'Suivez les dépenses', active: false,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    description: 'Enregistrez les transactions et suivez la consommation en temps réel. Des alertes intelligentes préviennent avant tout dépassement de seuil.',
  },
]

export default function HowItWorks() {
  const [headerRef, headerVisible] = useScrollAnimation(0.1)
  const [stepsRef, stepsVisible] = useScrollAnimation(0.06)

  return (
    <section id="how-it-works" style={{ padding:'96px 24px', background:'#F8FAFC', borderTop:'1px solid rgba(15,23,42,0.07)', borderBottom:'1px solid rgba(15,23,42,0.07)' }} aria-labelledby="how-it-works-title">
      <div style={{ maxWidth:1100, margin:'0 auto' }}>

        <div ref={headerRef} style={{ textAlign:'center', marginBottom:72, opacity:headerVisible?1:0, transform:headerVisible?'translateY(0)':'translateY(24px)', transition:'all .7s cubic-bezier(.16,1,.3,1)' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.15em', color:'var(--color-gold)', marginBottom:16 }}>Comment ça marche</p>
          <h2 id="how-it-works-title" style={{ fontSize:'clamp(1.8rem,3.5vw,3rem)', fontWeight:800, letterSpacing:'-0.04em', color:'#0F172A', marginBottom:16, lineHeight:1.15 }}>
            Simple. Rapide. Tracé.
          </h2>
          <p style={{ fontSize:16, color:'#64748B', maxWidth:480, margin:'0 auto', lineHeight:1.6 }}>
            De la création du budget à la clôture de l'exercice, Gestion budgétaire structure chaque étape de votre cycle financier.
          </p>
        </div>

        <div ref={stepsRef} style={{ position:'relative' }}>
          {/* Connector line */}
          <div aria-hidden="true" style={{
            position:'absolute', top:28, left:'calc(16.67% + 28px)', right:'calc(16.67% + 28px)',
            height:1, background:'rgba(15,23,42,0.1)', zIndex:0,
          }}>
            <div style={{ position:'absolute', top:0, left:0, height:'100%', width:'33%', background:'linear-gradient(90deg, var(--color-gold), rgba(184,134,74,0.2))', boxShadow:'0 0 6px rgba(184,134,74,0.3)' }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:48, position:'relative', zIndex:1 }}>
            {STEPS.map((step, i) => <StepCard key={step.number} step={step} index={i} visible={stepsVisible} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

function StepCard({ step, index, visible }) {
  const { number, title, description, icon, active } = step
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', opacity:visible?1:0, transform:visible?'translateY(0)':'translateY(24px)', transition:`all .7s cubic-bezier(.16,1,.3,1) ${index*.12}s` }}>
      <div style={{
        width:56, height:56, borderRadius:'50%', marginBottom:20,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:active?'rgba(184,134,74,0.1)':'#FFFFFF',
        border:`2px solid ${active?'var(--color-gold)':'rgba(15,23,42,0.12)'}`,
        color:active?'var(--color-gold)':'#94A3B8',
        boxShadow:active?'0 0 16px rgba(184,134,74,0.2)':'0 1px 4px rgba(15,23,42,0.08)',
        position:'relative', zIndex:1,
      }}>{icon}</div>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', color:active?'var(--color-gold)':'#94A3B8', textTransform:'uppercase', marginBottom:10 }}>Étape {number}</div>
      <h3 style={{ fontSize:17, fontWeight:700, color:'#0F172A', marginBottom:10, letterSpacing:'-0.02em' }}>{title}</h3>
      <p style={{ fontSize:13, color:'#64748B', lineHeight:1.65, margin:0, maxWidth:260 }}>{description}</p>
    </div>
  )
}
