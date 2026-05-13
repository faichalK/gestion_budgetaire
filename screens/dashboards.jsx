// Atlas Finance — Dashboards (Admin / Gestionnaire / Comptable) + Login

function DashboardAdmin() {
  return (
    <div className="af-app">
      <Sidebar active="dashboard" role="Administrateur" user="Pauline Lefèvre" initials="PL" />
      <Topbar crumb={["Pilotage", "Tableau de bord", "Vue Administrateur"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">Exercice 2026 · T2</div>
            <h1 className="title">Vue d'ensemble exécutive</h1>
            <div className="sub">Allocations consolidées et exécution sur les 6 départements actifs.</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-outline">{Icon.download}Exporter</button>
            <button className="af-btn af-btn-gold">{Icon.plus}Nouveau budget</button>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">{Icon.budget}Allocation totale</div><div className="val">2,840<span className="unit"> M FCFA</span></div><div className="delta up">▲ 8,2% vs T1</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.expense}Dépenses engagées</div><div className="val">1,612<span className="unit"> M FCFA</span></div><div className="delta flat">56,8% du budget</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.validate}En attente</div><div className="val">8</div><div className="delta down">3 délais critiques</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.ai}Anomalies IA</div><div className="val">3</div><div className="delta up">Détectées cette semaine</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="af-card">
            <div className="af-card-head">
              <div className="title">Évolution mensuelle</div><div className="sub">Recettes vs dépenses</div>
              <div className="right"><span className="af-pill active">12 mois</span><span className="af-pill">YTD</span></div>
            </div>
            <div className="af-card-body" style={{ paddingTop: 8 }}>
              <BarChart
                data={[[180, 120], [210, 140], [195, 165], [240, 180], [275, 200], [260, 220], [310, 240], [290, 260], [320, 245], [340, 280], [365, 295], [380, 310]]}
                labels={["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]}
              />
              <div className="af-legend" style={{ marginTop: 10 }}>
                <div className="item"><span className="dot" style={{ background: "#C04848" }}></span>Dépenses</div>
                <div className="item"><span className="dot" style={{ background: "#2D6A4F" }}></span>Recettes</div>
              </div>
            </div>
          </div>
          <div className="af-card">
            <div className="af-card-head"><div className="title">Allocation par département</div></div>
            <div className="af-card-body">
              {DEPTS.slice(0, 5).map((d, i) => {
                const pct = [82, 67, 91, 54, 73][i];
                const amt = [620, 480, 540, 320, 280][i];
                return (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div className="af-flex-between" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12 }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: d.color, marginRight: 8 }}></span>
                        {d.name}
                      </span>
                      <span className="af-table" style={{ fontSize: 11, color: "var(--af-cream)" }}>
                        <span style={{ fontFamily: "var(--af-mono)" }}>{amt} M FCFA</span>
                        <span style={{ marginLeft: 8, color: pct > 85 ? "#FCA5A5" : "var(--af-gold)" }}>{pct}%</span>
                      </span>
                    </div>
                    <div className="af-bar"><div className={`af-bar-fill ${pct > 85 ? "danger" : pct > 70 ? "warn" : ""}`} style={{ width: `${pct}%` }}></div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="af-card">
          <div className="af-card-head">
            <div className="title">Alertes & anomalies</div>
            <div className="right"><button className="af-btn af-btn-ghost">Voir tout</button></div>
          </div>
          <table className="af-table">
            <thead><tr><th>Réf.</th><th>Type</th><th>Département</th><th>Détecté</th><th>Sévérité</th><th></th></tr></thead>
            <tbody>
              <tr><td className="ref">#A-2814</td><td>Dépassement enveloppe</td><td><DeptChip idx={2}/></td><td className="muted">il y a 2h</td><td><span className="af-badge reject">Critique</span></td><td><button className="af-btn af-btn-ghost">{Icon.arrow}</button></td></tr>
              <tr><td className="ref">#A-2813</td><td>Dépense atypique</td><td><DeptChip idx={1}/></td><td className="muted">il y a 5h</td><td><span className="af-badge submit">Modérée</span></td><td><button className="af-btn af-btn-ghost">{Icon.arrow}</button></td></tr>
              <tr><td className="ref">#A-2811</td><td>Ratio suspect</td><td><DeptChip idx={4}/></td><td className="muted">hier</td><td><span className="af-badge submit">Modérée</span></td><td><button className="af-btn af-btn-ghost">{Icon.arrow}</button></td></tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function DashboardGestionnaire() {
  return (
    <div className="af-app">
      <Sidebar active="budgets" role="Gestionnaire" user="Marc Dubois" initials="MD" />
      <Topbar crumb={["Pilotage", "Mes budgets"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">Département · Marketing</div>
            <h1 className="title">Mes budgets en cours</h1>
            <div className="sub">5 budgets actifs · 12 dépenses ce mois.</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-outline">{Icon.filter}Filtres</button>
            <button className="af-btn af-btn-gold">{Icon.plus}Créer un budget</button>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">{Icon.budget}Enveloppe allouée</div><div className="val">480<span className="unit"> M FCFA</span></div><div className="delta flat">Exercice 2026</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.expense}Engagé</div><div className="val">321<span className="unit"> M FCFA</span></div><div className="delta up">66,9%</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.validate}À soumettre</div><div className="val">2</div><div className="delta flat">Brouillons</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.audit}Refusés</div><div className="val">1</div><div className="delta down">Action requise</div></div>
        </div>

        <div className="af-card">
          <div className="af-card-head">
            <div className="title">Budgets actifs</div>
            <div className="right">
              <span className="af-pill active">Tous</span>
              <span className="af-pill">Brouillons</span>
              <span className="af-pill">Soumis</span>
              <span className="af-pill">Approuvés</span>
            </div>
          </div>
          <table className="af-table">
            <thead><tr><th>Réf.</th><th>Intitulé</th><th>Méthode</th><th>Montant</th><th>Exécution</th><th>Statut</th><th>Modifié</th></tr></thead>
            <tbody>
              <tr><td className="ref">BG-2026-014</td><td>Campagne Q2 — Lancement produit</td><td><span className="af-tag-method">PERT</span></td><td className="num">84 102 000 FCFA</td><td><div className="af-bar" style={{ width: 100 }}><div className="af-bar-fill warn" style={{ width: "78%" }}></div></div></td><td><Badge status="approve"/></td><td className="muted">il y a 2j</td></tr>
              <tr><td className="ref">BG-2026-013</td><td>Refonte site corporate</td><td><span className="af-tag-method">ANALOGIE</span></td><td className="num">40 937 500 FCFA</td><td><div className="af-bar" style={{ width: 100 }}><div className="af-bar-fill" style={{ width: "42%" }}></div></div></td><td><Badge status="approve"/></td><td className="muted">il y a 5j</td></tr>
              <tr><td className="ref">BG-2026-012</td><td>Salons & événements H2</td><td><span className="af-tag-method">ASCENDANTE</span></td><td className="num">31 440 000 FCFA</td><td><div className="af-bar" style={{ width: 100 }}><div className="af-bar-fill" style={{ width: "0%" }}></div></div></td><td><Badge status="submit"/></td><td className="muted">il y a 1j</td></tr>
              <tr><td className="ref">BG-2026-011</td><td>Outils SaaS marketing</td><td><span className="af-tag-method">PERT</span></td><td className="num">18 929 500 FCFA</td><td>—</td><td><Badge status="reject"/></td><td className="muted">il y a 3j</td></tr>
              <tr><td className="ref">BG-2026-010</td><td>Production contenu vidéo</td><td><span className="af-tag-method">ANALOGIE</span></td><td className="num">22 925 000 FCFA</td><td>—</td><td><Badge status="draft"/></td><td className="muted">aujourd'hui</td></tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function DashboardComptable() {
  return (
    <div className="af-app">
      <Sidebar active="validation" role="Comptable" user="Élise Renaud" initials="ER" />
      <Topbar crumb={["Workflow", "Validation"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">File de validation · 8 en attente</div>
            <h1 className="title">À traiter aujourd'hui</h1>
            <div className="sub">Ordre par ancienneté de soumission. Délai moyen : 1,3 jour.</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-outline">{Icon.filter}Tous les départements</button>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">{Icon.validate}Budgets à approuver</div><div className="val">5</div><div className="delta down">2 critiques</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.expense}Dépenses à valider</div><div className="val">23</div><div className="delta flat">12 ce matin</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.audit}Approuvés cette semaine</div><div className="val">47</div><div className="delta up">+12% vs sem. dernière</div></div>
          <div className="af-kpi"><div className="lbl">{Icon.kpi}Taux de rejet</div><div className="val">8,2<span className="unit">%</span></div><div className="delta flat">stable</div></div>
        </div>

        <div className="af-card" style={{ marginBottom: 14 }}>
          <div className="af-card-head"><div className="title">Budgets en attente d'approbation</div></div>
          <table className="af-table">
            <thead><tr><th>Soumis</th><th>Réf.</th><th>Intitulé</th><th>Gestionnaire</th><th>Département</th><th>Montant</th><th></th></tr></thead>
            <tbody>
              <tr><td className="muted">il y a 3h</td><td className="ref">BG-2026-012</td><td>Salons & événements H2</td><td>Marc Dubois</td><td><DeptChip idx={1}/></td><td className="num">31 440 000 FCFA</td><td><button className="af-btn af-btn-outline">Examiner →</button></td></tr>
              <tr><td className="muted">il y a 6h</td><td className="ref">BG-2026-009</td><td>Recrutement T3</td><td>Sophie Marin</td><td><DeptChip idx={3}/></td><td className="num">93 010 000 FCFA</td><td><button className="af-btn af-btn-outline">Examiner →</button></td></tr>
              <tr><td className="muted">hier</td><td className="ref">BG-2026-008</td><td>Infrastructure cloud R&D</td><td>Hugo Leclerc</td><td><DeptChip idx={2}/></td><td className="num">64 517 500 FCFA</td><td><button className="af-btn af-btn-outline">Examiner →</button></td></tr>
              <tr><td className="muted">hier</td><td className="ref">BG-2026-007</td><td>Plan formation Q3</td><td>Sophie Marin</td><td><DeptChip idx={3}/></td><td className="num">24 104 000 FCFA</td><td><button className="af-btn af-btn-outline">Examiner →</button></td></tr>
              <tr><td className="muted">2j</td><td className="ref">BG-2026-006</td><td>Refonte process opérations</td><td>Léa Bernard</td><td><DeptChip idx={4}/></td><td className="num">46 636 000 FCFA</td><td><button className="af-btn af-btn-outline">Examiner →</button></td></tr>
            </tbody>
          </table>
        </div>

        <div className="af-card">
          <div className="af-card-head"><div className="title">Dépenses à valider</div><div className="sub">Top 5</div></div>
          <table className="af-table">
            <thead><tr><th>Réf.</th><th>Libellé</th><th>Budget</th><th>Pièce</th><th>Montant</th><th></th></tr></thead>
            <tbody>
              <tr><td className="ref">DP-4421</td><td>Prestation agence Studio Mira</td><td className="muted">BG-2026-014</td><td>{Icon.paperclip}<span className="muted" style={{ marginLeft: 6 }}>facture.pdf</span></td><td className="num">5 502 000 FCFA</td><td><div className="af-flex"><button className="af-btn af-btn-success">{Icon.check}</button><button className="af-btn af-btn-danger">{Icon.reject}</button></div></td></tr>
              <tr><td className="ref">DP-4420</td><td>Licences SaaS Notion + Linear</td><td className="muted">BG-2026-011</td><td>{Icon.paperclip}<span className="muted" style={{ marginLeft: 6 }}>recu.pdf</span></td><td className="num">1 866 800 FCFA</td><td><div className="af-flex"><button className="af-btn af-btn-success">{Icon.check}</button><button className="af-btn af-btn-danger">{Icon.reject}</button></div></td></tr>
              <tr><td className="ref">DP-4419</td><td>Production vidéo institutionnelle</td><td className="muted">BG-2026-010</td><td>{Icon.paperclip}<span className="muted" style={{ marginLeft: 6 }}>devis.pdf</span></td><td className="num">10 218 000 FCFA</td><td><div className="af-flex"><button className="af-btn af-btn-success">{Icon.check}</button><button className="af-btn af-btn-danger">{Icon.reject}</button></div></td></tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function LoginScreen() {
  return (
    <div className="af-login">
      <div className="af-login-left">
        <div style={{ fontFamily: "var(--af-serif)", fontSize: 22, color: "var(--af-gold)" }}>Atlas Finance</div>
        <div>
          <div className="af-login-quote">Le budget n'est pas une contrainte — c'est l'expression chiffrée d'une stratégie.</div>
          <div className="af-login-attrib">— Manuel de gouvernance financière, 2026</div>
        </div>
        <div style={{ fontFamily: "var(--af-mono)", fontSize: 11, color: "var(--af-cream)", opacity: .6 }}>
          v 2.4.1 · Hébergé en UE · ISO 27001
        </div>
      </div>
      <div className="af-login-right">
        <div className="af-login-form">
          <div className="af-eyebrow">Espace sécurisé · JWT + Argon2</div>
          <h2>Connexion</h2>
          <div className="lead">Accédez à votre espace de pilotage budgétaire.</div>

          <div className="af-form-group">
            <label>Identifiant</label>
            <input className="af-input" defaultValue="p.lefevre@atlasfinance.fr" />
          </div>
          <div className="af-form-group">
            <label>Mot de passe</label>
            <input className="af-input" type="password" defaultValue="••••••••••" />
          </div>
          <button className="af-btn af-btn-gold" style={{ width: "100%", justifyContent: "center", padding: "12px" }}>Se connecter →</button>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "var(--af-cream)" }}>
            <a style={{ color: "var(--af-gold)" }}>Mot de passe oublié ?</a>
          </div>

          <div className="af-login-roles">
            <div className="af-login-role active">Admin</div>
            <div className="af-login-role">Gestionnaire</div>
            <div className="af-login-role">Comptable</div>
          </div>
          <div style={{ fontSize: 10, color: "var(--af-mute)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
            Comptes démo pré-créés · Données fictives uniquement
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardAdmin, DashboardGestionnaire, DashboardComptable, LoginScreen });
