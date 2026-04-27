import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  SIGNATURE_SUR_PLACE,
  isDossierContractStatus,
  isSeanceContractStatus,
  isSignedContractStatus,
  normalizeContractCandidateStatus,
  STATUS_ATTENTE_SEANCE_CONTRAT,
  STATUS_CONTRAT_FINALISE,
  STATUS_CONTRAT_SIGNE,
  STATUS_EN_ATTENTE_DOSSIER,
  STATUS_SEANCE_EN_COURS,
  STATUS_SEANCE_TERMINEE,
  TYPE_CANDIDAT_CONTRACT_SESSION,
  TYPE_CANDIDAT_DOSSIER_CONTRACT,
  TYPE_CANDIDAT_CONTACT_CONTRACT_LEGACY,
  TYPE_CANDIDAT_CONTRACT_SIGNED,
  isContractType,
  normalizeContractType,
  isSessionStatus,
} from "../data/contractWorkflow.js";
import { buildRoleHeaders } from "../utils/roles.js";

const STATUS_NOUVEAU = "Nouveau";
const STATUS_ACCEPTE = "Accepte";
const ENTRETIEN_OK = "OK";
const TYPE_CANDIDAT_EVALUATION = "test_passed";

const RecrutementsContext = createContext(null);

const today = new Date();
const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const initialEntries = [
  {
    id: 1,
    date: "11/03/2026",
    mission: "M002",
    ville: "Sfax",
    responsable: "Sara El Amrani",
    candidats: [
      { nom: "Karim Ayari", cin: "08234567", telephone: "22 345 678", poste: "Operateur cablage" },
      { nom: "Nour Hammami", cin: "09345678", telephone: "55 456 789", poste: "Technicien controle" },
      { nom: "Ines Chaabane", cin: "07456789", telephone: "98 567 890", poste: "Operateur cablage" },
    ],
  },
  {
    id: 2,
    date: "12/03/2026",
    mission: "M004",
    ville: "Bizerte",
    responsable: "Fatima Rachidi",
    candidats: [
      { nom: "Yassine Ben Ali", cin: "06567890", telephone: "25 678 901", poste: "Operateur cablage" },
      { nom: "Salma Trabelsi", cin: "05678901", telephone: "50 789 012", poste: "Agent qualite" },
    ],
  },
];

const initialCandidats = [
  {
    id: 1,
    nomComplet: "Karim Ayari",
    cin: "08234567",
    dateNaissance: "1998-04-12",
    sexe: "Homme",
    telephone: "22 345 678",
    email: "karim.ayari@mail.com",
    adresse: "12 Rue de la Paix",
    gouvernoratResidence: "Sfax",
    delegation: "Sfax Ville",
    gouvernoratOrigine: "Gabes",
    villeOrigine: "El Hamma",
    niveauEtudes: "Baccalaureat",
    specialite: "Sciences",
    etablissement: "Lycee Sfax",
    posteVise: "Operateur cablage",
    missionId: "M002",
    statut: "Nouveau",
    notes: "",
  },
  {
    id: 2,
    nomComplet: "Nour Hammami",
    cin: "09345678",
    dateNaissance: "2000-09-22",
    sexe: "Femme",
    telephone: "55 456 789",
    email: "",
    adresse: "Cite El Ons",
    gouvernoratResidence: "Sfax",
    delegation: "Sakiet Ezzit",
    gouvernoratOrigine: "Kairouan",
    villeOrigine: "Kairouan Nord",
    niveauEtudes: "BTS / BTP",
    specialite: "Electronique",
    etablissement: "ISET Sfax",
    posteVise: "Technicien controle",
    missionId: "M002",
    statut: "Nouveau",
    notes: "",
  },
  {
    id: 3,
    nomComplet: "Yassine Ben Ali",
    cin: "06567890",
    dateNaissance: "1997-01-05",
    sexe: "Homme",
    telephone: "25 678 901",
    email: "yassine@mail.tn",
    adresse: "Av. Habib Bourguiba",
    gouvernoratResidence: "Bizerte",
    delegation: "Bizerte Nord",
    gouvernoratOrigine: "Jendouba",
    villeOrigine: "Tabarka",
    niveauEtudes: "Licence",
    specialite: "Mecanique",
    etablissement: "FST Bizerte",
    posteVise: "Operateur cablage",
    missionId: "M004",
    statut: "Nouveau",
    notes: "Bonne presentation",
  },
  {
    id: 4,
    nomComplet: "Salma Trabelsi",
    cin: "05678901",
    dateNaissance: "2001-07-18",
    sexe: "Femme",
    telephone: "50 789 012",
    email: "",
    adresse: "Rue 20 Mars",
    gouvernoratResidence: "Bizerte",
    delegation: "Zarzouna",
    gouvernoratOrigine: "Beja",
    villeOrigine: "Beja Nord",
    niveauEtudes: "Baccalaureat",
    specialite: "Gestion",
    etablissement: "Lycee Bizerte",
    posteVise: "Agent qualite",
    missionId: "M004",
    statut: "Nouveau",
    notes: "",
  },
  {
    id: 5,
    nomComplet: "Omar Jebali",
    cin: "04789012",
    dateNaissance: "1996-11-30",
    sexe: "Homme",
    telephone: "92 890 123",
    email: "omar.jebali@gmail.com",
    adresse: "Cite Jardins",
    gouvernoratResidence: "Tunis",
    delegation: "El Menzah",
    gouvernoratOrigine: "Sousse",
    villeOrigine: "Msaken",
    niveauEtudes: "Ingenieur",
    specialite: "Genie industriel",
    etablissement: "ENIT Tunis",
    posteVise: "Technicien maintenance",
    missionId: "M001",
    statut: "Nouveau",
    notes: "Experience 2 ans",
  },
];

