import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import { buildRoleHeaders, normalizeRole } from "../utils/roles.js";
import "./CandidatsPage.css";

const STATUS_NOUVEAU = "Nouveau";
const STATUS_ACCEPTE = "Accepte";
const STATUS_REFUSE = "Refuse";
const ENTRETIEN_OK = "OK";
const ENTRETIEN_NOK = "NOK";
const ENTRETIEN_ATTENTE = "EN_ATTENTE";
const INCOMPLETE_INTERVIEW_TO_SEANCE_MESSAGE = "Impossible d\u2019envoyer vers S\u00e9ance contrat : les informations d\u2019entretien sont incompl\u00e8tes.";
const TYPE_CANDIDAT_CONTRACT_SESSION = "contract_session_pending";
const statutChoices = ["Tous", STATUS_NOUVEAU, STATUS_ACCEPTE, STATUS_REFUSE];
const ALLOWED_GENRES = ["Femme", "Homme"];

const candidateTypes = [
  {
    id: "candidat",
    short: "Candidat",
    title: "Candidat (entr\u00e9e)",
    desc: "Personne ajout\u00e9e directement au d\u00e9but du processus de recrutement.",
    headerClass: "candidat",
    badgeBg: "#e8f2fa",
    badgeColor: "#1d6d9e",
  },
  {
    id: "test_passed",
    short: "Test / Entretien",
    title: "Candidats en phase test et entretien",
    desc: "Passage entretien avec r\u00e9sultat OK ou NOK.",
    headerClass: "test",
    badgeBg: "#e4f3fb",
    badgeColor: "#1c759f",
  },
];

const typeMap = Object.fromEntries(candidateTypes.map((type) => [type.id, type]));
const typeToRoute = {
  candidat: "candidat",
  test_passed: "test",
};
const routeToType = Object.fromEntries(
  Object.entries(typeToRoute).map(([typeId, routeKey]) => [routeKey, typeId])
);
const statutColors = {
  [STATUS_NOUVEAU]: { bg: "#e8f2fa", color: "#1f6e9f" },
  [STATUS_ACCEPTE]: { bg: "#def4e9", color: "#1f885c" },
  [STATUS_REFUSE]: { bg: "#fdecec", color: "#bf3f3f" },
};

const gouvs = [
  "Tous",
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Zaghouan",
  "Bizerte",
  "Beja",
  "Jendouba",
  "Le Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabes",
  "Medenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kebili",
];

const niveaux = [
  "Tous",
  "1 AS",
  "2 AS",
  "3 AS",
  "4 AS",
  "6 AP",
  "7 AS",
  "7 B",
  "8 B",
  "9 B",
  "Baccalaur\u00e9at",
  "BTP",
  "BTS",
  "BTS/BTP",
  "CAP",
  "Ing\u00e9nieur",
  "Licence",
  "Master",
  "Non renseign\u00e9",
  "Sans dipl\u00f4me",
  "Technicien sup\u00e9rieur",
];
const postes = [
  "Operateur cablage",
  "Technicien controle",
  "Agent qualite",
  "Agent logistique",
  "Technicien maintenance",
  "Operateur production",
];
const niveauOptions = [
  "Tous",
  "1 AS",
  "2 AS",
  "3 AS",
  "4 AS",
  "6 AP",
  "7 AS",
  "7 B",
  "8 B",
  "9 B",
  "Baccalauréat",
  "BTP",
  "BTS",
  "BTS/BTP",
  "CAP",
  "Ingénieur",
  "Licence",
  "Master", 
  "Technicien supérieur",
];
const MAX_CIN_LENGTH = 8;
const MAX_PHONE_LENGTH = 8;
const MAX_AGE_LENGTH = 2;
const MIN_CANDIDATE_AGE = 18;
const MIN_CANDIDATE_AGE_MESSAGE = "L\u2019\u00e2ge du candidat doit \u00eatre sup\u00e9rieur ou \u00e9gal \u00e0 18 ans.";
const DEFAULT_VISIBLE_MOVEMENTS = 10;
const MOVEMENT_FILTERS = [
  { id: "all", label: "Tous", step: "" },
  { id: "test", label: "Vers Test / Entretien", step: "TEST_ENTRETIEN" },
  { id: "seance", label: "Vers Séance Contrat", step: "SEANCE_INFO" },
];

function inferCandidateType(candidat) {
  if (candidat.typeCandidat === TYPE_CANDIDAT_CONTRACT_SESSION) return TYPE_CANDIDAT_CONTRACT_SESSION;
  if (candidat.typeCandidat === "contact_contract") return "contact_contract";
  if (typeMap[candidat.typeCandidat]) return candidat.typeCandidat;
  if (candidat.entretienResult === ENTRETIEN_OK) return "contact_contract";
  return "candidat";
}

function normalizeBeforeSave(candidate) {
  const next = { ...candidate };
  next.typeCandidat = typeMap[next.typeCandidat] ? next.typeCandidat : inferCandidateType(next);
  if (![ENTRETIEN_OK, ENTRETIEN_NOK, ENTRETIEN_ATTENTE].includes(next.entretienResult)) {
    next.entretienResult = ENTRETIEN_ATTENTE;
  }

  const normalizedEtape = norm(next.etape);
  const normalizedStatut = norm(next.statut);

  if (normalizedEtape === "reintegration") {
    next.etape = "CANDIDAT";
  }
  if (normalizedStatut.startsWith("reintegr")) {
    next.statut = STATUS_NOUVEAU;
  }

  if (next.typeCandidat === "contact_contract") {
    next.entretienResult = ENTRETIEN_OK;
    next.statut = STATUS_ACCEPTE;
    next.documentsContrat = next.documentsContrat || {};
    if (typeof next.contratSigne !== "boolean") next.contratSigne = false;
    if (typeof next.contratValide !== "boolean") next.contratValide = false;
  }

  next.canalEntree = normalizeCanalEntree(next.canalEntree);
  return next;
}

function norm(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function isFinalizedCandidate(candidate) {
  const statut = String(candidate?.statut || "").trim().toUpperCase();
  const etape = String(candidate?.etape || "").trim().toUpperCase();
  const contratSigne = toBooleanFlag(candidate?.contratSigne ?? candidate?.contrat_signe);
  const dossierValide = toBooleanFlag(candidate?.dossierValide ?? candidate?.dossier_valide);

  return (
    statut === "CONTRAT_FINALISE" ||
    etape === "NOUVEAU_RECRUTE" ||
    (contratSigne && dossierValide)
  );
}

function normalizeCanalEntree(value) {
  const label = String(value || "").trim();
  if (!label) return "Candidat";

  const normalized = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "direct" || normalized === "survey" || normalized === "candidat") {
    return "Candidat";
  }

  return label;
}

