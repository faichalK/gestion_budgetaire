/**
 * BudgetFlow - Formateurs communs.
 * Les formats numeriques suivent la langue active de l'interface (fr / en).
 */

const NNBS = '\u202f'
const DEFAULT_LANG = 'fr'

const MOIS_LONG = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const MOIS_COURT = ['', 'jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.']

function normaliserLangue(langue) {
  if (typeof langue !== 'string') return DEFAULT_LANG
  const valeur = langue.trim().toLowerCase()
  return valeur.startsWith('en') ? 'en' : 'fr'
}

export function getLangueFormatage(langue) {
  if (langue) return normaliserLangue(langue)

  try {
    const saved = localStorage.getItem('pref_lang')
    if (saved) return normaliserLangue(saved)
  } catch {
    // Ignore storage access errors and fallback to DOM/default language.
  }

  try {
    const htmlLang = document?.documentElement?.getAttribute('lang')
    if (htmlLang) return normaliserLangue(htmlLang)
  } catch {
    // Ignore DOM access errors and fallback to the default language.
  }

  return DEFAULT_LANG
}

export function getLocaleFormatage(langue) {
  return getLangueFormatage(langue) === 'en' ? 'en-US' : 'fr-FR'
}

function getCompactSuffix(abs, langue) {
  const resolved = getLangueFormatage(langue)
  if (abs >= 1_000_000_000) return resolved === 'en' ? 'B' : 'Md'
  if (abs >= 1_000_000) return 'M'
  return 'K'
}

function getPourcentageSuffix(langue) {
  return getLangueFormatage(langue) === 'en' ? '%' : `${NNBS}%`
}

function versNombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : NaN
  if (typeof valeur === 'string') {
    const direct = Number(valeur)
    if (Number.isFinite(direct)) return direct
    const fallback = Number.parseFloat(valeur)
    return Number.isFinite(fallback) ? fallback : NaN
  }
  return NaN
}

export function formaterNombre(valeur, {
  decimales,
  minimumFractionDigits,
  maximumFractionDigits,
  useGrouping = true,
  locale,
  vide = '—',
} = {}) {
  const nombre = versNombre(valeur)
  if (nombre === null) return vide
  if (Number.isNaN(nombre)) return vide

  const options = { useGrouping }
  if (typeof decimales === 'number') {
    options.minimumFractionDigits = decimales
    options.maximumFractionDigits = decimales
  }
  if (typeof minimumFractionDigits === 'number') {
    options.minimumFractionDigits = minimumFractionDigits
  }
  if (typeof maximumFractionDigits === 'number') {
    options.maximumFractionDigits = maximumFractionDigits
  }

  const safeNumber = Object.is(nombre, -0) ? 0 : nombre
  return new Intl.NumberFormat(getLocaleFormatage(locale), options).format(safeNumber)
}

export function formaterMontant(montant, {
  decimales = 0,
  avecDevise = true,
  locale,
  vide = '—',
} = {}) {
  const nombre = versNombre(montant)
  if (nombre === null) return vide
  if (Number.isNaN(nombre)) return vide

  const resultat = formaterNombre(nombre, { decimales, locale, vide })
  return avecDevise ? `${resultat} FCFA` : resultat
}

export function formaterMontantCompact(montant, {
  decimales = 1,
  avecDevise = true,
  locale,
  vide = '—',
} = {}) {
  const valeur = versNombre(montant)
  if (valeur === null) return vide
  if (Number.isNaN(valeur)) return vide

  const abs = Math.abs(valeur)
  if (abs < 1_000) {
    return formaterMontant(valeur, { decimales: 0, avecDevise, locale, vide })
  }

  let base = abs / 1_000
  if (abs >= 1_000_000_000) base = abs / 1_000_000_000
  else if (abs >= 1_000_000) base = abs / 1_000_000

  const texte = formaterNombre(base, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
    useGrouping: false,
    locale,
    vide,
  })
  const signe = valeur < 0 ? '-' : ''
  const suffixe = getCompactSuffix(abs, locale)
  const resultat = `${signe}${texte}${suffixe}`
  return avecDevise ? `${resultat} FCFA` : resultat
}

