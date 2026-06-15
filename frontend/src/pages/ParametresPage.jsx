import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { changePassword, updateMe } from '../api/accounts'
import AuditLogsPage from './admin/AuditLogsPage'
import { cn } from '../lib/cn'

/* ── Persistence ─────────────────────────────────────────────────────────── */
function ls(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { }
}

function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  lsSet('pref_theme', theme)
}
function applyDensity(d) {
  document.documentElement.setAttribute('data-density', d)
  lsSet('pref_densite', d)
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination); osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.18, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
  } catch { }
}

/* ── Toggle ──────────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`af-toggle${checked ? ' on' : ''}`} />
  )
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t) }, [onDone])
  const bg = type === 'error' ? '#DC2626' : '#0E2A47'
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: bg, color: '#fff', padding: '11px 20px', borderRadius: 10,
      fontSize: 13, fontWeight: 600, boxShadow: '0 12px 40px rgba(0,0,0,.28)',
      display: 'flex', alignItems: 'center', gap: 10, animation: 'slideDown .2s ease',
    }}>
      <span style={{ fontSize: 15 }}>{type === 'error' ? '✗' : '✓'}</span>
      {msg}
    </div>
  )
}

/* ── Divider row ─────────────────────────────────────────────────────────── */
function Row({ label, description, control, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 0', borderBottom: last ? 'none' : '1px solid var(--af-line)', gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ivory)' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--af-cream)', marginTop: 2, lineHeight: 1.45 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  )
}

