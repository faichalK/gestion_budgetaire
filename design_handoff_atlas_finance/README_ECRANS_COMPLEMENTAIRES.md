# Atlas Finance — Écrans complémentaires (handoff Claude Code)

Ce document **complète** `README.md` du même dossier. Il documente les 4 écrans manquants demandés et leur intégration dans la stack du projet :

> **Stack cible** : Django 5.2 (DRF + SimpleJWT) backend · React 19 + Vite 7 + TailwindCSS 4 + TanStack Query 5 + Recharts 3 frontend · PostgreSQL 15.

Les fichiers de référence design sont dans `prototype/screens/missing.jsx` (composants React/JSX) et `prototype/missing.html` (canvas pour les visualiser : `npx http-server prototype/ -p 8080` puis ouvrir `/missing.html`).

---

## 1. Inventaire des écrans ajoutés

| # | Écran | Composant proto | Route React | Endpoint principal | Rôles |
|---|-------|-----------------|-------------|--------------------|-------|
| 14 | Budgets — Liste | `BudgetList` | `/budgets` | `GET /api/budget/` | Admin · Comptable · Gestionnaire (filtré) |
| 15 | Budget — Détail | `BudgetDetail` | `/budgets/:id` | `GET /api/budget/{id}/` + `GET /api/budget/{id}/lignes/` | tous |
| 16 | Dépense — Détail | `ExpenseDetail` | `/depenses/:id` | `GET /api/v1/depenses/{id}/` | tous (actions selon rôle) |
| 17 | Rapports combinés | `RapportsCombines` | `/rapports` | `GET /api/v1/rapports/kpis/` + `GET /api/v1/rapports/par-departement/` + `GET /api/v1/rapports/evolution-mensuelle/` | Admin · Comptable |

Tous les écrans réutilisent le shell Sidebar (220px) + Topbar (56px) + main, et **respectent** les tokens et primitives définis dans `README.md` (§5–§6).

---

## 2. Écran 14 — Budgets (Liste)

### Objet
Vue consolidée de **tous les budgets** avec filtres par statut. Point d'entrée pour les actions « Nouveau budget », « Exporter », ouverture détail.

### Layout
- **Page head** : eyebrow `Exercice 2026 · 38 budgets` · h1 `Tous les budgets` · sub · actions à droite (`Exporter`, `Nouveau budget` — masqué pour rôle Comptable).
- **KPI grid** 4 colonnes : Total alloué · Approuvés · En attente · Brouillons/Rejetés.
- **Card** « Liste des budgets » avec :
  - Filtres en pills : `Tous · Brouillons · Soumis · Approuvés · Rejetés · Clôturés` (état `.active` doré sur celui sélectionné) + bouton filtre avancé.
  - Table 8 colonnes : `Réf. · Intitulé · Département · Méthode · Montant · Exécution · Statut · ›` (chevron action).

### Données API
```http
GET /api/budget/
  ?statut=APPROUVE         # filtre statut (optionnel)
  &departement={uuid}      # filtre département (optionnel)
  &exercice=2026           # année
  &page=1&page_size=25     # pagination

→ {
  count: 38, next, previous,
  results: Budget[]
}
```
Côté gestionnaire, le backend filtre déjà à `gestionnaire=request.user`.

### Composants UI à créer
- `<BudgetTable>` : table responsive, hover row teinté or, click sur la ligne → navigate(`/budgets/:id`).
- `<BudgetStatusFilter>` : pills `.af-pill` contrôlées, état persisté en query string (`?statut=...`).
- `<BudgetExportMenu>` : dropdown CSV / PDF (utilise `frontend/src/utils/export.js`).

### Permissions UI
- Bouton « Nouveau budget » : visible **uniquement** si `user.role === "GESTIONNAIRE"`.
- Bouton « Approuver/Rejeter » dans la kebab-menu : visible **uniquement** si `user.role === "COMPTABLE"`.

### États
- **Vide** : illustration discrète + sub `Aucun budget pour ce filtre.` + CTA `Réinitialiser`.
- **Loading** : 5 lignes skeleton.
- **Erreur** : toast rouge + bouton `Réessayer`.

---

## 3. Écran 15 — Budget (Détail)

### Objet
Vue **complète** d'un budget : informations, lignes, dépenses imputées, synthèse, workflow, pièces jointes, avis IA. Permet la saisie d'une dépense liée et l'export PDF.

### Layout — grid 2 colonnes (1.6fr · 1fr)