const initialSeancesContrat = [];

function toSeanceId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeSeanceContratFields(seance) {
  const next = { ...seance };
  next.id = toSeanceId(next.id) || next.id;
  next.date = next.date || new Date().toISOString().slice(0, 10);
  next.heure = next.heure || "09:00";
  next.responsableId = Number.isInteger(Number(next.responsableId)) ? Number(next.responsableId) : 0;
  next.responsableNom = (next.responsableNom || "Service Contrats").trim();
  next.candidatIds = Array.isArray(next.candidatIds)
    ? [...new Set(next.candidatIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
    : [];
  next.statutSeance = isSessionStatus(next.statutSeance) ? next.statutSeance : STATUS_SEANCE_EN_COURS;
  if (!next.createdAt) next.createdAt = new Date().toISOString();
  return next;
}

function isAcceptedEvaluationCandidate(candidate) {
  const candidateType = String(candidate?.typeCandidat || "").trim();
  const normalizedStatus = String(candidate?.statut || "").trim().toLowerCase();
  const normalizedInterview = String(candidate?.entretienResult || "").trim().toUpperCase();

  const fromEvaluationStep =
    candidateType === TYPE_CANDIDAT_EVALUATION || candidateType === TYPE_CANDIDAT_CONTACT_CONTRACT_LEGACY;
  const acceptedDecision = normalizedStatus === STATUS_ACCEPTE.toLowerCase() || normalizedInterview === ENTRETIEN_OK;

  return fromEvaluationStep && acceptedDecision;
}

function toBooleanFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "oui", "yes"].includes(normalized)) return true;
    if (["0", "false", "non", "no", ""].includes(normalized)) return false;
  }
  return false;
}

