# Handoff — Atlas Finance

Plateforme de pilotage budgétaire pour institutions publiques, ONG et grandes entreprises.
Ce dossier contient la totalité des maquettes (landing publique + 12 écrans produit) prêtes à être réimplémentées dans une codebase de production.

---

## 1. À propos de ces fichiers

**Les fichiers du dossier `prototype/` sont des références de design en HTML/JSX (Babel inline) — pas du code de production.**
Ce sont des prototypes haute-fidélité qui montrent l'apparence finale, la structure d'information, la copy exacte, les états et les interactions attendus.

**Votre mission** : recréer ces écrans dans la stack cible du projet (typiquement React + TypeScript + un framework UI/CSS choisi côté équipe — Tailwind, CSS Modules, vanilla CSS, etc.) en respectant les conventions de la codebase. Si aucune codebase n'existe encore, choisissez la stack la plus appropriée :

> **Recommandation par défaut** : Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui pour les primitives, Recharts pour les graphes.

Ne pas copier-coller le HTML tel quel : extraire les composants, les tokens et les structures, puis les recomposer proprement.

---

## 2. Fidélité

**Haute fidélité (hifi)** sur tous les écrans :
- Couleurs, typographies, espacements, ombres et radius **finaux**
- Copy française **finale**, à respecter mot pour mot
- États (hover, active, focus, disabled, vide, succès, erreur) majoritairement définis
- Animations légères (reveal au scroll, count-up, hover halos) — voir §7

Les graphes (line, bar) sont rendus en SVG/CSS dans le proto pour rapidité ; en production, utiliser une librairie de chart (Recharts / Visx / ECharts) en respectant les mêmes couleurs.

---

## 3. Vue d'ensemble du produit

**Atlas Finance** est une plateforme SaaS de gestion budgétaire pour institutions. 3 rôles utilisateur :

| Rôle | Responsabilités |
|------|-----------------|
| **Administrateur** | Vision exécutive, configuration, gouvernance, audit, utilisateurs |
| **Gestionnaire** | Création de budgets, saisie de dépenses, suivi de son département |
| **Comptable** | Validation des budgets et dépenses, conformité |

**Modules métier** : Budgets · Workflow de validation · Suivi des dépenses · Rapports & KPIs · IA (Claude) · Audit & traçabilité.

**Devise** : FCFA (Franc CFA). **Locale** : `fr-FR` avec séparateur de milliers fine espace (`280 000 FCFA`).

---

## 4. Inventaire des écrans

| # | Écran | Composant proto | Rôle | But |
|---|-------|----------------|------|-----|
| 0 | **Landing publique** | `index.html` | — | Site marketing, CTA "Demander une démo" |
| 1 | Connexion | `LoginScreen` | tous | Login JWT/Argon2 + sélecteur de rôle démo |
| 2 | Dashboard Admin | `DashboardAdmin` | Admin | KPIs consolidés, allocation par dept, alertes |
| 3 | Dashboard Gestionnaire | `DashboardGestionnaire` | Gestionnaire | Mes budgets, mon enveloppe |
| 4 | Dashboard Comptable | `DashboardComptable` | Comptable | File de validation |
| 5 | Création de budget | `BudgetCreation` | Gestionnaire | Form lignes budgétaires + méthode estim. |
| 6 | Validation détail | `ValidationDetail` | Comptable | Approuver/rejeter un budget soumis |
| 7 | Suivi des dépenses | `ExpenseTracking` | Gestionnaire | Liste filtrable des dépenses + pièces |
| 8 | Assistant IA | `ChatbotIA` | Admin | Drawer Claude + suggestions/anomalies |
| 9 | KPI Analytics | `KPIAnalytics` | Admin | Graphes consolidés, perf. par dept |
| 10 | Journal d'audit | `AuditLog` | Admin | Log immuable des actions |
| 11 | Utilisateurs | `UsersPage` | Admin | Gestion des accès |
| 12 | Paramètres | `SettingsPage` | Admin | Sécurité, conformité, intégrations |

Tous les écrans produit utilisent le même shell : **Sidebar (220px) + Topbar (56px) + Main**.

---

## 5. Tokens de design

### 5.1 Couleurs — Produit (thème clair "ivory & petrol")

