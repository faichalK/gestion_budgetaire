const STATUT_MAP = {
  BROUILLON: { cls: 'draft',   label: 'BROUILLON' },
  SOUMIS:    { cls: 'submit',  label: 'SOUMIS' },
  APPROUVE:  { cls: 'approve', label: 'APPROUVÉ' },
  REJETE:    { cls: 'reject',  label: 'REJETÉ' },
  CLOTURE:   { cls: 'close',   label: 'CLÔTURÉ' },
}
const DEP_STATUT_MAP = {
  SAISIE:  { cls: 'submit',  label: 'EN ATTENTE' },
  VALIDEE: { cls: 'approve', label: 'VALIDÉE' },
  REJETEE: { cls: 'reject',  label: 'REJETÉE' },
}

export function StatutBadge({ statut }) {
  const s = STATUT_MAP[statut] || { cls: 'draft', label: statut }
  return <span className={`af-badge ${s.cls}`}>{s.label}</span>
}

export function DepenseStatutBadge({ statut }) {
  const s = DEP_STATUT_MAP[statut] || { cls: 'draft', label: statut }
  return <span className={`af-badge ${s.cls}`}>{s.label}</span>
}

export function MethodeBadge({ technique }) {
  const labels = {
    ANALOGIE:     'ANALOGIE',
    TROIS_POINTS: '3 POINTS',
    ASCENDANTE:   'ASCENDANTE',
  }
  return <span className="af-tag-method">{labels[technique] || technique}</span>
}

export function AlerteBadge({ niveau }) {
  const map = {
    CRITIQUE: { cls: 'reject',  label: 'CRITIQUE' },
    MODERE:   { cls: 'submit',  label: 'MODÉRÉ' },
    INFO:     { cls: 'draft',   label: 'INFO' },
  }
  const s = map[niveau] || { cls: 'draft', label: niveau }
  return <span className={`af-badge ${s.cls}`}>{s.label}</span>
}
