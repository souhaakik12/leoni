import { useState } from "react";

const contractsData = [
  { id: 1, nom: "Fatima Zahra El Idrissi", matricule: "EMP001", type: "CDD", departement: "Production",  dateFin: "15/04/2026", joursRestants: 38 },
  { id: 2, nom: "Amina Bennani",           matricule: "EMP023", type: "CDD", departement: "Logistique",  dateFin: "20/04/2026", joursRestants: 43 },
  { id: 3, nom: "Khadija Alami",           matricule: "EMP045", type: "CDD", departement: "Qualité",     dateFin: "28/04/2026", joursRestants: 51 },
  { id: 4, nom: "Mohamed Tahar",           matricule: "EMP012", type: "CDI", departement: "Maintenance", dateFin: "—",          joursRestants: null },
  { id: 5, nom: "Sana Karoui",             matricule: "EMP067", type: "CDI", departement: "RH",          dateFin: "—",          joursRestants: null },
];

const alertes = contractsData.filter(c => c.joursRestants !== null);

function JoursBadge({ jours }) {
  const color = jours < 40 ? "#ea580c" : "#d97706";
  const bg    = jours < 40 ? "#fff7ed" : "#fffbeb";
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}40`, borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      {jours} jours restants
    </span>
  );
}

export default function ContractsPage() {
  const [tab, setTab] = useState("liste");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Gestion des Contrats</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>Gérez les contrats des employés</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#2563eb", color: "#fff",
          border: "none", borderRadius: 8,
          padding: "9px 18px", fontSize: 13, fontWeight: 600,
          boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouveau Contrat
        </button>
      </div>

      {/* Alert banner */}
      {alertes.length > 0 && (
        <div style={{
          background: "#fff7ed", border: "1px solid #fed7aa",
          borderRadius: 10, padding: "12px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <span style={{ fontWeight: 700, color: "#ea580c", fontSize: 13 }}>{alertes.length} contrats proches d'expiration</span>
              <p style={{ fontSize: 12, color: "#c2410c", marginTop: 1 }}>Vérifiez les alertes de renouvellement</p>
            </div>
          </div>
          <button onClick={() => setTab("alertes")} style={{
            background: "none", border: "none", color: "#ea580c", fontSize: 13, fontWeight: 600,
          }}>Voir les alertes →</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 24, gap: 0 }}>
        {[
          { key: "liste",   label: "Liste des Contrats" },
          { key: "alertes", label: "Alertes Renouvellement", count: alertes.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: "none", border: "none",
            padding: "10px 20px",
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? "#2563eb" : "var(--text-secondary)",
            borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
            marginBottom: "-2px",
            display: "flex", alignItems: "center", gap: 7,
            transition: "all 0.15s",
          }}>
            {t.label}
            {t.count && (
              <span style={{
                background: "#dc2626", color: "#fff",
                borderRadius: "50%", width: 18, height: 18,
                fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Liste tab */}
      {tab === "liste" && (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
                {["NOM","MATRICULE","TYPE","DÉPARTEMENT","DATE FIN","ACTIONS"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractsData.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < contractsData.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <td style={{ padding: "13px 16px", fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{c.nom}</td>
                  <td style={{ padding: "13px 16px", color: "var(--text-secondary)", fontSize: 13 }}>{c.matricule}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{
                      background: c.type === "CDI" ? "#eff6ff" : "#fff7ed",
                      color: c.type === "CDI" ? "#2563eb" : "#ea580c",
                      borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 600,
                    }}>{c.type}</span>
                  </td>
                  <td style={{ padding: "13px 16px", color: "var(--text-secondary)", fontSize: 13 }}>{c.departement}</td>
                  <td style={{ padding: "13px 16px", color: c.joursRestants ? "#ea580c" : "var(--text-muted)", fontSize: 13, fontWeight: c.joursRestants ? 600 : 400 }}>{c.dateFin}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ background: "none", border: "none", color: "#6b7280" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button style={{ background: "none", border: "none", color: "#6b7280" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alertes tab */}
      {tab === "alertes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {alertes.map(c => (
            <div key={c.id} style={{
              background: "#fff", border: "1px solid var(--border)",
              borderLeft: "4px solid #ea580c",
              borderRadius: 10, padding: "20px 24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{c.nom}</span>
                  <JoursBadge jours={c.joursRestants} />
                </div>
                <button style={{
                  background: "none", border: "none",
                  color: "#2563eb", fontSize: 13, fontWeight: 600,
                }}>Renouveler</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 40px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Matricule: <strong style={{ color: "var(--text-primary)" }}>{c.matricule}</strong></div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Département: <strong style={{ color: "var(--text-primary)" }}>{c.departement}</strong></div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Type: <strong style={{ color: "var(--text-primary)" }}>{c.type}</strong></div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Date fin: <strong style={{ color: "#ea580c" }}>{c.dateFin}</strong></div>
              </div>
              <div style={{
                background: "#fff7ed", border: "1px solid #fed7aa",
                borderRadius: 7, padding: "9px 14px",
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, color: "#c2410c",
              }}>
                ⚠️ Ce contrat arrive à expiration, veuillez préparer le renouvellement.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}