function normalizeCandidateContractFields(candidate) {
  const next = { ...candidate };

  next.nomComplet = next.nomComplet || next.nom || "";
  next.cin = next.cin || "";
  next.telephone = next.telephone || "";
  next.age = next.age ?? "";
  next.genre = String(next.genre || next.sexe || "").trim();
  next.niveauEtudes = next.niveauEtudes || next.niveau_etudes || next.niveau_scolaire || "";
  next.posteVise = next.posteVise || next.poste || "";
  next.adresse = next.adresse || "";

  const contratSigne = toBooleanFlag(next.contratSigne ?? next.contrat_signe);
  const dossierValide = toBooleanFlag(next.dossierValide ?? next.dossier_valide);
  next.contratSigne = contratSigne;
  next.contrat_signe = contratSigne;
  next.dossierValide = dossierValide;
  next.dossier_valide = dossierValide;
  next.dateSignature = next.dateSignature || next.date_signature || null;
  next.date_signature = next.dateSignature;
  next.dateDebutContrat = next.dateDebutContrat || next.date_debut_contrat || null;
  next.date_debut_contrat = next.dateDebutContrat;
  next.dateFinContrat = next.dateFinContrat || next.date_fin_contrat || null;
  next.date_fin_contrat = next.dateFinContrat;
  next.signatureLieu = next.signatureLieu || next.lieu_signature || SIGNATURE_SUR_PLACE;
  next.lieu_signature = next.signatureLieu;
  next.statutDossier = String(next.statutDossier || next.statut_dossier || (dossierValide ? "VALIDE" : "INCOMPLET"));
  next.statut_dossier = next.statutDossier;
  next.statutContrat = next.statutContrat || next.statut_contrat || "";
  next.statut_contrat = next.statutContrat;
  if (typeof next.contratValide !== "boolean") next.contratValide = dossierValide;
  if (!next.documentsContrat || typeof next.documentsContrat !== "object") next.documentsContrat = {};
  const normalizedTypeContrat = normalizeContractType(next.typeContrat || next.type_contrat);
  next.typeContrat = normalizedTypeContrat;
  next.type_contrat = normalizedTypeContrat;
  next.seanceContratId = toSeanceId(next.seanceContratId);
  next.statut = normalizeContractCandidateStatus(next.statut);
  const isFinalized = String(next.statut || "").trim().toUpperCase() === STATUS_CONTRAT_FINALISE;

  if (isFinalized) {
    next.typeCandidat = TYPE_CANDIDAT_CONTRACT_SIGNED;
    next.contratSigne = true;
    next.contrat_signe = true;
    next.dossierValide = true;
    next.dossier_valide = true;
    next.contratValide = true;
    next.statutDossier = "VALIDE";
    next.statut_dossier = "VALIDE";
  } else if (isSignedContractStatus(next.statut) || next.contratSigne) {
    next.typeCandidat = TYPE_CANDIDAT_CONTRACT_SIGNED;
    next.contratSigne = true;
    next.contrat_signe = true;
    if (!next.statut) next.statut = STATUS_CONTRAT_SIGNE;
  } else if (isDossierContractStatus(next.statut)) {
    next.typeCandidat = TYPE_CANDIDAT_DOSSIER_CONTRACT;
    next.statut = STATUS_EN_ATTENTE_DOSSIER;
  } else if (next.dossierValide) {
    next.typeCandidat = TYPE_CANDIDAT_DOSSIER_CONTRACT;
    if (!next.statut) next.statut = STATUS_EN_ATTENTE_DOSSIER;
  } else if (isAcceptedEvaluationCandidate(next)) {
    next.typeCandidat = TYPE_CANDIDAT_CONTRACT_SESSION;
    next.statut = STATUS_ATTENTE_SEANCE_CONTRAT;
    next.entretienResult = ENTRETIEN_OK;
    if (!next.seanceContratId) next.seanceContratId = null;
  } else if (isSeanceContractStatus(next.statut) || next.seanceContratId) {
    next.typeCandidat = TYPE_CANDIDAT_CONTRACT_SESSION;
    next.statut = STATUS_ATTENTE_SEANCE_CONTRAT;
  } else if (!next.typeCandidat && next.entretienResult === "OK") {
    next.typeCandidat = TYPE_CANDIDAT_CONTACT_CONTRACT_LEGACY;
  }

  if (!next.statut) next.statut = STATUS_NOUVEAU;
  return next;
}

