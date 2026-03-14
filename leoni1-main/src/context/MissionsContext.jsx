import { createContext, useContext, useState } from "react";

const MissionsContext = createContext(null);

const initialMissions = [
  { id: "M001", date: "15/03/2026", ville: "Tunis", responsable: "Ahmed Benjelloun", transport: "Bus", objectif: "45/50", statut: "Terminée", observations: "" },
  { id: "M002", date: "10/03/2026", ville: "Sfax", responsable: "Sara El Amrani", transport: "Minibus", objectif: "28/30", statut: "Terminée", observations: "" },
  { id: "M003", date: "12/03/2026", ville: "Sousse", responsable: "Mohamed Alaoui", transport: "Van", objectif: "35/40", statut: "Terminée", observations: "" },
  { id: "M004", date: "18/03/2026", ville: "Bizerte", responsable: "Fatima Rachidi", transport: "Bus", objectif: "35", statut: "En cours", observations: "" },
  { id: "M005", date: "20/03/2026", ville: "Kairouan", responsable: "Youssef Bennis", transport: "Minibus", objectif: "25", statut: "Planifiée", observations: "" },
];

function toDisplayDate(dateValue) {
  if (!dateValue) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateValue;
}

function nextMissionId(list) {
  const max = list.reduce((acc, mission) => {
    const n = parseInt(String(mission.id).replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `M${String(max + 1).padStart(3, "0")}`;
}

export function MissionsProvider({ children }) {
  const [missions, setMissions] = useState(initialMissions);

  const addMission = (missionData) => {
    setMissions((prev) => {
      const mission = {
        id: nextMissionId(prev),
        date: toDisplayDate(missionData.date),
        ville: missionData.ville || "",
        responsable: missionData.responsable || "",
        transport: missionData.transport || "Bus",
        objectif: missionData.objectif || "",
        statut: missionData.statut || "Planifiée",
        observations: missionData.observations || "",
      };
      return [...prev, mission];
    });
  };

  const updateMission = (updated) => {
    setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const deleteMission = (id) => {
    setMissions((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <MissionsContext.Provider value={{ missions, addMission, updateMission, deleteMission }}>
      {children}
    </MissionsContext.Provider>
  );
}

export const useMissions = () => useContext(MissionsContext);
