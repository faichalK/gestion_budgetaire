import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateMe, changePassword } from '../api/accounts'
import { User, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { RoleBadge } from '../components/StatusBadge'

export default function ProfilPage() {
  const { user } = useAuth()

  /* Infos personnelles */
  const [infoForm,    setInfoForm]    = useState({ nom: user?.nom || '', prenom: user?.prenom || '', email: user?.email || '' })
  const [infoSaving,  setInfoSaving]  = useState(false)
  const [infoSuccess, setInfoSuccess] = useState(false)
  const [infoError,   setInfoError]   = useState('')

  const handleInfoSubmit = async (e) => {
    e.preventDefault()
    setInfoError(''); setInfoSuccess(false); setInfoSaving(true)
    try {
      await updateMe(infoForm)
      setInfoSuccess(true)
      setTimeout(() => setInfoSuccess(false), 3000)
    } catch (err) {
      setInfoError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erreur')
    } finally { setInfoSaving(false) }
  }

  /* Mot de passe */
  const [pwdForm,    setPwdForm]    = useState({ ancien_password: '', nouveau_password: '', confirmer: '' })
  const [pwdSaving,  setPwdSaving]  = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError,   setPwdError]   = useState('')
  const [showPwd,    setShowPwd]    = useState({ ancien: false, nouveau: false, confirmer: false })

  const handlePwdSubmit = async (e) => {
    e.preventDefault()
    setPwdError(''); setPwdSuccess(false)
    if (pwdForm.nouveau_password !== pwdForm.confirmer) { setPwdError('Les deux mots de passe ne correspondent pas.'); return }
    if (pwdForm.nouveau_password.length < 4) { setPwdError('Le nouveau mot de passe doit faire au moins 4 caractères.'); return }
    setPwdSaving(true)
    try {
      await changePassword({ ancien_password: pwdForm.ancien_password, nouveau_password: pwdForm.nouveau_password })
      setPwdSuccess(true)
      setPwdForm({ ancien_password: '', nouveau_password: '', confirmer: '' })
      setTimeout(() => setPwdSuccess(false), 4000)
    } catch (err) {
      const data = err.response?.data
      setPwdError(data?.ancien_password?.[0] || data?.detail || JSON.stringify(data) || 'Erreur')
    } finally { setPwdSaving(false) }
  }

  const initiales = (user?.prenom?.[0] || user?.email?.[0] || '?').toUpperCase()

  return (
    <div className="max-w-[680px] mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mon profil</h1>
          <p className="page-subtitle">Gérez vos informations personnelles et votre mot de passe</p>
        </div>
      </div>

      {/* Carte identité */}
      <div
        className="rounded-[var(--radius-lg)] px-8 py-7 mb-6 flex items-center gap-[22px] text-white relative overflow-hidden"
        style={{
          background: 'var(--af-ink)',
          boxShadow: '0 8px 28px rgba(15,34,64,.4)',
        }}
      >
        <div className="absolute rounded-full pointer-events-none" style={{ top: -40, right: -40, width: 180, height: 180, background: 'rgba(201,168,76,.06)' }} />
        <div
          className="w-[70px] h-[70px] rounded-full shrink-0 flex items-center justify-center font-extrabold text-[1.6rem]"
          style={{ background: 'rgba(255,255,255,.18)', border: '2.5px solid rgba(255,255,255,.35)' }}
        >
          {initiales}
        </div>
        <div className="relative">
          <div className="font-extrabold text-[1.25rem] mb-1" style={{ fontFamily: "'Lora', serif", color: '#F8FAFC' }}>
            {user?.prenom} {user?.nom}
          </div>
          <div className="text-[13px] mb-[10px]" style={{ color: 'rgba(250,247,242,.65)' }}>{user?.email}</div>
          <div className="flex gap-2 flex-wrap">
            <span
              className="px-3 py-[3px] rounded-[20px] text-[11px] font-bold"
              style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)' }}
            >
              {user?.role}
            </span>
            {user?.matricule && (
              <span
                className="font-mono px-3 py-[3px] rounded-[20px] text-[11px] font-semibold"
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}
              >
                {user.matricule}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="card mb-5">
        <h2 className="card-section-title font-bold text-[14px] text-[#1F2937]">
          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{ background: '#FEF9EC' }}>
            <User size={14} strokeWidth={2} style={{ color: '#C9910A' }} />
          </div>
          Informations personnelles
        </h2>

        <form onSubmit={handleInfoSubmit}>
          <div className="grid form-grid-2 gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div>
              <label className="form-label">Prénom</label>
              <input className="form-input" required value={infoForm.prenom}
                onChange={e => setInfoForm(f => ({ ...f, prenom: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Nom</label>
              <input className="form-input" required value={infoForm.nom}
                onChange={e => setInfoForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label">Adresse email</label>
            <input className="form-input" type="email" required value={infoForm.email}
              onChange={e => setInfoForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          <div className="grid form-grid-2 gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div>
              <label className="form-label">Matricule</label>
              <input
                className="form-input font-mono"
                value={user?.matricule || ''}
                disabled
              />
            </div>
            <div>
              <label className="form-label">Rôle</label>
              <div className="h-[42px] flex items-center pl-[14px]">
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>

          {infoError   && <InlineAlert type="error"   msg={infoError} />}
          {infoSuccess && <InlineAlert type="success" msg="Informations mises à jour avec succès." />}

          <div className="card-footer justify-end mt-5">
            <button type="submit" disabled={infoSaving} className="btn btn-primary btn-md">
              {infoSaving ? <><span className="spinner-sm" /> Enregistrement…</> : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>

      {/* Changer le mot de passe */}
      <div className="card">
        <h2 className="card-section-title font-bold text-[14px] text-[#1F2937]">
          <div className="w-7 h-7 rounded-[7px] bg-[#FFFBEB] flex items-center justify-center">
            <Lock size={14} strokeWidth={2} className="text-[#D97706]" />
          </div>
          Changer le mot de passe
        </h2>

        <form onSubmit={handlePwdSubmit}>
          {[
            { key: 'ancien_password',  label: 'Mot de passe actuel',             showKey: 'ancien'    },
            { key: 'nouveau_password', label: 'Nouveau mot de passe',            showKey: 'nouveau'   },
            { key: 'confirmer',        label: 'Confirmer le nouveau mot de passe', showKey: 'confirmer' },
          ].map(({ key, label, showKey }) => (
            <div key={key} className="mb-4">
              <label className="form-label">{label}</label>
              <div className="relative">
                <input
                  className="form-input pr-[42px]"
                  type={showPwd[showKey] ? 'text' : 'password'}
                  required
                  value={pwdForm[key]}
                  onChange={e => setPwdForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => ({ ...s, [showKey]: !s[showKey] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center p-1 text-[#9CA3AF] cursor-pointer"
                >
                  {showPwd[showKey]
                    ? <EyeOff size={15} strokeWidth={2} />
                    : <Eye    size={15} strokeWidth={2} />
                  }
                </button>
              </div>
            </div>
          ))}

          {pwdForm.nouveau_password && (
            <div className="mb-4">
              <PasswordStrength pwd={pwdForm.nouveau_password} />
            </div>
          )}

          {pwdError   && <InlineAlert type="error"   msg={pwdError} />}
          {pwdSuccess && <InlineAlert type="success" msg="Mot de passe modifié avec succès." />}

          <div className="card-footer justify-end mt-5">
            <button type="submit" disabled={pwdSaving} className="btn btn-primary btn-md">
              {pwdSaving ? <><span className="spinner-sm" /> Modification…</> : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Indicateur force mot de passe ───────────────────────────────────────── */
function PasswordStrength({ pwd }) {
  const score = [
    pwd.length >= 8,
    /[A-Z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length

  const levels = [
    { label: 'Très faible', color: '#DC2626', w: '25%'  },
    { label: 'Faible',      color: '#F59E0B', w: '50%'  },
    { label: 'Moyen',       color: '#C9910A', w: '75%'  },
    { label: 'Fort',        color: '#16A34A', w: '100%' },
  ]
  const lvl = levels[score - 1] || levels[0]

  return (
    <div>
      <div className="h-1 bg-[#E5E7EB] rounded-full overflow-hidden mb-[5px]">
        <div className="h-full rounded-full transition-[width_.3s,background_.3s]" style={{ width: lvl.w, background: lvl.color }} />
      </div>
      <div className="text-[11px] font-semibold" style={{ color: lvl.color }}>Force : {lvl.label}</div>
    </div>
  )
}

/* ── Alert inline ─────────────────────────────────────────────────────────── */
function InlineAlert({ type, msg }) {
  const isErr = type === 'error'
  return (
    <div
      className="flex items-start gap-[9px] px-[14px] py-[10px] rounded-[9px] mt-[14px] text-[13px]"
      style={{
        background: isErr ? '#FEF2F2' : '#F0FDF4',
        border: `1px solid ${isErr ? '#FECACA' : '#BBF7D0'}`,
        color: isErr ? '#B91C1C' : '#166534',
      }}
    >
      {isErr
        ? <AlertTriangle  size={14} strokeWidth={2} className="shrink-0 mt-[1px]" />
        : <CheckCircle2   size={14} strokeWidth={2} className="shrink-0 mt-[1px]" />
      }
      {msg}
    </div>
  )
}