function mapApiCandidateToLocal(candidate) {
  const etape = String(candidate?.etape || "").trim().toUpperCase();
  const hasStatut = String(candidate?.statut || "").trim();
  const parsedId = Number(candidate?.id);
  const contratSigne = toBooleanFlag(candidate?.contrat_signe ?? candidate?.contratSigne);
  const dossierValide = toBooleanFlag(candidate?.dossier_valide ?? candidate?.dossierValide);

  let statut = hasStatut;
  if (!statut && etape === "SEANCE_INFO") {
    statut = STATUS_ATTENTE_SEANCE_CONTRAT;
  } else if (!statut && etape === "DOSSIER_CONTRAT") {
    statut = STATUS_EN_ATTENTE_DOSSIER;
  } else if (!statut && etape === "NOUVEAU_RECRUTE" && contratSigne && dossierValide) {
    statut = STATUS_CONTRAT_FINALISE;
  }

  let typeCandidat = String(candidate?.typeCandidat || candidate?.type_candidature || "").trim();
  if (!typeCandidat && etape === "TEST_ENTRETIEN") {
    typeCandidat = TYPE_CANDIDAT_EVALUATION;
  } else if (!typeCandidat && etape === "SEANCE_INFO") {
    typeCandidat = TYPE_CANDIDAT_CONTRACT_SESSION;
  } else if (!typeCandidat && etape === "DOSSIER_CONTRAT") {
    typeCandidat = TYPE_CANDIDAT_DOSSIER_CONTRACT;
  } else if (!typeCandidat && etape === "NOUVEAU_RECRUTE") {
    typeCandidat = TYPE_CANDIDAT_CONTRACT_SIGNED;
  }

  return normalizeCandidateContractFields({
    ...candidate,
    id: Number.isInteger(parsedId) ? parsedId : candidate?.id,
    nomComplet: candidate?.nomComplet || candidate?.nom || "",
    posteVise: candidate?.posteVise || candidate?.poste || "",
    canalEntree: candidate?.canalEntree || candidate?.canal || "Candidat",
    typeCandidat,
    statut,
    entretienResult: etape === "SEANCE_INFO" ? ENTRETIEN_OK : candidate?.entretienResult,
    etape: candidate?.etape || "",
    contratSigne,
    dossierValide,
    dateSignature: candidate?.date_signature ?? candidate?.dateSignature ?? null,
    dateDebutContrat: candidate?.date_debut_contrat ?? candidate?.dateDebutContrat ?? null,
    dateFinContrat: candidate?.date_fin_contrat ?? candidate?.dateFinContrat ?? null,
    signatureLieu: candidate?.lieu_signature ?? candidate?.lieuSignature ?? SIGNATURE_SUR_PLACE,
    statutDossier: candidate?.statut_dossier ?? candidate?.statutDossier ?? null,
    type_contrat: candidate?.type_contrat ?? candidate?.typeContrat ?? null,
    statut_contrat: candidate?.statut_contrat ?? candidate?.statutContrat ?? null,
  });
}

