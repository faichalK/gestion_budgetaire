import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle2, Wallet } from '../components/AtlasIcons'
import { resetPasswordConfirm } from '../api/accounts'

export default function ResetPasswordPage() {
  const navigate       = useNavigate()
  const [params]       = useSearchParams()
  const uid            = params.get('uid')   || ''
  const token          = params.get('token') || ''

  const [pwd,     setPwd]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const invalidLink = !uid || !token

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (pwd.length < 4) { setError('Le mot de passe doit contenir au moins 4 caractères.'); return }
    if (pwd !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      await resetPasswordConfirm({ uid, token, new_password: pwd })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Lien invalide ou expiré. Refaites une demande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FAFC', fontFamily: "'IBM Plex Sans', system-ui, sans-serif", padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: '#FFFFFF', borderRadius: 12,
        border: '1px solid #D1D8E0', boxShadow: '0 4px 24px rgba(13,34,64,.08)', overflow: 'hidden',
      }}>

        {/* Header — dark navy */}
        <div style={{
          background: 'var(--af-ink)', padding: '20px 28px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8, background: 'rgba(201,145,10,.15)',
            border: '1px solid rgba(201,145,10,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Lock size={16} strokeWidth={2} color="#C9910A" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#FFFFFF', letterSpacing: '-.1px' }}>
              Gestion Budgétaire
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', letterSpacing: '.5px', textTransform: 'uppercase' }}>
              Réinitialisation du mot de passe
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 28px 32px' }}>
          {invalidLink ? (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--af-ink)', marginBottom: 10, margin: '0 0 10px' }}>
                Lien invalide
              </h2>
              <p style={{ fontSize: 14, color: '#57616E', lineHeight: 1.7, marginBottom: 24, margin: '0 0 24px' }}>
                Ce lien de réinitialisation est manquant ou mal formé. Refaites une demande depuis la page de connexion.
              </p>
              <Link to="/login" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center' }}>
                Retour à la connexion
              </Link>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#E8F5EE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle2 size={28} color="#1B7C3E" strokeWidth={1.8} />
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--af-ink)', marginBottom: 8, margin: '0 0 8px' }}>
                Mot de passe mis à jour !
              </h2>
              <p style={{ fontSize: 14, color: '#57616E', lineHeight: 1.7, marginBottom: 28, margin: '0 0 28px' }}>
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Se connecter
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--af-ink)', marginBottom: 4, margin: '0 0 4px' }}>
                  Nouveau mot de passe
                </h2>
                <p style={{ fontSize: 13.5, color: '#8A939E', lineHeight: 1.6, margin: 0 }}>
                  Choisissez un nouveau mot de passe pour votre compte.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* Nouveau mot de passe */}
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">
                    Nouveau mot de passe <span style={{ color: '#C0392B' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} strokeWidth={1.8} style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: '#B0BAC4', pointerEvents: 'none',
                    }} />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={pwd}
                      onChange={e => setPwd(e.target.value)}
                      placeholder="••••••••"
                      className="form-input"
                      style={{ paddingLeft: 38, paddingRight: 44, height: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(s => !s)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#B0BAC4',
                        display: 'flex', alignItems: 'center', padding: 4, minHeight: 44,
                      }}
                      aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPwd ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                {/* Confirmation */}
                <div style={{ marginBottom: 24 }}>
                  <label className="form-label">
                    Confirmer <span style={{ color: '#C0392B' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} strokeWidth={1.8} style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: '#B0BAC4', pointerEvents: 'none',
                    }} />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="form-input"
                      style={{ paddingLeft: 38, height: 44 }}
                    />
                  </div>
                </div>

                {error && (
                  <div role="alert" className="alert alert-error" style={{ marginBottom: 18 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {loading
                    ? <><span className="spinner-sm" /> Mise à jour…</>
                    : 'Enregistrer le nouveau mot de passe'
                  }
                </button>
              </form>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <Link to="/login" style={{ fontSize: 13, color: '#C9910A', fontWeight: 600, textDecoration: 'none' }}>
                  ← Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
