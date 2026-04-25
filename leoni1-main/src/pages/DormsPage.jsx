import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dormPinBedIcon from "../assets/dorm-pin-bed.svg";
import "./DormsPage.css";

const dormPalette = {
  textStrong: "#111827",
  textDark: "#1f2937",
  accent: "#2563eb",
  border: "#e5e7eb",
  bg: "#f8fafc",
  surface: "#ffffff",
  success: "#22c55e",
  warning: "#f97316",
};

function getOccupancyColor(pct) {
  if (pct >= 90) return dormPalette.warning;
  if (pct >= 70) return dormPalette.accent;
  return dormPalette.success;
}

export default function DormsPage() {
  const navigate = useNavigate();
  const [dorms, setDorms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDorms = async () => {
      setIsLoading(true);
      try {
        const foyersRes = await fetch("http://localhost:3000/api/foyers");
        if (!foyersRes.ok) {
          throw new Error(`Foyers fetch failed with status ${foyersRes.status}`);
        }

        const foyersData = await foyersRes.json();
        const normalizedFoyers = (Array.isArray(foyersData) ? foyersData : []).map((d) => ({
          id: d.id,
          nom: d.nom ?? "",
          ville: d.ville ?? "",
          adresse: d.adresse ?? "",
          telephone: d.telephone ?? "",
          capacite: Number(d.capacite ?? 0),
          occupes: 0,
        }));

        const occupesCounts = await Promise.all(
          normalizedFoyers.map(async (d) => {
            try {
              const residentsRes = await fetch(`http://localhost:3000/api/resident/${d.id}`);
              if (!residentsRes.ok) return 0;
              const residentsData = await residentsRes.json();
              return Array.isArray(residentsData) ? residentsData.length : 0;
            } catch (err) {
              console.error(err);
              return 0;
            }
          })
        );

        const foyersWithOccupancy = normalizedFoyers.map((d, index) => ({
          ...d,
          occupes: occupesCounts[index],
        }));

        if (isMounted) {
          setDorms(foyersWithOccupancy);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setDorms([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDorms();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalPlaces = dorms.reduce((sum, d) => sum + d.capacite, 0);
    const occupiedPlaces = dorms.reduce((sum, d) => sum + d.occupes, 0);
    return {
      totalPlaces,
      occupiedPlaces,
      availablePlaces: totalPlaces - occupiedPlaces,
    };
  }, [dorms]);

  if (isLoading) {
    return (
      <div className="dorms-page">
        <div className="dorms-empty-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dorms-page">
      <div className="dorms-header">
        <div>
          <h2 className="dorms-title">Gestion des Foyers</h2>
          <p className="dorms-subtitle">Cliquez sur un foyer pour gerer les residentes</p>
        </div>
        <div className="dorms-header-icon">
          <img src={dormPinBedIcon} alt="Icone foyer" />
        </div>
      </div>

      <div className="dorms-stats-grid">
        <div className="dorms-stat-card">
          <p className="dorms-stat-label">Total Places</p>
          <p className="dorms-stat-value">{stats.totalPlaces}</p>
        </div>
        <div className="dorms-stat-card">
          <p className="dorms-stat-label">Places Occupees</p>
          <p className="dorms-stat-value dorms-stat-primary">{stats.occupiedPlaces}</p>
        </div>
        <div className="dorms-stat-card">
          <p className="dorms-stat-label">Places Disponibles</p>
          <p className="dorms-stat-value dorms-stat-success">{stats.availablePlaces}</p>
        </div>
      </div>

      <div className="dorms-grid">
        {dorms.map((dorm) => {
          const placesDisponibles = Math.max(dorm.capacite - dorm.occupes, 0);
          const taux = dorm.capacite > 0 ? (dorm.occupes / dorm.capacite) * 100 : 0;
          const tauxLabel = `${taux.toFixed(1)}%`;
          const barColor = getOccupancyColor(taux);
          const isCritical = placesDisponibles <= 3;

          return (
            <div
              key={dorm.id}
              onClick={() => navigate(`/dorms/${dorm.id}`)}
              className="dorms-card"
            >
              <div className="dorms-card-head">
                <div>
                  <h3 className="dorms-card-title">{dorm.nom}</h3>
                  <p className="dorms-card-address">{dorm.adresse}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dorms/${dorm.id}`);
                  }}
                  className="dorms-view-btn"
                >
                  Voir
                </button>
              </div>

              <div className="dorms-mini-stats">
                <div>
                  <p className="dorms-mini-label">Total</p>
                  <p className="dorms-mini-value">{dorm.capacite}</p>
                </div>
                <div>
                  <p className="dorms-mini-label">Occupees</p>
                  <p className="dorms-mini-value dorms-mini-primary">{dorm.occupes}</p>
                </div>
                <div>
                  <p className="dorms-mini-label">Disponibles</p>
                  <p className="dorms-mini-value dorms-mini-success">{placesDisponibles}</p>
                </div>
              </div>

              <div className="dorms-progress-block">
                <div className="dorms-progress-head">
                  <span>Taux d'occupation</span>
                  <span>{tauxLabel}</span>
                </div>
                <div className="dorms-progress-track">
                  <div
                    style={{
                      width: `${Math.min(taux, 100)}%`,
                      height: "100%",
                      background: barColor,
                      borderRadius: 99,
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>
              </div>

              {isCritical && (
                <div className="dorms-critical-badge">
                  Capacite critique: {placesDisponibles} places restantes
                </div>
              )}

              <div className="dorms-card-phone">
                {dorm.telephone}
              </div>
            </div>
          );
        })}
      </div>

      {dorms.length === 0 && (
        <div className="dorms-empty-state">
          Aucun foyer trouve.
        </div>
      )}
    </div>
  );
}