export function RecrutementsProvider({ children }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState(initialEntries);
  const [candidats, setCandidats] = useState(() => 
    initialCandidats.map((candidate) => normalizeCandidateContractFields(candidate))
  );
  const [seancesContrat, setSeancesContrat] = useState(() =>
    initialSeancesContrat.map((seance) => normalizeSeanceContratFields(seance))
  );
  const [nextEId, setNextEId] = useState(() =>
    initialEntries.reduce((maxId, entry) => Math.max(maxId, Number(entry.id) || 0), 0) + 1
  );
  const [nextCId, setNextCId] = useState(() =>
    initialCandidats.reduce((maxId, candidate) => Math.max(maxId, Number(candidate.id) || 0), 0) + 1
  );
  const [nextSeanceId, setNextSeanceId] = useState(() =>
    initialSeancesContrat.reduce((maxId, seance) => Math.max(maxId, Number(seance.id) || 0), 0) + 1
  );
  const [candidateSeanceMap, setCandidateSeanceMap] = useState({});

  const refreshCandidatsFromApi = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch("http://localhost:3000/api/candidats", {
        headers: buildRoleHeaders(user),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Impossible de charger les candidats.");
      }
      const list = Array.isArray(payload) ? payload.map((candidate) => mapApiCandidateToLocal(candidate)) : [];
      setCandidats(list);
      console.log(`[refresh-candidats] fetched_count=${list.length}`);
    } catch (error) {
      console.error("Erreur fetch candidats:", error);
    }
  }, [user]);

  const refreshSeancesFromApi = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch("http://localhost:3000/api/seances-contrat", {
        headers: buildRoleHeaders(user),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Impossible de charger les seances contrat.");
      }

      const seancesRaw = Array.isArray(payload?.seances)
        ? payload.seances
        : Array.isArray(payload)
          ? payload
          : [];
      const relationsRaw = Array.isArray(payload?.relations) ? payload.relations : [];
      console.log(
        `[refresh-seances] seances_count=${seancesRaw.length} relations_count=${relationsRaw.length}`
      );

      const nextCandidateSeanceMap = {};
      const candidateIdsBySeance = new Map();
      relationsRaw.forEach((relation) => {
        const seanceId = toSeanceId(relation?.seance_id ?? relation?.seanceId ?? relation?.id_seance);
        const candidatId = Number(relation?.candidat_id ?? relation?.candidatId ?? relation?.id_candidat);
        if (!seanceId || !Number.isInteger(candidatId) || candidatId <= 0) return;
        if (!candidateIdsBySeance.has(seanceId)) candidateIdsBySeance.set(seanceId, []);
        candidateIdsBySeance.get(seanceId).push(candidatId);
        nextCandidateSeanceMap[candidatId] = seanceId;
      });

      const normalizedSeances = seancesRaw.map((seance) => {
        const seanceId = toSeanceId(seance?.id ?? seance?.seance_id);
        return normalizeSeanceContratFields({
          id: seanceId || seance?.id,
          date: seance?.date,
          heure: seance?.heure,
          responsableId: seance?.responsable_id ?? seance?.responsableId,
          responsableNom: seance?.responsable_nom ?? seance?.responsableNom,
          statutSeance: seance?.statut_seance ?? seance?.statutSeance,
          candidatIds: seanceId ? candidateIdsBySeance.get(seanceId) || [] : [],
          createdAt: seance?.created_at ?? seance?.createdAt,
          nbPresents: Number(seance?.nb_presents ?? seance?.nbPresents ?? 0),
          nbAbsents: Number(seance?.nb_absents ?? seance?.nbAbsents ?? 0),
          dateCloture: seance?.date_cloture ?? seance?.dateCloture ?? null,
        });
      });

      setSeancesContrat(normalizedSeances);
      const maxSeanceId = normalizedSeances.reduce((maxId, seance) => Math.max(maxId, toSeanceId(seance?.id) || 0), 0);
      setNextSeanceId((current) => Math.max(current, maxSeanceId + 1));
      setCandidateSeanceMap(nextCandidateSeanceMap);
    } catch (error) {
      console.error("Erreur fetch seances contrat:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshCandidatsFromApi();
    refreshSeancesFromApi();
  }, [user, refreshCandidatsFromApi, refreshSeancesFromApi]);

  useEffect(() => {
    setCandidats((prev) => {
      let changed = false;
      const next = prev.map((candidate) => {
        const mappedSeanceId = toSeanceId(candidateSeanceMap[candidate.id]);
        const currentSeanceId = toSeanceId(candidate.seanceContratId);

        if (mappedSeanceId === currentSeanceId) {
          return candidate;
        }

        changed = true;
        const nextCandidate = {
          ...candidate,
          seanceContratId: mappedSeanceId || null,
        };
        if (mappedSeanceId) {
          nextCandidate.typeCandidat = TYPE_CANDIDAT_CONTRACT_SESSION;
        }

        return normalizeCandidateContractFields(nextCandidate);
      });
      return changed ? next : prev;
    });
  }, [candidateSeanceMap]);

  const addEntry = (entry) => {
    const newEntry = { ...entry, id: nextEId };
    setEntries((prev) => [...prev, newEntry]);
    setNextEId((n) => n + 1);
    return newEntry;
  };

  const addCandidatToEntry = (entryId, candidat) =>
    setEntries((prev) => prev.map((entry) => (entry.id === entryId ? { ...entry, candidats: [...entry.candidats, candidat] } : entry)));

  const removeCandidatFromEntry = (entryId, index) =>
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, candidats: entry.candidats.filter((_, candidateIndex) => candidateIndex !== index) }
          : entry
      )
    );

  const deleteEntry = (entryId) => setEntries((prev) => prev.filter((entry) => entry.id !== entryId));

  const addCandidat = (form) => {
    const candidate = normalizeCandidateContractFields({ ...form, id: nextCId });
    setCandidats((prev) => [...prev, candidate]);
    setNextCId((n) => n + 1);
    return candidate;
  };

  const updateCandidat = (updated) =>
    setCandidats((prev) =>
      prev.map((candidate) => (candidate.id === updated.id ? normalizeCandidateContractFields(updated) : candidate))
    );

  const patchCandidat = (candidatId, patch) => {
    setCandidats((prev) =>
      prev.map((candidate) =>
        candidate.id === candidatId
          ? normalizeCandidateContractFields({
              ...candidate,
              ...patch,
            })
          : candidate
      )
    );
  };

  const deleteCandidat = (id) => {
    setCandidats((prev) => prev.filter((candidate) => candidate.id !== id));
    setSeancesContrat((prev) =>
      prev.map((seance) => ({
        ...seance,
        candidatIds: seance.candidatIds.filter((candidateId) => candidateId !== id),
      }))
    );
  };

  const createSeanceContrat = ({
    id,
    date,
    heure,
    responsableId,
    responsableNom,
    candidatIds = [],
    statutSeance = STATUS_SEANCE_EN_COURS,
  }) => {
    const forcedId = toSeanceId(id);
    const resolvedSeanceId = forcedId || nextSeanceId;
    const seance = normalizeSeanceContratFields({
      id: resolvedSeanceId,
      date: date || new Date().toISOString().slice(0, 10),
      heure: heure || "09:00",
      responsableId: Number.isInteger(Number(responsableId)) ? Number(responsableId) : 0,
      responsableNom: (responsableNom || "Responsable contrat").trim(),
      candidatIds: Array.isArray(candidatIds) ? candidatIds : [],
      statutSeance: isSessionStatus(statutSeance) ? statutSeance : STATUS_SEANCE_EN_COURS,
      createdAt: new Date().toISOString(),
    });
    setSeancesContrat((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === seance.id);
      if (existingIndex === -1) return [...prev, seance];
      const next = [...prev];
      next[existingIndex] = seance;
      return next;
    });
    setNextSeanceId((value) => Math.max(value, resolvedSeanceId + 1));
    return seance;
  };

  const assignCandidatToSeance = async (candidatId, seanceId) => {
    const normalizedCandidateId = Number(candidatId);
    const normalizedSeanceId = toSeanceId(seanceId);
    if (!normalizedSeanceId || !Number.isInteger(normalizedCandidateId) || normalizedCandidateId <= 0) {
      return { ok: false, message: "candidat_id ou seance_id invalide." };
    }

    try {
      const response = await fetch(`http://localhost:3000/api/seances-contrat/${normalizedSeanceId}/candidats`, {
        method: "POST",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ candidat_id: normalizedCandidateId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          message: payload?.message || "Affectation a la seance impossible.",
        };
      }

      await refreshCandidatsFromApi();
      await refreshSeancesFromApi();

      return {
        ok: true,
        message: payload?.message || "Candidat affecte a la seance contrat.",
      };
    } catch (error) {
      console.error("Erreur assignCandidatToSeance:", error);
      return {
        ok: false,
        message: error?.message || "Erreur reseau.",
      };
    }
  };

  const setCandidatTypeContrat = async (candidatId, typeContrat) => {
    const normalizedCandidateId = Number(candidatId);
    const normalizedType = normalizeContractType(typeContrat);
    if (!Number.isInteger(normalizedCandidateId) || normalizedCandidateId <= 0) {
      return { ok: false, message: "ID candidat invalide." };
    }
    if (!normalizedType || !isContractType(normalizedType)) {
      return { ok: false, message: "Veuillez sélectionner un type de contrat valide." };
    }

    try {
      const response = await fetch(`http://localhost:3000/api/candidats/${normalizedCandidateId}/type-contrat`, {
        method: "PUT",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ type_contrat: normalizedType }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          message: payload?.message || "Mise a jour du type de contrat impossible.",
        };
      }

      const savedType = normalizeContractType(payload?.type_contrat || normalizedType) || normalizedType;
      patchCandidat(normalizedCandidateId, {
        typeContrat: savedType,
        type_contrat: savedType,
      });

      await refreshCandidatsFromApi();
      await refreshSeancesFromApi();

      return {
        ok: true,
        typeContrat: savedType,
        message: payload?.message || `Type contrat mis a jour (${savedType}).`,
      };
    } catch (error) {
      console.error("Erreur setCandidatTypeContrat:", error);
      return {
        ok: false,
        message: error?.message || "Erreur reseau.",
      };
    }
  };

  const sendCandidatToDossier = (candidatId) => {
    patchCandidat(candidatId, {
      typeCandidat: TYPE_CANDIDAT_DOSSIER_CONTRACT,
      statut: STATUS_EN_ATTENTE_DOSSIER,
      contratValide: false,
    });
  };

  const validerDossierContrat = async (candidatId, { dossierComplet } = {}) => {
    const normalizedCandidateId = Number(candidatId);
    if (!Number.isInteger(normalizedCandidateId) || normalizedCandidateId <= 0) {
      return { ok: false, message: "ID candidat invalide." };
    }

    try {
      const response = await fetch(`http://localhost:3000/api/candidats/${normalizedCandidateId}/dossier-contrat/valider`, {
        method: "POST",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ dossierComplet: dossierComplet === true }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          message: payload?.message || "Validation dossier impossible.",
        };
      }

      await refreshCandidatsFromApi();
      await refreshSeancesFromApi();

      return {
        ok: true,
        message: payload?.message || "Dossier valide.",
        etape: payload?.etape,
        statut: payload?.statut,
        contratSigne: Boolean(payload?.contrat_signe),
        dossierValide: Boolean(payload?.dossier_valide),
        finalise: Boolean(payload?.finalise),
      };
    } catch (error) {
      console.error("Erreur validerDossierContrat:", error);
      return {
        ok: false,
        message: error?.message || "Erreur reseau.",
      };
    }
  };

  const signerContratCandidat = async (candidatId, { lieuSignature } = {}) => {
    const normalizedCandidateId = Number(candidatId);
    if (!Number.isInteger(normalizedCandidateId) || normalizedCandidateId <= 0) {
      return { ok: false, message: "ID candidat invalide." };
    }

    const candidate = candidats.find((item) => item.id === normalizedCandidateId);
    const normalizedType = normalizeContractType(candidate?.type_contrat || candidate?.typeContrat);
    if (!normalizedType || !isContractType(normalizedType)) {
      return {
        ok: false,
        message: "Veuillez sélectionner le type de contrat avant de signer.",
      };
    }

    const safeLieuSignature = String(lieuSignature || SIGNATURE_SUR_PLACE).trim() || SIGNATURE_SUR_PLACE;
    const endpoint = `http://localhost:3000/api/candidats/${normalizedCandidateId}/contrat/signer`;
    const requestBody = {
      lieu_signature: safeLieuSignature,
      type_contrat: normalizedType,
    };

    try {
      console.log("[signerContratCandidat] request", {
        endpoint,
        method: "POST",
        body: requestBody,
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => null);
      console.log("[signerContratCandidat] response", {
        endpoint,
        status: response.status,
        ok: response.ok,
        payload,
      });

      if (!response.ok) {
        return {
          ok: false,
          message: payload?.message || "Signature contrat impossible.",
          details: payload?.details || null,
          status: response.status,
        };
      }

      await refreshCandidatsFromApi();
      await refreshSeancesFromApi();

      return {
        ok: true,
        message: payload?.message || "Contrat signe.",
        etape: payload?.etape,
        statut: payload?.statut,
        contratSigne: Boolean(payload?.contrat_signe),
        dossierValide: Boolean(payload?.dossier_valide),
        dateSignature: payload?.date_signature || null,
        dateDebut: payload?.date_debut || null,
        dateFin: payload?.date_fin || null,
        typeContrat: normalizeContractType(payload?.type_contrat || normalizedType) || normalizedType,
        contractInserted: Boolean(payload?.contract_inserted),
        duplicatePrevented: Boolean(payload?.duplicate_prevented),
        contratId: payload?.contrat_id || null,
        status: response.status,
        signatureLieu: payload?.lieu_signature || safeLieuSignature,
        finalise: Boolean(payload?.finalise),
      };
    } catch (error) {
      console.error("Erreur signerContratCandidat:", error?.message || error);
      console.error(error);
      return {
        ok: false,
        message: error?.message || "Erreur reseau.",
        details: null,
      };
    }
  };

  const sendSeanceCandidatesToDossier = async (seanceId) => {
    const normalizedSeanceId = toSeanceId(seanceId);
    if (!normalizedSeanceId) {
      return { ok: false, reason: "invalid_session", updatedCount: 0, alreadyCount: 0, missingType: [] };
    }

    try {
      const response = await fetch(`http://localhost:3000/api/seances-contrat/${normalizedSeanceId}/close`, {
        method: "POST",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = String(payload?.message || "").toLowerCase();
        if (response.status === 404) {
          return { ok: false, reason: "session_not_found", updatedCount: 0, alreadyCount: 0, missingType: [] };
        }
        if (response.status === 400 && message.includes("aucun candidat")) {
          return { ok: false, reason: "empty_session", updatedCount: 0, alreadyCount: 0, missingType: [] };
        }
        if (response.status === 409 && message.includes("deja")) {
          return { ok: false, reason: "session_closed", updatedCount: 0, alreadyCount: 0, missingType: [] };
        }
        if (response.status === 409 && message.includes("type contrat")) {
          return {
            ok: false,
            reason: "missing_contract_type",
            updatedCount: 0,
            alreadyCount: 0,
            missingType: Array.isArray(payload?.missing_type) ? payload.missing_type : [],
          };
        }

        return {
          ok: false,
          reason: "api_error",
          updatedCount: 0,
          alreadyCount: 0,
          missingType: [],
          message: payload?.message || "Cloture de seance impossible.",
        };
      }

      console.log(
        `[close-seance-api] seance_id=${normalizedSeanceId} linked=${Number(payload?.linked_candidates_count || payload?.total_count || 0)} updated=${Number(payload?.updated_count || 0)}`
      );

      await refreshCandidatsFromApi();
      await refreshSeancesFromApi();

      return {
        ok: true,
        reason: "updated_and_closed",
        updatedCount: Number(payload?.updated_count || 0),
        alreadyCount: Number(payload?.already_count || 0),
        removedRelationsCount: Number(payload?.removed_relations_count || 0),
        missingType: [],
        message: payload?.message || "Seance cloturee avec succes.",
      };
    } catch (error) {
      console.error("Erreur cloture seance:", error);
      return {
        ok: false,
        reason: "network_error",
        updatedCount: 0,
        alreadyCount: 0,
        missingType: [],
        message: error?.message || "Erreur reseau.",
      };
    }
  };

  const setCandidatContratSigne = (candidatId, signatureLieu = SIGNATURE_SUR_PLACE) => {
    return signerContratCandidat(candidatId, { lieuSignature: signatureLieu });
  };

  const unsetCandidatContratSigne = (candidatId) => {
    patchCandidat(candidatId, {
      typeCandidat: TYPE_CANDIDAT_DOSSIER_CONTRACT,
      statut: STATUS_EN_ATTENTE_DOSSIER,
      contratSigne: false,
    });
  };

  const seancesWithCandidats = useMemo(
    () =>
      seancesContrat.map((seance) => ({
        ...seance,
        candidats: seance.candidatIds
          .map((id) => candidats.find((candidate) => candidate.id === id))
          .filter(Boolean),
      })),
    [seancesContrat, candidats]
  );

  const waitingSeanceCandidates = useMemo(
    () =>
      candidats.filter(
        (candidate) =>
          isSeanceContractStatus(candidate.statut) &&
          !toSeanceId(candidate.seanceContratId)
      ),
    [candidats]
  );

  const todayStr = fmt(today);
  const todayEntries = entries.filter((entry) => entry.date === todayStr);
  const todayCount = todayEntries.reduce((sum, entry) => sum + entry.candidats.length, 0);
  const byDate = entries.reduce((acc, entry) => {
    acc[entry.date] = (acc[entry.date] || 0) + entry.candidats.length;
    return acc;
  }, {});

  return (
    <RecrutementsContext.Provider
      value={{
        entries,
        addEntry,
        addCandidatToEntry,
        removeCandidatFromEntry,
        deleteEntry,
        candidats,
        addCandidat,
        updateCandidat,
        patchCandidat,
        refreshCandidatsFromApi,
        refreshSeancesFromApi,
        deleteCandidat,
        seancesContrat,
        seancesWithCandidats,
        waitingSeanceCandidates,
        createSeanceContrat,
        assignCandidatToSeance,
        setCandidatTypeContrat,
        sendCandidatToDossier,
        validerDossierContrat,
        signerContratCandidat,
        sendSeanceCandidatesToDossier,
        setCandidatContratSigne,
        unsetCandidatContratSigne,
        todayStr,
        todayCount,
        todayEntries,
        byDate,
        postes: [
          "Operateur cablage",
          "Technicien controle",
          "Agent qualite",
          "Agent logistique",
          "Technicien maintenance",
          "Operateur production",
        ],
      }}
    >
      {children}
    </RecrutementsContext.Provider>
  );
}

export const useRecrutements = () => useContext(RecrutementsContext);
