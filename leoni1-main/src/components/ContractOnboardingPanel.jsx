import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import {
  SIGNATURE_SUR_PLACE,
  TYPE_CONTRAT_OPTIONS,
  normalizeContractType,
} from "../data/contractWorkflow.js";
import "./ContractOnboardingPanel.css";

const requiredDocDefinitions = [
  { key: "photos_identite", label: "Photos d'identite", sourceService: "Recrutement", maleOnly: false },
  {
    key: "copies_cin",
    label: "Copies de la carte d'identite nationale",
    sourceService: "Recrutement",
    maleOnly: false,
  },
  {
    key: "declaration_adresse",
    label: "Declaration d'adresse avec signature legalisee",
    sourceService: "Recrutement",
    maleOnly: false,
  },
  {
    key: "extrait_naissance_candidat",
    label: "Extrait de naissance du candidat",
    sourceService: "Recrutement",
    maleOnly: false,
  },
  {
    key: "document_administratif",
    label: "Document administratif",
    sourceService: "Recrutement",
    maleOnly: false,
  },
  {
    key: "rib_20_chiffres",
    label: "RIB / document du compte courant contenant 20 chiffres avec cachet original",
    sourceService: "Recrutement",
    maleOnly: false,
  },
  {
    key: "bulletin_numero_3",
    label: "Bulletin n 3 / casier judiciaire",
    sourceService: "Service Contrats",
    maleOnly: false,
  },
  {
    key: "copies_diplomes",
    label: "Copies certifiees conformes des diplomes prouvant le niveau scolaire",
    sourceService: "Recrutement",
    maleOnly: false,
  },
  {
    key: "attestation_cnss",
    label: "Attestation d'affiliation a la CNSS pour les personnes ayant deja travaille",
    sourceService: "Recrutement",
    maleOnly: false,
  },
  {
    key: "contrat_initiation_vie_professionnelle",
    label: "Contrat d'initiation a la vie professionnelle",
    sourceService: "Service Contrats",
    maleOnly: false,
  },
  {
    key: "contrat_travail_signature_legalisee",
    label: "Contrat de travail avec signature legalisee",
    sourceService: "Service Contrats",
    maleOnly: false,
  },
  {
    key: "extrait_naissance_conjoint",
    label: "Extrait de naissance du conjoint",
    sourceService: "Recrutement",
    maleOnly: false,
    familyOnly: true,
  },
  {
    key: "contrat_mariage",
    label: "Copie du contrat de mariage ou extrait de mariage",
    sourceService: "Recrutement",
    maleOnly: false,
    familyOnly: true,
  },
  {
    key: "extrait_naissance_enfants",
    label: "Extrait de naissance original pour chaque enfant",
    sourceService: "Recrutement",
    maleOnly: false,
    familyOnly: true,
  },
];

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
    if (["1", "true", "yes", "oui"].includes(normalized)) return true;
    if (["0", "false", "no", "non", ""].includes(normalized)) return false;
  }
  return false;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("fr-TN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isMaleCandidate(candidat) {
  const sexe = norm(candidat?.sexe);
  return sexe.includes("homme") || sexe.includes("male") || sexe.includes("garcon");
}

function getMaritalStatusValue(candidat, maritalStatusDrafts = {}) {
  const localValue = maritalStatusDrafts?.[candidat?.id];
  if (localValue === "marie" || localValue === "non_marie") {
    return localValue;
  }

  const familyStatus = norm(
    candidat?.situationFamiliale ||
      candidat?.situation_familiale ||
      candidat?.etatCivil ||
      candidat?.etat_civil
  ).replace(/\s+/g, " ");

  if (!familyStatus) return "non_marie";
  if (familyStatus.includes("non marie")) return "non_marie";
  if (familyStatus.includes("marie")) return "marie";
  return "non_marie";
}

function isMarriedCandidate(candidat, maritalStatusDrafts = {}) {
  return getMaritalStatusValue(candidat, maritalStatusDrafts) === "marie";
}

function getRequiredDocs(candidat, maritalStatusDrafts = {}) {
  const isMale = isMaleCandidate(candidat);
  const isMarried = isMarriedCandidate(candidat, maritalStatusDrafts);
  return requiredDocDefinitions.filter((doc) => {
    if (doc.maleOnly && !isMale) return false;
    if (doc.familyOnly && !isMarried) return false;
    return true;
  });
}