export function formaterMontantSigne(montant, {
  avecDevise = true,
  locale,
  vide = '—',
} = {}) {
  const valeur = versNombre(montant)
  if (valeur === null) return vide
  if (Number.isNaN(valeur)) return vide
  const fmt = formaterMontant(Math.abs(valeur), { avecDevise, locale, vide })
  return valeur >= 0 ? `+${fmt}` : `-${fmt}`
}

export function formaterEcart(montantReel, montantPrevu, { locale } = {}) {
  const reel = versNombre(montantReel) || 0
  const prevu = versNombre(montantPrevu) || 0
  const ecart = reel - prevu
  const taux = prevu !== 0 ? (reel / prevu) * 100 : 0

  const signe = ecart >= 0 ? '+' : ''
  const montantFmt = `${signe}${formaterMontant(ecart, { locale })}`
  const tauxFmt = `${taux >= 0 ? '+' : ''}${formaterNombre(taux, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    locale,
  })}${getPourcentageSuffix(locale)}`

  let statut
  let couleur
  if (taux < 50) {
    statut = 'sous_consomme'
    couleur = '#D97706'
  } else if (taux <= 80) {
    statut = 'normal'
    couleur = '#22C55E'
  } else if (taux <= 95) {
    statut = 'sur_consomme'
    couleur = '#F59E0B'
  } else {
    statut = 'depasse'
    couleur = '#EF4444'
  }

  return { montant: montantFmt, pourcentage: tauxFmt, statut, couleur }
}

export function formaterTaux(numerateur, denominateur, {
  decimales = 1,
  locale,
  vide = '—',
} = {}) {
  const num = versNombre(numerateur)
  const den = versNombre(denominateur)
  if (!den || num === null || den === null || Number.isNaN(num) || Number.isNaN(den)) return vide
  const taux = (num / den) * 100
  return `${formaterNombre(taux, { decimales, locale, vide })}${getPourcentageSuffix(locale)}`
}

export function getCouleurExecution(taux) {
  if (taux === null || taux === undefined) return '#6B7280'
  const t = Number.parseFloat(taux)
  if (t < 50) return '#D97706'
  if (t < 80) return '#22C55E'
  if (t < 95) return '#F59E0B'
  return '#EF4444'
}

