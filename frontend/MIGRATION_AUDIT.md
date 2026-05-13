# MIGRATION_AUDIT — Atlas Finance → Tailwind CSS v4

> Date : 2026-05-13  
> Scope : `frontend/src/**`  
> Tailwind déjà installé : **v4.2.2** (architecture CSS-first, pas de `tailwind.config.js`)

---

## 1. Fichiers CSS existants

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/index.css` | ~1 338 | Point d'entrée : `@import "tailwindcss"`, `@theme`, `@layer base`, `@layer components`, animations |
| `src/styles/atlas.css` | ~1 275 | **Cible principale** : classes vanilla non-Tailwind (`.af-app`, `.af-sidebar`, `.af-card`, `.af-btn`, `.af-table`…) |

**Stratégie** :
- `index.css` → nettoyer le `@layer components` (remplacer les blocs CSS par `@apply` Tailwind, ou supprimer au fur et à mesure que les composants JSX utilisent les utilitaires directement)
- `atlas.css` → **suppression totale** en fin de migration (quand tous les JSX n'en dépendent plus)

---

## 2. Inventaire des couleurs — mapping vers tokens Tailwind

### Palette principale

| Rôle | Hex actuel | Token `@theme` | Classe Tailwind |
|------|-----------|----------------|-----------------|
| Ink (bleu pétrole foncé) | `#0E2A47` | `--color-primary-700` | `bg-primary-700` / `text-primary-700` |
| Ink hover | `#163A5F` | `--color-primary-600` | `bg-primary-600` |
| Bleu moyen | `#1F5F8B` | `--color-primary-500` | `bg-primary-500` |
| Gold accent | `#B8864A` | `--color-gold` | `bg-gold` / `text-gold` |
| Gold dark | `#8C6534` | `--color-gold-dark` | `text-gold-dark` |
| Gold warm | `#E8B86E` / `#C9A961` | `--color-gold-warm` | `text-gold-warm` |
| Page background | `#F7F5F0` | `--af-night` | `bg-night` |
| Card background | `#FFFFFF` | `--af-slate` | `bg-white` |
| Subtle wash | `#EDE7DA` | `--color-gray-100` | `bg-gray-100` |
| Subtle wash 2 | `#DCD3C0` | `--color-gray-150` | `bg-gray-150` |
| Text primary | `#0E2A47` | `--color-primary-700` | `text-primary-700` |
| Text secondary | `#5A6B7E` | `--color-gray-500` | `text-gray-500` |
| Text muted | `rgba(90,107,126,0.7)` | `--af-mute` | `text-muted` (classe custom) |
| Sidebar text | `#E8EEF5` | `--af-side-text` | `text-side` (classe custom) |

### Statuts

| Statut | Texte | Fond badge | Bordure badge |
|--------|-------|------------|---------------|
| BROUILLON | `#4B5563` | `rgba(107,114,128,0.10)` | `rgba(107,114,128,0.35)` |
| SOUMIS / SAISIE | `#1D4ED8` | `rgba(37,99,235,0.10)` | `rgba(37,99,235,0.35)` |
| APPROUVE / VALIDEE | `#15803D` | `rgba(21,128,61,0.10)` | `rgba(21,128,61,0.35)` |
| REJETE / REJETEE | `#B91C1C` | `rgba(220,38,38,0.10)` | `rgba(220,38,38,0.35)` |
| CLOTURE | `#6D28D9` | `rgba(109,40,217,0.10)` | `rgba(109,40,217,0.35)` |
| ARCHIVE | `#5A6B7E` | `var(--color-gray-50)` | `var(--af-line-2)` |

---

## 3. Tailles de police et espacements custom

### Typographie

| Usage | Valeur actuelle | Tailwind équivalent |
|-------|----------------|---------------------|
| Page title (h1) | `32px / 400` | `text-[32px] font-normal tracking-[-0.02em]` |
| Section title (h3) | `18px / 500` | `text-lg font-medium` |
| Card title | `16px / 500` | `text-base font-medium tracking-[-0.01em]` |
| Body | `13.5px` | `text-[13.5px]` (var Tailwind `text-sm` = 14px, proche) |
| Small / label | `10px` | `text-[10px]` |
| Eyebrow | `10px uppercase ls-0.20em` | `text-[10px] uppercase tracking-[0.20em]` |
| Badge | `10px / 600` | `text-[10px] font-semibold tracking-[0.10em]` |
| KPI value | `28px` | `text-[28px] tabular-nums tracking-[-0.02em]` |
| Mono ref | `11px` | `text-[11px] font-mono` |

### Espacements critiques

