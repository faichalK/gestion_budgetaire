// Atlas Finance — IA Chatbot, Audit Log, KPI Analytics, Users, Settings

function ChatbotIA() {
  return (
    <div className="af-app">
      <Sidebar active="ia" role="Administrateur" user="Pauline Lefèvre" initials="PL" />
      <Topbar crumb={["Intelligence", "Assistant IA"]} />
      <main className="af-main" style={{ paddingRight: 0, position: "relative" }}>
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">Claude 3.5 Sonnet · Connecté</div>
            <h1 className="title">Analyse en cours · BG-2026-014</h1>
            <div className="sub">L'assistant analyse vos données financières en temps réel, avec sources tracées.</div>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">{Icon.sparkle}Analyses ce mois</div><div className="val">142</div><div className="delta up">+24% vs avr.</div></div>
          <div className="af-kpi"><div className="lbl">Anomalies détectées</div><div className="val">11</div><div className="delta down">7 critiques</div></div>
          <div className="af-kpi"><div className="lbl">Précision modèle</div><div className="val">94,2<span className="unit">%</span></div><div className="delta up">stable</div></div>
          <div className="af-kpi"><div className="lbl">Économies estimées</div><div className="val">86<span className="unit"> M FCFA</span></div><div className="delta up">YTD</div></div>
        </div>

        <div className="af-card">
          <div className="af-card-head"><div className="title">Suggestions récentes</div></div>
          <div className="af-card-body">
            <div className="af-anomaly"><div className="head">Anomalie · Marketing</div>Pic de dépenses média +47% sur le 24/05. Cause probable : campagne LinkedIn doublée par erreur. Suggestion : pauser DP-4417.</div>
            <div className="af-anomaly" style={{ borderColor: "rgba(229,165,61,0.4)", background: "rgba(229,165,61,0.08)" }}><div className="head" style={{ color: "#E5A53D" }}>Optimisation · R&D</div>3 licences SaaS redondantes détectées. Économie potentielle : 5 502 000 FCFA/an.</div>
          </div>
        </div>

        <aside className="af-drawer">
          <div className="af-drawer-head">
            <div className="av">{Icon.sparkle}</div>
            <div className="info"><div className="name">Claude</div><div className="status">● Actif</div></div>
            <button className="af-icon-btn close">{Icon.close}</button>
          </div>
          <div className="af-msgs">
            <div className="af-msg user">Analyse mon budget BG-2026-014 et détecte les anomalies.</div>
            <div className="af-msg bot">
              J'analyse votre budget <strong>Campagne Q2 — Lancement produit</strong> (84 102 000 FCFA).
              <br/><br/>
              <strong style={{ color: "var(--af-gold)" }}>3 observations</strong> :<br/>
              • Allocation média à <strong>62%</strong> du budget — supérieur à la moyenne sectorielle (48%)<br/>
              • Aucune ligne "imprévu / contingence" — risque pour méthode PERT<br/>
              • Dépense DP-4417 (LinkedIn Ads) doublée le 24/05<br/><br/>
              Souhaitez-vous que je génère un rapport détaillé ?
              <div className="src">Sources : 7 budgets historiques · Référentiel sectoriel 2025</div>
            </div>
            <div className="af-msg user">Génère le rapport PDF.</div>
            <div className="af-msg bot">Rapport en cours de génération… <span style={{ color: "var(--af-gold)" }}>analyse_BG-2026-014.pdf</span> sera prêt dans 12 secondes.</div>
          </div>
          <div className="af-input-bar">
            <input defaultValue="Compare avec les budgets marketing 2025…" />
            <button>{Icon.send}</button>
          </div>
        </aside>
      </main>
    </div>
  );
}