```css
/* Surfaces */
--af-night:     #F7F5F0;   /* fond page — ivoire chaud */
--af-ink:       #0E2A47;   /* sidebar / boutons primaires — bleu pétrole */
--af-slate:     #FFFFFF;   /* cards */
--af-steel:     #EDE7DA;   /* wash subtil */
--af-steel-2:   #DCD3C0;
--af-line:      rgba(14, 42, 71, 0.08);
--af-line-2:    rgba(14, 42, 71, 0.16);

/* Texte */
--af-ivory:     #0E2A47;   /* texte principal sur fond clair */
--af-cream:     #5A6B7E;   /* texte secondaire */
--af-mute:      rgba(90, 107, 126, 0.7);
--af-side-text: #E8EEF5;   /* texte sidebar (sur fond bleu) */
--af-side-mute: rgba(232, 238, 245, 0.55);

/* Accent — cuivre/or raffiné */
--af-gold:      #B8864A;
--af-gold-soft: rgba(184, 134, 74, 0.12);
--af-gold-line: rgba(184, 134, 74, 0.30);

/* Statuts workflow */
--af-st-draft:   #6B7280;  /* gris  — BROUILLON */
--af-st-submit:  #2563EB;  /* bleu  — SOUMIS */
--af-st-approve: #15803D;  /* vert  — APPROUVÉ */
--af-st-reject:  #DC2626;  /* rouge — REJETÉ */
--af-st-close:   #7C3AED;  /* violet — CLÔTURÉ */

/* Comptabilité */
--af-revenue: #15803D;
--af-expense: #B91C1C;
```

### 5.2 Couleurs — Landing publique

```css
--bg-0: #f7f8fb;            /* page */
--bg-1: #ffffff;            /* cards */
--bg-3: #f1f3f7;            /* section profonde */
--fg:        #0c1626;       /* encre noire */
--fg-dim:    rgba(12,22,38,0.66);
--fg-mute:   rgba(12,22,38,0.46);
--accent:    #2563eb;       /* bleu encre */
--accent-2:  #0c4a6e;
--line:      rgba(12,22,38,0.08);
--line-2:    rgba(12,22,38,0.14);
--line-bright: rgba(37,99,235,0.35);
```

### 5.3 Palette départements

Les 6 départements ont chacun une couleur stable utilisée dans les chips, légendes et graphes :

| # | Département | Couleur | Short |
|---|-------------|---------|-------|
| 0 | Direction Générale | `#C9A961` | DG |
| 1 | Marketing | `#3B82F6` | MK |
| 2 | R&D | `#10B981` | RD |
| 3 | Ressources Humaines | `#8B5CF6` | RH |
| 4 | Opérations | `#E5A53D` | OP |
| 5 | Communication | `#7DD3FC` | CO |

### 5.4 Typographie

Le proto utilise **Arial** comme placeholder (font système, sans import).
**Pour la production, remplacer par :**

| Usage | Famille recommandée | Fallback |
|-------|---------------------|----------|
| Display / titres / valeurs KPI | **GT Alpina** *(payant)* ou **Lora** / **Source Serif 4** *(gratuit)* | `serif` |
| Texte UI | **Inter** | `system-ui, -apple-system, Segoe UI, sans-serif` |
| Mono (refs, montants tabulaires) | **JetBrains Mono** | `ui-monospace, monospace` |

Les variables CSS `--af-serif`, `--af-sans`, `--af-mono` centralisent le choix.

**Échelle typographique produit** :

| Token | Taille | Usage |
|-------|-------|-------|
| Title page | 32px / serif / weight 400 | h1 page |
| Section title | 18px / serif / 500 | titres de section |
| Card title | 16px / serif / 500 | titres de card |
| KPI value | 28px / serif / -0.02em | valeurs chiffrées |
| Body | 13px / sans / 1.45 | texte courant |
| Body small | 12.5px | tables, descriptions |
| Eyebrow / labels | 10–11px / 0.18–0.20em / uppercase | labels de form, breadcrumbs |
| Mono | 10–11px | refs, timestamps |

**Échelle typographique landing** :

- Hero h1 : `clamp(48px, 7.4vw, 104px)` / weight 800 / -0.04em
- H2 sections : `clamp(40px, 5vw, 64px)` / 700 / -0.03em
- Hero CTA band : `clamp(56px, 8.5vw, 116px)` / 800
- Body : 16px / 1.5

