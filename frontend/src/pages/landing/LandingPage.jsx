import { useEffect } from 'react'
import Navbar     from './components/Navbar'
import Hero       from './components/Hero'
import Stats      from './components/Stats'
import HowItWorks from './components/HowItWorks'
import CTAFinal   from './components/CTAFinal'

export default function LandingPage() {
  useEffect(() => {
    const prev = document.title
    document.title = 'Gestion budgétaire — Pilotage financier intelligent pour votre organisation'
    return () => { document.title = prev }
  }, [])

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: '#FFFFFF',
      color: '#0F172A',
      overflowX: 'hidden',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    }}>
      {/* Subtle blue ambient top glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 600,
        zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 900px 400px at 50% -10%, rgba(184,134,74,0.06) 0%, transparent 70%)',
      }} />

      {/* Grid pattern */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundSize: '40px 40px',
        backgroundImage: `
          linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)
        `,
        maskImage: 'radial-gradient(ellipse at 50% 0%, black 20%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 20%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <main>
          <Hero />
          <Stats />
          <HowItWorks />
          <CTAFinal />
        </main>
      </div>
    </div>
  )
}
