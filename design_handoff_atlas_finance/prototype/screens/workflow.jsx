// Atlas Finance — Workflow screens: Budget Creation, Validation Detail, Expenses

function BudgetCreation() {
  const lines = [
    { type: "REVENU", lbl: "Subvention principale", amt: 157200000, cat: "Subvention" },
    { type: "REVENU", lbl: "Co-financement partenaires", amt: 39300000, cat: "Partenariats" },
    { type: "DEPENSE", lbl: "Salaires & charges équipe", amt: 93010000, cat: "Personnel" },
    { type: "DEPENSE", lbl: "Prestations externes", amt: 51352000, cat: "Externe" },
    { type: "DEPENSE", lbl: "Achats matériel & SaaS", amt: 21288000, cat: "Matériel" },
    { type: "DEPENSE", lbl: "Communication & événements", amt: 18340000, cat: "Comm." },
    { type: "DEPENSE", lbl: "Frais administratifs", amt: 6026000, cat: "Admin" },
  ];
  const tot = (t) => lines.filter(l => l.type === t).reduce((s, l) => s + l.amt, 0);
  return (
    <div className="af-app">
      <Sidebar active="budgets" role="Gestionnaire" user="Marc Dubois" initials="MD" />
      <Topbar crumb={["Pilotage", "Budgets", "Nouveau"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">Brouillon · Sauvegardé il y a 2 min</div>
            <h1 className="title">Création de budget</h1>
            <div className="sub">Renseignez les informations, ajoutez vos lignes, choisissez la méthode d'estimation.</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-ghost">Enregistrer brouillon</button>
            <button className="af-btn af-btn-outline">Aperçu</button>
            <button className="af-btn af-btn-gold">Soumettre au comptable →</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
          <div className="af-card">
            <div className="af-card-head"><div className="title">Lignes budgétaires</div><div className="right"><button className="af-btn af-btn-outline">{Icon.plus}Ajouter une ligne</button></div></div>
            <table className="af-table">
              <thead><tr><th>Type</th><th>Intitulé</th><th>Catégorie</th><th>Montant HT</th><th></th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td><span className="af-badge" style={{ background: l.type === "REVENU" ? "rgba(45,106,79,0.18)" : "rgba(192,72,72,0.15)", color: l.type === "REVENU" ? "#7DCFA0" : "#F5A0A0", borderColor: l.type === "REVENU" ? "rgba(45,106,79,0.5)" : "rgba(192,72,72,0.5)" }}>{l.type}</span></td>
                    <td>{l.lbl}</td>
                    <td className="muted">{l.cat}</td>
                    <td className="num">{l.amt.toLocaleString("fr")} FCFA</td>
                    <td><button className="af-btn af-btn-ghost">{Icon.more}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--af-line)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <div><div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--af-mute)" }}>Total recettes</div><div className="num" style={{ fontFamily: "var(--af-serif)", fontSize: 22, color: "#7DCFA0" }}>{tot("REVENU").toLocaleString("fr")} FCFA</div></div>
              <div><div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--af-mute)" }}>Total dépenses</div><div className="num" style={{ fontFamily: "var(--af-serif)", fontSize: 22, color: "#F5A0A0" }}>{tot("DEPENSE").toLocaleString("fr")} FCFA</div></div>
              <div><div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--af-mute)" }}>Solde prévisionnel</div><div className="num" style={{ fontFamily: "var(--af-serif)", fontSize: 22, color: "var(--af-gold)" }}>{(tot("REVENU") - tot("DEPENSE")).toLocaleString("fr")} FCFA</div></div>
            </div>
          </div>

          <div className="af-stack">
            <div className="af-card">
              <div className="af-card-head"><div className="title">Informations</div></div>
              <div className="af-card-body">
                <div className="af-form-group"><label>Intitulé du budget</label><input className="af-input" defaultValue="Campagne Q3 — Lancement Atlas v2"/></div>
                <div className="af-form-row">
                  <div className="af-form-group"><label>Département</label><select className="af-select"><option>Marketing</option></select></div>
                  <div className="af-form-group"><label>Exercice</label><select className="af-select"><option>2026 — T3</option></select></div>
                </div>
                <div className="af-form-group"><label>Description</label><textarea className="af-textarea" defaultValue="Budget alloué au lancement public de la version 2 d'Atlas, incluant production de contenus, salons spécialisés et campagne digitale ciblée DAF."/></div>
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Méthode d'estimation</div></div>
              <div className="af-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div className="af-pill" style={{ justifyContent: "center", padding: "10px 8px", textAlign: "center" }}>Analogie</div>
                  <div className="af-pill active" style={{ justifyContent: "center", padding: "10px 8px", textAlign: "center" }}>3 Points (PERT)</div>
                  <div className="af-pill" style={{ justifyContent: "center", padding: "10px 8px", textAlign: "center" }}>Ascendante</div>
                </div>
                <div style={{ marginTop: 16, padding: 14, background: "var(--af-ink)", borderRadius: 6, border: "1px solid var(--af-line)" }}>
                  <div className="af-eyebrow" style={{ marginBottom: 10 }}>Estimation pondérée (PERT)</div>
                  <div className="af-grid-3" style={{ gap: 10 }}>
                    <div><div style={{ fontSize: 10, color: "var(--af-mute)" }}>Optimiste</div><div className="num" style={{ fontFamily: "var(--af-mono)" }}>240 000</div></div>
                    <div><div style={{ fontSize: 10, color: "var(--af-mute)" }}>Plus probable</div><div className="num" style={{ fontFamily: "var(--af-mono)", color: "var(--af-gold)" }}>290 100</div></div>
                    <div><div style={{ fontSize: 10, color: "var(--af-mute)" }}>Pessimiste</div><div className="num" style={{ fontFamily: "var(--af-mono)" }}>340 000</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ValidationDetail() {
  return (
    <div className="af-app">
      <Sidebar active="validation" role="Comptable" user="Élise Renaud" initials="ER" />
      <Topbar crumb={["Workflow", "Validation", "BG-2026-009"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-flex" style={{ gap: 12, marginBottom: 6 }}>
              <span className="af-eyebrow" style={{ marginBottom: 0 }}>BG-2026-009</span>
              <Badge status="submit"/>
            </div>
            <h1 className="title">Recrutement T3 — Plan d'embauches</h1>
            <div className="sub">Soumis par Sophie Marin · Département RH · il y a 6h</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-danger">{Icon.reject}Rejeter</button>
            <button className="af-btn af-btn-success" style={{ background: "rgba(16,185,129,0.18)" }}>{Icon.check}Approuver</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
          <div className="af-stack">
            <div className="af-card">
              <div className="af-card-head"><div className="title">Détail des lignes</div><div className="right"><span className="af-tag-method">ANALOGIE</span></div></div>
              <table className="af-table">
                <thead><tr><th>Type</th><th>Intitulé</th><th>Catégorie</th><th className="num" style={{ textAlign: "right" }}>Montant</th></tr></thead>
                <tbody>
                  <tr><td><span className="af-badge submit">DEPENSE</span></td><td>Salaires bruts (5 ETP)</td><td className="muted">Personnel</td><td className="num">64 452 000 FCFA</td></tr>
                  <tr><td><span className="af-badge submit">DEPENSE</span></td><td>Charges patronales</td><td className="muted">Personnel</td><td className="num">20 436 000 FCFA</td></tr>
                  <tr><td><span className="af-badge submit">DEPENSE</span></td><td>Frais cabinets recrutement</td><td className="muted">Externe</td><td className="num">5 502 000 FCFA</td></tr>
                  <tr><td><span className="af-badge submit">DEPENSE</span></td><td>Onboarding & formation initiale</td><td className="muted">Formation</td><td className="num">2 620 000 FCFA</td></tr>
                </tbody>
              </table>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Justification</div></div>
              <div className="af-card-body" style={{ fontSize: 13.5, color: "var(--af-cream)", lineHeight: 1.7 }}>
                Plan d'embauches T3 nécessaire au regard de la croissance du portefeuille clients (+18% T2 vs T1) et de la nouvelle obligation de rotation 24/7 sur les comptes critiques. 5 ETP : 2 développeurs senior, 1 product designer, 1 customer success, 1 data analyst.
                <br/><br/>
                Coûts estimés par <strong style={{ color: "var(--af-ivory)" }}>analogie</strong> sur la base des recrutements 2025 (référentiel #BG-2025-141).
              </div>
            </div>
          </div>

          <div className="af-stack">
            <div className="af-card">
              <div className="af-card-head"><div className="title">Synthèse</div></div>
              <div className="af-card-body">
                <div className="af-flex-between" style={{ marginBottom: 14 }}><span style={{ color: "var(--af-cream)" }}>Total demandé</span><span className="num" style={{ fontFamily: "var(--af-serif)", fontSize: 22, color: "var(--af-gold)" }}>93 010 000 FCFA</span></div>
                <div className="af-flex-between" style={{ marginBottom: 14 }}><span style={{ color: "var(--af-cream)" }}>Enveloppe RH dispo.</span><span className="num">209 600 000 FCFA</span></div>
                <div className="af-flex-between" style={{ marginBottom: 6 }}><span style={{ fontSize: 11, color: "var(--af-mute)" }}>Impact sur l'enveloppe</span><span className="num" style={{ color: "var(--af-st-approve)" }}>44%</span></div>
                <div className="af-bar"><div className="af-bar-fill ok" style={{ width: "44%" }}></div></div>
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Avis IA Claude</div><div className="right">{Icon.sparkle}</div></div>
              <div className="af-card-body" style={{ fontSize: 12.5, color: "var(--af-ivory)", lineHeight: 1.65 }}>
                <div className="af-eyebrow" style={{ color: "var(--af-st-approve)", marginBottom: 8 }}>Recommandation : Approuver avec réserve</div>
                Cohérence des montants conforme aux référentiels 2024-2025. Aucune anomalie détectée. Toutefois, le ratio charges/salaires (31,7%) est légèrement supérieur à la moyenne des recrutements RH 2025 (28,4%) — vérifier les hypothèses.
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Historique</div></div>
              <div className="af-card-body" style={{ fontSize: 12 }}>
                <div className="af-flex" style={{ marginBottom: 10 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--af-st-submit)" }}></div><span style={{ color: "var(--af-cream)" }}>Soumis · S. Marin · il y a 6h</span></div>
                <div className="af-flex" style={{ marginBottom: 10 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--af-st-draft)" }}></div><span style={{ color: "var(--af-cream)" }}>Brouillon créé · S. Marin · il y a 3j</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ExpenseTracking() {
  return (
    <div className="af-app">
      <Sidebar active="depenses" role="Gestionnaire" user="Marc Dubois" initials="MD" />
      <Topbar crumb={["Pilotage", "Dépenses"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">47 dépenses · Mai 2026</div>
            <h1 className="title">Suivi des dépenses</h1>
            <div className="sub">Saisissez, joignez vos justificatifs, suivez les validations.</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-outline">{Icon.download}Exporter</button>
            <button className="af-btn af-btn-gold">{Icon.plus}Saisir une dépense</button>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">Engagé ce mois</div><div className="val">52,3<span className="unit"> M FCFA</span></div><div className="delta up">+12% vs mois dernier</div></div>
          <div className="af-kpi"><div className="lbl">Validé</div><div className="val">38,1<span className="unit"> M FCFA</span></div><div className="delta flat">28 dépenses</div></div>
          <div className="af-kpi"><div className="lbl">En attente</div><div className="val">11,4<span className="unit"> M FCFA</span></div><div className="delta flat">15 dépenses</div></div>
          <div className="af-kpi"><div className="lbl">Rejeté</div><div className="val">2,8<span className="unit"> M FCFA</span></div><div className="delta down">4 dépenses</div></div>
        </div>

        <div className="af-card">
          <div className="af-card-head">
            <div className="title">Toutes les dépenses</div>
            <div className="right">
              <span className="af-pill active">Tous</span>
              <span className="af-pill">Validés</span>
              <span className="af-pill">En attente</span>
              <span className="af-pill">Rejetés</span>
              <button className="af-btn af-btn-ghost">{Icon.filter}</button>
            </div>
          </div>
          <table className="af-table">
            <thead><tr><th>Date</th><th>Réf.</th><th>Libellé</th><th>Budget</th><th>PJ</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>
              <tr><td className="muted">28/05</td><td className="ref">DP-4421</td><td>Prestation agence Studio Mira</td><td className="muted">BG-2026-014</td><td>{Icon.paperclip}</td><td className="num">5 502 000 FCFA</td><td><Badge status="submit"/></td></tr>
              <tr><td className="muted">27/05</td><td className="ref">DP-4420</td><td>Licences SaaS Notion + Linear</td><td className="muted">BG-2026-011</td><td>{Icon.paperclip}</td><td className="num">1 866 800 FCFA</td><td><Badge status="submit"/></td></tr>
              <tr><td className="muted">26/05</td><td className="ref">DP-4419</td><td>Production vidéo institutionnelle</td><td className="muted">BG-2026-010</td><td>{Icon.paperclip}</td><td className="num">10 218 000 FCFA</td><td><Badge status="submit"/></td></tr>
              <tr><td className="muted">25/05</td><td className="ref">DP-4418</td><td>Voyage Salon DigiFinance Paris</td><td className="muted">BG-2026-012</td><td>{Icon.paperclip}</td><td className="num">812 200 FCFA</td><td><Badge status="approve"/></td></tr>
              <tr><td className="muted">24/05</td><td className="ref">DP-4417</td><td>Achat médias LinkedIn Ads</td><td className="muted">BG-2026-014</td><td>{Icon.paperclip}</td><td className="num">3 144 000 FCFA</td><td><Badge status="approve"/></td></tr>
              <tr><td className="muted">23/05</td><td className="ref">DP-4416</td><td>Prestation freelance copywriting</td><td className="muted">BG-2026-013</td><td>—</td><td className="num">2 096 000 FCFA</td><td><Badge status="reject"/></td></tr>
              <tr><td className="muted">22/05</td><td className="ref">DP-4415</td><td>Hébergement Vercel Pro</td><td className="muted">BG-2026-011</td><td>{Icon.paperclip}</td><td className="num">183 400 FCFA</td><td><Badge status="approve"/></td></tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { BudgetCreation, ValidationDetail, ExpenseTracking });