| Usage | Valeur | Note |
|-------|--------|------|
| Sidebar width | `220px` | Variable CSS dynamique — garder en `style` inline |
| Topbar height | `56px` | Idem |
| Page padding | `28px 32px 40px` | `px-8 pt-7 pb-10` |
| Card padding | `20px` | `p-5` |
| KPI padding | `18px 20px` | `py-[18px] px-5` |
| Gap grille KPI | `14px` | `gap-[14px]` |
| Gap items | `6–10px` | `gap-1.5` à `gap-2.5` |

---

## 4. Composants à migrer — triés par priorité

### Priorité 1 — Atomiques (bloquants pour tout le reste)

| Composant | Fichier | Classes custom |
|-----------|---------|---------------|
| `cn()` helper | `lib/cn.js` | — |
| StatusStyles | `utils/statusStyles.js` | badges statuts |
| StatusBadge | `components/StatusBadge.jsx` | `.badge`, `.badge-*` |
| Spinner / Loader | inline dans pages | `.spinner`, `.page-loader` |
| Button | `components/ui/Button.jsx` (si existe) | `.btn`, `.btn-*` |
| InputMontant | `components/ui/InputMontant.jsx` | `.af-input` |
| ConfirmModal | `components/ui/ConfirmModal.jsx` | `.modal-*` |
| Card | `components/ui/Card.jsx` | `.card`, `.af-card` |
| KpiCard | `components/KpiCard.jsx` | `.af-kpi`, `.af-kpi-grid` |

### Priorité 2 — Moléculaires

| Composant | Fichier | Classes custom |
|-----------|---------|---------------|
| Layout (sidebar + topbar) | `components/Layout.jsx` | `.af-app`, `.af-sidebar`, `.af-topbar`, `.af-main` |
| LignesBudgetaires | `components/budget/LignesBudgetaires.jsx` | `.af-table`, `.af-card` |
| DepenseMultiModal | `components/budget/DepenseMultiModal.jsx` | `.modal-*`, `.af-form-*` |
| ChatbotDrawer | `components/ia/ChatbotDrawer.jsx` | `.af-drawer`, `.af-msg` |

### Priorité 3 — Pages comptable

| Fichier | Complexité |
|---------|-----------|
| `pages/comptable/ComptableDashboard.jsx` | Moyenne — tables + KPIs |
| `pages/comptable/BudgetsAValider.jsx` | Haute — table complexe |
| `pages/comptable/DepensesPage.jsx` | Haute — table + filtres |

### Priorité 4 — Pages gestionnaire

| Fichier | Complexité |
|---------|-----------|
| `pages/gestionnaire/GestionnaireDashboard.jsx` | Haute — charts + KPIs |
| `pages/gestionnaire/MesBudgets.jsx` | Moyenne |
| `pages/gestionnaire/MesDepenses.jsx` | Moyenne |
| `pages/gestionnaire/BudgetDetail.jsx` | Très haute — tableaux imbriqués |
| `pages/gestionnaire/DepenseDetail.jsx` | Haute — workflow statuts |
| `pages/gestionnaire/DepensesParBudget.jsx` | Haute |

### Priorité 5 — Pages admin

| Fichier | Complexité |
|---------|-----------|
| `pages/admin/AdminDashboard.jsx` | Haute |
| `pages/admin/BudgetsPage.jsx` | Moyenne |
| `pages/admin/UtilisateursPage.js` | Haute |
| `pages/admin/DepartementsPage.jsx` | Moyenne |
| `pages/admin/RapportPage.jsx` | Haute — charts |
| `pages/admin/RapportsKPIPage.jsx` | Haute |
| `pages/admin/AuditLogsPage.jsx` | Moyenne |
| `pages/admin/BudgetAnnuelPage.jsx` | Moyenne |

### Priorité 6 — Pages secondaires + auth

| Fichier | Complexité |
|---------|-----------|
| `pages/LoginPage.jsx` | Moyenne — layout split-screen |
| `pages/ProfilPage.jsx` | Faible |
| `pages/ParametresPage.jsx` | Faible |
| `pages/ResetPasswordPage.jsx` | Faible |
| `pages/rapports/` | Haute |

---

## 5. Classes custom → stratégie de transformation

### Patterns `@apply` recommandés (dans `index.css`)

