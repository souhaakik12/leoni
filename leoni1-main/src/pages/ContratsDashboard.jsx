import { useState } from "react";

const CONTRACT_TYPE_OPTIONS = ["CDI", "CAIP", "CIVP", "CDI SANS ESSAI", "SIVP"];

const contractsData = [
  { id: 1, nom: "Fatima Zahra El Idrissi", matricule: "EMP001", type: "CAIP", departement: "Production", dateFin: "15/04/2026", joursRestants: 38 },
  { id: 2, nom: "Amina Bennani", matricule: "EMP023", type: "CIVP", departement: "Logistique", dateFin: "20/04/2026", joursRestants: 43 },
  { id: 3, nom: "Khadija Alami", matricule: "EMP045", type: "SIVP", departement: "Qualite", dateFin: "28/04/2026", joursRestants: 51 },
  { id: 4, nom: "Mohamed Tahar", matricule: "EMP012", type: "CDI", departement: "Maintenance", dateFin: "-", joursRestants: null },
  { id: 5, nom: "Sana Karoui", matricule: "EMP067", type: "CDI SANS ESSAI", departement: "RH", dateFin: "-", joursRestants: null },
];

const alertes = contractsData.filter((contract) => contract.joursRestants !== null);

export default function ContratsDashboard() {
  const [tab, setTab] = useState("liste");
  const [showModal, setShowModal] = useState(false);
  const [newContrat, setNewContrat] = useState({
    nom: "",
    matricule: "",
    type: CONTRACT_TYPE_OPTIONS[1],
    departement: "",
    dateFin: "",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>Tableau de Bord - Contrats</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>Gestion des contrats des employes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau Contrat
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: contractsData.length, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
          { label: "CDI", value: contractsData.filter((contract) => contract.type === "CDI").length, color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
          { label: "CAIP", value: contractsData.filter((contract) => contract.type === "CAIP").length, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
          { label: "Alertes", value: alertes.length, color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: 10,
              padding: "16px 20px",
              flex: "1 1 120px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: card.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {alertes.length > 0 && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 10,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <span style={{ fontWeight: 700, color: "#ea580c", fontSize: 13 }}>{alertes.length} contrats proches d'expiration</span>
              <p style={{ fontSize: 12, color: "#c2410c" }}>Verifiez les alertes de renouvellement</p>
            </div>
          </div>
          <button onClick={() => setTab("alertes")} style={{ background: "none", border: "none", color: "#ea580c", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Voir les alertes -
          </button>
        </div>
      )}

      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 24 }}>
        {[
          { key: "liste", label: "Liste des Contrats" },
          { key: "alertes", label: "Alertes Renouvellement", count: alertes.length },
        ].map((section) => (
          <button
            key={section.key}
            onClick={() => setTab(section.key)}
            style={{
              background: "none",
              border: "none",
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: tab === section.key ? 600 : 400,
              color: tab === section.key ? "#2563eb" : "var(--text-secondary)",
              borderBottom: tab === section.key ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: "-2px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
            }}
          >
            {section.label}
            {section.count ? (
              <span
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {section.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "liste" && (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
                {["NOM", "MATRICULE", "TYPE", "DEPARTEMENT", "DATE FIN", "ACTIONS"].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "11px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractsData.map((contract, index) => (
                <tr
                  key={contract.id}
                  style={{ borderBottom: index < contractsData.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "#fff";
                  }}
                >
                  <td style={{ padding: "13px 16px", fontWeight: 600, fontSize: 13 }}>{contract.nom}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{contract.matricule}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        background: contract.type.startsWith("CDI") ? "#eff6ff" : "#fff7ed",
                        color: contract.type.startsWith("CDI") ? "#2563eb" : "#ea580c",
                        borderRadius: 6,
                        padding: "2px 9px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {contract.type}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{contract.departement}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: contract.joursRestants ? 600 : 400, color: contract.joursRestants ? "#ea580c" : "var(--text-muted)" }}>
                    {contract.dateFin}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button title="Voir" style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button title="Modifier" style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {contract.joursRestants ? (
                        <button
                          style={{
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            color: "#ea580c",
                            borderRadius: 6,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Renouveler
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "alertes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {alertes.map((contract) => (
            <div key={contract.id} style={{ background: "#fff", border: "1px solid var(--border)", borderLeft: "4px solid #ea580c", borderRadius: 10, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{contract.nom}</span>
                  <span style={{ background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa40", borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                    {contract.joursRestants} jours restants
                  </span>
                </div>
                <button style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Renouveler</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 40px", marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Matricule: <strong style={{ color: "var(--text-primary)" }}>{contract.matricule}</strong></div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Departement: <strong style={{ color: "var(--text-primary)" }}>{contract.departement}</strong></div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Type: <strong>{contract.type}</strong></div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Date fin: <strong style={{ color: "#ea580c" }}>{contract.dateFin}</strong></div>
              </div>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 7, padding: "9px 14px", fontSize: 13, color: "#c2410c" }}>
                Ce contrat arrive a expiration, veuillez preparer le renouvellement.
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Nouveau Contrat</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer" }}>
                x
              </button>
            </div>

            {[
              { label: "Nom complet", key: "nom", placeholder: "Ex: Ahmed Ben Ali" },
              { label: "Matricule", key: "matricule", placeholder: "Ex: EMP099" },
              { label: "Departement", key: "departement", placeholder: "Ex: Production" },
              { label: "Date de fin", key: "dateFin", placeholder: "jj/mm/aaaa" },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{field.label}</label>
                <input
                  value={newContrat[field.key]}
                  onChange={(event) => setNewContrat((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  onFocus={(event) => {
                    event.target.style.borderColor = "#2563eb";
                  }}
                  onBlur={(event) => {
                    event.target.style.borderColor = "var(--border)";
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Type</label>
              <select
                value={newContrat.type}
                onChange={(event) => setNewContrat((prev) => ({ ...prev, type: event.target.value }))}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, outline: "none" }}
              >
                {CONTRACT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "9px", border: "1px solid var(--border)", borderRadius: 8, background: "#f9fafb", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "9px", border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
