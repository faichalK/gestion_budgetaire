/**
 * Gestion Budgétaire — Utilitaires d'export (CSV et impression PDF)
 */

/* ── Conversion markdown → HTML (rendu propre pour rapports IA) ────────────── */
import { formaterNombre, getLangueFormatage } from './formatters'

function _inline(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function _mdToHtml(md) {
  if (!md) return ''
  const lines = md.split('\n')
  const out   = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Table : header row + separator sur la ligne suivante
    if (line.match(/^\|.+\|/) && lines[i + 1]?.match(/^\|[\s\-:|]+\|/)) {
      const headers = line.split('|').slice(1, -1).map(c => `<th>${_inline(c.trim())}</th>`).join('')
      i += 2 // skip separator
      const bodyRows = []
      while (i < lines.length && lines[i].match(/^\|.+\|/)) {
        const cells = lines[i].split('|').slice(1, -1).map(c => `<td>${_inline(c.trim())}</td>`).join('')
        bodyRows.push(`<tr>${cells}</tr>`)
        i++
      }
      out.push(`<table><thead><tr>${headers}</tr></thead><tbody>${bodyRows.join('')}</tbody></table>`)
      continue
    }

    // Titres
    if (line.startsWith('### ')) { out.push(`<h3>${_inline(line.slice(4))}</h3>`);  i++; continue }
    if (line.startsWith('## '))  { out.push(`<h2>${_inline(line.slice(3))}</h2>`);  i++; continue }
    if (line.startsWith('# '))   { out.push(`<h1>${_inline(line.slice(2))}</h1>`);  i++; continue }

    // Séparateur
    if (line.match(/^---+$/))    { out.push('<hr>'); i++; continue }

    // Liste (regroupe les items consécutifs)
    if (line.match(/^[-*] /)) {
      const items = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(`<li>${_inline(lines[i].slice(2))}</li>`)
        i++
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    // Ligne vide
    if (!line.trim()) { out.push('<br>'); i++; continue }

    // Paragraphe
    out.push(`<p>${_inline(line)}</p>`)
    i++
  }

  return out.join('\n')
}

/**
 * Impression d'un rapport IA avec rendu markdown professionnel.
 * @param {object} rapport  - objet rapport IA {titre, type_rapport, contenu, created_at, tokens_utilises}
 */
export function printRapportIA(rapport, { langue } = {}) {
  const htmlLang = getLangueFormatage(langue)
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const TYPE_LABELS = {
    MENSUEL: 'Rapport mensuel', TRIMESTRIEL: 'Rapport trimestriel',
    ANNUEL:  'Rapport annuel',  AD_HOC: 'Rapport ad-hoc',
  }
  const typeLabel = TYPE_LABELS[rapport.type_rapport] || rapport.type_rapport || 'Rapport'
  const dateCreation = rapport.created_at
    ? new Date(rapport.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  const bodyHtml = _mdToHtml(rapport.contenu)

  const html = `<!DOCTYPE html><html lang="${htmlLang}"><head>
<meta charset="UTF-8"/>
<title>${rapport.titre || 'Rapport IA'}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11.5px; color: #1F2937; background: #fff;
    padding: 0; line-height: 1.65;
  }

  /* ── Toolbar ── */
  .toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; gap: 8px; justify-content: flex-end;
    padding: 10px 24px;
    background: #fff; border-bottom: 1px solid #E5E7EB;
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
  }
  .toolbar button {
    padding: 7px 18px; border-radius: 6px; border: none;
    cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit;
  }
  .btn-print { background: #1C1917; color: #C9A84C; border: 1px solid rgba(201,168,76,.4); }
  .btn-close  { background: #F3F4F6; color: #374151; }

  /* ── Page ── */
  .page { max-width: 860px; margin: 64px auto 40px; padding: 0 32px; }

  /* ── Couverture ── */
  .cover {
    background: linear-gradient(135deg, #0D1E35 0%, #1E3A5F 100%);
    border-radius: 14px; padding: 32px 36px; margin-bottom: 32px;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .cover-left {}
  .cover-logo {
    font-size: 20px; font-weight: 900; color: #fff;
    font-family: Georgia, serif; letter-spacing: -0.3px; margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px;
  }
  .cover-logo::before {
    content: '◆'; font-size: 14px; color: #C9A84C;
  }
  .cover-type {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: rgba(201,168,76,.85); margin-bottom: 6px;
  }
  .cover-title {
    font-size: 22px; font-weight: 800; color: #fff; line-height: 1.25;
    margin-bottom: 10px; max-width: 480px;
  }
  .cover-right { text-align: right; flex-shrink: 0; }
  .cover-date  { font-size: 11px; color: rgba(255,255,255,.55); line-height: 1.7; }
  .cover-badge {
    display: inline-block; margin-top: 10px;
    padding: 4px 14px; border-radius: 20px;
    background: rgba(201,168,76,.2); border: 1px solid rgba(201,168,76,.35);
    font-size: 10px; font-weight: 700; color: #C9A84C; letter-spacing: .5px;
  }

  /* ── Méta-info bar ── */
  .meta-bar {
    display: flex; gap: 0; margin-bottom: 28px;
    border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden;
  }
  .meta-item {
    flex: 1; padding: 12px 16px; border-right: 1px solid #E5E7EB;
    background: #F9FAFB;
  }
  .meta-item:last-child { border-right: none; }
  .meta-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #9CA3AF; margin-bottom: 3px; }
  .meta-value { font-size: 13px; font-weight: 700; color: #111827; }

  /* ── Contenu markdown ── */
  .content { padding: 0; }
  .content h1 {
    font-size: 20px; font-weight: 800; color: #0D1E35;
    padding-bottom: 10px; margin: 28px 0 14px;
    border-bottom: 2px solid #C9A84C;
  }
  .content h2 {
    font-size: 15px; font-weight: 700; color: #1E3A5F;
    margin: 24px 0 10px; padding-left: 12px;
    border-left: 3px solid #C9A84C;
  }
  .content h3 {
    font-size: 13px; font-weight: 700; color: #374151;
    margin: 18px 0 8px; text-transform: uppercase;
    letter-spacing: .4px;
  }
  .content p {
    margin: 0 0 10px; color: #374151; line-height: 1.7;
  }
  .content ul {
    margin: 8px 0 12px 20px; padding: 0;
  }
  .content li {
    margin-bottom: 5px; color: #374151; line-height: 1.6;
  }
  .content li::marker { color: #C9A84C; }
  .content hr {
    border: none; border-top: 1px solid #E5E7EB;
    margin: 20px 0;
  }
  .content strong { color: #111827; }
  .content code {
    background: #F3F4F6; border: 1px solid #E5E7EB;
    border-radius: 3px; padding: 1px 5px;
    font-family: 'Consolas', 'Courier New', monospace; font-size: 10.5px;
    color: #B45309;
  }
  .content br { display: block; content: ''; margin: 6px 0; }

  /* ── Tables markdown ── */
  .content table {
    width: 100%; border-collapse: collapse;
    margin: 12px 0 18px; font-size: 11px;
    border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;
  }
  .content table thead tr { background: #0D1E35; }
  .content table thead th {
    color: #fff; padding: 8px 12px; text-align: left;
    font-size: 9.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .5px; white-space: nowrap;
  }
  .content table tbody tr:nth-child(even) td { background: #F9FAFB; }
  .content table tbody td {
    padding: 7px 12px; border-bottom: 1px solid #F3F4F6;
    color: #374151; vertical-align: top;
  }
  .content table tbody tr:last-child td { border-bottom: none; }

  /* ── Pied de page ── */
  .footer {
    margin-top: 36px; padding-top: 14px;
    border-top: 1px solid #E5E7EB;
    display: flex; justify-content: space-between;
    font-size: 9.5px; color: #9CA3AF;
  }

  @media print {
    .toolbar { display: none !important; }
    body { font-size: 10.5px; }
    .page { margin: 0; padding: 0 16px; max-width: 100%; }
    .cover { border-radius: 8px; padding: 24px 28px; margin-bottom: 24px; }
    .cover-title { font-size: 18px; }
    @page { margin: 1.2cm; size: A4; }
  }
</style>
</head><body>

<div class="toolbar">
  <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  <button class="btn-print" onclick="window.print()">🖨 Imprimer / Enregistrer PDF</button>
</div>

<div class="page">

  <!-- Couverture -->
  <div class="cover">
    <div class="cover-left">
      <div class="cover-logo">Gestion Budgétaire</div>
      <div class="cover-type">${typeLabel}</div>
      <div class="cover-title">${rapport.titre || 'Rapport d\'analyse'}</div>
    </div>
    <div class="cover-right">
      <div class="cover-date">
        Généré le<br><strong style="color:#fff">${dateCreation}</strong><br><br>
        Imprimé le<br><strong style="color:#fff">${now}</strong>
      </div>
      <div class="cover-badge">${rapport.type_rapport || 'IA'}</div>
    </div>
  </div>

  <!-- Méta-info -->
  <div class="meta-bar">
    <div class="meta-item">
      <div class="meta-label">Type</div>
      <div class="meta-value">${typeLabel}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Date de génération</div>
      <div class="meta-value">${dateCreation}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Tokens utilisés</div>
      <div class="meta-value">${rapport.tokens_utilises ? formaterNombre(rapport.tokens_utilises) : '—'}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Source</div>
      <div class="meta-value">Analyse IA</div>
    </div>
  </div>

  <!-- Corps du rapport -->
  <div class="content">
    ${bodyHtml}
  </div>

  <!-- Pied de page -->
  <div class="footer">
    <span>Gestion Budgétaire — Système de Gestion Budgétaire</span>
    <span>Document confidentiel — usage interne</span>
  </div>

</div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.target   = '_blank'
  a.rel      = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/**
 * Export CSV multi-sections (chaque section séparée par une ligne vide + titre)
 * @param {string} filename
 * @param {{ title: string, headers: string[], rows: Array[] }[]} sections
 */
export function exportCSVMulti(filename, sections) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = []
  sections.forEach((s, i) => {
    if (i > 0) lines.push('')
    lines.push(escape('=== ' + s.title + ' ==='))
    lines.push(s.headers.map(escape).join(';'))
    s.rows.forEach(r => lines.push(r.map(escape).join(';')))
  })
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${filename}.csv`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Export CSV (compatible Excel avec séparateur ; et BOM UTF-8)
 * @param {string} filename  - nom du fichier sans extension
 * @param {string[]} headers - titres des colonnes
 * @param {Array[]} rows     - tableau de tableaux de valeurs
 */
export function exportCSV(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    headers.map(escape).join(';'),
    ...rows.map(r => r.map(escape).join(';')),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${filename}.csv`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Impression PDF via fenêtre dédiée avec mise en page propre
 * @param {string} title      - titre du document
 * @param {string[]} headers  - colonnes du tableau
 * @param {Array[]} rows      - données
 * @param {object} meta       - métadonnées {subtitle, filters, stats}
 */
export function printPDF(title, headers, rows, meta = {}) {
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const statsHtml = meta.stats
    ? `<div class="stats">${meta.stats.map(s =>
        `<div class="stat-box"><div class="stat-val">${s.value}</div><div class="stat-lbl">${s.label}</div></div>`
      ).join('')}</div>`
    : ''

  const thead = headers.map(h => `<th>${h}</th>`).join('')
  const tbody = rows.map((r, i) =>
    `<tr class="${i % 2 === 0 ? '' : 'alt'}">${r.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`
  ).join('')

  const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1F2937; background: #fff; padding: 24px 28px; }
  .toolbar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 16px; }
  .toolbar button { padding: 7px 18px; border-radius: 6px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; }
  .btn-print { background: #0E2A47; color: #fff; border: 1px solid rgba(30,58,138,.4); }
  .btn-close { background: #F3F4F6; color: #374151; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #B8864A; }
  .header-left h1 { font-size: 16px; font-weight: 800; color: #0E2A47; margin-bottom: 3px; }
  .header-left p  { font-size: 10px; color: #6B7280; }
  .header-right   { text-align: right; font-size: 10px; color: #6B7280; }
  .logo { font-size: 18px; font-weight: 900; color: #0E2A47; letter-spacing: -0.5px; }
  .stats { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .stat-box { background: rgba(184,134,74,0.08); border: 1px solid rgba(184,134,74,0.25); border-radius: 6px; padding: 8px 14px; min-width: 100px; }
  .stat-val { font-size: 15px; font-weight: 800; color: #0E2A47; }
  .stat-lbl { font-size: 9px; color: #6B7280; text-transform: uppercase; letter-spacing: .4px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead tr { background: #0E2A47; }
  thead th { color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 7px 8px; text-align: left; white-space: nowrap; }
  tbody td { padding: 6px 8px; font-size: 10px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  tr.alt td { background: #F9FAFB; }
  .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 9px; color: #9CA3AF; }
  @media print {
    .toolbar { display: none !important; }
    body { padding: 10px 14px; }
    @page { margin: 1cm; size: A4 landscape; }
  }
</style>
</head><body>
<div class="toolbar no-print">
  <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  <button class="btn-print" onclick="window.print()">🖨 Imprimer / Enregistrer PDF</button>
</div>
<div class="header">
  <div class="header-left">
    <div class="logo">Gestion Budgétaire</div>
    <h1>${title}</h1>
    ${meta.subtitle ? `<p>${meta.subtitle}</p>` : ''}
  </div>
  <div class="header-right">
    <div>Généré le ${now}</div>
    ${meta.filters ? `<div style="margin-top:4px">${meta.filters}</div>` : ''}
    <div style="margin-top:4px">${rows.length} enregistrement${rows.length !== 1 ? 's' : ''}</div>
  </div>
</div>
${statsHtml}
<table>
  <thead><tr>${thead}</tr></thead>
  <tbody>${tbody}</tbody>
</table>
<div class="footer">
  <span>Gestion Budgétaire — Système de Gestion Budgétaire</span>
  <span>Document confidentiel — usage interne</span>
</div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.target   = '_blank'
  a.rel      = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/**
 * Impression PDF multi-sections — chaque section a son propre tableau
 */
export function printPDFMulti(title, sections, meta = {}) {
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const statsHtml = meta.stats
    ? `<div class="stats">${meta.stats.map(s =>
        `<div class="stat-box"><div class="stat-val">${s.value}</div><div class="stat-lbl">${s.label}</div></div>`
      ).join('')}</div>`
    : ''
  const sectionsHtml = sections.map(s => {
    const thead = s.headers.map(h => `<th>${h}</th>`).join('')
    const tbody = s.rows.map((r, i) =>
      `<tr class="${i % 2 === 0 ? '' : 'alt'}">${r.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`
    ).join('')
    return `<div class="sec-title">${s.title}<span class="sec-count">${s.rows.length} ligne${s.rows.length !== 1 ? 's' : ''}</span></div>
<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`
  }).join('<div class="sec-gap"></div>')
  const totalRows = sections.reduce((s, sec) => s + sec.rows.length, 0)
  const htmlM = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"/><title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1F2937; background: #fff; padding: 24px 28px; }
  .toolbar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 16px; }
  .toolbar button { padding: 7px 18px; border-radius: 6px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; }
  .btn-print { background: #0E2A47; color: #fff; }
  .btn-close  { background: #F3F4F6; color: #374151; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #B8864A; }
  .header-left h1 { font-size: 16px; font-weight: 800; color: #0E2A47; margin-bottom: 3px; }
  .header-left p  { font-size: 10px; color: #6B7280; }
  .header-right   { text-align: right; font-size: 10px; color: #6B7280; }
  .logo { font-size: 18px; font-weight: 900; color: #0E2A47; letter-spacing: -0.5px; }
  .stats { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
  .stat-box { background: rgba(184,134,74,0.08); border: 1px solid rgba(184,134,74,0.25); border-radius: 6px; padding: 8px 14px; min-width: 100px; }
  .stat-val { font-size: 15px; font-weight: 800; color: #0E2A47; }
  .stat-lbl { font-size: 9px; color: #6B7280; text-transform: uppercase; letter-spacing: .4px; margin-top: 2px; }
  .sec-title { font-size: 12px; font-weight: 800; color: #0E2A47; margin: 0 0 8px; padding: 6px 10px; background: rgba(184,134,74,0.08); border-left: 3px solid #B8864A; border-radius: 0 4px 4px 0; display: flex; align-items: center; }
  .sec-count { font-size: 10px; font-weight: 600; color: #6B7280; margin-left: 8px; }
  .sec-gap { height: 22px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  thead tr { background: #0E2A47; }
  thead th { color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 7px 8px; text-align: left; white-space: nowrap; }
  tbody td { padding: 6px 8px; font-size: 10px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  tr.alt td { background: #F9FAFB; }
  .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 9px; color: #9CA3AF; }
  @media print { .toolbar { display: none !important; } body { padding: 10px 14px; } @page { margin: 1cm; size: A4 landscape; } }
</style></head><body>
<div class="toolbar">
  <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  <button class="btn-print" onclick="window.print()">🖨 Imprimer / Enregistrer PDF</button>
</div>
<div class="header">
  <div class="header-left">
    <div class="logo">Gestion Budgétaire</div>
    <h1>${title}</h1>
    ${meta.subtitle ? `<p>${meta.subtitle}</p>` : ''}
  </div>
  <div class="header-right">
    <div>Généré le ${now}</div>
    ${meta.filters ? `<div style="margin-top:4px">${meta.filters}</div>` : ''}
    <div style="margin-top:4px">${totalRows} enregistrement${totalRows !== 1 ? 's' : ''}</div>
  </div>
</div>
${statsHtml}
${sectionsHtml}
<div class="footer">
  <span>Gestion Budgétaire — Système de Gestion Budgétaire</span>
  <span>Document confidentiel — usage interne</span>
</div>
</body></html>`
  const blobM = new Blob([htmlM], { type: 'text/html;charset=utf-8' })
  const urlM  = URL.createObjectURL(blobM)
  const aM    = document.createElement('a')
  aM.href     = urlM
  aM.target   = '_blank'
  aM.rel      = 'noopener noreferrer'
  aM.style.display = 'none'
  document.body.appendChild(aM)
  aM.click()
  document.body.removeChild(aM)
  setTimeout(() => URL.revokeObjectURL(urlM), 10000)
}