function sanitizeDigits(value, maxLength) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

function phoneHref(phone) {
  const digits = (phone || "").replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function buildCandidateFormValues(source = {}) {
  return {
    nom: String(source.nom || source.nomComplet || ""),
    cin: sanitizeDigits(source.cin, MAX_CIN_LENGTH),
    telephone: sanitizeDigits(source.telephone, MAX_PHONE_LENGTH),
    age: sanitizeDigits(source.age, MAX_AGE_LENGTH),
    genre: String(source.genre || source.sexe || ""),
    niveauScolaire: String(source.niveauScolaire || source.niveau_scolaire || source.niveauEtudes || ""),
    poste: String(source.poste || source.posteVise || postes[0] || ""),
    adresse: String(source.adresse || ""),
  };
}

function isValidGenre(value) {
  return ALLOWED_GENRES.includes(String(value || "").trim());
}

function validateCandidateFields(values, options = {}) {
  const { requireGenre = false, minimumAge = 1 } = options;
  const nextErrors = {};
  const trimmedNom = values.nom.trim();
  const trimmedCin = values.cin.trim();
  const trimmedTelephone = values.telephone.trim();
  const trimmedAge = values.age.trim();
  const trimmedGenre = String(values.genre || "").trim();
  const trimmedNiveau = values.niveauScolaire.trim();
  const trimmedPoste = values.poste.trim();
  const trimmedAdresse = values.adresse.trim();

  if (!trimmedNom) {
    nextErrors.nom = "Le nom complet est obligatoire.";
  }

  if (!trimmedCin) {
    nextErrors.cin = "Le CIN est obligatoire.";
  } else if (!/^\d{8}$/.test(trimmedCin)) {
    nextErrors.cin = "Le CIN doit contenir exactement 8 chiffres.";
  }

  if (!trimmedTelephone) {
    nextErrors.telephone = "Le telephone est obligatoire.";
  } else if (!/^\d{8}$/.test(trimmedTelephone)) {
    nextErrors.telephone = "Le telephone doit contenir exactement 8 chiffres.";
  }

  if (!trimmedAge) {
    nextErrors.age = "L'age est obligatoire.";
  } else if (!/^\d+$/.test(trimmedAge) || Number(trimmedAge) <= 0) {
    nextErrors.age = "L'age doit etre un nombre valide.";
  } else if (Number(trimmedAge) < minimumAge) {
    nextErrors.age = MIN_CANDIDATE_AGE_MESSAGE;
  }

  if (requireGenre && !trimmedGenre) {
    nextErrors.genre = "Le genre est obligatoire.";
  } else if (requireGenre && !isValidGenre(trimmedGenre)) {
    nextErrors.genre = "Le genre doit etre Femme ou Homme.";
  }

  if (!trimmedNiveau) {
    nextErrors.niveauScolaire = "Le niveau scolaire est obligatoire.";
  }

  if (!trimmedPoste) {
    nextErrors.poste = "Le poste est obligatoire.";
  }

  if (!trimmedAdresse) {
    nextErrors.adresse = "L'adresse est obligatoire.";
  }

  return nextErrors;
}

function buildCandidatePayload(values, options = {}) {
  const { includeGenre = false } = options;
  const payload = {
    nom: values.nom.trim(),
    cin: values.cin.trim(),
    telephone: values.telephone.trim(),
    age: Number(values.age.trim()),
    niveau_scolaire: values.niveauScolaire.trim(),
    poste: values.poste.trim(),
    adresse: values.adresse.trim(),
  };

  if (includeGenre) {
    payload.genre = String(values.genre || "").trim();
  }

  return payload;
}

function normalizeInterviewTransferResult(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === ENTRETIEN_OK) return ENTRETIEN_OK;
  if (normalized === ENTRETIEN_NOK) return ENTRETIEN_NOK;
  return ENTRETIEN_ATTENTE;
}

function hasRequiredInterviewDetails(values = {}) {
  return ["fonction", "segment", "projet", "site"].every((key) => String(values?.[key] || "").trim() !== "");
}

function hasCompleteInterviewForSeance(values = {}) {
  return hasRequiredInterviewDetails(values) && normalizeInterviewTransferResult(values?.resultat_entretien || values?.entretienResult) === ENTRETIEN_OK;
}

async function fetchHasCompleteInterviewForSeance(candidateId, user) {
  const response = await fetch(`http://localhost:3000/api/test-entretien/${candidateId}`, {
    headers: buildRoleHeaders(user),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "Chargement des entretiens impossible.");
  }

  const interviews = Array.isArray(payload?.interviews) ? payload.interviews : [];
  return interviews.some((interview) => hasCompleteInterviewForSeance(interview));
}

function getEntretienMeta(value) {
  if (value === ENTRETIEN_OK) return { label: "Entretien OK", className: "ok" };
  if (value === ENTRETIEN_NOK) return { label: "Entretien NOK", className: "nok" };
  return { label: "Entretien en attente", className: "wait" };
}

function formatMovementStep(step) {
  const normalized = String(step || "").trim().toUpperCase();
  if (normalized === "TEST_ENTRETIEN") return "Test / Entretien";
  if (normalized === "SEANCE_INFO") return "Séance Contrat";
  if (normalized === "CANDIDAT" || normalized === "CANDIDATURE") return "Candidat";
  return String(step || "-");
}

function formatMovementRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "Admin";
  if (normalized === "recruteur") return "Recruteur";
  if (normalized === "contrats") return "Contrats";
  return String(role || "").trim();
}

function formatMovementUser(mouvement) {
  const userName = String(mouvement?.utilisateur_nom || "").trim() || "Utilisateur inconnu";
  const userRole = formatMovementRole(mouvement?.utilisateur_role);
  return userRole ? `Par : ${userName} — ${userRole}` : `Par : ${userName}`;
}

function getMovementBadgeClass(step) {
  const normalized = String(step || "").trim().toUpperCase();
  if (normalized === "TEST_ENTRETIEN") return "test";
  if (normalized === "SEANCE_INFO") return "seance";
  return "neutral";
}

