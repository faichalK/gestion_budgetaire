import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

const ADMIN_EMAIL = 'stanislaskonate@gmail.com'

const SUBJECTS = [
  'Demande de démo',
  'Question sur les fonctionnalités',
  'Demande de tarification',
  'Support technique',
  'Partenariat',
  'Autre',
]

export default function ContactPage() {
  const [form, setForm] = useState({ nom: '', email: '', organisation: '', sujet: '', message: '' })
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState({})
  const pageRef = useRef(null)

  useEffect(() => {
    document.title = "Contacter l'équipe — Gestion budgétaire"
    const items = pageRef.current?.querySelectorAll('.c-reveal')
    if (!items) return
    items.forEach((el, i) => setTimeout(() => el.classList.add('c-active'), 80 + i * 100))
    return () => { document.title = 'Gestion budgétaire' }
  }, [])

  const validate = () => {
    const e = {}
    if (!form.nom.trim())     e.nom     = 'Requis'
    if (!form.email.trim())   e.email   = 'Requis'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide'
    if (!form.message.trim()) e.message = 'Requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (!validate()) return
    const subject = encodeURIComponent(`[Gestion budgétaire] ${form.sujet || 'Contact'} — ${form.nom}`)
    const body = encodeURIComponent(
      `Nom : ${form.nom}\nEmail : ${form.email}\nOrganisation : ${form.organisation || 'Non précisée'}\nSujet : ${form.sujet || 'Non précisé'}\n\nMessage :\n${form.message}`
    )
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`
    setSent(true)
  }

  const field = (name, label, type = 'text', required = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={name} style={{ fontSize: 13, fontWeight: 500, color: errors[name] ? '#DC2626' : '#374151' }}>
        {label}{required && <span style={{ color: 'var(--color-gold)', marginLeft: 3 }}>*</span>}
      </label>
      <input
        id={name}
        type={type}
        value={form[name]}
        onChange={e => { setForm(f => ({ ...f, [name]: e.target.value })); setErrors(er => ({ ...er, [name]: '' })) }}
        style={{
          padding: '11px 14px', borderRadius: 10, fontSize: 14,
          background: errors[name] ? 'rgba(220,38,38,0.05)' : '#FFFFFF',
          border: `1px solid ${errors[name] ? 'rgba(220,38,38,0.4)' : 'rgba(15,23,42,0.15)'}`,
          color: '#0F172A', outline: 'none', transition: 'border-color .15s, box-shadow .15s',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
        onFocus={e => { if (!errors[name]) { e.target.style.borderColor = 'var(--color-gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,74,0.15)' } }}
        onBlur={e => { if (!errors[name]) { e.target.style.borderColor = 'rgba(15,23,42,0.15)'; e.target.style.boxShadow = 'none' } }}
        placeholder={type === 'email' ? 'vous@organisation.org' : ''}
        aria-required={required}
        aria-invalid={!!errors[name]}
      />
      {errors[name] && <span style={{ fontSize: 11, color: '#DC2626' }}>{errors[name]}</span>}
    </div>
  )

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: '#F8FAFC', color: '#0F172A',
      minHeight: '100vh', overflowX: 'hidden',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        .c-reveal { opacity: 0; transform: translateY(20px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
        .c-active  { opacity: 1; transform: translateY(0); }
        input::placeholder, textarea::placeholder { color: #94A3B8; }
        select option { background: #FFFFFF; color: #0F172A; }
      `}</style>

      {/* Top accent bar */}
      <div aria-hidden="true" style={{
        height: 4, background: 'linear-gradient(90deg, var(--color-gold), var(--color-gold-warm), rgba(184,134,74,0.3))',
      }} />

      <div ref={pageRef}>
        {/* Navbar */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50, height: 64,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(15,23,42,0.07)',
          display: 'flex', alignItems: 'center', padding: '0 32px',
          boxShadow: '0 1px 8px rgba(15,23,42,0.05)',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(184,134,74,0.3)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.03em' }}>Gestion budgétaire</span>
          </Link>
          <Link to="/" style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-gold)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748B' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
            </svg>
            Retour
          </Link>
        </nav>

        {/* Main */}
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px 96px' }}>

          {/* Header */}
          <div className="c-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 14px', borderRadius: 999,
              background: 'var(--color-gold-soft)', border: '1px solid var(--color-gold-line)',
              fontSize: 11, fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '.08em',
              textTransform: 'uppercase', marginBottom: 20,
            }}>
              Nous contacter
            </div>
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800,
              letterSpacing: '-0.04em', color: '#0F172A', lineHeight: 1.1, marginBottom: 16,
            }}>
              Parlons de votre projet.
            </h1>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
              Démo, tarification, intégration ou question technique — notre équipe vous répond sous 24h.
            </p>
          </div>

          {sent ? (
            /* Success */
            <div className="c-reveal c-active" style={{
              maxWidth: 520, margin: '0 auto', textAlign: 'center',
              padding: '56px 40px', borderRadius: 20,
              background: '#FFFFFF', border: '1px solid var(--af-line)',
              boxShadow: '0 8px 40px rgba(15,23,42,0.08)',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 24px',
                background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 12, letterSpacing: '-0.02em' }}>
                Client mail ouvert !
              </h2>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 32 }}>
                Votre client mail s'est ouvert avec le message pré-rempli. Envoyez-le pour contacter l'équipe Gestion budgétaire.
              </p>
              <Link to="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 24px', borderRadius: 10,
                background: 'var(--af-ink)', color: '#FFFFFF', textDecoration: 'none',
                fontWeight: 600, fontSize: 14, boxShadow: '0 4px 16px rgba(14,42,71,0.25)',
              }}>
                Retour à l'accueil
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 40, alignItems: 'start' }}>

              {/* Left — info */}
              <div className="c-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  {
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                    label: 'Email direct',
                    value: ADMIN_EMAIL,
                    href: `mailto:${ADMIN_EMAIL}`,
                  },
                  {
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                    label: 'Délai de réponse',
                    value: 'Sous 24 heures ouvrées',
                    href: null,
                  },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', gap: 16, padding: '20px',
                    borderRadius: 12, background: '#FFFFFF',
                    border: '1px solid rgba(15,23,42,0.08)',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'var(--color-gold-soft)', border: '1px solid var(--color-gold-line)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--af-ink)',
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{item.label}</div>
                      {item.href
                        ? <a href={item.href} style={{ fontSize: 14, color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 500 }}>{item.value}</a>
                        : <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{item.value}</span>
                      }
                    </div>
                  </div>
                ))}

                {/* Topics */}
                <div style={{
                  padding: '20px', borderRadius: 12, background: '#FFFFFF',
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
                }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>On peut parler de</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['Démo personnalisée', 'Tarification pour ONG', 'Déploiement hébergé', 'Intégration ERP / API', 'Support & Formation'].map(t => (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-gold)', flexShrink: 0 }} />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — form */}
              <div className="c-reveal" style={{
                padding: '36px 32px', borderRadius: 20,
                background: '#FFFFFF',
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 8px 32px rgba(15,23,42,0.07)',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Top accent */}
                <div aria-hidden="true" style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: 3, background: 'linear-gradient(90deg, var(--color-gold), var(--color-gold-warm))',
                }} />

                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {field('nom',   'Nom complet',   'text',  true)}
                    {field('email', 'Adresse email', 'email', true)}
                  </div>

                  {field('organisation', 'Organisation / Structure', 'text', false)}

                  {/* Select sujet */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label htmlFor="sujet" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Sujet</label>
                    <select
                      id="sujet"
                      value={form.sujet}
                      onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))}
                      style={{
                        padding: '11px 14px', borderRadius: 10, fontSize: 14,
                        background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.15)',
                        color: form.sujet ? '#0F172A' : '#94A3B8', outline: 'none',
                        fontFamily: "'Inter', system-ui, sans-serif", cursor: 'pointer',
                        appearance: 'none', WebkitAppearance: 'none',
                        transition: 'border-color .15s, box-shadow .15s',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--color-gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,74,0.15)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(15,23,42,0.15)'; e.target.style.boxShadow = 'none' }}
                    >
                      <option value="">Sélectionnez un sujet…</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Textarea */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label htmlFor="message" style={{ fontSize: 13, fontWeight: 500, color: errors.message ? '#DC2626' : '#374151' }}>
                      Message<span style={{ color: 'var(--color-gold)', marginLeft: 3 }}>*</span>
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      value={form.message}
                      onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setErrors(er => ({ ...er, message: '' })) }}
                      placeholder="Décrivez votre besoin, votre contexte, ou posez votre question…"
                      style={{
                        padding: '11px 14px', borderRadius: 10, fontSize: 14, resize: 'vertical',
                        background: errors.message ? 'rgba(220,38,38,0.05)' : '#FFFFFF',
                        border: `1px solid ${errors.message ? 'rgba(220,38,38,0.4)' : 'rgba(15,23,42,0.15)'}`,
                        color: '#0F172A', outline: 'none', transition: 'border-color .15s, box-shadow .15s',
                        fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.6,
                      }}
                      onFocus={e => { if (!errors.message) { e.target.style.borderColor = 'var(--color-gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,74,0.15)' } }}
                      onBlur={e => { if (!errors.message) { e.target.style.borderColor = 'rgba(15,23,42,0.15)'; e.target.style.boxShadow = 'none' } }}
                      aria-required="true"
                      aria-invalid={!!errors.message}
                    />
                    {errors.message && <span style={{ fontSize: 11, color: '#DC2626' }}>{errors.message}</span>}
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: '13px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'var(--af-ink)', color: '#FFFFFF',
                      fontWeight: 700, fontSize: 15, fontFamily: "'Inter', system-ui, sans-serif",
                      boxShadow: '0 4px 16px rgba(14,42,71,0.25)',
                      transition: 'background .15s, box-shadow .15s, transform .15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-gold-dark)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--af-ink)'; e.currentTarget.style.transform = '' }}
                  >
                    Envoyer le message
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>

                  <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', margin: 0 }}>
                    En cliquant sur Envoyer, votre client mail s'ouvre avec le message pré-rempli à l'adresse de l'administrateur.
                  </p>
                </form>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(15,23,42,0.07)',
          padding: '20px 32px', textAlign: 'center',
          background: '#FFFFFF',
        }}>
          <Link to="/" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-gold)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748B' }}
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