function getCandidateDocs(candidate, localDrafts) {
  const draft = localDrafts?.[candidate.id];
  if (draft && typeof draft === "object") return draft;
  return candidate.documentsContrat || {};
}

function computeDossierProgress(candidate, localDrafts, maritalStatusDrafts = {}) {
  const requiredDocs = getRequiredDocs(candidate, maritalStatusDrafts);
  const docs = getCandidateDocs(candidate, localDrafts);
  const doneCount = requiredDocs.filter((doc) => Boolean(docs[doc.key])).length;
  const total = requiredDocs.length || 1;
  const percent = Math.round((doneCount / total) * 100);
  return {
    requiredDocs,
    docs,
    doneCount,
    total: requiredDocs.length,
    percent,
    isComplete: doneCount === requiredDocs.length && requiredDocs.length > 0,
  };
}

function computeCandidateWorkflow(candidate, localDrafts, maritalStatusDrafts = {}) {
  const progress = computeDossierProgress(candidate, localDrafts, maritalStatusDrafts);
  const contratSigne = toBooleanFlag(candidate?.contratSigne ?? candidate?.contrat_signe);
  const dossierValide = toBooleanFlag(candidate?.dossierValide ?? candidate?.dossier_valide);
  const etape = String(candidate?.etape || "").trim().toUpperCase();
  const statut = String(candidate?.statut || "").trim().toUpperCase();
  const finalise = etape === "NOUVEAU_RECRUTE" || statut === "CONTRAT_FINALISE";

  return {
    progress,
    contratSigne,
    dossierValide,
    finalise,
  };
}

