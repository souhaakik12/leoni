import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dormsCatalog, initialResidentsByDorm } from "../data/dormsData.js";

function getOccupancyColor(pct) {
  if (pct >= 90) return "#ef4444";
  if (pct >= 75) return "#f97316";
  return "#16a34a";
}

export default function DormsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const dorms = useMemo(
    () =>
      dormsCatalog.map((d) => {
        const residents = initialResidentsByDorm[d.id] || [];
        return { ...d, occupes: residents.length };
      }),
    []
  );

  const filteredDorms = dorms.filter(
    (d) =>
      d.nom.toLowerCase().includes(search.toLowerCase()) ||
      d.ville.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const totalPlaces = dorms.reduce((sum, d) => sum + d.capacite, 0);
    const occupiedPlaces = dorms.reduce((sum, d) => sum + d.occupes, 0);
    return {
      totalPlaces,
      occupiedPlaces,
      availablePlaces: totalPlaces - occupiedPlaces,
    };
  }, [dorms]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Gestion des Foyers
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
          Cliquez sur un foyer pour gerer les residentes
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Total Places</p>
          <p style={{ fontSize: 42, lineHeight: 1, fontWeight: 800, color: "#111827" }}>{stats.totalPlaces}</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Places Occupees</p>
          <p style={{ fontSize: 42, lineHeight: 1, fontWeight: 800, color: "#2563eb" }}>{stats.occupiedPlaces}</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Places Disponibles</p>
          <p style={{ fontSize: 42, lineHeight: 1, fontWeight: 800, color: "#16a34a" }}>{stats.availablePlaces}</p>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher El Khalil ou Graiet..."
          style={{
            border: "none",
            outline: "none",
            fontSize: 13,
            color: "#111827",
            flex: 1,
            background: "transparent",
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
        {filteredDorms.map((dorm) => {
          const placesDisponibles = dorm.capacite - dorm.occupes;
          const taux = (dorm.occupes / dorm.capacite) * 100;
          const tauxLabel = `${taux.toFixed(1)}%`;
          const barColor = getOccupancyColor(taux);
          const isCritical = placesDisponibles <= 3;

          return (
            <div
              key={dorm.id}
              onClick={() => navigate(`/dorms/${dorm.id}`)}
              style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "18px 20px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div>
                  <h3 style={{ fontSize: 33, fontWeight: 700, color: "#111827" }}>{dorm.nom}</h3>
                  <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{dorm.adresse}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dorms/${dorm.id}`);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Voir →
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>Total</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>{dorm.capacite}</p>
                </div>
                <div>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>Occupees</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: "#2563eb" }}>{dorm.occupes}</p>
                </div>
                <div>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>Disponibles</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>{placesDisponibles}</p>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#374151" }}>Taux d'occupation</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{tauxLabel}</span>
                </div>
                <div style={{ background: "#e5e7eb", borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(taux, 100)}%`,
                      height: "100%",
                      background: barColor,
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>

              {isCritical && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "#dc2626",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  Capacite critique: {placesDisponibles} places restantes
                </div>
              )}

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, fontSize: 13, color: "#374151" }}>
                {dorm.telephone}
              </div>
            </div>
          );
        })}
      </div>

      {filteredDorms.length === 0 && (
        <div style={{ marginTop: 18, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          Aucun foyer trouve.
        </div>
      )}
    </div>
  );
}