### 5.5 Spacing, radius, ombres

```css
/* Radius */
--radius:    12px;     /* cards principales */
--radius-lg: 14px;     /* hero device, modal */
/* boutons      : 6–10px (8 par défaut) */
/* inputs       : 6px */
/* badges       : 4px */
/* pills        : 999px */

/* Container */
--max:   1280px;       /* landing */
--pad-x: clamp(20px, 4vw, 64px);

/* Shell produit */
sidebar: 220px (largeur fixe)
topbar:  56px  (hauteur fixe)
main:    padding 28px 32px 40px

/* Spacing recommandé */
4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28 / 32 / 40 / 48
```

**Ombres** — discrètes, pour donner du relief :

```css
/* card produit */
box-shadow: 0 1px 0 rgba(14,42,71,0.02);
/* hero device landing */
box-shadow: 0 50px 100px -40px rgba(12,22,38,0.30),
            0 24px 48px -24px rgba(37,99,235,0.18);
/* modal */
box-shadow: 0 40px 80px -20px rgba(12,22,38,0.30);
/* hover card landing */
box-shadow: 0 24px 60px -28px rgba(12,22,38,0.18);
```

---

## 6. Architecture des composants (à recréer)

### 6.1 Primitives partagées (voir `prototype/screens/shared.jsx`)

- **`<Sidebar>`** — props `{ active, role, user, initials }` ; sections `Pilotage / Workflow / Intelligence / Gouvernance / Compte` ; item actif marqué par une barre verticale `--af-gold` 2px à gauche.
- **`<Topbar>`** — props `{ crumb: string[], showSearch }` ; breadcrumb avec séparateur `/` doré, recherche fantôme, icônes notif (avec pip doré) + settings.
- **`<Badge status>`** — `draft | submit | approve | reject | close` ; pill 4px radius, dot circulaire à gauche, mono 10px, letterSpacing 0.10em.
- **`<DeptChip idx>`** — chip arrondi avec dot coloré + nom complet du dept.
- **`<LineChart data height>`** — SVG path + area gradient or, dots discrets.
- **`<BarChart data labels>`** — barres empilées (revenus en vert, dépenses en rouge), labels mono dessous, grille en pointillés.
- **`Icon.*`** — set de SVG inlined (dashboard, budget, expense, validate, ai, audit, kpi, users, settings, search, bell, plus, arrow, filter, download, send, close, check, reject, more, paperclip, sparkle).

### 6.2 Patterns récurrents

| Classe | Pattern |
|--------|---------|
| `.af-card` | bg `#fff`, border `--af-line`, radius 10, ombre subtile, header avec title serif 16px + sub + actions à droite |
| `.af-kpi` | card 18px 20px, label uppercase 10px + icône or, valeur serif 28px, delta mono 11px (up/down/flat) |
| `.af-table` | header bg `#FAF8F3`, cell padding 14×16, hover row tinte `--af-gold-soft` à 4% |
| `.af-bar` | barre 5px height, fill or par défaut, variantes `warn / danger / ok` |
| `.af-pill` | bordure ronde 999px, état `.active` doré + soft bg |
| `.af-tag-method` | tag mono pour méthode d'estimation (PERT, ANALOGIE, ASCENDANTE) |
| `.af-form-group` | label uppercase 10px / input radius 6 / focus halo doré 3px |
| `.af-toggle` | switch 36×20, état `on` = bleu pétrole |
| `.af-drawer` | panneau 380px ancré à droite, ombre `-20px 0 40px` |

### 6.3 Workflow de validation

```
BROUILLON → SOUMIS → APPROUVÉ
                  ↘ REJETÉ
APPROUVÉ → CLÔTURÉ
```

5 statuts visuels (badges cf §6.1). Chaque transition est journalisée dans l'audit.

### 6.4 Méthodes d'estimation budgétaire

3 méthodes au choix sur création de budget :
1. **Analogie** — basée sur des budgets historiques similaires
2. **3 Points (PERT)** — pondération `(O + 4M + P) / 6` ; affiche optimiste / plus probable / pessimiste
3. **Ascendante** — addition des lignes saisies

