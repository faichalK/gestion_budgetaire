/**
 * Gestion Budgétaire — Constantes et configurations de statuts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. STATUTS BUDGET
// ═══════════════════════════════════════════════════════════════════════════════

const STATUT_BUDGET_CONFIG = {
  BROUILLON: {
    label:   'Brouillon',
    couleur: '#6B7280',
    bg:      '#F9FAFB',
    border:  '#E5E7EB',
    icone:   'FileText',
  },
  SOUMIS: {
    label:   'Soumis',
    couleur: '#D97706',
    bg:      '#FFFBEB',
    border:  '#FDE68A',
    icone:   'Clock',
  },
  APPROUVE: {
    label:   'Approuvé',
    couleur: '#059669',
    bg:      '#ECFDF5',
    border:  '#6EE7B7',
    icone:   'CheckCircle2',
  },
  REJETE: {
    label:   'Rejeté',
    couleur: '#DC2626',
    bg:      '#FEF2F2',
    border:  '#FECACA',
    icone:   'XCircle',
  },
  CLOTURE: {
    label:   'Clôturé',
    couleur: '#5A6B7E',
    bg:      'rgba(90,107,126,0.10)',
    border:  'rgba(90,107,126,0.25)',
    icone:   'Lock',
  },
  ARCHIVE: {
    label:   'Archivé',
    couleur: '#9CA3AF',
    bg:      '#F3F4F6',
    border:  '#D1D5DB',
    icone:   'Archive',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STATUTS DÉPENSE
// ═══════════════════════════════════════════════════════════════════════════════

const STATUT_DEPENSE_CONFIG = {
  SAISIE: {
    label:   'En attente',
    couleur: '#D97706',
    bg:      '#FFFBEB',
    border:  '#FDE68A',
    icone:   'Clock',
  },
  VALIDEE: {
    label:   'Validée',
    couleur: '#059669',
    bg:      '#ECFDF5',
    border:  '#6EE7B7',
    icone:   'CheckCircle2',
  },
  REJETEE: {
    label:   'Rejetée',
    couleur: '#DC2626',
    bg:      '#FEF2F2',
    border:  '#FECACA',
    icone:   'XCircle',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. RÔLES
// ═══════════════════════════════════════════════════════════════════════════════

const ROLE_CONFIG = {
  ADMINISTRATEUR: {
    label:   'Administrateur',
    couleur: '#0E2A47',
    bg:      'rgba(14,42,71,0.08)',
    icone:   'ShieldCheck',
  },
  GESTIONNAIRE: {
    label:   'Gestionnaire',
    couleur: '#C9A84C',
    bg:      '#FEF9EC',
    icone:   'Briefcase',
  },
  COMPTABLE: {
    label:   'Comptable',
    couleur: '#059669',
    bg:      '#ECFDF5',
    icone:   'Calculator',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. NIVEAUX D'ALERTE
// ═══════════════════════════════════════════════════════════════════════════════

export const ALERTE_CONFIG = {
  NORMAL: {
    label:   'Normal',
    couleur: '#6B7280',
    bg:      '#F9FAFB',
    icone:   'CheckCircle2',
  },
  ATTENTION: {
    label:   'Attention',
    couleur: '#D97706',
    bg:      '#FFFBEB',
    icone:   'AlertTriangle',
  },
  ALERTE: {
    label:   'Alerte',
    couleur: '#DC2626',
    bg:      '#FEF2F2',
    icone:   'AlertOctagon',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. HELPER : getStatutConfig
// ═══════════════════════════════════════════════════════════════════════════════

const _MAPS = {
  budget:  STATUT_BUDGET_CONFIG,
  depense: STATUT_DEPENSE_CONFIG,
  role:    ROLE_CONFIG,
}

export function getStatutConfig(statut, type = 'budget') {
  const map = _MAPS[type] || STATUT_BUDGET_CONFIG
  return map[statut] || {
    label:   statut,
    couleur: '#6B7280',
    bg:      '#F9FAFB',
    border:  '#E5E7EB',
    icone:   'HelpCircle',
  }
}
