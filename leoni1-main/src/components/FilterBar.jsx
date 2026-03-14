const FILTERS = ["Tous", "En cours", "Planifiée", "Terminée", "On Hold"];

export default function FilterBar({ filter, setFilter, search, setSearch, placeholder }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "16px 20px",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Filtres</span>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>Statut</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "5px 12px", borderRadius: 6,
                border: `1px solid ${filter === f ? "#2563eb" : "var(--border)"}`,
                background: filter === f ? "#2563eb" : "#fff",
                color: filter === f ? "#fff" : "var(--text-secondary)",
                fontSize: 12, fontWeight: filter === f ? 600 : 400,
                transition: "all 0.15s",
              }}>{f}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>Recherche</label>
          <div style={{ position: "relative" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={placeholder || "Rechercher..."}
              style={{
                width: "100%", padding: "7px 12px 7px 32px",
                border: "1px solid var(--border)", borderRadius: 7,
                fontSize: 13, color: "var(--text-primary)", background: "#fff", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "#2563eb"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>
        </div>
        <button onClick={() => { setFilter("Tous"); setSearch(""); }} style={{
          padding: "7px 16px", borderRadius: 7,
          border: "1px solid var(--border)", background: "#f9fafb",
          color: "var(--text-secondary)", fontSize: 12, fontWeight: 500,
          height: 34,
        }}>Réinitialiser</button>
      </div>
    </div>
  );
}