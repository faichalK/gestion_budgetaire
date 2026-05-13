import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forgotPassword } from '../api/accounts'
import { Eye, EyeOff, X, KeyRound } from '../components/AtlasIcons'

/* ── Icônes inline légères ──────────────────────────────────────────────── */
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}
function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

/* ── Modal mot de passe oublié ─────────────────────────────────────────── */
function ForgotPasswordModal({ onClose }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Veuillez entrer votre adresse email.'); return }
    setLoading(true)
    try {
      await forgotPassword(email.trim())
      setDone(true)
    } catch {
      setError("Une erreur s'est produite. Réessayez ou contactez l'administrateur.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(14,42,71,.55)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,.18)', overflow: 'hidden',
      }}>
        <div style={{
          background: '#0F1B3D', padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <KeyRound size={15} strokeWidth={1.8} color="#B8864A" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Mot de passe oublié</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>Un lien vous sera envoyé par email</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(255,255,255,.1)', border: 'none',
            color: 'rgba(255,255,255,.7)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(31,95,63,.08)', border: '2px solid rgba(31,95,63,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 22,
              }}>✉️</div>
              <p style={{ fontSize: 14, color: '#0F1B3D', fontWeight: 600, marginBottom: 6 }}>Email envoyé !</p>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, marginBottom: 20 }}>
                Si un compte correspond à cet email, vous recevrez un lien de réinitialisation.
              </p>
              <button onClick={onClose} style={btnOutlineStyle}>Fermer</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, marginBottom: 20 }}>
                Entrez l'adresse email associée à votre compte.
              </p>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Adresse email</label>
                <input
                  type="email" required autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  style={inputStyle}
                />
              </div>
              {error && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onClose} style={{ ...btnOutlineStyle, flex: 1 }}>Annuler</button>
                <button type="submit" disabled={loading} style={{ ...btnPrimaryStyle, flex: 2 }}>
                  {loading ? 'Envoi…' : 'Envoyer le lien'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Styles partagés ────────────────────────────────────────────────────── */
const inputStyle = {
  width: '100%', padding: '12px 14px 12px 42px',
  border: '1.5px solid #CBD5E1', borderRadius: 8,
  fontSize: 14, color: '#1E293B', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
  fontFamily: 'inherit',
  transition: 'border-color .15s',
}
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#475569', marginBottom: 6, letterSpacing: '.02em',
}
const btnPrimaryStyle = {
  width: '100%', padding: '13px 16px',
  background: '#1F5F3F', color: '#fff',
  border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 700,
  cursor: 'pointer', letterSpacing: '.06em',
  textTransform: 'uppercase', justifyContent: 'center',
  display: 'flex', alignItems: 'center', gap: 6,
  transition: 'background .15s',
}
const btnOutlineStyle = {
  padding: '11px 16px', borderRadius: 8,
  border: '1.5px solid #CBD5E1', background: '#fff',
  fontSize: 13, fontWeight: 600, color: '#475569',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', transition: 'all .15s', width: '100%',
}

/* ── Page principale ────────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [form,       setForm]       = useState({ email: '', password: '' })
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [showPwd,    setShowPwd]    = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(
        err?.response?.status === 403
          ? detail || 'Compte bloqué après 3 tentatives. Contactez votre administrateur.'
          : detail || 'Identifiant ou mot de passe incorrect.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="af-login-page">
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      {/* ══════════════ PANNEAU GAUCHE : image ══════════════ */}
      <div
        className="af-login-img-panel"
        style={{ backgroundImage: "url('/gestion.jpg')" }}
      >
        {/* Overlay dégradé navy */}
        <div className="af-login-overlay" />

        {/* Contenu texte */}
        <div style={{
          position: 'relative', zIndex: 1,
          height: '100%', padding: '52px 56px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>
          {/* Logo petit en haut à gauche */}
          <div style={{
            position: 'absolute', top: 40, left: 52,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'linear-gradient(135deg, #B8864A, #8C6534)',
              display: 'grid', placeItems: 'center',
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>A</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.85)', letterSpacing: '0.01em' }}>
              Atlas Finance
            </span>
          </div>

          {/* Titre principal */}
          <h1 style={{
            fontSize: 'clamp(2rem, 3.5vw, 3rem)',
            fontWeight: 800, lineHeight: 1.15,
            color: '#fff', margin: '0 0 18px',
            textShadow: '0 2px 12px rgba(0,0,0,.3)',
          }}>
            Connectez-vous à votre compte{' '}
            <span style={{ color: '#B8864A' }}>Atlas Finance</span>
          </h1>

          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,.72)',
            lineHeight: 1.65, maxWidth: 420, margin: 0,
          }}>
            Restez connecté et gérez vos budgets, dépenses et rapports financiers en toute sécurité.
          </p>

          {/* Badge version */}
          <div style={{
            marginTop: 36,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '6px 14px', width: 'fit-content',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#4ADE80', display: 'inline-block',
            }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>
              Système opérationnel · v 2.4.1
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════ PANNEAU DROIT : formulaire ══════════════ */}
      <div className="af-login-form-panel">
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Logo + nom centré */}
          <div style={{ textAlign: 'center', marginBottom: 38 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18, margin: '0 auto 18px',
              background: 'linear-gradient(135deg, #B8864A 0%, #8C6534 100%)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 8px 24px rgba(201,162,75,.30)',
            }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>A</span>
            </div>
            <div style={{
              fontSize: 30, fontWeight: 800,
              color: '#0F1B3D', letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              Atlas Finance
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} noValidate>

            {/* ── Identifiant ── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)', color: '#94A3B8',
                  display: 'flex', pointerEvents: 'none',
                }}>
                  <IconUser />
                </span>
                <input
                  id="email" type="email" required autoComplete="email" autoFocus
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Entrez votre identifiant"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#B8864A'}
                  onBlur={e => e.target.style.borderColor = '#CBD5E1'}
                />
              </div>
            </div>

            {/* ── Mot de passe ── */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)', color: '#94A3B8',
                  display: 'flex', pointerEvents: 'none',
                }}>
                  <IconLock />
                </span>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Entrez votre mot de passe"
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={e => e.target.style.borderColor = '#B8864A'}
                  onBlur={e => e.target.style.borderColor = '#CBD5E1'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94A3B8', display: 'flex', alignItems: 'center',
                    padding: 0,
                  }}
                >
                  {showPwd ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* ── Erreur ── */}
            {error && (
              <div style={{
                fontSize: 12.5, color: '#DC2626', marginBottom: 16,
                padding: '9px 12px',
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.20)',
                borderRadius: 7, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            {/* ── Bouton LOGIN ── */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...btnPrimaryStyle,
                background: loading ? '#2D7A52' : '#1F5F3F',
                marginBottom: 18,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#174D31' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1F5F3F' }}
            >
              {loading ? 'CONNEXION EN COURS…' : 'SE CONNECTER'}
            </button>

            {/* ── Liens bas ── */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#475569', fontWeight: 500,
                  padding: 0, textDecoration: 'underline',
                  textDecorationColor: 'rgba(71,85,105,.35)',
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>

          {/* ── Pied de page ── */}
          <div style={{
            marginTop: 48, textAlign: 'center',
            fontSize: 11, color: '#94A3B8',
          }}>
            © {new Date().getFullYear()} Atlas Finance · Gestion budgétaire sécurisée
          </div>
        </div>
      </div>

    </div>
  )
}
