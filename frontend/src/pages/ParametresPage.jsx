import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Sun, Moon, Monitor, Bell, Globe, Check, ClipboardList, Info } from 'lucide-react'
import AuditLogsPage from './admin/AuditLogsPage'

/* ── Persistence ─────────────────────────────────────────────────────────── */
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

/* ── Apply theme to <html> ───────────────────────────────────────────────── */
function applyTheme(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
  save('pref_theme', theme)
}

/* ── Apply density to <html> ─────────────────────────────────────────────── */
function applyDensity(density) {
  document.documentElement.setAttribute('data-density', density)
  save('pref_densite', density)
}

/* ── Play notification sound via Web Audio API ───────────────────────────── */
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch {}
}

/* ── Components ──────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--af-ink)' : 'var(--color-gray-150)',
        position: 'relative', transition: 'background .18s', flexShrink: 0, minWidth: 44,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: checked ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.22)',
        transition: 'left .18s',
      }} />
    </button>
  )
}

function SectionCard({ icon: Icon, iconBg, iconColor, title, children }) {
  return (
    <div className="card mb-5">
      <h2 className="card-section-title font-bold text-[14px] text-[#1F2937]" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} strokeWidth={2} style={{ color: iconColor }} />
        </div>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, description, control, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, paddingBottom: 14, marginBottom: last ? 0 : 14, borderBottom: last ? 'none' : '1px solid #F9FAFB' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  )
}

function ChipGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(({ v, label, Icon }) => {
        const active = value === v
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
              border: active ? '2px solid var(--af-ink)' : '1.5px solid #E5E7EB',
              background: active ? 'var(--color-gold-soft)' : '#fff',
              color: active ? 'var(--af-ink)' : '#6B7280',
              fontWeight: active ? 700 : 500, fontSize: 13,
              transition: 'all .15s', minHeight: 38,
            }}
          >
            {Icon && <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />}
            {label}
            {active && <Check size={11} strokeWidth={3} style={{ color: 'var(--af-ink)' }} />}
          </button>
        )
      })}
    </div>
  )
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: 'var(--af-ink)', color: '#fff', padding: '10px 18px',
      borderRadius: 10, fontSize: 13, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,.18)',
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'fadeIn .2s ease',
    }}>
      <Check size={14} strokeWidth={3} /> {msg}
    </div>
  )
}

/* ── TABS ─────────────────────────────────────────────────────────────────── */
const TAB_STYLE = (active) => ({
  padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
  border: 'none', fontWeight: active ? 700 : 500, fontSize: 13,
  background: active ? 'var(--af-ink)' : 'transparent',
  color: active ? '#fff' : '#6B7280',
  transition: 'all .15s',
  minHeight: 38,
})

