import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import "./CandidatsPage.css";

const STATUS_NOUVEAU = "Nouveau";
const STATUS_ACCEPTE = "Accepte";
const STATUS_REFUSE = "Refuse";
const ENTRETIEN_OK = "OK";
const ENTRETIEN_NOK = "NOK";
const ENTRETIEN_ATTENTE = "EN_ATTENTE";
const TYPE_CANDIDAT_CONTRACT_SESSION = "contract_session_pending";
const statutChoices = ["Tous", STATUS_NOUVEAU, STATUS_ACCEPTE, STATUS_REFUSE];
const ALLOWED_GENRES = ["Femme", "Homme"];

const candidateTypes = [
  {
    id: "candidat",
    short: "Candidat",
    title: "Candidat (entree)",
    desc: "Personne ajoutee directement au debut du processus de recrutement.",
    headerClass: "candidat",
    badgeBg: "#e8f2fa",
    badgeColor: "#1d6d9e",
  },
  {
    id: "test_passed",
    short: "Test / Entretien",
    title: "Candidats en phase test et entretien",
    desc: "Passage entretien avec resultat OK ou NOK.",
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
  "Baccalauréat",
  "BTP",
  "BTS",
  "BTS/BTP",
  "CAP",
  "Ingénieur",
  "Licence",
  "Master",
  "Non renseigné",
  "Sans diplôme",
  "Technicien supérieur",
];
const postes = [
  "Operateur cablage",
  "Technicien controle",
  "Agent qualite",
  "Agent logistique",
  "Technicien maintenance",
  "Operateur production",
];
const MAX_CIN_LENGTH = 8;
const MAX_PHONE_LENGTH = 8;
const MAX_AGE_LENGTH = 2;

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
  const { requireGenre = false } = options;
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

function getEntretienMeta(value) {
  if (value === ENTRETIEN_OK) return { label: "Entretien OK", className: "ok" };
  if (value === ENTRETIEN_NOK) return { label: "Entretien NOK", className: "nok" };
  return { label: "Entretien en attente", className: "wait" };
}
function mapApiCandidate(candidate) {
  const etape = String(candidate?.etape || "CANDIDATURE").trim().toUpperCase();

  let typeCandidat = "candidat";

  if (etape === "TEST_ENTRETIEN") {
    typeCandidat = "test_passed";
  } else if (etape === "SEANCE_INFO") {
    typeCandidat = TYPE_CANDIDAT_CONTRACT_SESSION;
  } else if (etape === "DOSSIER_CONTRAT") {
    typeCandidat = "contact_contract";
  }

  const statut =
    (candidate?.statut || "").trim() ||
    (etape === "SEANCE_INFO"
      ? "En attente seance contrat"
      : etape === "DOSSIER_CONTRAT"
      ? "EN_ATTENTE_DOSSIER"
      : STATUS_NOUVEAU);

  const entretienResult = etape === "SEANCE_INFO" || etape === "DOSSIER_CONTRAT" ? ENTRETIEN_OK : ENTRETIEN_ATTENTE;

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

    // ✅ AJOUT IMPORTANT
    etape: etape,

    typeCandidat,
    statut,
    email: "",
    gouvernoratResidence: "",
    notes: "",
    entretienResult,
    documentsContrat: {},
    contratSigne: false,
    contratValide: false,
  });
}
export default function CandidatsPage() {
  const { typePage = "candidat" } = useParams();
  const navigate = useNavigate();
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
  const [errors, setErrors] = useState({});
  const [submissionMessage, setSubmissionMessage] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState("");
  const [editCandidateId, setEditCandidateId] = useState(null);
  const [editForm, setEditForm] = useState(() => buildCandidateFormValues());
  const [editErrors, setEditErrors] = useState({});
  const [editMessage, setEditMessage] = useState("");

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

  useEffect(() => {
    fetchCandidats();
  }, []);

  const candidatsNormalized = useMemo(
    () => candidats.map((c) => ({ ...c, typeCandidat: inferCandidateType(c) })),
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

  const pushToast = (message, timeout = 2200) => {
    setToast(message);
    setTimeout(() => setToast(""), timeout);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ etape: "TEST_ENTRETIEN" }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Erreur lors du changement d'etape.");
      }

      await fetchCandidats();
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
    const response = await fetch(`http://localhost:3000/api/candidats/${candidate.id}/etape`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
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
    }, { requireGenre: true });
    setErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;
    setSubmissionMessage(isValid ? "" : "Veuillez corriger les champs obligatoires avant d'ajouter le candidat.");
    return isValid;
  };

  const validateEditForm = () => {
    const nextErrors = validateCandidateFields(editForm);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const text = await response.text();
console.log("Réponse brute edit :", text);

let result = {};
try {
  result = text ? JSON.parse(text) : {};
} catch (e) {
  throw new Error("Le serveur renvoie du HTML au lieu de JSON.");
}

if (!response.ok) {
  throw new Error(result?.message || "Erreur lors de la modification du candidat.");
}

      await fetchCandidats();
      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildCandidatePayload(editForm)),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Erreur lors de la modification du candidat.");
      }

      await fetchCandidats();
      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }
      cancelEditCandidate();
      pushToast("Candidat modifie avec succes.");
    } catch (error) {
      const message = error?.message || "Erreur reseau lors de la modification.";
      setEditMessage(message);
      pushToast(message);
    }
  };

  const handleDeleteCandidate = async (candidate) => {
    const confirmed = window.confirm(`Supprimer le candidat ${candidate.nomComplet} ?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/candidats/${candidate.id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Erreur lors de la suppression du candidat.");
      }

      removeCandidateFromState(candidate.id);
      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }
      if (editCandidateId === candidate.id) {
        cancelEditCandidate();
      }
      pushToast("Candidat supprime avec succes.");
    } catch (error) {
      const message = error?.message || "Erreur reseau lors de la suppression.";
      pushToast(message);
    }
  };

  return (
    <div className="cand-page">
      {toast && <div className="cand-toast success">{toast}</div>}

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
            <label htmlFor="cand-telephone">Telephone</label>
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
            <label htmlFor="cand-age">Age</label>
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
              <option value="">Selectionner un niveau</option>
              {niveaux
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
            <input
              id="cand-adresse"
              value={adresse}
              onChange={(e) => {
                setAdresse(e.target.value);
                clearFieldError("adresse");
              }}
              placeholder="Adresse complete"
              autoComplete="street-address"
              required
              aria-invalid={Boolean(errors.adresse)}
            />
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
            {niveaux.map((n) => (
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
                const tel = phoneHref(c.telephone);
                const mail = c.email ? `mailto:${c.email}` : "";
                const entretien = getEntretienMeta(c.entretienResult);
                const isEditing = currentTypeId === "test_passed" && editCandidateId === c.id;
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
                        <label>Age</label>
                        <strong>{c.age || "-"}</strong>
                      </div>
                      <div>
                        <label>GENRE</label>
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
                        <label>Residence</label>
                        <strong>{c.gouvernoratResidence || "-"}</strong>
                      </div>
                      <div>
                        <label>Telephone</label>
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

                    {isEditing && (
                      <form className="cand-create-box cand-edit-box" onSubmit={(e) => handleEditSubmit(e, c.id)}>
                        {editMessage && <div className="cand-create-hint error">{editMessage}</div>}

                        <div className={`cand-create-field ${editErrors.nom ? "is-invalid" : ""}`}>
                          <label htmlFor={`edit-nom-${c.id}`}>Nom complet</label>
                          <input
                            id={`edit-nom-${c.id}`}
                            value={editForm.nom}
                            onChange={(e) => {
                              setEditForm((prev) => ({ ...prev, nom: e.target.value }));
                              clearEditFieldError("nom");
                            }}
                            required
                            aria-invalid={Boolean(editErrors.nom)}
                          />
                          {editErrors.nom && <span className="cand-create-error">{editErrors.nom}</span>}
                        </div>

                        <div className={`cand-create-field ${editErrors.cin ? "is-invalid" : ""}`}>
                          <label htmlFor={`edit-cin-${c.id}`}>CIN</label>
                          <input
                            id={`edit-cin-${c.id}`}
                            value={editForm.cin}
                            onChange={(e) => {
                              setEditForm((prev) => ({
                                ...prev,
                                cin: sanitizeDigits(e.target.value, MAX_CIN_LENGTH),
                              }));
                              clearEditFieldError("cin");
                            }}
                            inputMode="numeric"
                            pattern="\d{8}"
                            maxLength={MAX_CIN_LENGTH}
                            required
                            aria-invalid={Boolean(editErrors.cin)}
                          />
                          {editErrors.cin && <span className="cand-create-error">{editErrors.cin}</span>}
                        </div>

                        <div className={`cand-create-field ${editErrors.telephone ? "is-invalid" : ""}`}>
                          <label htmlFor={`edit-tel-${c.id}`}>Telephone</label>
                          <input
                            id={`edit-tel-${c.id}`}
                            value={editForm.telephone}
                            onChange={(e) => {
                              setEditForm((prev) => ({
                                ...prev,
                                telephone: sanitizeDigits(e.target.value, MAX_PHONE_LENGTH),
                              }));
                              clearEditFieldError("telephone");
                            }}
                            inputMode="numeric"
                            pattern="\d{8}"
                            maxLength={MAX_PHONE_LENGTH}
                            required
                            aria-invalid={Boolean(editErrors.telephone)}
                          />
                          {editErrors.telephone && <span className="cand-create-error">{editErrors.telephone}</span>}
                        </div>

                        <div className={`cand-create-field ${editErrors.age ? "is-invalid" : ""}`}>
                          <label htmlFor={`edit-age-${c.id}`}>Age</label>
                          <input
                            id={`edit-age-${c.id}`}
                            value={editForm.age}
                            onChange={(e) => {
                              setEditForm((prev) => ({
                                ...prev,
                                age: sanitizeDigits(e.target.value, MAX_AGE_LENGTH),
                              }));
                              clearEditFieldError("age");
                            }}
                            inputMode="numeric"
                            pattern="\d+"
                            maxLength={MAX_AGE_LENGTH}
                            required
                            aria-invalid={Boolean(editErrors.age)}
                          />
                          {editErrors.age && <span className="cand-create-error">{editErrors.age}</span>}
                        </div>

                        <div className={`cand-create-field ${editErrors.niveauScolaire ? "is-invalid" : ""}`}>
                          <label htmlFor={`edit-niveau-${c.id}`}>Niveau scolaire</label>
                          <select
                            id={`edit-niveau-${c.id}`}
                            value={editForm.niveauScolaire}
                            onChange={(e) => {
                              setEditForm((prev) => ({ ...prev, niveauScolaire: e.target.value }));
                              clearEditFieldError("niveauScolaire");
                            }}
                            required
                            aria-invalid={Boolean(editErrors.niveauScolaire)}
                          >
                            <option value="">Selectionner un niveau</option>
                            {niveaux
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
                          <label htmlFor={`edit-poste-${c.id}`}>Poste</label>
                          <select
                            id={`edit-poste-${c.id}`}
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
                          <label htmlFor={`edit-adresse-${c.id}`}>Adresse</label>
                          <input
                            id={`edit-adresse-${c.id}`}
                            value={editForm.adresse}
                            onChange={(e) => {
                              setEditForm((prev) => ({ ...prev, adresse: e.target.value }));
                              clearEditFieldError("adresse");
                            }}
                            required
                            aria-invalid={Boolean(editErrors.adresse)}
                          />
                          {editErrors.adresse && <span className="cand-create-error">{editErrors.adresse}</span>}
                        </div>

                        <div className="cand-edit-actions">
                          <button type="submit" className="cand-create-submit">
                            Enregistrer
                          </button>
                          <button type="button" className="action-link" onClick={cancelEditCandidate}>
                            Annuler
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="cand-actions">
                      {currentTypeId === "test_passed" ? (
                        <button className="action-link" onClick={() => startEditCandidate(c)}>
                          Edit
                        </button>
                      ) : (
                        <a
                          className={`action-link ${!tel ? "disabled" : ""}`}
                          href={tel || "#"}
                          onClick={(e) => !tel && e.preventDefault()}
                        >
                          Appeler
                        </a>
                      )}
                      {currentTypeId !== "test_passed" && (
                        <a
                          className={`action-link ${!mail ? "disabled" : ""}`}
                          href={mail || "#"}
                          onClick={(e) => !mail && e.preventDefault()}
                        >
                          Envoyer mail
                        </a>
                      )}
                      {currentTypeId === "test_passed" && (
                        <button className="dossier-link" onClick={() => openDossier(c.id)}>
                          Consulter dossier
                        </button>
                      )}
                      <button className="delete-link" onClick={() => handleDeleteCandidate(c)}>
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
