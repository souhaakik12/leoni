import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useNotifications } from "./NotificationsContext.jsx";
import { buildRoleHeaders } from "../utils/roles.js";

const API_BASE_URL = "http://localhost:3000/api/missions";
const PLANIFIED_STATUS = "Planifi\u00e9e";
const IN_PROGRESS_STATUS = "En cours";
const COMPLETED_STATUS = "Termin\u00e9e";

const MissionsContext = createContext(null);

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeIdArray(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set();
  const ids = [];

  source.forEach((entry) => {
    const parsed = Number(entry);
    if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) {
      return;
    }

    seen.add(parsed);
    ids.push(parsed);
  });

  return ids;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (frMatch) return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function toDisplayDate(value) {
  const isoDate = toIsoDate(value);
  if (!isoDate) return "";

  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function normalizeStatus(value) {
  const raw = normalizeText(value);
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "planifiee") return PLANIFIED_STATUS;
  if (normalized === "terminee") return COMPLETED_STATUS;
  if (normalized === "en cours") return IN_PROGRESS_STATUS;

  return raw || PLANIFIED_STATUS;
}

function buildVille(gouvernorat, delegation) {
  const parts = [normalizeText(gouvernorat), normalizeText(delegation)].filter(Boolean);
  return parts.join(" - ");
}

function splitVille(ville) {
  const parts = normalizeText(ville).split(" - ");
  return {
    Gouvernorat: normalizeText(parts[0]),
    Delegation: normalizeText(parts.slice(1).join(" - ")),
  };
}

function sortMissions(list) {
  return [...list].sort((left, right) => {
    const rightDate = toIsoDate(right.DateMission || right.date);
    const leftDate = toIsoDate(left.DateMission || left.date);

    if (rightDate !== leftDate) {
      return rightDate.localeCompare(leftDate);
    }

    return Number(right.Id || 0) - Number(left.Id || 0);
  });
}

function normalizeMission(input) {
  const missionId = Number(input?.Id ?? input?.id ?? 0) || 0;
  const codeMission = normalizeText(input?.CodeMission);
  const dateMission = toIsoDate(input?.DateMission || input?.date);
  const location = {
    Gouvernorat: normalizeText(input?.Gouvernorat),
    Delegation: normalizeText(input?.Delegation),
  };

  if (!location.Gouvernorat && !location.Delegation) {
    const parsedVille = splitVille(input?.ville);
    location.Gouvernorat = parsedVille.Gouvernorat;
    location.Delegation = parsedVille.Delegation;
  }

  const responsablesIds = normalizeIdArray(input?.responsablesIds ?? input?.responsableIds);
  const responsablesNoms = normalizeText(input?.ResponsablesNoms || input?.responsable);
  const transport = normalizeText(input?.Transport || input?.transport);
  const objectif = normalizeText(input?.Objectif || input?.objectif);
  const observations = normalizeText(input?.Observations || input?.observations);
  const statut = normalizeStatus(input?.Statut || input?.statut);
  const ville = normalizeText(input?.ville) || buildVille(location.Gouvernorat, location.Delegation);
  const legacyId = normalizeText(input?.id) || codeMission || `M${missionId}`;
  const creeParNom = normalizeText(input?.CreeParNom || input?.creeParNom || input?.createdBy);
  const creeParEmail = normalizeText(input?.CreeParEmail || input?.creeParEmail || input?.createdByEmail);

  return {
    ...input,
    Id: missionId,
    CodeMission: codeMission || null,
    id: legacyId,
    TypeMission: normalizeText(input?.TypeMission || input?.typeMission),
    DateMission: dateMission,
    date: normalizeText(input?.date) || toDisplayDate(dateMission),
    Gouvernorat: location.Gouvernorat,
    Delegation: location.Delegation,
    ville,
    Transport: transport,
    transport,
    Objectif: objectif,
    objectif,
    ResultatMission: normalizeText(input?.ResultatMission || input?.resultatMission),
    NombreRecrutes: normalizeNullableNumber(input?.NombreRecrutes ?? input?.nombreRecrutes),
    Observations: observations,
    observations,
    Statut: statut,
    statut,
    CreePar: normalizeNullableNumber(input?.CreePar ?? input?.creePar),
    CreeParNom: creeParNom,
    CreeParEmail: creeParEmail,
    createdBy: creeParNom,
    createdByEmail: creeParEmail,
    ResponsablesNoms: responsablesNoms,
    responsable: responsablesNoms,
    responsablesIds,
    CreeLe: input?.CreeLe ?? null,
    ModifieLe: input?.ModifieLe ?? null,
  };
}

function normalizeResponsable(input) {
  return {
    Id: Number(input?.Id ?? input?.id ?? 0) || 0,
    NomComplet: normalizeText(input?.NomComplet || input?.nomComplet || input?.nom),
    Email: normalizeText(input?.Email || input?.email),
    Role: normalizeText(input?.Role || input?.role),
    AccesFoyer: Number(input?.AccesFoyer ?? input?.accesFoyer ?? 0) || 0,
  };
}