```css
@layer components {
  /* Garder @apply pour patterns ultra-récurrents uniquement */
  .btn-primary  { @apply inline-flex items-center gap-2 rounded-[6px] bg-primary-700 px-4 py-[9px] text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-45; }
  .btn-outline  { @apply inline-flex items-center gap-2 rounded-[6px] border border-[rgba(14,42,71,0.16)] bg-white px-4 py-[9px] text-[13px] font-medium text-primary-700 transition-colors duration-150 hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-45; }
  .btn-ghost    { @apply inline-flex items-center gap-2 rounded-[6px] bg-transparent px-4 py-[9px] text-[13px] text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-45; }
  .btn-danger   { @apply inline-flex items-center gap-2 rounded-[6px] border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-4 py-[9px] text-[13px] text-[#B91C1C] transition-colors duration-150 hover:bg-[rgba(220,38,38,0.14)] disabled:cursor-not-allowed disabled:opacity-45; }
  .btn-success  { @apply inline-flex items-center gap-2 rounded-[6px] border border-[rgba(21,128,61,0.3)] bg-[rgba(21,128,61,0.08)] px-4 py-[9px] text-[13px] text-[#15803D] transition-colors duration-150 hover:bg-[rgba(21,128,61,0.14)] disabled:cursor-not-allowed disabled:opacity-45; }
}
```

### Styles inline dynamiques à conserver

Ces patterns doivent rester en `style={{...}}` car ils dépendent de valeurs calculées en JS :

| Pattern | Localisation | Raison |
|---------|-------------|--------|
| `gridTemplateColumns: isMobile ? '1fr' : ...` | `Layout.jsx` | Valeur dynamique |
| `background: linear-gradient(180deg, ${bgColor}...)` | `KpiCard.jsx` | Couleur prop dynamique |
| `width: ${pct}%` | Barres de progression | Pourcentage calculé |
| `background: getDeptColor(dept)` | Tables depts | Couleur hashée |
| `style={{ color }}` | Icônes colorées | Props dynamiques |

---

## 6. Animations / keyframes à conserver

Tous dans `index.css` — **ne pas supprimer** :

| Nom | Usage |
|-----|-------|
| `fadeIn` | Loaders, modals, dropdowns |
| `fadeUp` | `.page-content` (entrée page) |
| `scaleIn` | Modals |
| `shimmer` | Skeletons |
| `spin` | Spinners |
| `slideDown` | Dropdowns |
| `pulse` | États chargement |
| `ia-pulse`, `ia-float`, `ia-bar`, `ia-slide` | Animations page IA |
| `progress-fill` | Barres de progression animées |
| `vt-fade-out`, `vt-fade-in` | View Transitions API |

---

## 7. Architecture Tailwind v4 — Points clés

### Différences v3 → v4 (importantes pour ce projet)

| v3 | v4 (ce projet) |
|----|----------------|
| `tailwind.config.js` | Config dans `@theme {}` en CSS |
| `require('@tailwindcss/forms')` | `@plugin "@tailwindcss/forms"` en CSS |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| Classes arbitraires `[#hex]` | Préférer tokens `@theme` |

### Tokens `@theme` déjà présents

- ✅ Couleurs primaires (`--color-primary-*`)
- ✅ Gold (`--color-gold*`)
- ✅ Success / Warning / Danger / Info
- ✅ Grays neutrals (`--color-gray-*`)
- ✅ Border radius (`--radius-*`)
- ✅ Shadows (`--shadow-*`)
- ✅ Semantic aliases (`--af-night`, `--af-ink`, `--af-slate`, `--af-cream`, `--af-mute`)
- ❌ **Tokens statuts manquants** → à ajouter dans `@theme`
- ❌ **Animations** non déclarées dans `@theme` → utiliser `animate-[...]` ou classes custom

---

## 8. Packages à installer

```bash
npm install clsx tailwind-merge
```

Optionnel (si formulaires complexes) :
```bash
npm install -D @tailwindcss/forms @tailwindcss/typography
```

(En v4 : ajouter `@plugin "@tailwindcss/forms"` dans `index.css`, pas dans un `.js`)

---

## 9. Fichiers à créer

| Fichier | Rôle |
|---------|------|
| `src/lib/cn.js` | Helper `cn()` = clsx + tailwind-merge |
| `src/utils/statusStyles.js` | Maps statuts → classes Tailwind |

---

## 10. Ordre d'exécution validé

1. ✅ **Audit** (ce document)
2. 🔄 **Setup** : install clsx/twmerge + `cn()` + `statusStyles.js` + compléter `@theme`
3. ⬜ **Atomiques** : StatusBadge, Spinner, Button, Input, Card, Modal
4. ⬜ **Layout** : `Layout.jsx` (sidebar + topbar + main)
5. ⬜ **KpiCard**, LignesBudgetaires, DepenseMultiModal, ChatbotDrawer
6. ⬜ **Pages comptable** (3 pages)
7. ⬜ **Pages gestionnaire** (6 pages)
8. ⬜ **Pages admin** (8 pages)
9. ⬜ **Pages auth + secondaires** (4 pages)
10. ⬜ **Suppression finale** de `atlas.css` + nettoyage `index.css`