/* ── Pills selector ──────────────────────────────────────────────────────── */
function Pills({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {options.map(([v, l]) => (
        <span key={v}
          onClick={() => onChange(v)}
          className={cn(
            'inline-flex px-2.5 py-1 rounded-full text-[12px] border transition-all duration-150 cursor-pointer',
            value === v
              ? 'text-[#B8864A] border-[#B8864A] bg-[rgba(184,134,74,0.12)]'
              : 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-white hover:border-[#B8864A] hover:text-[#B8864A]'
          )}
        >{l}</span>
      ))}
    </div>
  )
}

const ROLE_LABELS = { ADMINISTRATEUR: 'Administrateur', COMPTABLE: 'Comptable', GESTIONNAIRE: 'Gestionnaire' }

/* ── NAV ─────────────────────────────────────────────────────────────────── */
const NAV_BASE = [
  { group: 'Compte',      items: [{ id: 'profil', label: 'Profil' }, { id: 'securite', label: 'Sécurité' }] },
  { group: 'Préférences', items: [{ id: 'apparence', label: 'Apparence' }, { id: 'notifications', label: 'Notifications' }] },
]
const NAV_SYSTEM_ADMIN = { group: 'Système', items: [{ id: 'integrations', label: 'Intégrations' }, { id: 'api', label: 'API & Webhooks' }, { id: 'about', label: 'À propos' }] }
const NAV_SYSTEM_USER  = { group: 'Système', items: [{ id: 'about', label: 'À propos' }] }
const NAV_ADMIN_GROUP  = { group: 'Administration', items: [{ id: 'audit', label: "Journal d'audit" }] }

export default function ParametresPage() {
  const { user, isAdmin, lang, setLanguage, refreshUser } = useAuth()
  const [section, setSection] = useState('profil')

  const [theme,   setThemeState]   = useState(() => ls('pref_theme',   'light'))
  const [density, setDensityState] = useState(() => ls('pref_densite', 'normal'))

  const [notifBudget,  setNotifBudget]  = useState(() => ls('notif_budget',  true))
  const [notifDepense, setNotifDepense] = useState(() => ls('notif_depense', true))
  const [notifEmail,   setNotifEmail]   = useState(() => ls('notif_email',   false))
  const [notifSon,     setNotifSon]     = useState(() => ls('notif_son',     false))

  const [editProfil,   setEditProfil]   = useState(false)
  const [profilForm,   setProfilForm]   = useState({ prenom: '', nom: '' })
  const [profilSaving, setProfilSaving] = useState(false)

  const [twofa,   setTwofa]   = useState(() => ls('pref_2fa',    true))
  const [autoBan, setAutoBan] = useState(() => ls('pref_autoban', true))

  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookModal, setWebhookModal] = useState(false)

  const [pwForm,   setPwForm]   = useState({ ancien: '', nouveau: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError,  setPwError]  = useState('')

  const [apiKey,        setApiKey]        = useState('sk-atlas-••••••••••••••••')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyReal]                      = useState('sk-atlas-2f8a9c1e7d4b6f3a0e5c2d8b')

  const [toast, setToast] = useState(null)

  useEffect(() => {
    applyTheme(ls('pref_theme', 'light'))
    applyDensity(ls('pref_densite', 'normal'))
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => { if (ls('pref_theme', 'light') === 'system') applyTheme('system') }
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    if (user) setProfilForm({ prenom: user.prenom || '', nom: user.nom || '' })
  }, [user])

  const flash = (msg, type = 'success') => setToast({ msg, type })

  const handleTheme   = v => { setThemeState(v);   applyTheme(v);   flash('Thème mis à jour') }
  const handleDensity = v => { setDensityState(v); applyDensity(v); flash('Densité mise à jour') }
  const handleLang    = v => { setLanguage(v); flash('Langue mise à jour') }

  const handleToggle = (setter, key) => v => {
    setter(v); lsSet(key, v)
    if (key === 'notif_son' && v) beep()
    flash('Préférence enregistrée')
  }

  const handleProfilSave = async (e) => {
    e.preventDefault(); setProfilSaving(true)
    try {
      await updateMe(profilForm)
      await refreshUser()
      setEditProfil(false)
      flash('Profil mis à jour')
    } catch { flash('Erreur lors de la mise à jour', 'error') }
    finally { setProfilSaving(false) }
  }

  const handleToggleSecurity = (setter, key) => v => {
    setter(v); lsSet(key, v)
    flash(v ? 'Protection activée' : 'Protection désactivée')
  }

  const handleAddWebhook = (e) => {
    e.preventDefault()
    if (!webhookUrl.trim()) return
    flash(`Webhook enregistré : ${webhookUrl.trim()}`)
    setWebhookUrl('')
    setWebhookModal(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault(); setPwError('')
    if (pwForm.nouveau !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas'); return }
    if (pwForm.nouveau.length < 8) { setPwError('Minimum 8 caractères'); return }
    setPwSaving(true)
    try {
      await changePassword({ ancien_password: pwForm.ancien, nouveau_password: pwForm.nouveau })
      setPwForm({ ancien: '', nouveau: '', confirm: '' }); flash('Mot de passe modifié')
    } catch (err) {
      setPwError(err.response?.data?.ancien_password?.[0] || err.response?.data?.detail || 'Mot de passe actuel incorrect')
    } finally { setPwSaving(false) }
  }

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(apiKeyReal)
      .then(() => flash('Clé copiée'))
      .catch(() => flash('Impossible de copier', 'error'))
  }

  const handleRegenKey = () => {
    const k = 'sk-atlas-' + Math.random().toString(36).slice(2, 18)
    setApiKey(k.slice(0, 12) + '••••••••')
    flash('Nouvelle clé générée — copiez-la immédiatement')
  }

  const navGroups = isAdmin
    ? [...NAV_BASE, NAV_SYSTEM_ADMIN, NAV_ADMIN_GROUP]
    : [...NAV_BASE, NAV_SYSTEM_USER]

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <div className="text-[10px] tracking-[0.20em] uppercase text-[#B8864A] mb-2 font-medium">Configuration</div>
        <h1 className="text-[32px] font-normal tracking-[-0.02em] leading-[1.1] text-[#0E2A47] mb-1">Paramètres</h1>
        <div className="text-[13px] text-[#5A6B7E]">Profil, sécurité, apparence et intégrations.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Sidebar nav ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]" style={{ padding: '8px 0' }}>
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div style={{ height: 1, background: 'var(--af-line)', margin: '6px 0' }} />}
              <div style={{
                padding: '8px 16px 4px',
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.09em',
                color: 'var(--af-mute)',
              }}>{group.group}</div>
              {group.items.map(item => {
                const active = section === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 16px',
                      background: active ? 'var(--af-gold-soft)' : 'transparent',
                      border: 'none',
                      borderLeft: active ? '3px solid var(--af-gold)' : '3px solid transparent',
                      cursor: 'pointer', textAlign: 'left',
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      color: active ? 'var(--af-gold)' : 'var(--af-ivory)',
                      borderRadius: '0 6px 6px 0',
                      transition: 'all .12s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--af-steel)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent' } }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
          <div style={{ height: 8 }} />
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── PROFIL ─────────────────────────────────────────────────────── */}
          {section === 'profil' && (<>
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]">
                <div className="text-[13px] font-semibold text-[#0E2A47]">Informations personnelles</div>
                {!editProfil && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditProfil(true)}>Modifier</button>
                )}
              </div>
              {!editProfil ? (
                <div style={{ padding: '0 20px' }}>
                  <Row label="Prénom" control={<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ivory)' }}>{user?.prenom || '—'}</span>} />
                  <Row label="Nom" control={<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ivory)' }}>{user?.nom || '—'}</span>} />
                  <Row label="E-mail" control={<span style={{ fontSize: 12, fontFamily: 'var(--af-mono)', color: 'var(--af-cream)' }}>{user?.email || '—'}</span>} />
                  <Row label="Rôle" control={
                    <span className={`af-badge ${user?.role === 'ADMINISTRATEUR' ? 'approve' : user?.role === 'COMPTABLE' ? 'submit' : 'draft'}`}>
                      {ROLE_LABELS[user?.role] || user?.role || '—'}
                    </span>
                  } />
                  <Row label="Département" last control={
                    <span style={{ fontSize: 13, color: 'var(--af-ivory)' }}>{user?.departement_nom || '—'}</span>
                  } />
                </div>
              ) : (
                <form onSubmit={handleProfilSave} style={{ padding: '16px 20px' }}>
                  <div className="af-form-row">
                    <div className="mb-[18px]">
                      <label className="form-label">Prénom</label>
                      <input className="form-input" value={profilForm.prenom}
                        onChange={e => setProfilForm(f => ({ ...f, prenom: e.target.value }))} />
                    </div>
                    <div className="mb-[18px]">
                      <label className="form-label">Nom</label>
                      <input className="form-input" value={profilForm.nom}
                        onChange={e => setProfilForm(f => ({ ...f, nom: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button type="button" onClick={() => setEditProfil(false)} className="btn btn-secondary btn-sm">Annuler</button>
                    <button type="submit" disabled={profilSaving} className="btn btn-primary btn-sm">
                      {profilSaving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Session active</div></div>
              <div style={{ padding: '0 20px' }}>
                <Row label="Statut" control={<span className="af-badge approve">Connecté</span>} />
                <Row label="Sessions simultanées" control={<span style={{ fontSize: 13, fontWeight: 600 }}>1</span>} last />
              </div>
            </div>
          </>)}

          {/* ── SÉCURITÉ ───────────────────────────────────────────────────── */}
          {section === 'securite' && (<>
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Changer le mot de passe</div></div>
              <form onSubmit={handlePasswordChange} style={{ padding: '0 20px 16px' }}>
                <div style={{ marginTop: 12 }}>
                  <div className="mb-[18px]">
                    <label className="form-label">Mot de passe actuel</label>
                    <input type="password" className="form-input" placeholder="••••••••"
                      value={pwForm.ancien} onChange={e => setPwForm(f => ({ ...f, ancien: e.target.value }))} required />
                  </div>
                  <div className="af-form-row">
                    <div className="mb-[18px]">
                      <label className="form-label">Nouveau mot de passe</label>
                      <input type="password" className="form-input" placeholder="Min. 8 caractères"
                        value={pwForm.nouveau} onChange={e => setPwForm(f => ({ ...f, nouveau: e.target.value }))} required />
                    </div>
                    <div className="mb-[18px]">
                      <label className="form-label">Confirmer</label>
                      <input type="password" className="form-input" placeholder="••••••••"
                        value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
                    </div>
                  </div>
                  {pwError && (
                    <div style={{ padding: '9px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)', borderRadius: 8, fontSize: 12, color: '#DC2626', marginBottom: 12 }}>
                      {pwError}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={pwSaving} className="btn btn-primary btn-sm">
                      {pwSaving ? 'Modification…' : 'Modifier le mot de passe'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Sécurité du compte</div><div className="text-[11px] text-[#8A9CB0]">JWT · Argon2id</div></div>
              <div style={{ padding: '0 20px' }}>
                <Row label="Authentification 2FA" description="Code TOTP via authenticator."
                  control={<Toggle checked={twofa}   onChange={handleToggleSecurity(setTwofa,   'pref_2fa')} />} />
                <Row label="Blocage auto" description="Verrouillage après 3 tentatives · 15 min."
                  control={<Toggle checked={autoBan} onChange={handleToggleSecurity(setAutoBan, 'pref_autoban')} />} />
                <Row label="Durée de session" last description="Token 15 min · Refresh 7 jours." control={<span className="af-tag-method">15min / 7j</span>} />
              </div>
            </div>
          </>)}

          {/* ── APPARENCE ──────────────────────────────────────────────────── */}
          {section === 'apparence' && (<>
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Affichage</div></div>
              <div style={{ padding: '0 20px' }}>
                <Row
                  label="Thème"
                  description="Clair, sombre ou selon le système."
                  control={<Pills options={[['light','Clair'],['dark','Sombre'],['system','Système']]} value={theme} onChange={handleTheme} />}
                />
                <Row
                  label="Langue"
                  description="Langue d'affichage de l'interface."
                  control={<Pills options={[['fr','Français'],['en','English']]} value={lang} onChange={handleLang} />}
                />
                <Row
                  label="Densité"
                  description="Espacement des éléments d'interface."
                  last
                  control={<Pills options={[['compact','Compact'],['normal','Normal'],['relaxed','Aéré']]} value={density} onChange={handleDensity} />}
                />
              </div>
            </div>

            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Aperçu</div><div className="text-[11px] text-[#8A9CB0]">Densité : {density}</div></div>
              <table className="af-table">
                <thead>
                  <tr><th>Code</th><th>Département</th><th>Montant</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {[
                    { code: 'BUD-2025-FIN-001', dept: 'Finance',   montant: '12 500 000 FCFA', cls: 'approve', lbl: 'APPROUVÉ' },
                    { code: 'BUD-2025-EDU-007', dept: 'Éducation', montant: '8 200 000 FCFA',  cls: 'submit',  lbl: 'SOUMIS'   },
                    { code: 'BUD-2025-SAN-003', dept: 'Santé',     montant: '5 750 000 FCFA',  cls: 'reject',  lbl: 'REJETÉ'   },
                  ].map(r => (
                    <tr key={r.code}>
                      <td className="ref">{r.code}</td><td>{r.dept}</td>
                      <td className="num">{r.montant}</td>
                      <td><span className={`af-badge ${r.cls}`}>{r.lbl}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}

          {/* ── NOTIFICATIONS ──────────────────────────────────────────────── */}
          {section === 'notifications' && (
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Notifications</div><div className="text-[11px] text-[#8A9CB0]">Alertes en temps réel</div></div>
              <div style={{ padding: '0 20px' }}>
                <Row label="Budgets" description="Soumissions, approbations et rejets."
                  control={<Toggle checked={notifBudget}  onChange={handleToggle(setNotifBudget, 'notif_budget')} />} />
                <Row label="Dépenses" description="Validation ou rejet de dépenses."
                  control={<Toggle checked={notifDepense} onChange={handleToggle(setNotifDepense, 'notif_depense')} />} />
                <Row label="Email" description="Récapitulatif par e-mail."
                  control={<Toggle checked={notifEmail}   onChange={handleToggle(setNotifEmail, 'notif_email')} />} />
                <Row label="Son" last description="Son à chaque nouvelle notification."
                  control={<Toggle checked={notifSon}     onChange={handleToggle(setNotifSon, 'notif_son')} />} />
              </div>
            </div>
          )}

          {/* ── INTÉGRATIONS (admin) ───────────────────────────────────────── */}
          {section === 'integrations' && isAdmin && (
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Intégrations</div></div>
              <div style={{ padding: '0 20px' }}>
                {[
                  { nom: 'Export Excel (.xlsx)', desc: 'Budgets et dépenses vers Excel / LibreOffice',     actif: true  },
                  { nom: 'Export PDF',           desc: 'Rapports imprimables Atlas Finance',               actif: true  },
                  { nom: 'IA Claude',            desc: 'Analyse budgétaire et recommandations IA',         actif: true  },
                  { nom: 'Notifications email',  desc: 'SMTP — configuré côté serveur',                    actif: false },
                  { nom: 'Slack',                desc: 'Alertes vers un canal Slack',                      actif: false },
                  { nom: 'ERP (SAP / Sage)',      desc: 'Synchronisation bidirectionnelle des engagements', actif: false },
                ].map((item, i, arr) => (
                  <Row key={item.nom} label={item.nom} description={item.desc} last={i === arr.length - 1}
                    control={<span className={`af-badge ${item.actif ? 'approve' : 'draft'}`}>{item.actif ? 'Actif' : 'Inactif'}</span>}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── API & WEBHOOKS (admin) ─────────────────────────────────────── */}
          {section === 'api' && isAdmin && (<>
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Clé API</div><div className="text-[11px] text-[#8A9CB0]">REST v1 · JWT</div></div>
              <div style={{ padding: '16px 20px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Clé d'accès</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input readOnly className="form-input"
                    value={apiKeyVisible ? apiKeyReal : apiKey}
                    style={{ fontFamily: 'var(--af-mono)', fontSize: 12, flex: 1 }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => setApiKeyVisible(v => !v)}>
                    {apiKeyVisible ? 'Masquer' : 'Afficher'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleCopyKey}>Copier</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--af-mute)', marginBottom: 16 }}>
                  Expiration : 2026-12-31
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleRegenKey} style={{ fontSize: 12 }}>
                  Régénérer la clé
                </button>
              </div>
            </div>

            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Documentation API</div></div>
              <div style={{ padding: '0 20px' }}>
                {[
                  { label: 'Base URL',         val: '/api/v1/'    },
                  { label: 'Auth',             val: 'Bearer JWT'  },
                  { label: 'Format',           val: 'JSON'        },
                  { label: 'Rate limit',       val: '1 000 req/h' },
                ].map(({ label, val }, i, arr) => (
                  <Row key={label} label={label} last={i === arr.length - 1}
                    control={<span style={{ fontSize: 12, fontFamily: 'var(--af-mono)', fontWeight: 600, color: 'var(--af-ivory)' }}>{val}</span>}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Webhooks</div></div>
              <div style={{ padding: '0 20px' }}>
                {['budget.soumis', 'budget.approuve', 'depense.validee'].map((ev, i, arr) => (
                  <Row key={ev} label={ev} description="Non configuré" last={i === arr.length - 1}
                    control={<span className="af-badge draft">Désactivé</span>}
                  />
                ))}
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--af-line)' }}>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }} onClick={() => setWebhookModal(true)}>
                  + Ajouter un webhook
                </button>
              </div>
            </div>

            {/* Modal webhook */}
            {webhookModal && (
              <div className="modal-overlay" onClick={() => setWebhookModal(false)}>
                <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2 style={{ fontSize: 15, fontWeight: 700 }}>Ajouter un webhook</h2>
                    <button onClick={() => setWebhookModal(false)} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>✕</button>
                  </div>
                  <form onSubmit={handleAddWebhook}>
                    <div className="modal-body">
                      <div className="mb-[18px]">
                        <label className="form-label">URL de destination</label>
                        <input className="form-input" type="url" required placeholder="https://example.com/webhook"
                          value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                      </div>
                      <div className="mb-[18px]">
                        <label className="form-label">Événement</label>
                        <select className="form-select">
                          <option>budget.soumis</option>
                          <option>budget.approuve</option>
                          <option>depense.validee</option>
                        </select>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--af-cream)', lineHeight: 1.6 }}>
                        Un payload JSON sera envoyé à cette URL à chaque déclenchement de l'événement.
                      </p>
                    </div>
                    <div className="modal-footer">
                      <button type="button" onClick={() => setWebhookModal(false)} className="btn btn-secondary btn-sm">Annuler</button>
                      <button type="submit" className="btn btn-primary btn-sm">Enregistrer</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>)}

          {/* ── À PROPOS ───────────────────────────────────────────────────── */}
          {section === 'about' && (<>
            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Atlas Finance</div><div className="text-[11px] text-[#8A9CB0]">v2.4.1</div></div>
              <div style={{ padding: '0 20px' }}>
                {[
                  { label: 'Version',       value: '2.4.1'                },
                  { label: 'Environnement', value: 'Production'           },
                  { label: 'Développé par', value: 'KONATÉ Stanislas'     },
                  { label: 'Frontend',      value: 'React 19 · Vite 7'    },
                  { label: 'Backend',       value: 'Django 5.2 · DRF'     },
                  { label: 'IA',            value: 'Claude (Anthropic)'   },
                  { label: 'Sécurité',      value: 'JWT · Argon2id'       },
                  { label: 'Licence',       value: 'Usage académique 2026' },
                ].map(({ label, value }, i, arr) => (
                  <Row key={label} label={label} last={i === arr.length - 1}
                    control={<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--af-ivory)' }}>{value}</span>}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white border border-[rgba(14,42,71,0.08)] rounded-xl shadow-[0_1px_4px_rgba(14,42,71,0.06)]">
              <div className="flex items-center px-5 py-3 border-b border-[rgba(14,42,71,0.08)]"><div className="text-[13px] font-semibold text-[#0E2A47]">Conformité</div></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {['RGPD', 'ISO 27001', 'TLS 1.3', 'AES-256'].map(c => (
                    <span key={c} className="af-pill active">{c}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--af-cream)', lineHeight: 1.7 }}>
                  Données chiffrées au repos et en transit. Journal d'audit immuable.
                </div>
              </div>
            </div>
          </>)}

          {/* ── AUDIT (admin only) ─────────────────────────────────────────── */}
          {section === 'audit' && isAdmin && <AuditLogsPage embedded />}

        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
