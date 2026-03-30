import { useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import "./CandidatsPage.css";

const STATUS_NOUVEAU = "Nouveau";
const STATUS_REINTEGRE = "R\u00E9int\u00E9gr\u00E9";
const STATUS_ACCEPTE = "Accepte";
const STATUS_REFUSE = "Refuse";
const AVIS_OK = "OK";
const AVIS_REFUSE = "REFUSE";
const AVIS_ATTENTE = "PAS_DE_REPONSE";
const ENTRETIEN_OK = "OK";
const ENTRETIEN_NOK = "NOK";
const ENTRETIEN_ATTENTE = "EN_ATTENTE";
const statutChoices = ["Tous", STATUS_NOUVEAU, STATUS_REINTEGRE, STATUS_ACCEPTE, STATUS_REFUSE];

const candidateTypes = [
  {
    id: "candidat",
    short: "Candidat",
    title: "Candidat (entree)",
    desc: "Personne venue chercher travail, en direct ou via survey. Debut du processus.",
    headerClass: "candidat",
    badgeBg: "#e8f2fa",
    badgeColor: "#1d6d9e",
  },
  {
    id: "survey_ready",
    short: "Survey",
    title: "Survey remplie",
    desc: "Candidat ayant rempli le formulaire. Agent recrutement: appel + mail dossier.",
    headerClass: "survey",
    badgeBg: "#deedf9",
    badgeColor: "#1d6d9e",
  },
  {
    id: "test_passed",
    short: "Test",
    title: "Test valide",
    desc: "Passage entretien avec resultat OK ou NOK.",
    headerClass: "test",
    badgeBg: "#e4f3fb",
    badgeColor: "#1c759f",
  },
  {
    id: "reintegrated_pending",
    short: "Reintegre",
    title: "Reintegre - attente juridique",
    desc: "Candidat reintegre en attente de l'avis juridique avant signature contrat.",
    headerClass: "reintegre",
    badgeBg: "#dff1ea",
    badgeColor: "#1c7a56",
  },
];

const typeMap = Object.fromEntries(candidateTypes.map((type) => [type.id, type]));
const typeToRoute = {
  candidat: "candidat",
  survey_ready: "survey",
  test_passed: "test",
  reintegrated_pending: "reintegres",
};
const routeToType = Object.fromEntries(
  Object.entries(typeToRoute).map(([typeId, routeKey]) => [routeKey, typeId])
);
const statutColors = {
  [STATUS_NOUVEAU]: { bg: "#e8f2fa", color: "#1f6e9f" },
  [STATUS_REINTEGRE]: { bg: "#dff1ea", color: "#1c7a56" },
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
  "Sans diplome",
  "Baccalaureat",
  "BTS / BTP",
  "Licence",
  "Master",
  "Ingenieur",
];
const postes = [
  "Operateur cablage",
  "Technicien controle",
  "Agent qualite",
  "Agent logistique",
  "Technicien maintenance",
  "Operateur production",
];

function inferCandidateType(candidat) {
  if (candidat.typeCandidat === "contact_contract") return "contact_contract";
  if (typeMap[candidat.typeCandidat]) return candidat.typeCandidat;
  if (candidat.entretienResult === ENTRETIEN_OK) return "contact_contract";
  if ([STATUS_REINTEGRE, STATUS_ACCEPTE, STATUS_REFUSE].includes(candidat.statut)) {
    return "reintegrated_pending";
  }
  return "candidat";
}

function normalizeBeforeSave(candidate) {
  const next = { ...candidate };
  next.typeCandidat = typeMap[next.typeCandidat] ? next.typeCandidat : inferCandidateType(next);
  if (next.typeCandidat === "survey_ready") next.posteVise = "";
  if (![ENTRETIEN_OK, ENTRETIEN_NOK, ENTRETIEN_ATTENTE].includes(next.entretienResult)) {
    next.entretienResult = ENTRETIEN_ATTENTE;
  }

  if (next.typeCandidat === "contact_contract") {
    next.entretienResult = ENTRETIEN_OK;
    next.statut = STATUS_ACCEPTE;
    next.documentsContrat = next.documentsContrat || {};
    if (typeof next.contratSigne !== "boolean") next.contratSigne = false;
    if (typeof next.contratValide !== "boolean") next.contratValide = false;
  }

  if (next.typeCandidat === "reintegrated_pending") {
    if (![STATUS_REINTEGRE, STATUS_ACCEPTE, STATUS_REFUSE].includes(next.statut)) {
      next.statut = STATUS_REINTEGRE;
    }
    if (![AVIS_OK, AVIS_REFUSE, AVIS_ATTENTE].includes(next.avisJuridique)) {
      next.avisJuridique = AVIS_ATTENTE;
    }
  } else if (
    next.typeCandidat !== "contact_contract" &&
    [STATUS_REINTEGRE, STATUS_ACCEPTE, STATUS_REFUSE].includes(next.statut)
  ) {
    next.statut = STATUS_NOUVEAU;
    next.avisJuridique = "";
  }

  if (!next.canalEntree) next.canalEntree = "Direct";
  return next;
}

function norm(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function addRemark(existingNotes, remark) {
  const cleanRemark = (remark || "").trim();
  if (!cleanRemark) return (existingNotes || "").trim();
  const current = (existingNotes || "").trim();
  if (!current) return cleanRemark;
  const alreadyPresent = current
    .split("|")
    .map((part) => part.trim().toLowerCase())
    .includes(cleanRemark.toLowerCase());
  if (alreadyPresent) return current;
  return `${current} | ${cleanRemark}`;
}

function phoneHref(phone) {
  const digits = (phone || "").replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function getEntretienMeta(value) {
  if (value === ENTRETIEN_OK) return { label: "Entretien OK", className: "ok" };
  if (value === ENTRETIEN_NOK) return { label: "Entretien NOK", className: "nok" };
  return { label: "Entretien en attente", className: "wait" };
}

export default function CandidatsPage() {
  const { typePage = "candidat" } = useParams();
  const navigate = useNavigate();
  const { candidats, addCandidat, updateCandidat, deleteCandidat } = useRecrutements();
  const currentTypeId = routeToType[typePage] || "candidat";
  const currentType = typeMap[currentTypeId];
  const showPosteField = currentTypeId !== "survey_ready";

  const [search, setSearch] = useState("");
  const [filtreGouv, setFiltreGouv] = useState("Tous");
  const [filtreNiveau, setFiltreNiveau] = useState("Tous");
  const [filtreStatut, setFiltreStatut] = useState("Tous");

  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState({
    nomComplet: "",
    cin: "",
    telephone: "",
    email: "",
    canalEntree: "Direct",
    targetType: "candidat",
    gouvernoratResidence: "",
    niveauEtudes: "",
    posteVise: postes[0],
  });

  const createTypeId = typeMap[draft.targetType] ? draft.targetType : currentTypeId;
  const createHasPoste = createTypeId !== "survey_ready";

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
          c.email,
          c.gouvernoratResidence,
          c.posteVise,
          c.avisJuridique,
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

  const moveToType = (candidate, nextType) => {
    updateCandidat(normalizeBeforeSave({ ...candidate, typeCandidat: nextType }));
    pushToast(`${candidate.nomComplet} passe vers ${typeMap[nextType].short}.`);
  };

  const setLegalDecision = (candidate, decision) => {
    if (decision === AVIS_OK) {
      const next = normalizeBeforeSave({
        ...candidate,
        typeCandidat: "test_passed",
        statut: STATUS_NOUVEAU,
        avisJuridique: AVIS_OK,
        entretienResult: ENTRETIEN_ATTENTE,
        notes: addRemark(candidate.notes, "Avis juridique OK - Reintegre"),
        contratSigne: false,
        contratValide: false,
      });
      updateCandidat(next);
      pushToast(`Avis juridique OK: ${candidate.nomComplet} passe vers l'etape Test.`);
      return;
    }

    const nextStatut = decision === AVIS_REFUSE ? STATUS_REFUSE : STATUS_REINTEGRE;
    const next = normalizeBeforeSave({
      ...candidate,
      typeCandidat: "reintegrated_pending",
      statut: nextStatut,
      avisJuridique: decision,
    });
    updateCandidat(next);
    const msg =
      decision === AVIS_REFUSE
        ? `Avis juridique refuse: ${candidate.nomComplet} refuse.`
        : `Avis juridique en attente: ${candidate.nomComplet} (pas de reponse).`;
    pushToast(msg);
  };

  const setEntretienResult = (candidate, result) => {
    if (result === ENTRETIEN_OK) {
      const next = normalizeBeforeSave({
        ...candidate,
        typeCandidat: "contact_contract",
        entretienResult: ENTRETIEN_OK,
        statut: STATUS_ACCEPTE,
      });
      updateCandidat(next);
      pushToast(`Entretien OK: ${candidate.nomComplet} envoye au service Contrats.`);
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

  const createCandidate = () => {
    if (!draft.nomComplet.trim() || !draft.cin.trim() || !draft.telephone.trim()) return;
    const canal = createTypeId === "survey_ready" ? "Survey" : draft.canalEntree || "Direct";
    const payload = normalizeBeforeSave({
      ...draft,
      typeCandidat: createTypeId,
      canalEntree: canal,
      posteVise: createHasPoste ? draft.posteVise : "",
      dateNaissance: "",
      sexe: "Homme",
      adresse: "",
      delegation: "",
      gouvernoratOrigine: "",
      villeOrigine: "",
      specialite: "",
      etablissement: "",
      missionId: "",
      notes: "",
      statut: STATUS_NOUVEAU,
      entretienResult: ENTRETIEN_ATTENTE,
      documentsContrat: {},
      contratSigne: false,
      contratValide: false,
    });
    addCandidat(payload);
    setShowCreate(false);
    setDraft((p) => ({
      ...p,
      nomComplet: "",
      cin: "",
      telephone: "",
      email: "",
      canalEntree: "Direct",
      targetType: currentTypeId,
    }));
    pushToast("Nouveau candidat ajoute.");
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
              setDraft((p) => ({ ...p, targetType: currentTypeId }));
            }
            setShowCreate((v) => !v);
          }}
        >
          {showCreate ? "Fermer creation" : "Nouveau candidat"}
        </button>
      </div>

      {showCreate && (
        <div className="cand-create-box">
          <input
            value={draft.nomComplet}
            onChange={(e) => setDraft((p) => ({ ...p, nomComplet: e.target.value }))}
            placeholder="Nom complet"
          />
          <input
            value={draft.cin}
            onChange={(e) => setDraft((p) => ({ ...p, cin: e.target.value }))}
            placeholder="CIN"
          />
          <input
            value={draft.telephone}
            onChange={(e) => setDraft((p) => ({ ...p, telephone: e.target.value }))}
            placeholder="Telephone"
          />
          <input
            value={draft.email}
            onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email"
          />
          <select
            value={draft.targetType}
            onChange={(e) => setDraft((p) => ({ ...p, targetType: e.target.value }))}
          >
            {candidateTypes.map((type) => (
              <option key={type.id} value={type.id}>{`Ajouter vers: ${type.title}`}</option>
            ))}
          </select>
          <select
            value={draft.canalEntree}
            onChange={(e) => setDraft((p) => ({ ...p, canalEntree: e.target.value }))}
          >
            <option value="Direct">Canal: Direct (sans survey)</option>
            <option value="Survey">Canal: Survey</option>
          </select>
          {createHasPoste ? (
            <select
              value={draft.posteVise}
              onChange={(e) => setDraft((p) => ({ ...p, posteVise: e.target.value }))}
            >
              {postes.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          ) : (
            <div className="cand-create-hint">
              Etape Survey: uniquement informations personnelles (sans poste).
            </div>
          )}
          <button onClick={createCandidate}>Ajouter</button>
        </div>
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche: nom, CIN, telephone..."
          />
        </div>
        <div>
          <label>Gouvernorat</label>
          <select value={filtreGouv} onChange={(e) => setFiltreGouv(e.target.value)}>
            {gouvs.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Niveau</label>
          <select value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)}>
            {niveaux.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
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
          Reinitialiser
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
                const avisValue = c.avisJuridique || AVIS_ATTENTE;
                const avisLabel =
                  avisValue === AVIS_OK ? "OK" : avisValue === AVIS_REFUSE ? "Refuse" : "Pas de reponse";
                const avisClass = avisValue === AVIS_OK ? "ok" : avisValue === AVIS_REFUSE ? "ko" : "wait";
                const entretien = getEntretienMeta(c.entretienResult);
                const isLegalOkRemark = norm(c.notes).includes("avis juridique ok");
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
                          Ouvrir dossier
                        </button>
                      )}
                    </div>

                    <div className="cand-badges">
                      <span style={{ background: lane.badgeBg, color: lane.badgeColor }}>{lane.short}</span>
                      <span style={{ background: status.bg, color: status.color }}>{c.statut}</span>
                      {currentTypeId === "test_passed" && (
                        <span className={`interview-badge ${entretien.className}`}>{entretien.label}</span>
                      )}
                      {currentTypeId === "reintegrated_pending" && (
                        <span className={`legal-badge ${avisClass}`}>Avis juridique: {avisLabel}</span>
                      )}
                    </div>

                    <div className="cand-meta">
                      <div>
                        <label>Canal</label>
                        <strong>{c.canalEntree || (c.typeCandidat === "survey_ready" ? "Survey" : "Direct")}</strong>
                      </div>
                      {showPosteField && (
                        <div>
                          <label>Poste</label>
                          <strong>{c.posteVise || "-"}</strong>
                        </div>
                      )}
                      <div>
                        <label>Residence</label>
                        <strong>{c.gouvernoratResidence || "-"}</strong>
                      </div>
                      <div>
                        <label>Telephone</label>
                        <strong>{c.telephone || "-"}</strong>
                      </div>
                      <div>
                        <label>Email</label>
                        <strong>{c.email || "Non renseigne"}</strong>
                      </div>
                      {c.notes && (
                        <div className={`cand-remark ${isLegalOkRemark ? "legal-ok" : ""}`}>
                          <label>Remarque</label>
                          <strong>{c.notes}</strong>
                        </div>
                      )}
                    </div>

                    <div className="cand-workflow-move">
                      <label>Changer de type</label>
                      <select value={c.typeCandidat} onChange={(e) => moveToType(c, e.target.value)}>
                        {candidateTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
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

                    {currentTypeId === "reintegrated_pending" && (
                      <div className="cand-legal-actions">
                        <button className="legal-accept" onClick={() => setLegalDecision(c, AVIS_OK)}>
                          Avis juridique OK - Accepter
                        </button>
                        <button className="legal-reject" onClick={() => setLegalDecision(c, AVIS_REFUSE)}>
                          Refuser
                        </button>
                        <button className="legal-pending" onClick={() => setLegalDecision(c, AVIS_ATTENTE)}>
                          Pas de reponse
                        </button>
                      </div>
                    )}

                    <div className="cand-actions">
                      <a
                        className={`action-link ${!tel ? "disabled" : ""}`}
                        href={tel || "#"}
                        onClick={(e) => !tel && e.preventDefault()}
                      >
                        Appeler
                      </a>
                      <a
                        className={`action-link ${!mail ? "disabled" : ""}`}
                        href={mail || "#"}
                        onClick={(e) => !mail && e.preventDefault()}
                      >
                        Envoyer mail
                      </a>
                      {currentTypeId === "test_passed" && (
                        <button className="dossier-link" onClick={() => openDossier(c.id)}>
                          Dossier
                        </button>
                      )}
                      <button className="delete-link" onClick={() => deleteCandidat(c.id)}>
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
