import { AlertTriangle, Trash2, CheckCircle2, LogOut, XCircle } from 'lucide-react'

// Flat header colors per variant — no gradients (design system rule)
const VARIANTS = {
  danger: {
    headerBg: '#C0392B',
    btnClass: 'btn btn-danger btn-md',
    Icon: Trash2,
  },
  warning: {
    headerBg: '#C9910A',
    btnClass: 'btn btn-warning btn-md',
    Icon: AlertTriangle,
  },
  success: {
    headerBg: '#1B7C3E',
    btnClass: 'btn btn-success btn-md',
    Icon: CheckCircle2,
  },
  primary: {
    headerBg: 'var(--af-ink)',
    btnClass: 'btn btn-primary btn-md',
    Icon: LogOut,
  },
}

/**
 * Modal de confirmation réutilisable — remplace window.confirm()
 *
 * Props :
 *   title        — titre affiché dans le header
 *   message      — texte de la question
 *   confirmLabel — libellé du bouton de confirmation (défaut : "Confirmer")
 *   variant      — 'danger' | 'warning' | 'success' | 'primary'  (défaut : 'danger')
 *   onConfirm    — callback si l'utilisateur confirme
 *   onClose      — callback si l'utilisateur annule / ferme
 */
export default function ConfirmModal({
  title        = 'Confirmation',
  message      = 'Êtes-vous sûr de vouloir effectuer cette action ?',
  confirmLabel = 'Confirmer',
  variant      = 'danger',
  onConfirm,
  onClose,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.danger
  const { Icon } = v

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal-panel"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 420, padding: 0, overflow: 'hidden' }}
      >
        {/* Header — flat solid color, no gradient */}
        <div style={{
          background: v.headerBg,
          padding: '18px 24px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={17} strokeWidth={2} />
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-.1px' }}>
              {title}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.65, marginTop: 2 }}>
              Cette action nécessite votre confirmation
            </div>
          </div>
        </div>

        {/* Corps */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--color-gray-700)',
            lineHeight: 1.65,
          }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '12px 24px',
          borderTop: '1px solid var(--color-gray-100)',
          background: 'var(--color-gray-50)',
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-md"
          >
            Annuler
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={v.btnClass}
            style={{ gap: 7 }}
          >
            <Icon size={14} strokeWidth={2} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