/* ══ Page principale ══════════════════════════════════════════════════════ */
export default function ParametresPage() {
  const { user, isAdmin, lang, setLanguage, t } = useAuth()

  /* Tabs */
  const TABS = [
    { id: 'apparence',      label: t('tab_apparence'),     Icon: Sun          },
    { id: 'notifications',  label: t('tab_notifications'), Icon: Bell         },
    ...(isAdmin ? [{ id: 'audit', label: t('tab_audit'), Icon: ClipboardList }] : []),
    { id: 'about',          label: t('tab_about'),         Icon: Info         },
  ]
  const [tab, setTab] = useState('apparence')

  /* Préférences */
  const [theme,        setThemeState]   = useState(() => load('pref_theme', 'light'))
  const [density,      setDensityState] = useState(() => load('pref_densite', 'normal'))
  const [notifBudget,  setNotifBudget]  = useState(() => load('notif_budget', true))
  const [notifDepense, setNotifDepense] = useState(() => load('notif_depense', true))
  const [notifEmail,   setNotifEmail]   = useState(() => load('notif_email', false))
  const [notifSon,     setNotifSon]     = useState(() => load('notif_son', false))
  const [toast,        setToast]        = useState(null)

  /* Appliquer prefs au montage */
  useEffect(() => {
    applyTheme(load('pref_theme', 'light'))
    applyDensity(load('pref_densite', 'normal'))
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (load('pref_theme', 'light') === 'system') applyTheme('system') }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  /* Helpers */
  const flash = (msg) => setToast(msg ?? t('pref_enregistree'))

  const handleTheme = (v) => { setThemeState(v); applyTheme(v); flash() }
  const handleDensity = (v) => { setDensityState(v); applyDensity(v); flash() }
  const handleLang = (v) => { setLanguage(v); flash(v === 'en' ? 'English selected' : 'Français activé') }
  const handleToggle = (setter, key) => (v) => {
    setter(v); save(key, v)
    if (key === 'notif_son' && v) playNotifSound()
    flash()
  }

  return (
    <div className="max-w-[760px] mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('param_titre')}</h1>
          <p className="page-subtitle">{t('param_sous_titre')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F3F4F6', padding: 4, borderRadius: 10, flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} style={TAB_STYLE(tab === id)} onClick={() => setTab(id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={13} strokeWidth={2} />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Apparence ────────────────────────────────────────────────────── */}
      {tab === 'apparence' && (
        <>
          <SectionCard icon={Sun} iconBg="#FEF9EC" iconColor="#C9910A" title={t('tab_apparence')}>
            <Row
              label={t('theme_label')}
              description={t('theme_desc')}
              control={
                <ChipGroup
                  value={theme}
                  onChange={handleTheme}
                  options={[
                    { v: 'light',  label: t('theme_clair'),   Icon: Sun     },
                    { v: 'dark',   label: t('theme_sombre'),  Icon: Moon    },
                    { v: 'system', label: t('theme_systeme'), Icon: Monitor },
                  ]}
                />
              }
            />
            <Row
              label={t('langue_label')}
              description={t('langue_desc')}
              control={
                <ChipGroup
                  value={lang}
                  onChange={handleLang}
                  options={[
                    { v: 'fr', label: 'Français', Icon: Globe },
                    { v: 'en', label: 'English',  Icon: Globe },
                  ]}
                />
              }
            />
            <Row
              label={t('densite_label')}
              description={t('densite_desc')}
              last
              control={
                <ChipGroup
                  value={density}
                  onChange={handleDensity}
                  options={[
                    { v: 'compact', label: t('densite_compact') },
                    { v: 'normal',  label: t('densite_normal')  },
                    { v: 'relaxed', label: t('densite_aere')    },
                  ]}
                />
              }
            />
          </SectionCard>

          {/* Aperçu densité */}
          <div className="card mb-5" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.6px' }}>
              Aperçu — densité {density}
            </div>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Code budget</th>
                  <th>Département</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 'BUD-2025-FIN-001', dept: 'Finance', montant: '12 500 000 F', statut: 'Approuvé' },
                  { code: 'BUD-2025-EDU-007', dept: 'Éducation', montant: '8 200 000 F', statut: 'En attente' },
                  { code: 'BUD-2025-SAN-003', dept: 'Santé', montant: '5 750 000 F', statut: 'Rejeté' },
                ].map(r => (
                  <tr key={r.code}>
                    <td className="td-mono">{r.code}</td>
                    <td>{r.dept}</td>
                    <td className="td-mono">{r.montant}</td>
                    <td>{r.statut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <SectionCard icon={Bell} iconBg="var(--color-gold-soft)" iconColor="var(--af-ink)" title={t('tab_notifications')}>
          <Row
            label={t('notif_budgets_label')}
            description={t('notif_budgets_desc')}
            control={<Toggle checked={notifBudget}  onChange={handleToggle(setNotifBudget,  'notif_budget')}  />}
          />
          <Row
            label={t('notif_depenses_label')}
            description={t('notif_depenses_desc')}
            control={<Toggle checked={notifDepense} onChange={handleToggle(setNotifDepense, 'notif_depense')} />}
          />
          <Row
            label={t('notif_email_label')}
            description={t('notif_email_desc')}
            control={<Toggle checked={notifEmail}   onChange={handleToggle(setNotifEmail,   'notif_email')}   />}
          />
          <Row
            label={t('notif_son_label')}
            description={t('notif_son_desc')}
            last
            control={<Toggle checked={notifSon}     onChange={handleToggle(setNotifSon,     'notif_son')}     />}
          />
        </SectionCard>
      )}

      {/* ── Journal d'audit (admin) ──────────────────────────────────────── */}
      {tab === 'audit' && isAdmin && (
        <AuditLogsPage embedded />
      )}

      {/* ── À propos ──────────────────────────────────────────────────────── */}
      {tab === 'about' && (
        <SectionCard icon={Globe} iconBg="#F3F4F6" iconColor="#6B7280" title="À propos de la plateforme">
          {[
            { label: 'Version',        value: '2.0.0'                                       },
            { label: 'Environnement',  value: 'Production'                                  },
            { label: 'Développé par',  value: 'KONATÉ Stanislas'                            },
            { label: 'Frontend',       value: 'React 19 · Vite · TanStack Query'            },
            { label: 'Backend',        value: 'Django 4 · Django REST Framework'            },
            { label: 'Base de données',value: 'PostgreSQL · Railway'                        },
            { label: 'Licence',        value: 'Usage académique — Soutenance 2025'          },
          ].map(({ label, value }, i, arr) => (
            <Row
              key={label}
              label={label}
              last={i === arr.length - 1}
              control={
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: 'var(--font-mono)', textAlign: 'right', maxWidth: 260 }}>
                  {value}
                </span>
              }
            />
          ))}
        </SectionCard>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