**Colonne gauche (stack vertical)** :
1. Card « Lignes budgétaires » — table 6 colonnes : Type (badge REVENU/DEPENSE) · Intitulé · Catégorie · Alloué · Consommé · Exécution (jauge + %).
2. Card « Dépenses imputées » — table 6 colonnes : Date · Réf. · Libellé · Ligne · Montant · Statut (badge).

**Colonne droite (stack)** :
1. Card « Synthèse » — solde prévisionnel (gros chiffre or) + jauge consommation + détails Engagé / Disponible.
2. Card « Workflow » — timeline verticale des transitions (Brouillon → Soumis → Approuvé / Rejeté → Clôturé) avec dot coloré statut + auteur + date.
3. Card « Pièces jointes » — liste fichiers avec icône `paperclip`.

### Header
- Eyebrow : `BG-2026-014 · Marketing · Exercice 2026 T2`
- `<Badge status>` + `<TagMethode>` (PERT/ANALOGIE/ASCENDANTE) inline.
- H1 = nom du budget.
- Sub : « Approuvé par X · il y a 12 jours · 4 dépenses engagées ».
- Actions selon rôle :
  - **Gestionnaire (propriétaire)** : `Exporter PDF` · `Avis IA` · `Saisir une dépense` (gold).
  - **Comptable** : `Exporter PDF` · `Avis IA` · `Approuver` (success) · `Rejeter` (danger) — uniquement si statut = SOUMIS.
  - **Admin** : `Exporter PDF` · `Avis IA`.

### Données API
```http
GET    /api/budget/{id}/                  → Budget (avec montants calculés)
GET    /api/budget/{id}/lignes/           → LigneBudgetaire[]
GET    /api/v1/depenses/?budget={id}      → ConsommationLigne[]
POST   /api/v1/ia/analyser-budget/{id}/   → AIInsight[]
POST   /api/budget/{id}/depense-multi/    → création dépense multi-lignes
GET    /api/audit/?table=Budget&enregistrement_id={id}  → historique workflow
```

### Composants UI
- `<BudgetLineRow>` : ligne tableau avec jauge `<af-bar>` + variantes warn/danger selon %.
- `<WorkflowTimeline events={Audit[]} />` : timeline verticale, dot coloré par action.
- `<AttachmentItem name size onDownload />`.
- `<AISidecar budgetId>` : ouvre le drawer chatbot prérempli (réutilise `<ChatbotDrawer>`).

### Calculs côté client
```ts
const totalLignes = lignes.reduce((s, l) => s + Number(l.montant_alloue), 0);
const consommation = lignes.reduce((s, l) => s + Number(l.montant_consomme), 0);
const pctExec = totalLignes ? Math.round(consommation / totalLignes * 100) : 0;
const couleurJauge = pctExec > 85 ? "danger" : pctExec > 70 ? "warn" : "ok";
```
**Important** : si le backend renvoie déjà `montant_disponible` calculé via `@property`, **utiliser cette valeur** plutôt que recalculer.

### Permissions
| Action | Admin | Gestionnaire (owner) | Comptable |
|--------|:-----:|:--------------------:|:---------:|
| Voir détail | ✅ | ✅ | ✅ |
| Saisir dépense | — | ✅ si statut=APPROUVE | — |
| Approuver/Rejeter | — | — | ✅ si statut=SOUMIS |
| Modifier les lignes | — | ✅ si statut=BROUILLON | — |
| Clôturer | — | — | ✅ si statut=APPROUVE |

---

## 4. Écran 16 — Dépense (Détail)

### Objet
Page de **revue d'une dépense** : utilisée par le comptable pour valider/rejeter, et par le gestionnaire pour consulter et joindre des PJ supplémentaires.

### Layout — grid 2 colonnes (1.5fr · 1fr)

**Colonne gauche** :
1. Card « Détail de la dépense » — grille 2 colonnes form-style : Référence · Date · Budget rattaché (lien vers `/budgets/:budgetId`) · Ligne budgétaire · Catégorie · Montant HT (gros chiffre or) + bloc Description.
2. Card « Pièces justificatives » — liste de fichiers : icône paperclip · nom · taille · ajouté il y a X · bouton download.

**Colonne droite (stack)** :
1. Card « Impact sur le budget » — montre la jauge **avant/après** validation sur la ligne concernée + disponible restant.
2. Card « Avis IA Claude » — verdict : `Aucune anomalie` (vert) / `À vérifier` (warn) / `Anomalie` (danger) + courte explication.
3. Card « Historique » — timeline transitions (Saisie → Soumise → Validée/Rejetée).