Sélecteur en pills 3 colonnes ; lorsque PERT est sélectionné, encart bleu pétrole avec les 3 valeurs.

---

## 7. Interactions & comportements

### Landing publique
- **Nav** : passe en mode `scrolled` (height 56, blur, border) au-delà de 8px de scroll.
- **`.reveal`** : opacité 0 → 1 + translateY 20→0 sur entrée viewport (IntersectionObserver, threshold 0.12), durée 0.8s.
- **Count-up** : nombres animés sur entrée viewport (threshold 0.6), easing `1 - (1-t)³`, durée 1200ms ; supporte `data-prefix`, `data-suffix`, `data-decimals`.
- **Card halo** : sur `.feat-card`, suivi de la souris via `--mx` mis à jour dans `mousemove`.
- **Constellation** : canvas `hero-stars` et `demo-stars`, points or/bleu en mouvement subtil ; densité paramétrable.
- **Modal démo** : ouvert par n'importe quel `[data-open-demo]` ; trap focus, fermeture sur backdrop click, Esc, ou bouton ; transition scale 0.98→1.
- **Smooth anchor scroll** : `behavior: smooth`, offset -60px.

### Produit
- **Hover row tableau** : tinte `rgba(184,134,74,0.04)`.
- **Hover card** : pas de transformation (volontairement sobre).
- **Hover bouton primaire** (`.af-btn-gold`) : `translateY(-1px)` + bg `#163A5F`.
- **Focus inputs** : border doré + halo `0 0 0 3px var(--af-gold-soft)` + bg ivoire.
- **Pills `.active`** : fond `--af-gold-soft`, border `--af-gold`, color `--af-gold`.
- **Drawer chatbot** : slide-in depuis la droite, peut être fermé via la croix.

### États de chargement, vide, erreur
Non maquettés finement. À construire en respectant la palette :
- **Loading** : skeleton shimmer en `--af-steel`.
- **Vide** : titre serif + sub mute + CTA primaire centré.
- **Erreur** : utiliser `--af-st-reject` + icône triangle.

---

## 8. État applicatif (modèle suggéré)

### Entités principales
```ts
type Role = "admin" | "gestionnaire" | "comptable";
type Status = "draft" | "submit" | "approve" | "reject" | "close";
type Method = "ANALOGIE" | "PERT" | "ASCENDANTE";

interface User { id; name; email; role: Role; deptId; initials; lastSeen; active }
interface Department { id; name; color; short }
interface Budget {
  id;            // ex. "BG-2026-014"
  title;
  deptId;
  fiscalYear;    // 2026
  fiscalQuarter; // "T2"
  method: Method;
  status: Status;
  lines: BudgetLine[];
  createdBy; submittedAt; approvedAt; rejectedAt;
  rejectionReason?;
}
interface BudgetLine { type: "REVENU" | "DEPENSE"; label; category; amount }
interface Expense {
  id;            // "DP-4421"
  budgetId;
  date;
  label;
  amount;
  attachments: File[];
  status: Status;
  reviewedBy;
}
interface AuditEntry {
  ts; action: "create"|"update"|"delete"|"login"|"approve"|"reject"|"submit"|"export"|"view";
  userId;
  target;        // ex. "Budget BG-2026-014"
  description;
  before?: any; after?: any;   // état JSON
}
interface AIInsight {
  type: "anomaly" | "optimization";
  severity: "critical" | "moderate" | "info";
  budgetId?; expenseId?;
  description; sources[];
}
```

### Routes attendues (ordre indicatif)
```
/login
/dashboard            (selon rôle, redirige vers la bonne vue)
/budgets
/budgets/new
/budgets/:id
/depenses
/validation
/validation/:budgetId
/ia
/kpi
/audit
/utilisateurs
/parametres
```

### Sécurité
- **Auth** : JWT (access 15 min) + Refresh (7 jours), stockage refresh en httpOnly cookie.
- **Hash mot de passe** : Argon2id.
- **2FA TOTP** activable.
- **RBAC** côté serveur **et** côté UI (cacher CTAs hors permissions).
- **Audit** : toutes mutations métier journalisées immuablement avec diff JSON before/after.

---

## 9. Assets

Le dossier `prototype/assets/` contient 8 SVG illustratifs pour la landing :