export default function ContractOnboardingPanel() {
  const navigate = useNavigate();
  const { candidats, validerDossierContrat, signerContratCandidat, setCandidatTypeContrat } = useRecrutements();
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [localDocDrafts, setLocalDocDrafts] = useState({});
  const [maritalStatusDrafts, setMaritalStatusDrafts] = useState({});
  const [savingTypeDrafts, setSavingTypeDrafts] = useState({});
  const [expandedCandidateId, setExpandedCandidateId] = useState(null);

  const queue = useMemo(
    () =>
      candidats.filter((candidate) => {
        const etape = String(candidate?.etape || "").trim().toUpperCase();
        return etape === "DOSSIER_CONTRAT" || etape === "CONTRAT_A_SIGNER";
      }),
    [candidats]
  );

  const pushToast = (message, type = "info", timeout = 2800) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current.message === message ? { message: "", type: "info" } : current));
    }, timeout);
  };

  const toggleExpanded = (candidateId) => {
    setExpandedCandidateId((current) => (current === candidateId ? null : candidateId));
  };

  const toggleDocumentStatus = (candidate, docKey) => {
    setLocalDocDrafts((prev) => {
      const currentDocs = getCandidateDocs(candidate, prev);
      const nextDocs = {
        ...currentDocs,
        [docKey]: !currentDocs[docKey],
      };
      return {
        ...prev,
        [candidate.id]: nextDocs,
      };
    });
  };

  const openCandidateDossier = (candidateId) => {
    navigate(`/candidats/test/${candidateId}/dossier?from=contracts`);
  };

  const handleValidateDossier = async (candidate) => {
    const workflow = computeCandidateWorkflow(candidate, localDocDrafts, maritalStatusDrafts);
    if (workflow.dossierValide) {
      pushToast(`Le dossier de ${candidate.nomComplet} est deja valide.`, "info");
      return;
    }
    if (!workflow.progress.isComplete) {
      pushToast(`Dossier incomplet pour ${candidate.nomComplet}.`, "error", 3200);
      return;
    }

    const result = await validerDossierContrat(candidate.id, { dossierComplet: true });
    if (!result?.ok) {
      pushToast(result?.message || "Validation dossier impossible.", "error", 3400);
      return;
    }

    pushToast(result?.message || "Dossier valide.", "success", 3200);
  };

  const handleSignContract = async (candidate) => {
    const workflow = computeCandidateWorkflow(candidate, localDocDrafts, maritalStatusDrafts);
    if (workflow.contratSigne) {
      pushToast(`Le contrat de ${candidate.nomComplet} est deja signe.`, "info");
      return;
    }

    const normalizedTypeContrat = normalizeContractType(candidate?.type_contrat || candidate?.typeContrat);
    if (!normalizedTypeContrat) {
      pushToast("Veuillez sélectionner le type de contrat avant de signer.", "error", 3400);
      return;
    }

    const selectedLieu = SIGNATURE_SUR_PLACE;

    console.log("[ContractOnboardingPanel] Signer le contrat", {
      candidateId: candidate.id,
      candidateName: candidate.nomComplet || null,
      endpoint: `POST /api/candidats/${candidate.id}/contrat/signer`,
      payload: {
        lieu_signature: selectedLieu,
        type_contrat: normalizedTypeContrat,
      },
    });

    const result = await signerContratCandidat(candidate.id, { lieuSignature: selectedLieu });
    if (!result?.ok) {
      console.error("[ContractOnboardingPanel] Signature contrat echec", result);
      pushToast(result?.message || "Signature contrat impossible.", "error", 3400);
      return;
    }

    pushToast(result?.message || "Contrat signe.", "success", 3200);
  };

  const handleTypeContratChange = async (candidate, nextType) => {
    const normalizedType = normalizeContractType(nextType);
    if (!normalizedType) {
      pushToast("Veuillez sélectionner un type de contrat valide.", "error", 2600);
      return;
    }

    setSavingTypeDrafts((prev) => ({ ...prev, [candidate.id]: true }));
    try {
      const result = await setCandidatTypeContrat(candidate.id, normalizedType);
      if (!result?.ok) {
        pushToast(result?.message || "Mise a jour du type contrat impossible.", "error", 3200);
        return;
      }
      pushToast(result?.message || `Type contrat mis a jour (${normalizedType}).`, "success", 1800);
    } finally {
      setSavingTypeDrafts((prev) => {
        const next = { ...prev };
        delete next[candidate.id];
        return next;
      });
    }
  };

  return (
    <section className="dossier-board">
      {toast.message && <div className={`dossier-toast ${toast.type}`}>{toast.message}</div>}

      <header className="dossier-board-head">
        <div>
          <h3>Dossier Contrat - Service Contrats</h3>
          <p>Vue compacte: utilisez "Afficher les documents" pour ouvrir le detail d'un candidat.</p>
        </div>
        <div className="dossier-board-kpi">
          <strong>{queue.length}</strong>
          <span>Candidats en cours</span>
        </div>
      </header>

      {queue.length === 0 ? (
        <div className="dossier-empty-state">Aucun candidat a l'etape DOSSIER_CONTRAT.</div>
      ) : (
        <div className="dossier-list">
          {queue.map((candidate) => {
            const workflow = computeCandidateWorkflow(candidate, localDocDrafts, maritalStatusDrafts);
            const progress = workflow.progress;
            const typeContrat = normalizeContractType(candidate.type_contrat || candidate.typeContrat) || "Non renseigne";
            const contratLabel = workflow.contratSigne ? "Signe" : "Non signe";
            const dossierLabel = workflow.dossierValide
              ? "Valide"
              : progress.isComplete
                ? "Complet a valider"
                : "Incomplet";
            const dossierBadgeState = workflow.dossierValide ? "ok" : progress.isComplete ? "info" : "warn";
            const maritalStatusValue = getMaritalStatusValue(candidate, maritalStatusDrafts);
            const isSavingType = Boolean(savingTypeDrafts[candidate.id]);
            const canSignContract = Boolean(normalizeContractType(candidate?.type_contrat || candidate?.typeContrat));
            const isExpanded = expandedCandidateId === candidate.id;

            return (
              <article key={candidate.id} className={`dossier-card-compact ${isExpanded ? "expanded" : ""}`}>
                <div className="dossier-summary-top">
                  <div>
                    <h4>{candidate.nomComplet || "Candidat sans nom"}</h4>
                    <p>CIN: {candidate.cin || "-"} | Type contrat: {typeContrat}</p>
                  </div>
                  <div className="dossier-head-badges">
                    <span className="badge type">{typeContrat}</span>
                    <span className={`badge status ${workflow.contratSigne ? "ok" : "warn"}`}>Contrat {contratLabel}</span>
                    <span className={`badge status ${dossierBadgeState}`}>Dossier {dossierLabel}</span>
                    {workflow.finalise && <span className="badge status ok">Nouveau recrute</span>}
                  </div>
                </div>

                <div className="summary-progress-row">
                  <div className="summary-progress-label">
                    <span>Progression documents</span>
                    <strong>{progress.doneCount}/{progress.total}</strong>
                  </div>
                  <div className="dossier-progress-track compact">
                    <div
                      className={`dossier-progress-fill ${progress.isComplete ? "ok" : "warn"}`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>

                <div className="summary-main-actions">
                  <button className="btn-secondary" onClick={() => openCandidateDossier(candidate.id)} type="button">
                    Consulter dossier
                  </button>
                  <button className="btn-toggle-docs" onClick={() => toggleExpanded(candidate.id)} type="button">
                    {isExpanded ? "Masquer les documents" : "Afficher les documents"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="dossier-expand-panel">
                    <div className="expand-status-line">
                      <span>
                        Contrat: <strong>{contratLabel}</strong>
                      </span>
                      <span>
                        Type contrat: <strong>{typeContrat}</strong>
                      </span>
                      <span>
                        Dossier: <strong>{dossierLabel}</strong>
                      </span>
                      <span>
                        Signature: <strong>{formatDateTime(candidate?.dateSignature || candidate?.date_signature)}</strong>
                      </span>
                      <label>
                        Situation familiale:
                        <select
                          className="sign-lieu-select"
                          value={maritalStatusValue}
                          onChange={(event) =>
                            setMaritalStatusDrafts((prev) => ({
                              ...prev,
                              [candidate.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="non_marie">Situation familiale: Non marie</option>
                          <option value="marie">Situation familiale: Marie</option>
                        </select>
                      </label>
                    </div>

                    <div className="dossier-doc-table-wrap">
                      <table className="dossier-doc-table">
                        <thead>
                          <tr>
                            <th>Document</th>
                            <th>Statut</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {progress.requiredDocs.map((doc) => {
                            const received = Boolean(progress.docs[doc.key]);
                            return (
                              <tr key={`${candidate.id}-${doc.key}`}>
                                <td>{doc.label}</td>
                                <td>
                                  <span className={`doc-status ${received ? "ok" : "missing"}`}>
                                    {received ? "Recu" : "Manquant"}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className={`doc-toggle-btn ${received ? "missing" : "ok"}`}
                                    onClick={() => toggleDocumentStatus(candidate, doc.key)}
                                    type="button"
                                  >
                                    {received ? "Marquer manquant" : "Marquer recu"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="dossier-expand-actions">
                      <div className="sign-action-wrap">
                        <select
                          className="sign-lieu-select"
                          value={normalizeContractType(candidate.type_contrat || candidate.typeContrat)}
                          onChange={(event) => void handleTypeContratChange(candidate, event.target.value)}
                          disabled={workflow.contratSigne || isSavingType}
                        >
                          <option value="">Type contrat</option>
                          {TYPE_CONTRAT_OPTIONS.map((option) => (
                            <option key={`${candidate.id}-${option}`} value={option}>
                              Type: {option}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn-sign"
                          onClick={() => handleSignContract(candidate)}
                          disabled={workflow.contratSigne || !canSignContract || isSavingType}
                          type="button"
                          title={!canSignContract ? "Veuillez sélectionner le type de contrat avant de signer." : ""}
                        >
                          {workflow.contratSigne ? "Contrat signe" : "Signer le contrat"}
                        </button>
                      </div>

                      {!canSignContract && !workflow.contratSigne && (
                        <div className="contract-type-required">
                          Veuillez sélectionner le type de contrat avant de signer.
                        </div>
                      )}

                      <button
                        className="btn-primary"
                        onClick={() => handleValidateDossier(candidate)}
                        disabled={workflow.dossierValide || !progress.isComplete}
                        type="button"
                      >
                        {workflow.dossierValide ? "Dossier valide" : "Valider dossier"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