function AuditLog() {
  const rows = [
    { ts: "29/05 14:32", action: "approve", user: "Élise Renaud", uin: "ER", target: "Budget BG-2026-014", desc: "Approbation après revue · solde -2,4%" },
    { ts: "29/05 14:18", action: "submit", user: "Marc Dubois", uin: "MD", target: "Budget BG-2026-014", desc: "Soumission au comptable · méthode PERT" },
    { ts: "29/05 13:45", action: "create", user: "Marc Dubois", uin: "MD", target: "Dépense DP-4421", desc: "Création · 5 502 000 FCFA · facture.pdf" },
    { ts: "29/05 11:20", action: "reject", user: "Élise Renaud", uin: "ER", target: "Budget BG-2026-011", desc: "Motif : justification SaaS insuffisante" },
    { ts: "29/05 10:14", action: "update", user: "Sophie Marin", uin: "SM", target: "Budget BG-2026-009", desc: "Mise à jour ligne 'Charges patronales'" },
    { ts: "29/05 09:02", action: "login", user: "Pauline Lefèvre", uin: "PL", target: "Session", desc: "Connexion · IP 91.x.x.x · Paris" },
    { ts: "28/05 17:48", action: "delete", user: "Hugo Leclerc", uin: "HL", target: "Dépense DP-4408", desc: "Suppression brouillon · doublon" },
    { ts: "28/05 16:30", action: "export", user: "Pauline Lefèvre", uin: "PL", target: "Rapport T1-2026", desc: "Export PDF · 142 budgets · 1 213 dépenses" },
    { ts: "28/05 15:11", action: "approve", user: "Élise Renaud", uin: "ER", target: "Dépense DP-4417", desc: "Approbation · 3 144 000 FCFA · LinkedIn Ads" },
  ];
  return (
    <div className="af-app">
      <Sidebar active="audit" role="Administrateur" user="Pauline Lefèvre" initials="PL" />
      <Topbar crumb={["Gouvernance", "Journal d'audit"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">9 types d'actions · État avant/après JSON</div>
            <h1 className="title">Journal d'audit immuable</h1>
            <div className="sub">Toutes les actions sont journalisées · 12 480 entrées sur 90 jours.</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-outline">{Icon.filter}Filtrer</button>
            <button className="af-btn af-btn-outline">{Icon.download}Exporter (JSON)</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {["TOUS", "CREATE", "UPDATE", "DELETE", "LOGIN", "APPROVE", "REJECT", "SUBMIT", "EXPORT", "VIEW"].map((a, i) => (
            <span key={a} className={`af-pill ${i === 0 ? "active" : ""}`}>{a}</span>
          ))}
        </div>

        <div className="af-card">
          {rows.map((r, i) => (
            <div className="af-audit-row" key={i}>
              <span className="ts">{r.ts}</span>
              <span className={`af-audit-action ${r.action}`}>{r.action.toUpperCase()}</span>
              <div className="af-audit-user"><div className="av">{r.uin}</div><span style={{ fontSize: 12 }}>{r.user}</span></div>
              <div>
                <div style={{ fontSize: 12.5, color: "var(--af-ivory)" }}>{r.target}</div>
                <div style={{ fontSize: 11, color: "var(--af-cream)", marginTop: 2 }}>{r.desc}</div>
              </div>
              <button className="af-btn af-btn-ghost">{Icon.arrow}</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function KPIAnalytics() {
  return (
    <div className="af-app">
      <Sidebar active="kpi" role="Administrateur" user="Pauline Lefèvre" initials="PL" />
      <Topbar crumb={["Intelligence", "KPI Analytics"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">Période · 12 derniers mois</div>
            <h1 className="title">Indicateurs clés</h1>
            <div className="sub">Pilotage consolidé · 6 départements · 2 550 M FCFA d'allocation.</div>
          </div>
          <div className="actions">
            <span className="af-pill">3M</span>
            <span className="af-pill active">12M</span>
            <span className="af-pill">YTD</span>
            <span className="af-pill">Tout</span>
          </div>
        </div>

        <div className="af-kpi-grid">
          <div className="af-kpi"><div className="lbl">Taux d'exécution</div><div className="val">68,4<span className="unit">%</span></div><div className="delta up">+4,2 pts</div></div>
          <div className="af-kpi"><div className="lbl">Délai moyen validation</div><div className="val">1,3<span className="unit"> j</span></div><div className="delta up">-0,4 j</div></div>
          <div className="af-kpi"><div className="lbl">Taux de rejet</div><div className="val">8,2<span className="unit">%</span></div><div className="delta flat">stable</div></div>
          <div className="af-kpi"><div className="lbl">Anomalies IA</div><div className="val">42</div><div className="delta down">+11 vs T1</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="af-card">
            <div className="af-card-head"><div className="title">Évolution dépenses par département</div></div>
            <div className="af-card-body"><LineChart data={[180, 195, 210, 240, 275, 260, 310, 290, 320, 340, 365, 380]} height={200}/></div>
          </div>
          <div className="af-card">
            <div className="af-card-head"><div className="title">Répartition par catégorie</div></div>
            <div className="af-card-body">
              {[
                { l: "Personnel", v: 42, c: "#C9A961" },
                { l: "Prestations externes", v: 24, c: "#3B82F6" },
                { l: "Matériel & SaaS", v: 14, c: "#10B981" },
                { l: "Communication", v: 11, c: "#8B5CF6" },
                { l: "Formation", v: 6, c: "#E5A53D" },
                { l: "Frais administratifs", v: 3, c: "#A8A39A" },
              ].map((r, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div className="af-flex-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: r.c, marginRight: 8 }}></span>{r.l}</span>
                    <span className="num" style={{ fontFamily: "var(--af-mono)", fontSize: 11, color: "var(--af-cream)" }}>{r.v}%</span>
                  </div>
                  <div className="af-bar"><div className="af-bar-fill" style={{ width: `${r.v * 2}%`, background: r.c }}></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="af-card">
          <div className="af-card-head"><div className="title">Performance par département</div></div>
          <table className="af-table">
            <thead><tr><th>Département</th><th>Allocation</th><th>Engagé</th><th>Restant</th><th>Exécution</th><th>Validation moy.</th><th>Anomalies</th></tr></thead>
            <tbody>
              {[["Direction Générale", 620, 412, 208, 66, "0,8j", 1],
                ["Marketing", 480, 321, 159, 67, "1,2j", 8],
                ["R&D", 540, 491, 49, 91, "1,9j", 12],
                ["Ressources Humaines", 320, 174, 146, 54, "1,1j", 3],
                ["Opérations", 280, 204, 76, 73, "1,5j", 6],
                ["Communication", 240, 152, 88, 63, "1,0j", 2]].map((r, i) => (
                <tr key={i}><td><DeptChip idx={i}/></td><td className="num">{r[1]} M FCFA</td><td className="num">{r[2]} M FCFA</td><td className="num muted">{r[3]} M FCFA</td><td><div className="af-flex" style={{ gap: 10 }}><div className="af-bar" style={{ width: 80 }}><div className={`af-bar-fill ${r[4] > 85 ? "danger" : r[4] > 70 ? "warn" : ""}`} style={{ width: `${r[4]}%` }}></div></div><span className="num" style={{ fontSize: 11 }}>{r[4]}%</span></div></td><td className="num muted">{r[5]}</td><td className="num" style={{ color: r[6] > 5 ? "#FCA5A5" : "var(--af-cream)" }}>{r[6]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function UsersPage() {
  const users = [
    { name: "Pauline Lefèvre", in: "PL", email: "p.lefevre@atlasfinance.fr", role: "Administrateur", dept: 0, last: "Aujourd'hui 09:02", active: true },
    { name: "Marc Dubois", in: "MD", email: "m.dubois@atlasfinance.fr", role: "Gestionnaire", dept: 1, last: "Aujourd'hui 13:45", active: true },
    { name: "Sophie Marin", in: "SM", email: "s.marin@atlasfinance.fr", role: "Gestionnaire", dept: 3, last: "Aujourd'hui 10:14", active: true },
    { name: "Hugo Leclerc", in: "HL", email: "h.leclerc@atlasfinance.fr", role: "Gestionnaire", dept: 2, last: "Hier 17:48", active: true },
    { name: "Léa Bernard", in: "LB", email: "l.bernard@atlasfinance.fr", role: "Gestionnaire", dept: 4, last: "il y a 2j", active: true },
    { name: "Élise Renaud", in: "ER", email: "e.renaud@atlasfinance.fr", role: "Comptable", dept: 0, last: "Aujourd'hui 14:32", active: true },
    { name: "Thomas Rivière", in: "TR", email: "t.riviere@atlasfinance.fr", role: "Gestionnaire", dept: 5, last: "il y a 5j", active: false },
  ];
  return (
    <div className="af-app">
      <Sidebar active="users" role="Administrateur" user="Pauline Lefèvre" initials="PL" />
      <Topbar crumb={["Gouvernance", "Utilisateurs"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">7 utilisateurs · 6 actifs</div>
            <h1 className="title">Gestion des accès</h1>
            <div className="sub">Rôles, départements, dernière connexion.</div>
          </div>
          <div className="actions">
            <button className="af-btn af-btn-outline">Importer CSV</button>
            <button className="af-btn af-btn-gold">{Icon.plus}Inviter un utilisateur</button>
          </div>
        </div>

        <div className="af-card">
          <table className="af-table">
            <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Département</th><th>Dernière connexion</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i}>
                  <td><div className="af-audit-user"><div className="av">{u.in}</div><div><div style={{ fontSize: 12.5 }}>{u.name}</div><div style={{ fontSize: 11, color: "var(--af-cream)" }}>{u.email}</div></div></div></td>
                  <td><span className="af-pill" style={{ color: u.role === "Administrateur" ? "var(--af-gold)" : u.role === "Comptable" ? "#C4B5FD" : "var(--af-ivory)", borderColor: u.role === "Administrateur" ? "var(--af-gold)" : "var(--af-line-2)" }}>{u.role}</span></td>
                  <td><DeptChip idx={u.dept}/></td>
                  <td className="muted">{u.last}</td>
                  <td>{u.active ? <span className="af-badge approve">ACTIF</span> : <span className="af-badge draft">INACTIF</span>}</td>
                  <td><button className="af-btn af-btn-ghost">{Icon.more}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="af-app">
      <Sidebar active="settings" role="Administrateur" user="Pauline Lefèvre" initials="PL" />
      <Topbar crumb={["Compte", "Paramètres"]} />
      <main className="af-main">
        <div className="af-page-head">
          <div>
            <div className="af-eyebrow">Profil & sécurité</div>
            <h1 className="title">Paramètres</h1>
            <div className="sub">Préférences, sécurité, intégrations.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
          <div className="af-stack">
            {["Profil", "Sécurité", "Notifications", "Intégrations", "Facturation", "API & Webhooks"].map((s, i) => (
              <div key={s} className={`af-nav-item ${i === 1 ? "active" : ""}`} style={{ background: i === 1 ? "var(--af-slate)" : "transparent" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: i === 1 ? "var(--af-gold)" : "transparent" }}></span>
                {s}
              </div>
            ))}
          </div>

          <div className="af-stack">
            <div className="af-card">
              <div className="af-card-head"><div className="title">Authentification</div><div className="sub">JWT · Argon2id</div></div>
              <div className="af-card-body" style={{ padding: 0 }}>
                <div style={{ padding: "0 20px" }}>
                  <div className="af-settings-row"><div className="info"><div className="t">Authentification à deux facteurs (2FA)</div><div className="d">Code TOTP via application authenticator. Recommandé pour les rôles administrateur.</div></div><div className="af-toggle on"></div></div>
                  <div className="af-settings-row"><div className="info"><div className="t">Blocage automatique</div><div className="d">Verrouillage après 3 tentatives échouées · 15 min.</div></div><div className="af-toggle on"></div></div>
                  <div className="af-settings-row"><div className="info"><div className="t">Sessions concurrentes</div><div className="d">Autoriser jusqu'à 3 sessions simultanées.</div></div><div className="af-toggle"></div></div>
                  <div className="af-settings-row" style={{ borderBottom: 0 }}><div className="info"><div className="t">Durée de session</div><div className="d">Token d'accès 15 min · Refresh 7 jours.</div></div><span className="af-tag-method">15min / 7j</span></div>
                </div>
              </div>
            </div>

            <div className="af-card">
              <div className="af-card-head"><div className="title">Conformité</div></div>
              <div className="af-card-body">
                <div className="af-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                  <span className="af-pill active">RGPD</span>
                  <span className="af-pill active">ISO 27001</span>
                  <span className="af-pill active">Hébergement UE</span>
                  <span className="af-pill active">Audit immuable</span>
                  <span className="af-pill">SOC 2 (en cours)</span>
                </div>
                <div className="af-divider"></div>
                <div style={{ fontSize: 12, color: "var(--af-cream)", lineHeight: 1.6 }}>
                  Vos données financières sont chiffrées au repos (AES-256) et en transit (TLS 1.3). Le journal d'audit est immuable et consultable uniquement par les rôles Administrateur et Comptable.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { ChatbotIA, AuditLog, KPIAnalytics, UsersPage, SettingsPage });
