import { cn } from '../lib/cn'

const BASE = 'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.10em] px-[9px] py-1 rounded-[4px] border whitespace-nowrap'

const VARS = {
  draft:   'text-[#4B5563] border-[rgba(107,114,128,0.35)] bg-[rgba(107,114,128,0.10)]',
  submit:  'text-[#1D4ED8] border-[rgba(37,99,235,0.35)]   bg-[rgba(37,99,235,0.10)]',
  approve: 'text-[#15803D] border-[rgba(21,128,61,0.35)]   bg-[rgba(21,128,61,0.10)]',
  reject:  'text-[#B91C1C] border-[rgba(220,38,38,0.35)]   bg-[rgba(220,38,38,0.10)]',
  close:   'text-[#6D28D9] border-[rgba(109,40,217,0.35)]  bg-[rgba(109,40,217,0.10)]',
}

const STATUT_MAP = {
  BROUILLON: { cls: 'draft',   label: 'BROUILLON' },
  SOUMIS:    { cls: 'submit',  label: 'SOUMIS'    },
  APPROUVE:  { cls: 'approve', label: 'APPROUVÉ'  },
  REJETE:    { cls: 'reject',  label: 'REJETÉ'    },
  CLOTURE:   { cls: 'close',   label: 'CLÔTURÉ'   },
  ARCHIVE:   { cls: 'close',   label: 'ARCHIVÉ'   },
}

const DEP_STATUT_MAP = {
  SAISIE:  { cls: 'submit',  label: 'EN ATTENTE' },
  VALIDEE: { cls: 'approve', label: 'VALIDÉE'    },
  REJETEE: { cls: 'reject',  label: 'REJETÉE'    },
}

const ALERTE_MAP = {
  CRITIQUE: { cls: 'reject',  label: 'CRITIQUE' },
  ROUGE:    { cls: 'reject',  label: 'ALERTE'   },
  ORANGE:   { cls: 'submit',  label: 'ATTENTION' },
  NORMAL:   { cls: 'approve', label: 'NORMAL'   },
  INFO:     { cls: 'draft',   label: 'INFO'     },
}

const ROLE_MAP = {
  ADMINISTRATEUR: { cls: 'approve', label: 'Administrateur' },
  GESTIONNAIRE:   { cls: 'draft',   label: 'Gestionnaire'   },
  COMPTABLE:      { cls: 'submit',  label: 'Comptable'      },
}

function Dot() {
  return <span className="block w-[5px] h-[5px] rounded-full bg-current shrink-0" aria-hidden="true" />
}

function Badge({ cls, label }) {
  return (
    <span className={cn(BASE, VARS[cls] ?? VARS.draft)}>
      <Dot />{label}
    </span>
  )
}

export function StatutBadge({ statut }) {
  const s = STATUT_MAP[statut] || { cls: 'draft', label: statut }
  return <Badge cls={s.cls} label={s.label} />
}

export function AlerteBadge({ niveau }) {
  const s = ALERTE_MAP[niveau] || { cls: 'draft', label: niveau }
  return <Badge cls={s.cls} label={s.label} />
}

export function DepenseBadge({ statut }) {
  const s = DEP_STATUT_MAP[statut] || { cls: 'draft', label: statut }
  return <Badge cls={s.cls} label={s.label} />
}

export function RoleBadge({ role }) {
  const s = ROLE_MAP[role] || { cls: 'draft', label: role }
  return <Badge cls={s.cls} label={s.label} />
}

export function InlineBadge({ statut, type = 'budget' }) {
  const map = type === 'depense' ? DEP_STATUT_MAP : STATUT_MAP
  const s = map[statut] || { cls: 'draft', label: statut }
  return <Badge cls={s.cls} label={s.label} />
}

export function MethodeBadge({ technique }) {
  const labels = {
    ANALOGIE:     'ANALOGIE',
    TROIS_POINTS: '3 POINTS',
    ASCENDANTE:   'ASCENDANTE',
  }
  return (
    <span className="inline-flex items-center px-2 py-[3px] border border-[rgba(184,134,74,0.30)] rounded-[3px] font-mono text-[10px] text-[#B8864A] tracking-[0.05em]">
      {labels[technique] || technique}
    </span>
  )
}