| Fichier | Usage |
|---------|-------|
| `dashboard_hero.svg` | Mockup principal du hero |
| `feature_budgets.svg` | Card module Budgets |
| `feature_workflow.svg` | Card module Workflow |
| `feature_depenses.svg` | Card module Dépenses |
| `feature_rapports.svg` | Card module Rapports (badge "Phare") |
| `feature_ia.svg` | Card module IA (badge "IA") |
| `feature_audit.svg` | Card module Audit |
| `about_visual.svg` | Section "Notre approche" |

Ces SVG sont **placeholders haute-fidélité** créés pour le proto. En production, il est probable que la marque souhaite des **screenshots réels** ou des illustrations dessinées par un designer — à clarifier avec le client.

Aucun logo de marque externe n'est utilisé. Les icônes UI sont inlined dans `shared.jsx` (style Lucide / Feather).

---

## 10. Internationalisation

Tous les écrans sont **en français**. Aucune chaîne extraite — à faire :

1. Extraire toutes les strings dans `locales/fr.json`.
2. Garder les **références** (`BG-2026-014`, `DP-4421`) **non traduites** — ce sont des identifiants.
3. Format monétaire : `Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'`.
4. Format date : `dd/MM HH:mm` pour les logs, relatif (`il y a 2h`, `hier`, `il y a 3j`) pour les listes.
5. Préparer pour ajouter EN ultérieurement (les libellés métier comme "Brouillon" / "Draft" sont déjà dans le code).

---

## 11. Responsive

Le proto produit est **fixé à 1440×900** (artboards). En production :

- **Desktop ≥ 1280px** : layout 220 + 1fr (sidebar + main).
- **Tablet 768–1279px** : sidebar collapsable (icônes seulement, 64px) ; KPI grid 2 colonnes.
- **Mobile < 768px** : sidebar masquée derrière un drawer, topbar avec hamburger, KPI 1 colonne, tables → cards stackées.

La landing a déjà des breakpoints à **1100px** (grids 1 col) et **720px** (mobile).

---

## 12. Comment lancer le proto pour référence

```bash
cd design_handoff_atlas_finance/prototype/
# Servir le dossier en HTTP (les ES imports + Babel inline ont besoin de http://)
npx http-server . -p 8080
# puis ouvrir :
#   http://localhost:8080/index.html      → landing publique
#   http://localhost:8080/prototype.html  → canvas avec les 13 écrans
```

Le `prototype.html` utilise un design canvas custom (`design-canvas.jsx`) pour empiler les écrans en grille pannable/zoomable.

---

## 13. Files dans ce handoff

```
design_handoff_atlas_finance/
├── README.md                          ← ce fichier
└── prototype/
    ├── index.html                     ← landing publique (autonome)
    ├── prototype.html                 ← canvas des 13 écrans produit
    ├── app.css                        ← TOUS les tokens & classes produit (à digérer)
    ├── design-canvas.jsx              ← composant canvas pannable (proto-only)
    ├── screens/
    │   ├── shared.jsx                 ← Sidebar, Topbar, Badge, charts, icons
    │   ├── dashboards.jsx             ← Login + 3 dashboards par rôle
    │   ├── workflow.jsx               ← Création budget, Validation détail, Dépenses
    │   └── intelligence.jsx           ← IA, Audit, KPI, Users, Settings
    └── assets/
        └── *.svg                      ← 8 visuels landing
```

---

## 14. Ordre d'implémentation suggéré

1. **Setup** — stack + tokens CSS/Tailwind config + fonts + Inter/serif/mono.
2. **Primitives** — Button, Input, Select, Toggle, Badge, Pill, Card, Table.
3. **Shell** — Sidebar + Topbar (avec routing actif + 3 jeux de nav par rôle si besoin).
4. **Auth** — Login (les 3 rôles démo peuvent être hardcodés au début).
5. **Dashboards** — un par rôle, avec données mockées.
6. **Workflow** — Création budget → Validation détail → Suivi dépenses.
7. **Intelligence** — KPI Analytics (graphes Recharts), puis Chatbot IA (drawer + integration Claude API).
8. **Gouvernance** — Audit log, Users, Settings.
9. **Landing** — page marketing publique séparée (peut être un projet Next à part).

Bon courage 🛠️
