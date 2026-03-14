import { useAuth } from "../context/AuthContext.jsx";

const roleInfo = {
  recruteur: { label: "Recruteur RH",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", dept: "Ressources Humaines — Recrutement" },
  contrats:  { label: "Dept. Contrats", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", dept: "Gestion des Contrats & Renouvellements" },
};

export default function ProfilePage() {
  const { user } = useAuth();
  const info = roleInfo[user?.role] || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>Mon Profil</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>Informations de votre compte</p>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

        {/* Profile card */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", flex: "1 1 320px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {user?.avatar}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{user?.nom}</div>
              <span style={{ background: info.bg, color: info.color, border: `1px solid ${info.border}`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                {info.label}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Email",       value: user?.email },
              { label: "Département", value: info.dept   },
              { label: "Rôle",        value: info.label  },
              { label: "Statut",      value: "Actif"     },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions card */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", flex: "1 1 280px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Accès & Permissions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(user?.role === "recruteur"
              ? ["Voir les missions", "Créer une mission", "Modifier une mission", "Voir les foyers"]
              : ["Voir les contrats", "Créer un contrat", "Renouveler un contrat", "Voir les alertes d'expiration"]
            ).map(perm => (
              <div key={perm} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {perm}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}