function buildMissionPayload(input, currentUserId) {
  const location = {
    Gouvernorat: normalizeText(input?.Gouvernorat),
    Delegation: normalizeText(input?.Delegation),
  };

  if (!location.Gouvernorat && !location.Delegation) {
    const parsedVille = splitVille(input?.ville);
    location.Gouvernorat = parsedVille.Gouvernorat;
    location.Delegation = parsedVille.Delegation;
  }

  return {
    TypeMission: normalizeText(input?.TypeMission || input?.typeMission),
    DateMission: toIsoDate(input?.DateMission || input?.date),
    Gouvernorat: location.Gouvernorat,
    Delegation: location.Delegation,
    Transport: normalizeText(input?.Transport || input?.transport),
    Objectif: normalizeText(input?.Objectif || input?.objectif),
    ResultatMission: normalizeText(input?.ResultatMission || input?.resultatMission),
    NombreRecrutes: normalizeNullableNumber(input?.NombreRecrutes ?? input?.nombreRecrutes),
    Observations: normalizeText(input?.Observations || input?.observations),
    Statut: normalizeStatus(input?.Statut || input?.statut),
    CreePar: Number(input?.CreePar ?? input?.creePar ?? currentUserId) || null,
    responsablesIds: normalizeIdArray(input?.responsablesIds ?? input?.responsableIds),
  };
}

function extractCollection(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function resolveMissionDatabaseId(value, missions) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;

  const matchingMission = missions.find(
    (mission) => String(mission.id) === String(value) || String(mission.Id) === String(value)
  );

  return matchingMission?.Id || null;
}

export function MissionsProvider({ children }) {
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [missions, setMissions] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [loadingResponsables, setLoadingResponsables] = useState(false);
  const [missionsError, setMissionsError] = useState("");
  const [responsablesError, setResponsablesError] = useState("");

  const currentUserId = Number(user?.Id ?? user?.id ?? 0) || null;

  const fetchMissions = async () => {
    setLoadingMissions(true);
    setMissionsError("");

    try {
      const response = await fetch(API_BASE_URL, {
        headers: buildRoleHeaders(user),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Impossible de charger les missions.");
      }

      const nextMissions = sortMissions(extractCollection(data, "missions").map(normalizeMission));
      setMissions(nextMissions);
      return nextMissions;
    } catch (error) {
      const message = error?.message || "Impossible de charger les missions.";
      setMissionsError(message);
      throw error;
    } finally {
      setLoadingMissions(false);
    }
  };

  const fetchResponsables = async () => {
    setLoadingResponsables(true);
    setResponsablesError("");

    try {
      const response = await fetch(`${API_BASE_URL}/responsables`, {
        headers: buildRoleHeaders(user),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Impossible de charger les responsables.");
      }

      const nextResponsables = extractCollection(data, "responsables").map(normalizeResponsable);
      setResponsables(nextResponsables);
      return nextResponsables;
    } catch (error) {
      const message = error?.message || "Impossible de charger les responsables.";
      setResponsablesError(message);
      throw error;
    } finally {
      setLoadingResponsables(false);
    }
  };

  const addMission = async (payload) => {
    const missionPayload = buildMissionPayload(payload, currentUserId);
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: buildRoleHeaders(user, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(missionPayload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Creation de mission impossible.");
    }

    const mission = normalizeMission(data?.mission || data);
    setMissions((prev) => sortMissions([...prev.filter((item) => item.Id !== mission.Id), mission]));
    refreshNotifications().catch(() => {});
    return mission;
  };

  const updateMission = async (payload) => {
    const missionId = resolveMissionDatabaseId(payload?.Id ?? payload?.id, missions);
    if (!missionId) {
      throw new Error("Mission introuvable.");
    }

    const missionPayload = buildMissionPayload(payload, currentUserId);
    const response = await fetch(`${API_BASE_URL}/${missionId}`, {
      method: "PUT",
      headers: buildRoleHeaders(user, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(missionPayload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Modification de mission impossible.");
    }

    const mission = normalizeMission(data?.mission || data);
    setMissions((prev) => sortMissions(prev.map((item) => (item.Id === mission.Id ? mission : item))));
    refreshNotifications().catch(() => {});
    return mission;
  };

  const deleteMission = async (id) => {
    const missionId = resolveMissionDatabaseId(id, missions);
    if (!missionId) {
      throw new Error("Mission introuvable.");
    }

    const response = await fetch(`${API_BASE_URL}/${missionId}`, {
      method: "DELETE",
      headers: buildRoleHeaders(user),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Suppression de mission impossible.");
    }

    setMissions((prev) => prev.filter((item) => item.Id !== missionId));
    return data;
  };

  useEffect(() => {
    if (!user) {
      setMissions([]);
      setResponsables([]);
      setMissionsError("");
      setResponsablesError("");
      return;
    }

    fetchMissions().catch(() => {});
    fetchResponsables().catch(() => {});
  }, [user?.Id, user?.role]);

  return (
    <MissionsContext.Provider
      value={{
        missions,
        responsables,
        loadingMissions,
        loadingResponsables,
        missionsError,
        responsablesError,
        fetchMissions,
        fetchResponsables,
        addMission,
        updateMission,
        deleteMission,
      }}
    >
      {children}
    </MissionsContext.Provider>
  );
}

export const useMissions = () => useContext(MissionsContext);
