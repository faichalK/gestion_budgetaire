import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forgotPassword } from '../api/accounts'
import { Eye, EyeOff, X, KeyRound, ArrowRight } from 'lucide-react'

const S = {
  login: {
    width: '100%', height: '100vh',
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    background: 'var(--af-night)', color: 'var(--af-ink)',
    fontFamily: "var(--font-sans)",
  },
  left: {
    background: 'var(--af-ink)', padding: 48,
    color: 'var(--af-side-text)',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    position: 'relative', overflow: 'hidden',
  },
  leftGlow: {
    content: '""', position: 'absolute', bottom: -200, right: -200,
    width: 500, height: 500,
    background: 'radial-gradient(closest-side, rgba(184,134,74,0.30), transparent 70%)',
    filter: 'blur(20px)', pointerEvents: 'none',
  },
  quote: {
    fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1.2,
    fontStyle: 'italic', color: 'var(--af-side-text)', maxWidth: 400,
    position: 'relative',
  },
  attrib: {
    fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
    color: 'rgba(232,238,245,0.65)', marginTop: 24,
  },
  right: {
    padding: 48, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    background: '#fff',
  },
  form: { width: '100%', maxWidth: 320 },
  eyebrow: {
    fontSize: 10, letterSpacing: '0.20em', textTransform: 'uppercase',
    color: 'var(--color-gold)', marginBottom: 8, fontWeight: 500,
  },
  lead: { fontSize: 13, color: 'var(--af-cream)', marginBottom: 30 },
  roles: {
    display: 'flex', gap: 8, marginTop: 18, paddingTop: 18,
    borderTop: '1px solid var(--af-line)',
  },
  role: (active) => ({
    flex: 1, padding: 10, textAlign: 'center',
    border: `1px solid ${active ? 'var(--color-gold)' : 'var(--af-line-2)'}`,
    borderRadius: 6, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: active ? 'var(--color-gold)' : 'var(--af-cream)',
    background: active ? 'var(--color-gold-soft)' : '#fff',
    cursor: 'pointer', transition: 'all .15s',
  }),
}

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
      padding: 20, animation: 'fadeIn .15s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(14,42,71,.18)', border: '1px solid var(--af-line)',
        overflow: 'hidden', animation: 'scaleIn .2s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <div style={{ background: 'var(--af-ink)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={15} strokeWidth={1.8} color="var(--color-gold-warm)" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Mot de passe oublié</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>Un lien vous sera envoyé par email</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,.1)', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(21,128,61,.1)', border: '2px solid rgba(21,128,61,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20 }}>✉️</div>
              <p style={{ fontSize: 14, color: 'var(--af-ink)', fontWeight: 600, marginBottom: 6 }}>Email envoyé !</p>
              <p style={{ fontSize: 13, color: 'var(--af-cream)', lineHeight: 1.7, marginBottom: 20 }}>
                Si un compte correspond à cet email, vous recevrez un lien de réinitialisation. Vérifiez vos spams.
              </p>
              <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>Fermer</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <p style={{ fontSize: 13, color: 'var(--af-cream)', lineHeight: 1.7, marginBottom: 20 }}>
                Entrez l'adresse email associée à votre compte.
              </p>
              <div className="form-field" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="forgot-email">Adresse email <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                <input id="forgot-email" type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" className="form-input" />
              </div>
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>{error}</span></div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Annuler</button>
                <button type="submit" disabled={loading} className="btn btn-primary btn-sm" style={{ flex: 2, justifyContent: 'center' }}>
                  {loading ? <><span className="spinner-sm" /> Envoi…</> : 'Envoyer le lien'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

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
          : detail || 'Email ou mot de passe incorrect. Vérifiez vos identifiants.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.login}>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      {/* Panneau gauche — dark navy */}
      <div style={S.left}>
        <div style={S.leftGlow} aria-hidden="true" />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, var(--color-gold), #8C6534)',
            display: 'grid', placeItems: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>A</span>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18, color: 'var(--af-side-text)', letterSpacing: '0.01em' }}>
            Atlas Finance
          </span>
        </div>

        {/* Citation */}
        <div style={{ position: 'relative' }}>
          <div style={S.quote}>
            <span style={{ fontSize: 72, color: 'var(--color-gold-warm)', lineHeight: 0, verticalAlign: -20, fontFamily: 'var(--font-display)' }}>"</span>
            Le budget n'est pas une contrainte — c'est l'expression chiffrée d'une stratégie.
          </div>
          <div style={S.attrib}>— Manuel de gouvernance financière, 2026</div>
        </div>

        {/* Version */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(232,238,245,0.4)', position: 'relative' }}>
          v 2.4.1 · Hébergé en UE · ISO 27001
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div style={S.right}>
        <div style={S.form}>
          <div style={S.eyebrow}>Espace sécurisé · JWT + Argon2</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, margin: '0 0 6px', letterSpacing: '-0.02em', color: 'var(--af-ink)' }}>
            Connexion
          </h2>
          <div style={S.lead}>Accédez à votre espace de pilotage budgétaire.</div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-field" style={{ marginBottom: 18 }}>
              <label className="form-label" htmlFor="email">Identifiant</label>
              <input
                id="email" type="email" required autoComplete="email" autoFocus
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="votre@email.com"
                className="form-input"
              />
            </div>

            {/* Mot de passe */}
            <div className="form-field" style={{ marginBottom: 18, position: 'relative' }}>
              <label className="form-label" htmlFor="password">Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--af-cream)', display: 'flex', alignItems: 'center' }}
                >
                  {showPwd ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: 16, fontSize: 12 }}>
                <span>{error}</span>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-md"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}
            >
              {loading
                ? <><span className="spinner-sm" /> Connexion…</>
                : <>Se connecter <ArrowRight size={14} strokeWidth={2.5} /></>
              }
            </button>

            {/* Mot de passe oublié */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                style={{ fontSize: 12, color: 'var(--color-gold)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>

          {/* Pills rôles */}
          <div style={S.roles}>
            {['Admin', 'Gestionnaire', 'Comptable'].map((r, i) => (
              <div key={r} style={S.role(i === 0)}>{r}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--af-mute)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
            Comptes démo pré-créés · Données fictives uniquement
          </div>
        </div>
      </div>
    </div>
  )
}
