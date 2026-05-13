import { useState } from 'react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const FEATURES = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    title: 'Gestion Multi-rôles',
    description: 'Hiérarchies claires entre Administrateurs, Gestionnaires et Comptables. Chacun accède uniquement à son périmètre de responsabilité.',
    accent: 'var(--af-ink)', extra: null,
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    title: 'Workflow de Validation',
    description: 'Circuit d\'approbation configuré. Chaque budget suit un parcours Brouillon → Soumis → Approuvé avec notifications automatiques.',
    accent: '#F59E0B',
    extra: (
      <div style={{ marginTop:16, display:'flex', gap:6 }}>
        {['Brouillon','Soumis','Approuvé'].map((s,i) => {
          const colors=['var(--af-ink)','#D97706','#16A34A']
          return (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600 }}>
              <span style={{ padding:'2px 8px', borderRadius:999, background:`${colors[i]}15`, color:colors[i], border:`1px solid ${colors[i]}30` }}>{s}</span>
              {i<2 && <span style={{ color:'#CBD5E1', fontSize:12 }}>→</span>}
            </div>
          )
        })}
      </div>
    ),
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    title: 'Suivi des Dépenses',
    description: 'Enregistrement en temps réel avec génération automatique de reçus PDF. Pièces justificatives attachées à chaque transaction.',
    accent: 'var(--af-ink)',
    extra: (
      <div style={{ marginTop:16, padding:'8px 12px', borderRadius:8, background:'#F1F5F9', border:'1px solid rgba(15,23,42,0.08)', fontFamily:'monospace', fontSize:11, color:'#64748B', display:'flex', justifyContent:'space-between' }}>
        <span>PRJ-AFR-04</span><span style={{ color:'var(--af-ink)', fontWeight:600 }}>− 4,2 M FCFA</span>
      </div>
    ),
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    title: 'Alertes Temps Réel',
    description: 'Notifications bidirectionnelles instantanées. Seuils d\'alerte à 75%, 90% et 100% de consommation budgétaire.',
    accent: '#F59E0B', extra: null,
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    title: 'Rapports & Exports',
    description: 'Rapports mensuels, trimestriels, annuels et ad-hoc en PDF ou Excel. Tableaux de synthèse conformes aux exigences bailleurs UE, USAID, ONU.',
    accent: 'var(--af-ink)', extra: null,
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    title: 'Allocation par Département',
    description: 'Répartition des enveloppes budgétaires par département et par appel à projet. Transferts inter-entités avec piste d\'audit automatique.',
    accent: '#F59E0B', wide: true,
    extra: (
      <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8, background:'#F1F5F9', border:'1px solid rgba(15,23,42,0.08)' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'#E2E8F0', border:'1px solid rgba(15,23,42,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🏢</div>
        <div style={{ flex:1, height:2, background:'rgba(15,23,42,0.08)', borderRadius:2, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, height:'100%', width:'100%', background:'linear-gradient(90deg, transparent, rgba(184,134,74,0.5), transparent)', animation:'sweep 2s infinite linear' }} />
        </div>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(184,134,74,0.1)', border:'1px solid rgba(184,134,74,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🌍</div>
        <style>{`@keyframes sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
      </div>
    ),
  },
]

function FeatureCard({ feature, visible, index }) {
  const [hovered, setHovered] = useState(false)
  const { icon, title, description, accent, extra, wide } = feature

  return (
    <div
      style={{
        gridColumn: wide ? 'span 2' : 'span 1',
        padding: 28, borderRadius: 16,
        background: hovered ? '#FFFFFF' : '#F8FAFC',
        border: `1px solid ${hovered ? 'rgba(184,134,74,0.25)' : 'rgba(15,23,42,0.08)'}`,
        boxShadow: hovered ? '0 8px 32px rgba(184,134,74,0.1)' : '0 1px 4px rgba(15,23,42,0.04)',
        transition: 'all .25s cubic-bezier(.16,1,.3,1)',
        cursor: 'default', position: 'relative', overflow: 'hidden',
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${index * 0.07}s`, display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10, marginBottom: 18,
        background: hovered ? `${accent}12` : 'var(--color-gold-soft)',
        border: `1px solid ${hovered ? `${accent}30` : 'var(--color-gold-line)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: hovered ? accent : 'var(--af-ink)', transition: 'all .25s',
      }}>{icon}</div>

      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10, letterSpacing: '-0.02em' }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.65, margin: 0, flex: 1 }}>{description}</p>
      {extra}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${accent}, transparent)`,
        transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left', transition: 'transform .4s cubic-bezier(.16,1,.3,1)',
      }} />
    </div>
  )
}

export default function Features() {
  const [ref, visible] = useScrollAnimation(0.06)

  return (
    <section id="features" style={{ padding: '96px 24px', background: 'var(--af-night)' }} aria-labelledby="features-title">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div ref={ref} style={{ textAlign: 'center', marginBottom: 64, opacity: visible?1:0, transform: visible?'translateY(0)':'translateY(24px)', transition: 'all .7s cubic-bezier(.16,1,.3,1)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.15em', color: 'var(--color-gold)', marginBottom: 16 }}>Fonctionnalités</p>
          <h2 id="features-title" style={{ fontSize: 'clamp(1.8rem,3.5vw,3rem)', fontWeight: 800, letterSpacing: '-0.04em', color: '#0F172A', marginBottom: 16, lineHeight: 1.15 }}>
            L'architecture de votre<br />
            <span style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-warm))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>rigueur financière.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
            Finis les tableurs éparpillés. Centralisez, tracez et validez chaque dépense avec un workflow conçu pour les audits les plus exigeants.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} visible={visible} index={i} />)}
        </div>
      </div>
    </section>
  )
}