function formatSqlDateTime(value) {
  if (!value) return "-";

  const cleanValue = String(value)
    .replace("T", " ")
    .replace("Z", "")
    .split(".")[0];

  const [datePart, timePart] = cleanValue.split(" ");

  if (!datePart || !timePart) return cleanValue;

  const [year, month, day] = datePart.split("-");
  const [hour, minute] = timePart.split(":");

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function mapApiCandidate(candidate) {
  const etape = String(candidate?.etape || "CANDIDATURE").trim().toUpperCase();
  const contratSigne = toBooleanFlag(candidate?.contrat_signe ?? candidate?.contratSigne);
  const dossierValide = toBooleanFlag(candidate?.dossier_valide ?? candidate?.dossierValide);
  const rawStatut = String(candidate?.statut || "").trim();
  const latestInterviewResult = normalizeInterviewTransferResult(candidate?.dernier_resultat_entretien);

  let typeCandidat = "candidat";

  if (etape === "TEST_ENTRETIEN") {
    typeCandidat = "test_passed";
  } else if (etape === "SEANCE_INFO") {
    typeCandidat = TYPE_CANDIDAT_CONTRACT_SESSION;
  } else if (etape === "DOSSIER_CONTRAT") {
    typeCandidat = "contact_contract";
  }

  const statut =
    rawStatut ||
    (etape === "SEANCE_INFO"
      ? "En attente seance contrat"
      : etape === "DOSSIER_CONTRAT"
      ? "EN_ATTENTE_DOSSIER"
      : STATUS_NOUVEAU);

  let entretienResult = ENTRETIEN_ATTENTE;
  if (etape === "SEANCE_INFO" || etape === "DOSSIER_CONTRAT") {
    entretienResult = ENTRETIEN_OK;
  } else if (etape === "TEST_ENTRETIEN") {
    entretienResult = latestInterviewResult;
  }

  return normalizeBeforeSave({
    id: candidate?.id,
    nomComplet: candidate?.nom || "",
    cin: candidate?.cin || "",
    telephone: candidate?.telephone || "",
    age: candidate?.age ? String(candidate.age) : "",
    genre: candidate?.genre || "",
    adresse: candidate?.adresse || "",
    niveauEtudes: candidate?.niveauEtudes || candidate?.niveau_etudes || candidate?.niveau_scolaire || "",
    posteVise: candidate?.poste || "",
    canalEntree: normalizeCanalEntree(candidate?.canalEntree || candidate?.canal),
    testPasse: candidate?.dernier_test_effectue || "",
    entretienAvec: candidate?.dernier_interviewer || "",
    fonction: candidate?.dernier_fonction || "",
    segment: candidate?.dernier_segment || "",
    projet: candidate?.dernier_projet || "",
    site: candidate?.dernier_site || "",

    // ✅ AJOUT IMPORTANT
    etape: etape,

    typeCandidat,
    statut,
    email: "",
    gouvernoratResidence: "",
    notes: "",
    entretienResult,
    documentsContrat: {},
    contratSigne,
    contrat_signe: contratSigne,
    dossierValide,
    dossier_valide: dossierValide,
    contratValide: dossierValide,
    typeContrat: candidate?.type_contrat || "",
    type_contrat: candidate?.type_contrat || "",
    statutContrat: candidate?.statut_contrat || "",
    statut_contrat: candidate?.statut_contrat || "",
    statutDossier: candidate?.statut_dossier || "",
    statut_dossier: candidate?.statut_dossier || "",
    dateSignature: candidate?.date_signature || null,
    date_signature: candidate?.date_signature || null,
    situation_familiale: candidate?.situation_familiale || "",
  });
}
export default function CandidatsPage() {
  const { typePage = "candidat" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshCandidatsFromApi } = useRecrutements();
  const currentTypeId = routeToType[typePage] || "candidat";
  const currentType = typeMap[currentTypeId];

  const [candidats, setCandidats] = useState([]);
  const [search, setSearch] = useState("");
  const [filtreGouv, setFiltreGouv] = useState("Tous");
  const [filtreNiveau, setFiltreNiveau] = useState("Tous");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [nom, setNom] = useState("");
  const [cin, setCin] = useState("");
  const [telephone, setTelephone] = useState("");
  const [age, setAge] = useState("");
  const [genre, setGenre] = useState("");
  const [niveauScolaire, setNiveauScolaire] = useState("");
  const [poste, setPoste] = useState(postes[0] || "");
  const [adresse, setAdresse] = useState("");
  const [gouvernoratOptions, setGouvernoratOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [submissionMessage, setSubmissionMessage] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [editCandidateId, setEditCandidateId] = useState(null);
  const [editForm, setEditForm] = useState(() => buildCandidateFormValues());
  const [editErrors, setEditErrors] = useState({});
  const [editMessage, setEditMessage] = useState("");
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [mouvements, setMouvements] = useState([]);
  const [movementFilter, setMovementFilter] = useState("all");
  const [mouvementsError, setMouvementsError] = useState("");
  const [visibleMovementCount, setVisibleMovementCount] = useState(DEFAULT_VISIBLE_MOVEMENTS);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  const fetchCandidats = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/candidats");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Impossible de charger les candidats.");
      }
      const next = Array.isArray(data) ? data.map((candidate) => mapApiCandidate(candidate)) : [];
      setCandidats(next);
    } catch (error) {
      const message = error?.message || "Erreur reseau pendant le chargement des candidats.";
      setSubmissionMessage(message);
    }
  };

  const fetchMouvements = async (filterId = movementFilter) => {
    try {
      const selectedFilter = MOVEMENT_FILTERS.find((item) => item.id === filterId) || MOVEMENT_FILTERS[0];
      const url = new URL("http://localhost:3000/api/candidats/mouvements");
      if (selectedFilter.step) {
        url.searchParams.set("nouvelle_etape", selectedFilter.step);
      }

      const res = await fetch(url.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Impossible de charger la traçabilité.");
      }

      setMouvements(Array.isArray(data?.mouvements) ? data.mouvements : []);
      setMouvementsError("");
    } catch (error) {
      setMouvements([]);
      setMouvementsError(error?.message || "Erreur reseau pendant le chargement de la traçabilité.");
    }
  };

  useEffect(() => {
    fetchCandidats();
  }, []);

  useEffect(() => {
    fetch("http://localhost:3000/api/references/candidat-options")
      .then((res) => res.json())
      .then((data) => setGouvernoratOptions(Array.isArray(data?.gouvernorats) ? data.gouvernorats : []))
      .catch(() => setGouvernoratOptions([]));
  }, []);

  useEffect(() => {
    fetchMouvements(movementFilter);
  }, [movementFilter]);

  useEffect(() => {
    setVisibleMovementCount(DEFAULT_VISIBLE_MOVEMENTS);
  }, [movementFilter, mouvements.length]);

  const candidatsNormalized = useMemo(
    () =>
      candidats
        .map((c) => ({ ...c, typeCandidat: inferCandidateType(c) }))
        .filter((candidate) => !isFinalizedCandidate(candidate)),
    [candidats]
  );

  const filtered = useMemo(() => {
    const q = norm(search);
    return candidatsNormalized.filter((c) => {
      const matchSearch =
        !q ||
        [
          c.nomComplet,
          c.cin,
          c.telephone,
          c.age,
          c.adresse,
          c.email,
          c.gouvernoratResidence,
          c.niveauEtudes,
          c.posteVise,
          c.statut,
          c.entretienResult,
          c.notes,
          typeMap[c.typeCandidat]?.title,
        ]
          .map(norm)
          .some((v) => v.includes(q));
      const matchGouv = filtreGouv === "Tous" || norm(c.gouvernoratResidence) === norm(filtreGouv);
      const matchNiveau = filtreNiveau === "Tous" || norm(c.niveauEtudes) === norm(filtreNiveau);
      const matchStatut = filtreStatut === "Tous" || c.statut === filtreStatut;
      const matchType = c.typeCandidat === currentTypeId;
      return matchSearch && matchGouv && matchNiveau && matchStatut && matchType;
    });
  }, [candidatsNormalized, search, filtreGouv, filtreNiveau, filtreStatut, currentTypeId]);

  const grouped = useMemo(
    () =>
      candidateTypes.map((type) => ({
        ...type,
        total: candidatsNormalized.filter((c) => c.typeCandidat === type.id).length,
      })),
    [candidatsNormalized]
  );

  const lane = { ...currentType, items: filtered };
  const displayedMouvements = useMemo(
    () => mouvements.slice(0, visibleMovementCount),
    [mouvements, visibleMovementCount]
  );
  const hasMoreMouvements = mouvements.length > visibleMovementCount;
  const editingCandidate = editCandidateId
    ? candidats.find((candidate) => candidate.id === editCandidateId) || null
    : null;

  const pushToast = (message, type = "success", timeout = 2200) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) =>
        current.message === message ? { message: "", type: "success" } : current
      );
    }, timeout);
  };

  const updateCandidat = (updated) => {
    setCandidats((prev) =>
      prev.map((candidate) =>
        candidate.id === updated.id ? normalizeBeforeSave(updated) : candidate
      )
    );
  };

  const removeCandidateFromState = (candidateId) => {
    setCandidats((prev) => prev.filter((candidate) => candidate.id !== candidateId));
  };

  const sendToTest = async (candidate) => {
    try {
      const response = await fetch(`http://localhost:3000/api/candidats/${candidate.id}/etape`, {
        method: "PUT",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ etape: "TEST_ENTRETIEN" }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Erreur lors du changement d'etape.");
      }

      await fetchCandidats();
      await fetchMouvements();
      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }
      pushToast(`${candidate.nomComplet} passe a l'etape: Test / Entretien`);
    } catch (error) {
      console.error(error);
      pushToast(error?.message || "Erreur lors du changement d'etape.");
    }
  };

  const handleEntretienOK = async (candidate) => {
    const hasCompleteInterview = await fetchHasCompleteInterviewForSeance(candidate.id, user);
    if (!hasCompleteInterview) {
      throw new Error(INCOMPLETE_INTERVIEW_TO_SEANCE_MESSAGE);
    }

    const response = await fetch(`http://localhost:3000/api/candidats/${candidate.id}/etape`, {
      method: "PUT",
      headers: buildRoleHeaders(user, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        etape: "SEANCE_INFO",
        statut: "En attente seance contrat",
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || "Erreur lors de la mise a jour entretien.");
    }

    await fetchCandidats();
    await fetchMouvements();
    if (typeof refreshCandidatsFromApi === "function") {
      await refreshCandidatsFromApi();
    }
  };

 const setEntretienResult = async (candidate, result) => {
  if (result === ENTRETIEN_OK) {
    try {
      await handleEntretienOK(candidate);
      pushToast(`Entretien OK: ${candidate.nomComplet}`);
    } catch (error) {
      console.error(error);
      pushToast(error?.message || "Erreur lors de la mise a jour entretien.");
    }

    return;
  }



    const nextStatut = result === ENTRETIEN_NOK ? STATUS_REFUSE : STATUS_NOUVEAU;
    const next = normalizeBeforeSave({
      ...candidate,
      typeCandidat: "test_passed",
      entretienResult: result,
      statut: nextStatut,
      contratSigne: false,
      contratValide: false,
    });
    updateCandidat(next);
    const msg =
      result === ENTRETIEN_NOK
        ? `Entretien NOK: ${candidate.nomComplet} reste sur l'etape Test.`
        : `Entretien remis en attente pour ${candidate.nomComplet}.`;
    pushToast(msg);
  };

  const openDossier = (candidateId) => {
    navigate(`/candidats/test/${candidateId}/dossier`);
  };

  const clearFieldError = (fieldName) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const clearEditFieldError = (fieldName) => {
    setEditErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const startEditCandidate = (candidate) => {
    setEditCandidateId(candidate.id);
    setEditForm(buildCandidateFormValues(candidate));
    setEditErrors({});
    setEditMessage("");
  };

  const cancelEditCandidate = () => {
    setEditCandidateId(null);
    setEditForm(buildCandidateFormValues());
    setEditErrors({});
    setEditMessage("");
  };

  const resetCreateForm = () => {
    setNom("");
    setCin("");
    setTelephone("");
    setAge("");
    setGenre("");
    setNiveauScolaire("");
    setPoste(postes[0] || "");
    setAdresse("");
    setErrors({});
    setSubmissionMessage("");
  };

  const validateForm = () => {
    const nextErrors = validateCandidateFields({
      nom,
      cin,
      telephone,
      age,
      genre,
      niveauScolaire,
      poste,
      adresse,
    }, { requireGenre: true, minimumAge: MIN_CANDIDATE_AGE });
    setErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;
    setSubmissionMessage(isValid ? "" : "Veuillez corriger les champs obligatoires avant d'ajouter le candidat.");
    return isValid;
  };

  const validateEditForm = () => {
    const nextErrors = validateCandidateFields(editForm, { requireGenre: true });
    setEditErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;
    setEditMessage(isValid ? "" : "Veuillez corriger les champs obligatoires avant de modifier le candidat.");
    return isValid;
  };

  const createCandidate = () => {
    setShowCreate(false);
    resetCreateForm();
    pushToast("Nouveau candidat ajoute.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionMessage("");
    if (!validateForm()) {
      return;
    }

    const data = {
      nom: nom.trim(),
      cin: cin.trim(),
      telephone: telephone.trim(),
      age: Number(age.trim()),
      niveau_scolaire: niveauScolaire.trim(),
      poste: poste.trim(),
      adresse: adresse.trim(),
      genre: String(genre || "").trim(),
    };

    try {
      const response = await fetch("http://localhost:3000/api/candidats", {
        method: "POST",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(data),
      });

      const text = await response.text();
      let result = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error("Le serveur renvoie du HTML au lieu de JSON.");
      }

      if (!response.ok) {
        throw new Error(result?.message || "Erreur lors de l'ajout du candidat.");
      }

      await fetchCandidats();
      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }
      await fetchMouvements();
      createCandidate();
    } catch (error) {
      const message = error?.message || "Erreur reseau.";
      setSubmissionMessage(message);
      pushToast(message);
    }
  };

  const handleEditSubmit = async (e, candidateId) => {
    e.preventDefault();
    setEditMessage("");

    if (!validateEditForm()) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/candidats/${candidateId}`, {
        method: "PUT",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(buildCandidatePayload(editForm, { includeGenre: true })),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Erreur lors de la modification du candidat.");
      }

      await fetchCandidats();
      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }
      await fetchMouvements();
      cancelEditCandidate();
      pushToast("Candidat modifié avec succès.");
    } catch (error) {
      const message = error?.message || "Erreur reseau lors de la modification.";
      setEditMessage(message);
      pushToast(message);
    }
  };

  const openDeleteCandidateModal = (candidate) => {
    setCandidateToDelete(candidate);
  };

  const closeDeleteCandidateModal = () => {
    if (isDeletingCandidate) {
      return;
    }
    setCandidateToDelete(null);
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete?.id) {
      return;
    }

    try {
      setIsDeletingCandidate(true);
      const response = await fetch(`http://localhost:3000/api/candidats/${candidateToDelete.id}`, {
        method: "DELETE",
        headers: buildRoleHeaders(user),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Erreur lors de la suppression du candidat.");
      }

      await fetchCandidats();
      await fetchMouvements();
      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }
      if (editCandidateId === candidateToDelete.id) {
        cancelEditCandidate();
      }
      setCandidateToDelete(null);
      pushToast("Candidat supprimé avec succès.", "success");
    } catch (error) {
      const message = error?.message || "Erreur reseau lors de la suppression.";
      pushToast(message, "error", 3200);
    } finally {
      setIsDeletingCandidate(false);
    }
  };

  return (
    <div className="cand-page">
      {toast.message && <div className={`cand-toast ${toast.type}`}>{toast.message}</div>}

      {candidateToDelete && (
        <div className="cand-modal-overlay" role="presentation" onClick={closeDeleteCandidateModal}>
          <div
            className="cand-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cand-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cand-modal-head">
              <h3 id="cand-delete-title">Confirmer la suppression</h3>
            </div>
            <div className="cand-modal-body">
              <p>Voulez-vous vraiment supprimer ce candidat ? Cette action est définitive.</p>
              <div className="cand-modal-candidate">
                <strong>{candidateToDelete.nomComplet || "-"}</strong>
                <span>CIN : {candidateToDelete.cin || "-"}</span>
              </div>
            </div>
            <div className="cand-modal-actions">
              <button type="button" className="cand-modal-cancel" onClick={closeDeleteCandidateModal} disabled={isDeletingCandidate}>
                Annuler
              </button>
              <button type="button" className="cand-modal-confirm" onClick={handleDeleteCandidate} disabled={isDeletingCandidate}>
                {isDeletingCandidate ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCandidate && (
        <div className="cand-modal-overlay" role="presentation" onClick={cancelEditCandidate}>
          <div
            className="cand-modal cand-modal-large"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cand-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cand-modal-head">
              <h3 id="cand-edit-title">Modifier le candidat</h3>
            </div>
            <form className="cand-modal-form" onSubmit={(e) => handleEditSubmit(e, editingCandidate.id)}>
              <div className="cand-modal-body">
                {editMessage && <div className="cand-create-hint error">{editMessage}</div>}

                <div className="cand-modal-candidate">
                  <strong>{editingCandidate.nomComplet || "-"}</strong>
                  <span>CIN : {editingCandidate.cin || "-"}</span>
                </div>

                <div className="cand-modal-grid">
                  <div className={`cand-create-field ${editErrors.nom ? "is-invalid" : ""}`}>
                    <label htmlFor="cand-edit-nom">Nom complet</label>
                    <input
                      id="cand-edit-nom"
                      value={editForm.nom}
                      onChange={(e) => {
                        setEditForm((prev) => ({ ...prev, nom: e.target.value }));
                        clearEditFieldError("nom");
                      }}
                      placeholder="Nom complet"
                      required
                      aria-invalid={Boolean(editErrors.nom)}
                    />
                    {editErrors.nom && <span className="cand-create-error">{editErrors.nom}</span>}
                  </div>

                  <div className={`cand-create-field ${editErrors.cin ? "is-invalid" : ""}`}>
                    <label htmlFor="cand-edit-cin">CIN</label>
                    <input
                      id="cand-edit-cin"
                      value={editForm.cin}
                      onChange={(e) => {
                        setEditForm((prev) => ({
                          ...prev,
                          cin: sanitizeDigits(e.target.value, MAX_CIN_LENGTH),
                        }));
                        clearEditFieldError("cin");
                      }}
                      placeholder="00000000"
                      inputMode="numeric"
                      pattern="\d{8}"
                      maxLength={MAX_CIN_LENGTH}
                      required
                      aria-invalid={Boolean(editErrors.cin)}
                    />
                    {editErrors.cin && <span className="cand-create-error">{editErrors.cin}</span>}
                  </div>

                  <div className={`cand-create-field ${editErrors.telephone ? "is-invalid" : ""}`}>
                    <label htmlFor="cand-edit-telephone">{"T\u00e9l\u00e9phone"}</label>
                    <input
                      id="cand-edit-telephone"
                      value={editForm.telephone}
                      onChange={(e) => {
                        setEditForm((prev) => ({
                          ...prev,
                          telephone: sanitizeDigits(e.target.value, MAX_PHONE_LENGTH),
                        }));
                        clearEditFieldError("telephone");
                      }}
                      placeholder="22000000"
                      inputMode="numeric"
                      pattern="\d{8}"
                      maxLength={MAX_PHONE_LENGTH}
                      required
                      aria-invalid={Boolean(editErrors.telephone)}
                    />
                    {editErrors.telephone && <span className="cand-create-error">{editErrors.telephone}</span>}
                  </div>

                  <div className={`cand-create-field ${editErrors.age ? "is-invalid" : ""}`}>
                    <label htmlFor="cand-edit-age">{"\u00c2ge"}</label>
                    <input
                      id="cand-edit-age"
                      value={editForm.age}
                      onChange={(e) => {
                        setEditForm((prev) => ({
                          ...prev,
                          age: sanitizeDigits(e.target.value, MAX_AGE_LENGTH),
                        }));
                        clearEditFieldError("age");
                      }}
                      placeholder="24"
                      inputMode="numeric"
                      pattern="\d+"
                      maxLength={MAX_AGE_LENGTH}
                      required
                      aria-invalid={Boolean(editErrors.age)}
                    />
                    {editErrors.age && <span className="cand-create-error">{editErrors.age}</span>}
                  </div>

                  <div className={`cand-create-field ${editErrors.genre ? "is-invalid" : ""}`}>
                    <label htmlFor="cand-edit-genre">Genre</label>
                    <select
                      id="cand-edit-genre"
                      value={editForm.genre}
                      onChange={(e) => {
                        setEditForm((prev) => ({ ...prev, genre: e.target.value }));
                        clearEditFieldError("genre");
                      }}
                      required
                      aria-invalid={Boolean(editErrors.genre)}
                    >
                      <option value="">Sélectionner un genre</option>
                      <option value="Femme">Femme</option>
                      <option value="Homme">Homme</option>
                    </select>
                    {editErrors.genre && <span className="cand-create-error">{editErrors.genre}</span>}
                  </div>

                  <div className={`cand-create-field ${editErrors.niveauScolaire ? "is-invalid" : ""}`}>
                    <label htmlFor="cand-edit-niveau">Niveau scolaire</label>
                    <select
                      id="cand-edit-niveau"
                      value={editForm.niveauScolaire}
                      onChange={(e) => {
                        setEditForm((prev) => ({ ...prev, niveauScolaire: e.target.value }));
                        clearEditFieldError("niveauScolaire");
                      }}
                      required
                      aria-invalid={Boolean(editErrors.niveauScolaire)}
                    >
                      <option value="">Sélectionner un niveau</option>
                      {niveauOptions
                        .filter((niveau) => niveau !== "Tous")
                        .map((niveau) => (
                          <option key={niveau} value={niveau}>
                            {niveau}
                          </option>
                        ))}
                    </select>
                    {editErrors.niveauScolaire && (
                      <span className="cand-create-error">{editErrors.niveauScolaire}</span>
                    )}
                  </div>

                  <div className={`cand-create-field ${editErrors.poste ? "is-invalid" : ""}`}>
                    <label htmlFor="cand-edit-poste">Poste</label>
                    <select
                      id="cand-edit-poste"
                      value={editForm.poste}
                      onChange={(e) => {
                        setEditForm((prev) => ({ ...prev, poste: e.target.value }));
                        clearEditFieldError("poste");
                      }}
                      required
                      aria-invalid={Boolean(editErrors.poste)}
                    >
                      {postes.map((posteOption) => (
                        <option key={posteOption} value={posteOption}>
                          {posteOption}
                        </option>
                      ))}
                    </select>
                    {editErrors.poste && <span className="cand-create-error">{editErrors.poste}</span>}
                  </div>

                  <div className={`cand-create-field cand-create-field-wide ${editErrors.adresse ? "is-invalid" : ""}`}>
                    <label htmlFor="cand-edit-adresse">Adresse / Gouvernorat</label>
                    <select
                      id="cand-edit-adresse"
                      value={editForm.adresse}
                      onChange={(e) => {
                        setEditForm((prev) => ({ ...prev, adresse: e.target.value }));
                        clearEditFieldError("adresse");
                      }}
                      required
                      aria-invalid={Boolean(editErrors.adresse)}
                    >
                      <option value="">Sélectionner un gouvernorat</option>
                      {gouvernoratOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {editErrors.adresse && <span className="cand-create-error">{editErrors.adresse}</span>}
                  </div>
                </div>
              </div>

              <div className="cand-modal-actions">
                <button type="button" className="cand-modal-cancel" onClick={cancelEditCandidate}>
                  Annuler
                </button>
                <button type="submit" className="cand-modal-save">
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="cand-header">
        <div>
          <h2>Gestion des Candidats</h2>
          <p>Page actuelle: {currentType.title}</p>
        </div>
        <button
          className="cand-create-btn"
          onClick={() => {
            if (!showCreate) {
              resetCreateForm();
            }
            setShowCreate((v) => !v);
          }}
        >
          {showCreate ? "Fermer creation" : "Nouveau candidat"}
        </button>
      </div>

      {showCreate && (
        <form className="cand-create-box" onSubmit={handleSubmit}>
          {submissionMessage && <div className="cand-create-hint error">{submissionMessage}</div>}

          <div className={`cand-create-field ${errors.nom ? "is-invalid" : ""}`}>
            <label htmlFor="cand-nom">Nom complet</label>
            <input
              id="cand-nom"
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                clearFieldError("nom");
              }}
              placeholder="Nom complet"
              autoComplete="name"
              required
              aria-invalid={Boolean(errors.nom)}
            />
            {errors.nom && <span className="cand-create-error">{errors.nom}</span>}
          </div>

          <div className={`cand-create-field ${errors.cin ? "is-invalid" : ""}`}>
            <label htmlFor="cand-cin">CIN</label>
            <input
              id="cand-cin"
              value={cin}
              onChange={(e) => {
                setCin(sanitizeDigits(e.target.value, MAX_CIN_LENGTH));
                clearFieldError("cin");
              }}
              placeholder="00000000"
              inputMode="numeric"
              pattern="\d{8}"
              maxLength={MAX_CIN_LENGTH}
              required
              aria-invalid={Boolean(errors.cin)}
            />
            {errors.cin && <span className="cand-create-error">{errors.cin}</span>}
          </div>

          <div className={`cand-create-field ${errors.telephone ? "is-invalid" : ""}`}>
            <label htmlFor="cand-telephone">{"T\u00e9l\u00e9phone"}</label>
            <input
              id="cand-telephone"
              value={telephone}
              onChange={(e) => {
                setTelephone(sanitizeDigits(e.target.value, MAX_PHONE_LENGTH));
                clearFieldError("telephone");
              }}
              placeholder="22000000"
              autoComplete="tel"
              inputMode="numeric"
              pattern="\d{8}"
              maxLength={MAX_PHONE_LENGTH}
              required
              aria-invalid={Boolean(errors.telephone)}
            />
            {errors.telephone && <span className="cand-create-error">{errors.telephone}</span>}
          </div>

          <div className={`cand-create-field ${errors.age ? "is-invalid" : ""}`}>
            <label htmlFor="cand-age">{"\u00c2ge"}</label>
            <input
              id="cand-age"
              type="text"
              value={age}
              onChange={(e) => {
                setAge(sanitizeDigits(e.target.value, MAX_AGE_LENGTH));
                clearFieldError("age");
              }}
              placeholder="24"
              inputMode="numeric"
              pattern="\d+"
              maxLength={MAX_AGE_LENGTH}
              required
              aria-invalid={Boolean(errors.age)}
            />
            {errors.age && <span className="cand-create-error">{errors.age}</span>}
          </div>

          <div className={`cand-create-field ${errors.genre ? "is-invalid" : ""}`}>
            <label htmlFor="cand-genre">Genre</label>
            <select
              id="cand-genre"
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value);
                clearFieldError("genre");
              }}
              required
              aria-invalid={Boolean(errors.genre)}
            >
              <option value="">Sélectionner un genre</option>
              <option value="Femme">Femme</option>
              <option value="Homme">Homme</option>
            </select>
            {errors.genre && <span className="cand-create-error">{errors.genre}</span>}
          </div>

          <div className={`cand-create-field ${errors.niveauScolaire ? "is-invalid" : ""}`}>
            <label htmlFor="cand-niveau">Niveau scolaire</label>
            <select
              id="cand-niveau"
              value={niveauScolaire}
              onChange={(e) => {
                setNiveauScolaire(e.target.value);
                clearFieldError("niveauScolaire");
              }}
              required
              aria-invalid={Boolean(errors.niveauScolaire)}
            >
              <option value="">Sélectionner un niveau</option>
              {niveauOptions
                .filter((niveau) => niveau !== "Tous")
                .map((niveau) => (
                  <option key={niveau} value={niveau}>
                    {niveau}
                  </option>
                ))}
            </select>
            {errors.niveauScolaire && <span className="cand-create-error">{errors.niveauScolaire}</span>}
          </div>

          <div className={`cand-create-field ${errors.poste ? "is-invalid" : ""}`}>
            <label htmlFor="cand-poste">Poste</label>
            <select
              id="cand-poste"
              value={poste}
              onChange={(e) => {
                setPoste(e.target.value);
                clearFieldError("poste");
              }}
              required
              aria-invalid={Boolean(errors.poste)}
            >
              {postes.map((posteOption) => (
                <option key={posteOption} value={posteOption}>
                  {posteOption}
                </option>
              ))}
            </select>
            {errors.poste && <span className="cand-create-error">{errors.poste}</span>}
          </div>

          <div className={`cand-create-field cand-create-field-wide ${errors.adresse ? "is-invalid" : ""}`}>
            <label htmlFor="cand-adresse">Adresse</label>
            <select
              id="cand-adresse"
              value={adresse}
              onChange={(e) => {
                setAdresse(e.target.value);
                clearFieldError("adresse");
              }}
              required
              aria-invalid={Boolean(errors.adresse)}
            >
              <option value="">Sélectionner un gouvernorat</option>
              {gouvernoratOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {errors.adresse && <span className="cand-create-error">{errors.adresse}</span>}
          </div>

          <button type="submit" className="cand-create-submit">
            Ajouter
          </button>
        </form>
      )}

      <div className="cand-type-strip">
        {grouped.map((g) => (
          <NavLink
            key={g.id}
            to={`/candidats/${typeToRoute[g.id]}`}
            className={`cand-type-card ${g.headerClass} ${currentTypeId === g.id ? "active" : ""}`}
          >
            <span className="cand-type-count">{g.total}</span>
            <span className="cand-type-title">{g.short}</span>
            <small>{g.title}</small>
          </NavLink>
        ))}
      </div>

      <div className="cand-filters">
        <div className="cand-search-wrap">
          <span className="cand-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, CIN ou téléphone..."
          />
        </div>
        <div className="cand-filter-field">
          <label>Gouvernorat</label>
          <select value={filtreGouv} onChange={(e) => setFiltreGouv(e.target.value)}>
            {gouvs.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="cand-filter-field">
          <label>Niveau</label>
          <select value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)}>
            {niveauOptions.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="cand-filter-field">
          <label>Statut admin</label>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
            {statutChoices.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <button
          className="cand-reset"
          onClick={() => {
            setSearch("");
            setFiltreGouv("Tous");
            setFiltreNiveau("Tous");
            setFiltreStatut("Tous");
          }}
        >
          Réinitialiser
        </button>
      </div>

      <section className="cand-trace-card">
        <button
          type="button"
          className="cand-trace-head"
          onClick={() => setIsTraceOpen((prev) => !prev)}
          aria-expanded={isTraceOpen}
        >
          <div className="cand-trace-head-copy">
            <h3>Traçabilité du processus</h3>
            <p>Derniers mouvements des candidats dans le workflow.</p>
          </div>
          <div className="cand-trace-head-side">
            <span className="cand-trace-count">{mouvements.length}</span>
            <span className={`cand-trace-chevron ${isTraceOpen ? "open" : ""}`} aria-hidden="true">
              {isTraceOpen ? "▲" : "▼"}
            </span>
          </div>
        </button>

        {isTraceOpen && (
          <>
          <div className="cand-trace-filters">
            {MOVEMENT_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`cand-trace-filter ${movementFilter === filter.id ? "active" : ""}`}
                onClick={() => setMovementFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

        {mouvementsError ? (
          <div className="cand-trace-empty error">{mouvementsError}</div>
        ) : mouvements.length === 0 ? (
          <div className="cand-trace-empty">Aucun mouvement enregistré pour ce filtre.</div>
        ) : (
          <>
          <div className="cand-trace-list">
            {displayedMouvements.map((mouvement) => (
              <article key={mouvement.id} className="cand-trace-item">
                <div className="cand-trace-main">
                  <div className="cand-trace-topline">
                    <strong>{mouvement.nom || "Candidat"}</strong>
                    <span>CIN: {mouvement.cin || "-"}</span>
                  </div>
                  <div className="cand-trace-action">{mouvement.action || "-"}</div>
                  <div className="cand-trace-user">{formatMovementUser(mouvement)}</div>
                  <div className="cand-trace-route">
                    <span>{formatMovementStep(mouvement.ancienne_etape)}</span>
                    <span className="cand-trace-arrow" aria-hidden="true">→</span>
                    <span className={`cand-trace-badge ${getMovementBadgeClass(mouvement.nouvelle_etape)}`}>
                      {formatMovementStep(mouvement.nouvelle_etape)}
                    </span>
                  </div>
                  {mouvement.commentaire && (
                    <div className="cand-trace-comment">{mouvement.commentaire}</div>
                  )}
                </div>
                <time className="cand-trace-date" dateTime={mouvement.created_at || ""}>
                  {formatSqlDateTime(mouvement.created_at)}
                </time>
              </article>
            ))}
          </div>
          {hasMoreMouvements && (
            <div className="cand-trace-more-wrap">
              <button
                type="button"
                className="cand-trace-more"
                onClick={() => setVisibleMovementCount((prev) => prev + DEFAULT_VISIBLE_MOVEMENTS)}
              >
                Voir plus
              </button>
            </div>
          )}
          </>
        )}
          </>
        )}
      </section>

      <div className="cand-board single">
        <section className="cand-lane">
          <div className={`cand-lane-head ${lane.headerClass}`}>
            <div>
              <h3>{lane.title}</h3>
              <p>{lane.desc}</p>
            </div>
            <span>{lane.items.length}</span>
          </div>
          <div className="cand-lane-body">
            {lane.items.length === 0 ? (
              <div className="cand-empty">Aucun candidat dans cette categorie avec les filtres actifs.</div>
            ) : (
              lane.items.map((c) => {
                const status = statutColors[c.statut] || statutColors[STATUS_NOUVEAU];
                const entretien = getEntretienMeta(c.entretienResult);
                return (
                  <article key={c.id} className="cand-card">
                    <div className="cand-card-top">
                      <div className="cand-avatar">{(c.nomComplet || "?").charAt(0).toUpperCase()}</div>
                      <div>
                        <h4>{c.nomComplet}</h4>
                        <p>CIN: {c.cin}</p>
                      </div>
                      {currentTypeId === "test_passed" && (
                        <button className="dossier-open" onClick={() => openDossier(c.id)}>
                          Consulter dossier
                        </button>
                      )}
                    </div>

                    <div className="cand-badges">
                      <span style={{ background: lane.badgeBg, color: lane.badgeColor }}>{lane.short}</span>
                      <span style={{ background: status.bg, color: status.color }}>{c.statut}</span>
                      {currentTypeId === "test_passed" && (
                        <span className={`interview-badge ${entretien.className}`}>{entretien.label}</span>
                      )}
                    </div>

                    <div className="cand-meta">
                      <div>
                        <label>Canal</label>
                        <strong>{normalizeCanalEntree(c.canalEntree)}</strong>
                      </div>
                      <div>
                        <label>{"\u00c2ge"}</label>
                        <strong>{c.age || "-"}</strong>
                      </div>
                      <div>
                        <label>Genre</label>
                        <strong>{c.genre || "-"}</strong>
                      </div>
                      <div>
                        <label>Niveau scolaire</label>
                        <strong>{c.niveauEtudes || "-"}</strong>
                      </div>
                      <div>
                        <label>Poste</label>
                        <strong>{c.posteVise || "-"}</strong>
                      </div>
                      <div>
                        <label>Adresse</label>
                        <strong>{c.adresse || "-"}</strong>
                      </div>
                      <div>
                        <label>{"R\u00e9sidence"}</label>
                        <strong>{c.gouvernoratResidence || "-"}</strong>
                      </div>
                      <div>
                        <label>{"T\u00e9l\u00e9phone"}</label>
                        <strong>{c.telephone || "-"}</strong>
                      </div>
                      {c.notes && (
                        <div className="cand-remark">
                          <label>Remarque</label>
                          <strong>{c.notes}</strong>
                        </div>
                      )}
                    </div>

                    <div className="cand-workflow-move">
                      {c.typeCandidat === "candidat" && (
                        <button
                          type="button"
                          className="cand-send-btn"
                          onClick={() => sendToTest(c)}
                        >
                          Envoyer au Test / Entretien
                        </button>
                      )}
                    </div>

                    {currentTypeId === "test_passed" && (
                      <div className="cand-interview-actions">
                        <button
                          className={`interview-ok ${c.entretienResult === ENTRETIEN_OK ? "active" : ""}`}
                          onClick={() => setEntretienResult(c, ENTRETIEN_OK)}
                        >
                          Entretien OK
                        </button>
                        <button
                          className={`interview-nok ${c.entretienResult === ENTRETIEN_NOK ? "active" : ""}`}
                          onClick={() => setEntretienResult(c, ENTRETIEN_NOK)}
                        >
                          Entretien NOK
                        </button>
                      </div>
                    )}

                    <div className="cand-actions">
                      <button type="button" className="action-link" onClick={() => startEditCandidate(c)}>
                        Modifier
                      </button>
                      {currentTypeId === "test_passed" && (
                        <button className="dossier-link" onClick={() => openDossier(c.id)}>
                          Consulter dossier
                        </button>
                      )}
                      <button type="button" className="delete-link" onClick={() => openDeleteCandidateModal(c)}>
                        Supprimer
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
