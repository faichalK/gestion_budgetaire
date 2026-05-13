// Atlas Finance — Écrans complémentaires
// 14 · Budget list  · 15 · Budget detail  · 16 · Dépense detail  · 17 · Rapports

function BudgetList() {
  const rows = [
    ["BG-2026-014", "Campagne Q2 — Lancement produit",        1, "PERT",       "84 102 000",  "approve", "78%"],
    ["BG-2026-013", "Refonte site corporate",                  1, "ANALOGIE",   "40 937 500",  "approve", "42%"],
    ["BG-2026-012", "Salons & événements H2",                  1, "ASCENDANTE", "31 440 000",  "submit",  "0%"],
    ["BG-2026-011", "Outils SaaS marketing",                   1, "PERT",       "18 929 500",  "reject",  "—"],
    ["BG-2026-010", "Production contenu vidéo",                1, "ANALOGIE",   "22 925 000",  "draft",   "—"],
    ["BG-2026-009", "Recrutement T3 — Plan d'embauches",       3, "ANALOGIE",   "93 010 000",  "submit",  "—"],
    ["BG-2026-008", "Infrastructure cloud R&D",                2, "PERT",       "64 517 500",  "submit",  "—"],
    ["BG-2026-007", "Plan formation Q3",                       3, "ASCENDANTE", "24 104 000",  "submit",  "—"],
    ["BG-2026-006", "Refonte process opérations",              4, "ANALOGIE",   "46 636 000",  "approve", "31%"],
    ["BG-2026-005", "Audit conformité ISO",                    0, "ANALOGIE",   "12 580 000",  "close",   "100%"],
  ];
  return (
    <div className="af-app">
      <Sidebar active="budgets" role="Administrateur" user="Pauline Lefèvre" initials="PL"/>
      <Topbar crumb={["Pilotage", "Budgets"]}/>
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">Exercice 2026 · 38 budgets</div>
            <h1 className="title">Tous les budgets</h1>
            <div className="sub">Vue consolidée, tous départements et statuts confondus.</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-outline">{Icon.download}Exporter</button>
            <button className="af-btn af-btn-gold">{Icon.plus}Nouveau budget</button>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">{Icon.budget}Total alloué</div><div className="val">2,840<span className="unit"> M FCFA</span></div><div className="delta flat">38 budgets</div></div>
          <div className="af-kpi"><div className="lbl">Approuvés</div><div className="val">22</div><div className="delta up">58%</div></div>
          <div className="af-kpi"><div className="lbl">En attente</div><div className="val">8</div><div className="delta down">3 critiques</div></div>
          <div className="af-kpi"><div className="lbl">Brouillons / Rejetés</div><div className="val">8</div><div className="delta flat">action requise</div></div>
        </div>

        <div className="af-card">
          <div className="af-card-head">
            <div className="title">Liste des budgets</div>
            <div className="right">
              <span className="af-pill active">Tous</span>
              <span className="af-pill">Brouillons</span>
              <span className="af-pill">Soumis</span>
              <span className="af-pill">Approuvés</span>
              <span className="af-pill">Rejetés</span>
              <span className="af-pill">Clôturés</span>
              <button className="af-btn af-btn-ghost">{Icon.filter}</button>
            </div>
          </div>
          <table className="af-table">
            <thead><tr><th>Réf.</th><th>Intitulé</th><th>Département</th><th>Méthode</th><th>Montant</th><th>Exécution</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="ref">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td><DeptChip idx={r[2]}/></td>
                  <td><span className="af-tag-method">{r[3]}</span></td>
                  <td className="num">{r[4]} FCFA</td>
                  <td>
                    {r[6] === "—" ? <span className="muted">—</span> : (
                      <div className="af-flex" style={{ gap: 8 }}>
                        <div className="af-bar" style={{ width: 80 }}>
                          <div className={`af-bar-fill ${parseInt(r[6]) > 85 ? "danger" : parseInt(r[6]) > 70 ? "warn" : ""}`} style={{ width: r[6] }}></div>
                        </div>
                        <span className="num" style={{ fontSize: 11 }}>{r[6]}</span>
                      </div>
                    )}
                  </td>
                  <td><Badge status={r[5]}/></td>
                  <td><button className="af-btn af-btn-ghost">{Icon.arrow}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function BudgetDetail() {
  const lines = [
    { type: "REVENU",  lbl: "Subvention principale",         cat: "Subvention",   alloue: 60000000, conso: 60000000 },
    { type: "REVENU",  lbl: "Co-financement partenaires",    cat: "Partenariats", alloue: 24102000, conso: 18000000 },
    { type: "DEPENSE", lbl: "Production agence Studio Mira", cat: "Externe",      alloue: 38400000, conso: 30201000 },
    { type: "DEPENSE", lbl: "Médias LinkedIn + Meta Ads",    cat: "Comm.",        alloue: 22500000, conso: 21420000 },
    { type: "DEPENSE", lbl: "Salons & événements H1",        cat: "Comm.",        alloue: 12000000, conso:  6280000 },
    { type: "DEPENSE", lbl: "Production vidéo institut.",    cat: "Externe",      alloue:  8200000, conso:  4400000 },
    { type: "DEPENSE", lbl: "Imprévus (10%)",                cat: "Contingence",  alloue:  3002000, conso:        0 },
  ];
  const totRev  = lines.filter(l => l.type === "REVENU").reduce((s, l) => s + l.alloue, 0);
  const totDep  = lines.filter(l => l.type === "DEPENSE").reduce((s, l) => s + l.alloue, 0);
  const consoDep = lines.filter(l => l.type === "DEPENSE").reduce((s, l) => s + l.conso, 0);
  return (
    <div className="af-app">
      <Sidebar active="budgets" role="Gestionnaire" user="Marc Dubois" initials="MD"/>
      <Topbar crumb={["Pilotage", "Budgets", "BG-2026-014"]}/>
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-flex" style={{ gap: 12, marginBottom: 6 }}>
              <span className="af-eyebrow" style={{ marginBottom: 0 }}>BG-2026-014 · Marketing · Exercice 2026 T2</span>
              <Badge status="approve"/>
              <span className="af-tag-method">PERT</span>
            </div>
            <h1 className="title">Campagne Q2 — Lancement produit</h1>
            <div className="sub">Approuvé par Élise Renaud · il y a 12 jours · 4 dépenses engagées</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-outline">{Icon.download}Exporter PDF</button>
            <button className="af-btn af-btn-outline">{Icon.sparkle}Avis IA</button>
            <button className="af-btn af-btn-gold">{Icon.plus}Saisir une dépense</button>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">Allocation totale</div><div className="val">84,1<span className="unit"> M FCFA</span></div><div className="delta flat">7 lignes</div></div>
          <div className="af-kpi"><div className="lbl">Engagé</div><div className="val">62,3<span className="unit"> M FCFA</span></div><div className="delta up">74%</div></div>
          <div className="af-kpi"><div className="lbl">Disponible</div><div className="val">21,8<span className="unit"> M FCFA</span></div><div className="delta flat">26%</div></div>
          <div className="af-kpi"><div className="lbl">Dépenses</div><div className="val">12</div><div className="delta down">2 en attente</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
          <div className="af-stack">
            <div className="af-card">
              <div className="af-card-head">
                <div className="title">Lignes budgétaires</div>
                <div className="sub">Recettes · {totRev.toLocaleString("fr")} · Dépenses · {totDep.toLocaleString("fr")}</div>
              </div>
              <table className="af-table">
                <thead><tr><th>Type</th><th>Intitulé</th><th>Catégorie</th><th className="num">Alloué</th><th className="num">Consommé</th><th>Exécution</th></tr></thead>
                <tbody>
                  {lines.map((l, i) => {
                    const pct = l.alloue ? Math.round(l.conso / l.alloue * 100) : 0;
                    return (
                      <tr key={i}>
                        <td><span className="af-badge" style={{ background: l.type === "REVENU" ? "rgba(45,106,79,0.18)" : "rgba(192,72,72,0.15)", color: l.type === "REVENU" ? "#7DCFA0" : "#F5A0A0", borderColor: l.type === "REVENU" ? "rgba(45,106,79,0.5)" : "rgba(192,72,72,0.5)" }}>{l.type}</span></td>
                        <td>{l.lbl}</td>
                        <td className="muted">{l.cat}</td>
                        <td className="num">{l.alloue.toLocaleString("fr")}</td>
                        <td className="num">{l.conso.toLocaleString("fr")}</td>
                        <td>
                          <div className="af-flex" style={{ gap: 8 }}>
                            <div className="af-bar" style={{ width: 70 }}><div className={`af-bar-fill ${pct > 85 ? "danger" : pct > 70 ? "warn" : ""}`} style={{ width: `${pct}%` }}></div></div>
                            <span className="num" style={{ fontSize: 11 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Dépenses imputées</div><div className="sub">12 au total · 4 dernières</div></div>
              <table className="af-table">
                <thead><tr><th>Date</th><th>Réf.</th><th>Libellé</th><th>Ligne</th><th className="num">Montant</th><th>Statut</th></tr></thead>
                <tbody>
                  <tr><td className="muted">28/05</td><td className="ref">DP-4421</td><td>Prestation agence Studio Mira</td><td className="muted">Production agence</td><td className="num">5 502 000 FCFA</td><td><Badge status="submit"/></td></tr>
                  <tr><td className="muted">24/05</td><td className="ref">DP-4417</td><td>Achat médias LinkedIn Ads</td><td className="muted">Médias</td><td className="num">3 144 000 FCFA</td><td><Badge status="approve"/></td></tr>
                  <tr><td className="muted">21/05</td><td className="ref">DP-4413</td><td>Spot vidéo digital</td><td className="muted">Production vidéo</td><td className="num">4 400 000 FCFA</td><td><Badge status="approve"/></td></tr>
                  <tr><td className="muted">18/05</td><td className="ref">DP-4408</td><td>Plateforme événement Q2</td><td className="muted">Salons</td><td className="num">6 280 000 FCFA</td><td><Badge status="approve"/></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="af-stack">
            <div className="af-card">
              <div className="af-card-head"><div className="title">Synthèse</div></div>
              <div className="af-card-body">
                <div className="af-flex-between" style={{ marginBottom: 14 }}>
                  <span style={{ color: "var(--af-cream)" }}>Solde prévisionnel</span>
                  <span className="num" style={{ fontFamily: "var(--af-serif)", fontSize: 22, color: "var(--af-gold)" }}>{(totRev - totDep).toLocaleString("fr")} FCFA</span>
                </div>
                <div className="af-flex-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--af-mute)" }}>Consommation dépenses</span>
                  <span className="num">{Math.round(consoDep / totDep * 100)}%</span>
                </div>
                <div className="af-bar"><div className="af-bar-fill warn" style={{ width: `${Math.round(consoDep / totDep * 100)}%` }}></div></div>
                <div className="af-divider"></div>
                <div className="af-flex-between" style={{ fontSize: 12, color: "var(--af-cream)" }}>
                  <span>Engagé</span><span className="num">{consoDep.toLocaleString("fr")} FCFA</span>
                </div>
                <div className="af-flex-between" style={{ fontSize: 12, color: "var(--af-cream)", marginTop: 6 }}>
                  <span>Disponible</span><span className="num">{(totDep - consoDep).toLocaleString("fr")} FCFA</span>
                </div>
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Workflow</div></div>
              <div className="af-card-body" style={{ fontSize: 12 }}>
                <div className="af-flex" style={{ marginBottom: 10 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--af-st-approve)" }}></div><span style={{ color: "var(--af-cream)" }}>Approuvé · É. Renaud · 17/05</span></div>
                <div className="af-flex" style={{ marginBottom: 10 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--af-st-submit)" }}></div><span style={{ color: "var(--af-cream)" }}>Soumis · M. Dubois · 16/05</span></div>
                <div className="af-flex"><div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--af-st-draft)" }}></div><span style={{ color: "var(--af-cream)" }}>Brouillon · M. Dubois · 12/05</span></div>
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Pièces jointes</div></div>
              <div className="af-card-body" style={{ fontSize: 12 }}>
                <div className="af-flex" style={{ gap: 8, marginBottom: 10 }}>{Icon.paperclip}<span>justification_BG-2026-014.pdf</span></div>
                <div className="af-flex" style={{ gap: 8 }}>{Icon.paperclip}<span>devis_studio_mira.pdf</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ExpenseDetail() {
  return (
    <div className="af-app">
      <Sidebar active="depenses" role="Comptable" user="Élise Renaud" initials="ER"/>
      <Topbar crumb={["Pilotage", "Dépenses", "DP-4421"]}/>
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-flex" style={{ gap: 12, marginBottom: 6 }}>
              <span className="af-eyebrow" style={{ marginBottom: 0 }}>DP-4421 · Saisie le 28/05/2026</span>
              <Badge status="submit"/>
            </div>
            <h1 className="title">Prestation agence Studio Mira</h1>
            <div className="sub">Saisie par Marc Dubois · Marketing · imputée sur BG-2026-014</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-danger">{Icon.reject}Rejeter</button>
            <button className="af-btn af-btn-success">{Icon.check}Valider la dépense</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
          <div className="af-stack">
            <div className="af-card">
              <div className="af-card-head"><div className="title">Détail de la dépense</div></div>
              <div className="af-card-body">
                <div className="af-grid-2">
                  <div className="af-form-group"><label>Référence</label><div className="num" style={{ fontFamily: "var(--af-mono)" }}>DP-4421</div></div>
                  <div className="af-form-group"><label>Date d'engagement</label><div>28 mai 2026</div></div>
                  <div className="af-form-group"><label>Budget rattaché</label><div><span className="ref" style={{ fontFamily: "var(--af-mono)", color: "var(--af-gold)" }}>BG-2026-014</span> · Campagne Q2</div></div>
                  <div className="af-form-group"><label>Ligne budgétaire</label><div>Production agence Studio Mira</div></div>
                  <div className="af-form-group"><label>Catégorie</label><div className="muted">Externe · Production</div></div>
                  <div className="af-form-group"><label>Montant HT</label><div className="num" style={{ fontFamily: "var(--af-serif)", fontSize: 22, color: "var(--af-gold)" }}>5 502 000 FCFA</div></div>
                </div>
                <div className="af-divider"></div>
                <div className="af-form-group" style={{ marginBottom: 0 }}>
                  <label>Description</label>
                  <div style={{ fontSize: 13, color: "var(--af-cream)", lineHeight: 1.6 }}>
                    Prestation de production audiovisuelle pour le spot de lancement Atlas v2 — tournage 2 jours, montage, motion design, livrables 16:9 + 9:16. Devis #DV-3092 du 22/05.
                  </div>
                </div>
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Pièces justificatives</div><div className="sub">2 fichiers · 1,8 Mo</div></div>
              <div className="af-card-body">
                <div className="af-flex" style={{ gap: 10, padding: "10px 12px", border: "1px solid var(--af-line)", borderRadius: 6, marginBottom: 8 }}>
                  {Icon.paperclip}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>facture_studio_mira_05-2026.pdf</div>
                    <div style={{ fontSize: 11, color: "var(--af-cream)" }}>1,2 Mo · ajouté il y a 2h</div>
                  </div>
                  <button className="af-btn af-btn-ghost">{Icon.download}</button>
                </div>
                <div className="af-flex" style={{ gap: 10, padding: "10px 12px", border: "1px solid var(--af-line)", borderRadius: 6 }}>
                  {Icon.paperclip}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>devis_DV-3092.pdf</div>
                    <div style={{ fontSize: 11, color: "var(--af-cream)" }}>620 Ko · ajouté il y a 6j</div>
                  </div>
                  <button className="af-btn af-btn-ghost">{Icon.download}</button>
                </div>
              </div>
            </div>
          </div>

          <div className="af-stack">
            <div className="af-card">
              <div className="af-card-head"><div className="title">Impact sur le budget</div></div>
              <div className="af-card-body">
                <div className="af-flex-between" style={{ marginBottom: 10 }}><span style={{ color: "var(--af-cream)" }}>Ligne · Production agence</span></div>
                <div className="af-flex-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--af-mute)" }}>Avant · 65%</span>
                  <span style={{ fontSize: 11, color: "var(--af-mute)" }}>Après · 79%</span>
                </div>
                <div className="af-bar"><div className="af-bar-fill warn" style={{ width: "79%" }}></div></div>
                <div className="af-divider"></div>
                <div className="af-flex-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--af-cream)" }}>Disponible après validation</span>
                  <span className="num">8 199 000 FCFA</span>
                </div>
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Avis IA Claude</div><div className="right">{Icon.sparkle}</div></div>
              <div className="af-card-body" style={{ fontSize: 12.5, color: "var(--af-ivory)", lineHeight: 1.65 }}>
                <div className="af-eyebrow" style={{ color: "var(--af-st-approve)", marginBottom: 8 }}>Aucune anomalie</div>
                Montant cohérent avec les prestations agence du même type sur 2025 (médiane 4,9 M FCFA). Justificatifs complets et conformes.
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Historique</div></div>
              <div className="af-card-body" style={{ fontSize: 12 }}>
                <div className="af-flex" style={{ marginBottom: 10 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--af-st-submit)" }}></div><span style={{ color: "var(--af-cream)" }}>Soumise · M. Dubois · il y a 2h</span></div>
                <div className="af-flex"><div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--af-st-draft)" }}></div><span style={{ color: "var(--af-cream)" }}>Saisie · M. Dubois · il y a 2h</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RapportsCombines() {
  return (
    <div className="af-app">
      <Sidebar active="kpi" role="Administrateur" user="Pauline Lefèvre" initials="PL"/>
      <Topbar crumb={["Intelligence", "Rapports"]}/>
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">Rapport consolidé · Budgets × Dépenses</div>
            <h1 className="title">Rapports combinés</h1>
            <div className="sub">Vue croisée de l'allocation, de l'exécution et du reste-à-engager.</div>
          </div>
          <div className="actions">
            <span className="af-pill">3M</span>
            <span className="af-pill active">12M</span>
            <span className="af-pill">YTD</span>
            <button className="af-btn af-btn-outline">{Icon.download}PDF</button>
            <button className="af-btn af-btn-outline">{Icon.download}CSV</button>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">{Icon.budget}Budgets alloués</div><div className="val">2,840<span className="unit"> M FCFA</span></div><div className="delta flat">38 budgets</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.expense}Dépenses validées</div><div className="val">1,612<span className="unit"> M FCFA</span></div><div className="delta up">56,8%</div></div>
          <div className="af-kpi"><div className="lbl">Reste à engager</div><div className="val">1,228<span className="unit"> M FCFA</span></div><div className="delta flat">43,2%</div></div>
          <div className="af-kpi"><div className="lbl">Écart vs prévision</div><div className="val">-2,4<span className="unit">%</span></div><div className="delta up">sous budget</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="af-card">
            <div className="af-card-head"><div className="title">Budgets vs Dépenses · 12 mois</div></div>
            <div className="af-card-body" style={{ paddingTop: 8 }}>
              <BarChart
                data={[[180, 220], [210, 240], [195, 245], [240, 280], [275, 300], [260, 320], [310, 340], [290, 360], [320, 345], [340, 380], [365, 395], [380, 410]]}
                labels={["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"]}
              />
              <div className="af-legend" style={{ marginTop: 10 }}>
                <div className="item"><span className="dot" style={{ background: "#C04848" }}></span>Dépenses validées</div>
                <div className="item"><span className="dot" style={{ background: "#2D6A4F" }}></span>Budgets alloués</div>
              </div>
            </div>
          </div>
          <div className="af-card">
            <div className="af-card-head"><div className="title">Trajectoire d'exécution</div></div>
            <div className="af-card-body"><LineChart data={[12, 18, 26, 32, 39, 45, 50, 54, 58, 62, 65, 68]} height={200}/></div>
          </div>
        </div>

        <div className="af-card">
          <div className="af-card-head">
            <div className="title">Croisement Budget × Dépense par département</div>
            <div className="right"><button className="af-btn af-btn-ghost">{Icon.filter}Filtrer</button></div>
          </div>
          <table className="af-table">
            <thead><tr><th>Département</th><th>Budgets</th><th className="num">Alloué</th><th className="num">Engagé</th><th className="num">Validé</th><th className="num">Reste</th><th>Exécution</th><th>Anomalies</th></tr></thead>
            <tbody>
              {[["Direction Générale", 4, 620, 412, 380, 240, 61, 1],
                ["Marketing",          9, 480, 321, 295, 185, 61, 8],
                ["R&D",                7, 540, 491, 460,  80, 85, 12],
                ["Ressources Humaines",6, 320, 174, 162, 158, 51,  3],
                ["Opérations",         8, 280, 204, 195,  85, 70,  6],
                ["Communication",      4, 240, 152, 140, 100, 58,  2]].map((r, i) => (
                <tr key={i}>
                  <td><DeptChip idx={i}/></td>
                  <td className="num">{r[1]}</td>
                  <td className="num">{r[2]} M</td>
                  <td className="num">{r[3]} M</td>
                  <td className="num">{r[4]} M</td>
                  <td className="num muted">{r[5]} M</td>
                  <td>
                    <div className="af-flex" style={{ gap: 8 }}>
                      <div className="af-bar" style={{ width: 80 }}><div className={`af-bar-fill ${r[6] > 85 ? "danger" : r[6] > 70 ? "warn" : ""}`} style={{ width: `${r[6]}%` }}></div></div>
                      <span className="num" style={{ fontSize: 11 }}>{r[6]}%</span>
                    </div>
                  </td>
                  <td className="num" style={{ color: r[7] > 5 ? "#FCA5A5" : "var(--af-cream)" }}>{r[7]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { BudgetList, BudgetDetail, ExpenseDetail, RapportsCombines });
