/**
 * Atlas Finance — Status style maps
 * Usage : className={cn(badgeVariants[statut], 'badge')}
 */

// ── Budget statuts ────────────────────────────────────────────────────────────

export const budgetBadge = {
  BROUILLON:              'text-[#4B5563] border-[rgba(107,114,128,0.35)] bg-[rgba(107,114,128,0.10)]',
  SOUMIS:                 'text-[#1D4ED8] border-[rgba(37,99,235,0.35)]   bg-[rgba(37,99,235,0.10)]',
  MODIFICATION_AUTORISEE: 'text-[#92400E] border-[rgba(217,119,6,0.35)]  bg-[rgba(217,119,6,0.10)]',
  APPROUVE:               'text-[#15803D] border-[rgba(21,128,61,0.35)]  bg-[rgba(21,128,61,0.10)]',
  REJETE:                 'text-[#B91C1C] border-[rgba(220,38,38,0.35)]  bg-[rgba(220,38,38,0.10)]',
  CLOTURE:                'text-[#6D28D9] border-[rgba(109,40,217,0.35)] bg-[rgba(109,40,217,0.10)]',
  ARCHIVE:                'text-[#5A6B7E] border-[rgba(14,42,71,0.16)]   bg-[#F9FAFB]',
}

// ── Dépense statuts ───────────────────────────────────────────────────────────

export const depenseBadge = {
  SAISIE:    'text-[#1D4ED8] border-[rgba(37,99,235,0.35)]  bg-[rgba(37,99,235,0.10)]',
  VALIDEE:   'text-[#15803D] border-[rgba(21,128,61,0.35)]  bg-[rgba(21,128,61,0.10)]',
  REJETEE:   'text-[#B91C1C] border-[rgba(220,38,38,0.35)]  bg-[rgba(220,38,38,0.10)]',
  REMBOURSEE:'text-[#B8864A] border-[rgba(184,134,74,0.30)] bg-[rgba(184,134,74,0.12)]',
}

// ── Alerte niveaux ────────────────────────────────────────────────────────────

export const alerteBadge = {
  NORMAL:   'text-[#15803D] border-[rgba(21,128,61,0.35)]  bg-[rgba(21,128,61,0.10)]',
  ORANGE:   'text-[#92400E] border-[rgba(217,119,6,0.35)]  bg-[rgba(217,119,6,0.10)]',
  ROUGE:    'text-[#B91C1C] border-[rgba(220,38,38,0.35)]  bg-[rgba(220,38,38,0.10)]',
  CRITIQUE: 'text-[#B91C1C] border-[rgba(220,38,38,0.35)]  bg-[rgba(220,38,38,0.10)]',
}

// ── Audit action colors ───────────────────────────────────────────────────────

export const auditAction = {
  create:  'text-[#15803D] bg-[rgba(21,128,61,0.10)]',
  update:  'text-[#1D4ED8] bg-[rgba(37,99,235,0.10)]',
  delete:  'text-[#B91C1C] bg-[rgba(220,38,38,0.10)]',
  approve: 'text-[#B8864A] bg-[rgba(184,134,74,0.12)]',
  reject:  'text-[#B91C1C] bg-[rgba(220,38,38,0.10)]',
  submit:  'text-[#6D28D9] bg-[rgba(109,40,217,0.10)]',
  login:   'text-[#5A6B7E] bg-[rgba(90,107,126,0.10)]',
  export:  'text-[#0E2A47] bg-[rgba(14,42,71,0.06)]',
}

// ── Helper générique ──────────────────────────────────────────────────────────

/**
 * Résout le bon map selon le type d'entité.
 * @param {'budget'|'depense'|'alerte'} entity
 * @param {string} statut
 * @returns {string} classes Tailwind
 */
export function statusClasses(entity, statut) {
  const maps = { budget: budgetBadge, depense: depenseBadge, alerte: alerteBadge }
  return (maps[entity]?.[statut]) ?? 'text-[#5A6B7E] border-[rgba(14,42,71,0.16)] bg-[#F9FAFB]'
}