### Header
- Eyebrow : `DP-4421 · Saisie le 28/05/2026` + `<Badge>`.
- H1 = libellé de la dépense.
- Sub : « Saisie par X · Département · imputée sur BG-XXXX-XXX (lien) ».
- Actions (comptable uniquement, si statut = SAISIE) : `Rejeter` (danger) · `Valider la dépense` (success).

### Données API
```http
GET   /api/v1/depenses/{id}/                  → ConsommationLigne (+ ligne, budget, user)
POST  /api/v1/depenses/{id}/valider/          → { motif?: string }
POST  /api/v1/depenses/{id}/rejeter/          → { motif: string }   ← OBLIGATOIRE
GET   /api/audit/?table=ConsommationLigne&enregistrement_id={id}
```

### Validation rejet (modal)
À l'ouverture du clic « Rejeter » :
- Modal centré, max-width 460px.
- Champ `Motif du rejet` (textarea) — obligatoire, min 10 caractères.
- Bouton `Annuler` (outline) + `Confirmer le rejet` (danger).
- En cas de succès : toast `Dépense DP-XXXX rejetée. Le gestionnaire a été notifié.` + redirection liste.

### Composants UI
- `<JaugeBeforeAfter avant apres />` : barre avec deux états visuels.
- `<AIVerdictCard verdict text />` : card avec eyebrow coloré selon verdict.
- `<RejectExpenseModal expense onConfirm />`.

---

## 5. Écran 17 — Rapports combinés

### Objet
**Vue croisée** Budget × Dépense — utilisée pour le pilotage trimestriel, comités budgétaires, exports vers la direction.

### Layout

1. **Page head** — eyebrow `Rapport consolidé · Budgets × Dépenses`, h1 `Rapports combinés`, sub. Actions : sélecteur période en pills (`3M · 12M · YTD`) + boutons `PDF` et `CSV`.
2. **KPI grid 4 col.** : Budgets alloués · Dépenses validées (avec %) · Reste à engager · Écart vs prévision.
3. **Grid 2 colonnes (1.4fr · 1fr)** :
   - Card « Budgets vs Dépenses · 12 mois » — `<BarChart>` empilé (vert recettes/budgets, rouge dépenses) + légende.
   - Card « Trajectoire d'exécution » — `<LineChart>` cumulatif % d'exécution.
4. **Card « Croisement Budget × Dépense par département »** — table 8 colonnes :
   `Département · Budgets (count) · Alloué · Engagé · Validé · Reste · Exécution (jauge) · Anomalies`.

### Données API
```http
GET /api/v1/rapports/kpis/?periode=12M
  → { allocation_totale, depenses_validees, reste_a_engager, ecart_pct }

GET /api/v1/rapports/evolution-mensuelle/?periode=12M
  → [{ mois: "2025-06", budgets: 220, depenses: 180 }, ...]

GET /api/v1/rapports/par-departement/?periode=12M
  → [{ departement: {id, nom, color}, nb_budgets, alloue, engage, valide, reste, taux_execution, anomalies }, ...]
```

### Recharts — recommandation
Remplacer les charts CSS du proto par :
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
         LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';

// Couleurs
const COLORS = {
  budgets:  '#2D6A4F',   // vert recettes
  depenses: '#C04848',   // rouge dépenses
  ligne:    '#B8864A',   // or — trajectoire
};
```
- Tooltip : background `#fff`, border `var(--af-line-2)`, radius 6, mono pour les chiffres.
- Grid : pointillés `var(--af-line)`.
- Pas de border autour du chart, padding 16px.

### Export
- **CSV** : utiliser `frontend/src/utils/export.js` (déjà présent dans le projet) — un fichier par bloc (kpis.csv, evolution.csv, departements.csv) ou un seul ZIP.
- **PDF** : appel backend `GET /api/v1/rapports/export-pdf/?periode=12M` (à implémenter, utiliser `reportlab` côté Django).

---

## 6. Tokens spécifiques aux nouveaux écrans

Aucun nouveau token — tout est déjà dans `app.css`. Rappel des classes utiles :

