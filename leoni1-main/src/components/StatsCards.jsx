export default function StatsCards({ items }) {
  const total     = items.length;
  const active    = items.filter(i => i.status === "Active" || i.status === "En cours").length;
  const completed = items.filter(i => i.status === "Completed" || i.status === "Terminée").length;
  const pending   = items.filter(i => i.status === "Pending" || i.status === "Planifiée").length;

  const cards = [
    { label: "Total",     value: total,     color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Actifs",    value: active,    color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
    { label: "Terminés",  value: completed, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
    { label: "En attente",value: pending,   color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  ];

  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          padding: "16px 20px",
          flex: "1 1 120px",
          minWidth: 110,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: c.color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}