function parseDate(valeur) {
  if (!valeur) return null
  if (valeur instanceof Date) return valeur
  if (typeof valeur === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
      const [y, m, d] = valeur.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const d = new Date(valeur)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function formaterDate(valeur, format = 'simple', vide = '—') {
  const d = parseDate(valeur)
  if (!d) return vide

  const j = d.getDate()
  const m = d.getMonth() + 1
  const a = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const jj = String(j).padStart(2, '0')
  const mm2 = String(m).padStart(2, '0')

  switch (format) {
    case 'long':
      return `${j} ${MOIS_LONG[m]} ${a}`
    case 'court':
      return `${j} ${MOIS_COURT[m]} ${a}`
    case 'datetime':
      return `${jj}/${mm2}/${a} à ${hh}:${mm}`
    case 'mois_an':
      return `${MOIS_LONG[m]} ${a}`
    default:
      return `${jj}/${mm2}/${a}`
  }
}

export function formaterDateRelative(valeur, { maintenant } = {}) {
  const d = parseDate(valeur)
  if (!d) return '—'

  const now = maintenant || new Date()
  const secondes = Math.floor((now - d) / 1000)

  if (secondes < 0) return formaterDate(valeur)
  if (secondes < 60) return "à l'instant"
  if (secondes < 3600) {
    const minutes = Math.floor(secondes / 60)
    return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  if (secondes < 86400) {
    const heures = Math.floor(secondes / 3600)
    return `il y a ${heures} heure${heures > 1 ? 's' : ''}`
  }
  if (secondes < 172800) return 'hier'
  if (secondes < 604800) {
    const jours = Math.floor(secondes / 86400)
    return `il y a ${jours} jours`
  }
  return formaterDate(valeur)
}

export function formaterDuree(jours, { vide = '—' } = {}) {
  if (jours === null || jours === undefined) return vide
  const j = Math.round(Number.parseFloat(jours))
  if (Number.isNaN(j) || j < 0) return vide
  if (j === 0) return '0 jour'
  if (j === 1) return '1 jour'
  if (j < 30) return `${j} jours`
  if (j < 365) {
    const mois = Math.floor(j / 30)
    const reste = j % 30
    let texte = `${mois} mois`
    if (reste > 0) texte += ` et ${reste} jour${reste > 1 ? 's' : ''}`
    return texte
  }
  const ans = Math.floor(j / 365)
  const reste = j % 365
  let texte = `${ans} an${ans > 1 ? 's' : ''}`
  if (reste > 0) texte += ` et ${reste} jour${reste > 1 ? 's' : ''}`
  return texte
}

export function formaterPeriode(dateDebut, dateFin, { vide = '—' } = {}) {
  if (!dateDebut && !dateFin) return vide
  const debut = formaterDate(dateDebut, 'long', '?')
  const fin = formaterDate(dateFin, 'long', '?')
  return `du ${debut} au ${fin}`
}

export function formaterPourcentage(valeur, {
  decimales = 1,
  locale,
  vide = '—',
} = {}) {
  const nombre = versNombre(valeur)
  if (nombre === null || Number.isNaN(nombre)) return vide
  return `${formaterNombre(nombre, { decimales, locale, vide })}${getPourcentageSuffix(locale)}`
}

export function calculerTauxExecution(consomme, alloue) {
  const c = versNombre(consomme) || 0
  const a = versNombre(alloue) || 0
  if (a === 0) return 0
  return Math.round((c / a) * 10000) / 100
}

export function formaterReference(reference, { vide = '—' } = {}) {
  if (!reference) return vide
  return String(reference).trim().toUpperCase()
}

export function genererReferenceBudget(annee, codeDepartement, sequence, { prefixe = 'BUD' } = {}) {
  const dept = String(codeDepartement).trim().toUpperCase().slice(0, 10)
  const seq = String(sequence).padStart(5, '0')
  return `${prefixe}-${annee}-${dept}-${seq}`
}

export function genererReferenceDepense(annee, codeDepartement, sequence, { prefixe = 'DEP' } = {}) {
  const dept = String(codeDepartement).trim().toUpperCase().slice(0, 10)
  const seq = String(sequence).padStart(5, '0')
  return `${prefixe}-${annee}-${dept}-${seq}`
}

function normaliserSeparateurUnique(valeur, separateur) {
  const parties = valeur.split(separateur)
  if (parties.length > 2) return parties.join('')

  const [gauche, droite = ''] = parties
  if (!droite) return gauche

  // Une seule occurrence suivie de 3 chiffres est tres probablement un separateur de milliers.
  if (droite.length === 3 && gauche.length >= 1) {
    return `${gauche}${droite}`
  }

  return `${gauche}.${droite}`
}

export function parseInputMontant(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return NaN

  const cleaned = String(valeur)
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/[^\d,.-]/g, '')

  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') return NaN

  const negatif = cleaned.startsWith('-')
  const numeric = cleaned.replace(/-/g, '')
  const hasComma = numeric.includes(',')
  const hasDot = numeric.includes('.')

  let normalized = numeric
  if (hasComma && hasDot) {
    const decimalSep = numeric.lastIndexOf(',') > numeric.lastIndexOf('.') ? ',' : '.'
    normalized = decimalSep === ','
      ? numeric.replace(/\./g, '').replace(',', '.')
      : numeric.replace(/,/g, '')
  } else if (hasComma) {
    normalized = normaliserSeparateurUnique(numeric, ',')
  } else if (hasDot) {
    normalized = normaliserSeparateurUnique(numeric, '.')
  }

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return NaN
  return negatif ? -parsed : parsed
}

export function formaterTailleFichier(octets) {
  if (!octets) return '0 o'
  if (octets < 1024) return `${octets} o`
  if (octets < 1_048_576) return `${formaterNombre(octets / 1024, { decimales: 1 })} Ko`
  if (octets < 1_073_741_824) return `${formaterNombre(octets / 1_048_576, { decimales: 1 })} Mo`
  return `${formaterNombre(octets / 1_073_741_824, { decimales: 2 })} Go`
}