| Besoin | Classe / token |
|--------|----------------|
| Card | `.af-card` + `.af-card-head` + `.af-card-body` |
| Table | `.af-table` (hover row tinté or) |
| Jauge ligne | `.af-bar` + `.af-bar-fill[.warn|.danger|.ok]` |
| Pills filtre | `.af-pill[.active]` |
| Tag méthode | `.af-tag-method` (mono, bordure or) |
| Badge statut | `<Badge status="draft|submit|approve|reject|close"/>` |
| Chip département | `<DeptChip idx={n}/>` |
| KPI | `.af-kpi` (label + val serif 28px + delta) |
| Action danger | `.af-btn .af-btn-danger` (rouge) |
| Action success | `.af-btn .af-btn-success` (vert) |

---

## 7. Routing React (à ajouter dans `frontend/src/App.jsx`)

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/budgets" element={<BudgetListPage />} />
  <Route path="/budgets/:id" element={<BudgetDetailPage />} />
  <Route path="/budgets/new" element={<BudgetCreatePage />} />
  <Route path="/depenses" element={<ExpenseListPage />} />
  <Route path="/depenses/:id" element={<ExpenseDetailPage />} />
  <Route path="/rapports" element={<ReportsPage />} />
</Route>
```

Tous protégés par `<ProtectedRoute>` (vérifie le JWT). `<RoleGate roles={[...]}>` autour des éléments soumis à permission.

---

## 8. Hooks TanStack Query suggérés

```ts
// frontend/src/api/hooks/budgets.ts
export const useBudgets = (filters) =>
  useQuery({ queryKey: ['budgets', filters], queryFn: () => api.budgets.list(filters) });

export const useBudget = (id) =>
  useQuery({ queryKey: ['budgets', id], queryFn: () => api.budgets.get(id), enabled: !!id });

export const useBudgetLignes = (id) =>
  useQuery({ queryKey: ['budgets', id, 'lignes'], queryFn: () => api.budgets.lignes(id) });

export const useApproveBudget = () =>
  useMutation({
    mutationFn: (id) => api.budgets.approuver(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['budgets']);
      queryClient.invalidateQueries(['budgets', id]);
      toast.success('Budget approuvé');
    },
  });

// Idem pour depenses, rapports
```

---

## 9. Tests recommandés

- **Backend (pytest + APIClient)** :
  - `test_budget_list_filtre_par_role` — un gestionnaire ne voit que ses budgets.
  - `test_validation_depense_motif_obligatoire` — POST `/rejeter/` sans motif → 400.
  - `test_rapport_kpis_calcul_coherent` — somme des départements = total global.
  - `test_audit_sur_validation_depense` — un LogAudit `APPROVE` est créé.
- **Frontend (Vitest + RTL)** :
  - Le filtre statut met à jour la query string et la liste.
  - Le bouton « Saisir une dépense » est masqué pour le comptable.
  - Le modal de rejet bloque la soumission si motif < 10 caractères.

---

## 10. Checklist d'implémentation

- [ ] Créer `frontend/src/pages/budgets/BudgetListPage.jsx`
- [ ] Créer `frontend/src/pages/budgets/BudgetDetailPage.jsx`
- [ ] Créer `frontend/src/pages/depenses/ExpenseDetailPage.jsx`
- [ ] Créer `frontend/src/pages/rapports/ReportsPage.jsx`
- [ ] Ajouter les routes dans `App.jsx`
- [ ] Ajouter les hooks TanStack Query (`api/hooks/budgets.ts`, `depenses.ts`, `rapports.ts`)
- [ ] Implémenter le bouton « Avis IA » → ouvre `<ChatbotDrawer>` prérempli
- [ ] Implémenter le modal `<RejectExpenseModal>` avec validation motif ≥ 10 car.
- [ ] Brancher exports CSV (existant) + PDF (à créer côté backend)
- [ ] Vérifier les permissions UI selon `user.role`
- [ ] Tests unitaires sur les calculs (taux exécution, couleur jauge)
- [ ] Tests E2E (Playwright) sur le flow Budget → Soumission → Validation → Dépense

---

## 11. Fichiers livrés dans cet ajout

```
design_handoff_atlas_finance/
├── README.md                              ← documentation principale
├── README_ECRANS_COMPLEMENTAIRES.md       ← CE FICHIER
└── prototype/
    ├── missing.html                       ← canvas pour visualiser les 4 écrans
    └── screens/
        └── missing.jsx                    ← BudgetList, BudgetDetail, ExpenseDetail, RapportsCombines
```

Pour lancer : `cd prototype/ && npx http-server . -p 8080` puis ouvrir `http://localhost:8080/missing.html`.
