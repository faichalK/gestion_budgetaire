import { AlertTriangle, Trash2, CheckCircle2, LogOut, XCircle } from '../AtlasIcons'

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
    headerBg: '#0E2A47',
    btnClass: 'btn btn-primary btn-md',
    Icon: LogOut,
  },
}

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
      className="fixed inset-0 bg-[rgba(14,42,71,0.45)] backdrop-blur-[8px] z-[500] flex items-center justify-center p-5 animate-[fadeIn_.15s_ease]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-[14px] shadow-[0_20px_60px_rgba(14,42,71,0.25)] border border-[rgba(14,42,71,0.08)] w-full max-w-[420px] animate-[scaleIn_.2s_cubic-bezier(.34,1.56,.64,1)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — couleur dynamique selon la variante */}
        <div
          className="flex items-center gap-[14px] px-6 py-[18px] text-white"
          style={{ background: v.headerBg }}
        >
          <div className="w-9 h-9 rounded-lg shrink-0 bg-white/15 flex items-center justify-center">
            <Icon size={17} strokeWidth={2} />
          </div>
          <div>
            <div className="font-bold text-[15px] tracking-[-0.1px]">{title}</div>
            <div className="text-xs opacity-65 mt-0.5">Cette action nécessite votre confirmation</div>
          </div>
        </div>

        {/* Corps */}
        <div className="px-6 py-5">
          <p className="text-sm text-[#5A6B7E] leading-[1.65]">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-[10px] px-6 py-3 border-t border-[rgba(14,42,71,0.08)] bg-[#EDE7DA]">
          <button onClick={onClose} className="btn btn-secondary btn-md">
            Annuler
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={v.btnClass}
          >
            <Icon size={14} strokeWidth={2} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
