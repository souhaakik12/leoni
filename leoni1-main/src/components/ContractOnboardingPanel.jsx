import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import {
  SIGNATURE_SUR_PLACE,
  TYPE_CONTRAT_OPTIONS,
  normalizeContractType,
} from "../data/contractWorkflow.js";
import { buildRoleHeaders } from "../utils/roles.js";
import "./ContractOnboardingPanel.css";

const DOCUMENTS_CONTRAT_API_BASE = "http://localhost:3000";

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

function getCandidateDocuments(candidate, documentsByCandidateId = {}) {
  const documents = documentsByCandidateId?.[candidate.id];
  return Array.isArray(documents) ? documents : [];
}

function computeDossierProgress(candidate, documentsByCandidateId = {}) {
  const requiredDocs = getCandidateDocuments(candidate, documentsByCandidateId);
  const doneCount = requiredDocs.filter((doc) => toBooleanFlag(doc?.est_recu)).length;
  const total = requiredDocs.length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  return {
    requiredDocs,
    doneCount,
    total,
    percent,
    isComplete: total > 0 && doneCount === total,
  };
}

function computeCandidateWorkflow(candidate, documentsByCandidateId = {}) {
  const progress = computeDossierProgress(candidate, documentsByCandidateId);
  const contratSigne = toBooleanFlag(candidate?.contratSigne ?? candidate?.contrat_signe);
  const dossierValide = toBooleanFlag(candidate?.dossierValide ?? candidate?.dossier_valide);
  const etape = String(candidate?.etape || "").trim().toUpperCase();
  const statut = String(candidate?.statut || "").trim().toUpperCase();
  const statutDossier = String(candidate?.statutDossier || candidate?.statut_dossier || "").trim().toUpperCase();
  const finalise = etape === "NOUVEAU_RECRUTE" || statut === "CONTRAT_FINALISE" || (contratSigne && dossierValide);
  const dossierClasseValide = dossierValide || statutDossier === "VALIDE" || statut === "CONTRAT_FINALISE";

  return {
    progress,
    contratSigne,
    dossierValide,
    dossierClasseValide,
    finalise,
  };
}

export default function ContractOnboardingPanel() {
  const TAB_EN_COURS = "en_cours";
  const TAB_VALIDES = "valides";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { candidats, validerDossierContrat, signerContratCandidat, setCandidatTypeContrat } = useRecrutements();
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(TAB_EN_COURS);
  const [maritalStatusDrafts, setMaritalStatusDrafts] = useState({});
  const [documentsByCandidateId, setDocumentsByCandidateId] = useState({});
  const [documentsAttemptedByCandidateId, setDocumentsAttemptedByCandidateId] = useState({});
  const [documentsLoadingByCandidateId, setDocumentsLoadingByCandidateId] = useState({});
  const [documentActionDrafts, setDocumentActionDrafts] = useState({});
  const [savingTypeDrafts, setSavingTypeDrafts] = useState({});
  const [expandedCandidateId, setExpandedCandidateId] = useState(null);

  const queue = useMemo(
    () =>
      candidats.filter((candidate) => {
        const workflow = computeCandidateWorkflow(candidate, documentsByCandidateId);
        const etape = String(candidate?.etape || "").trim().toUpperCase();
        const isContractStage = etape === "DOSSIER_CONTRAT" || etape === "CONTRAT_A_SIGNER";
        return isContractStage || workflow.dossierClasseValide || workflow.finalise;
      }),
    [candidats, documentsByCandidateId]
  );

  const searchedQueue = useMemo(() => {
    const normalizedSearch = norm(searchTerm).trim();
    if (!normalizedSearch) return queue;

    return queue.filter((candidate) => {
      const name = norm(candidate?.nomComplet || candidate?.nom || "");
      const cin = norm(candidate?.cin || "");
      const typeContrat = norm(candidate?.type_contrat || candidate?.typeContrat || "");
      return (
        name.includes(normalizedSearch) ||
        cin.includes(normalizedSearch) ||
        typeContrat.includes(normalizedSearch)
      );
    });
  }, [queue, searchTerm]);

  const ongoingQueue = useMemo(
    () =>
      searchedQueue.filter((candidate) => {
        const workflow = computeCandidateWorkflow(candidate, documentsByCandidateId);
        const etape = String(candidate?.etape || "").trim().toUpperCase();
        const isContractStage = etape === "DOSSIER_CONTRAT" || etape === "CONTRAT_A_SIGNER";
        return isContractStage && !workflow.dossierClasseValide && !workflow.finalise;
      }),
    [searchedQueue, documentsByCandidateId]
  );

  const validatedQueue = useMemo(
    () =>
      searchedQueue.filter((candidate) => {
        const workflow = computeCandidateWorkflow(candidate, documentsByCandidateId);
        return workflow.dossierClasseValide || workflow.finalise;
      }),
    [searchedQueue, documentsByCandidateId]
  );

  const pushToast = (message, type = "info", timeout = 2800) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current.message === message ? { message: "", type: "info" } : current));
    }, timeout);
  };

  const loadCandidateDocuments = async (candidateId, { silent = false } = {}) => {
    if (!user) {
      if (!silent) {
        pushToast("Authentification requise pour charger les documents contrat.", "error", 3200);
      }
      return { ok: false, message: "Authentification requise." };
    }

    setDocumentsAttemptedByCandidateId((prev) => ({ ...prev, [candidateId]: true }));
    setDocumentsLoadingByCandidateId((prev) => ({ ...prev, [candidateId]: true }));
    try {
      const response = await fetch(
        `${DOCUMENTS_CONTRAT_API_BASE}/api/candidats/${candidateId}/documents-contrat`,
        {
          headers: buildRoleHeaders(user, {
            "Content-Type": "application/json",
          }),
        }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Chargement des documents contrat impossible.");
      }

      const documents = Array.isArray(payload?.documents) ? payload.documents : [];
      setDocumentsByCandidateId((prev) => ({
        ...prev,
        [candidateId]: documents,
      }));

      return { ok: true, documents };
    } catch (error) {
      if (!silent) {
        pushToast(error?.message || "Chargement des documents contrat impossible.", "error", 3400);
      }
      return { ok: false, message: error?.message || "Chargement des documents contrat impossible." };
    } finally {
      setDocumentsLoadingByCandidateId((prev) => {
        const next = { ...prev };
        delete next[candidateId];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!user || ongoingQueue.length === 0) return;

    ongoingQueue.forEach((candidate) => {
      if (
        documentsAttemptedByCandidateId[candidate.id] ||
        documentsByCandidateId[candidate.id] ||
        documentsLoadingByCandidateId[candidate.id]
      ) {
        return;
      }
      void loadCandidateDocuments(candidate.id, { silent: true });
    });
  }, [ongoingQueue, user, documentsAttemptedByCandidateId, documentsByCandidateId, documentsLoadingByCandidateId]);

  const toggleExpanded = (candidateId) => {
    const shouldExpand = expandedCandidateId !== candidateId;
    setExpandedCandidateId(shouldExpand ? candidateId : null);

    if (
      shouldExpand &&
      !documentsByCandidateId[candidateId] &&
      !documentsLoadingByCandidateId[candidateId]
    ) {
      void loadCandidateDocuments(candidateId);
    }
  };

  const toggleDocumentStatus = async (candidate, documentId, received) => {
    const actionKey = `${candidate.id}:${documentId}`;
    setDocumentActionDrafts((prev) => ({ ...prev, [actionKey]: true }));

    try {
      const endpoint = received ? "manquant" : "recu";
      const response = await fetch(
        `${DOCUMENTS_CONTRAT_API_BASE}/api/candidats/${candidate.id}/documents-contrat/${documentId}/${endpoint}`,
        {
          method: "POST",
          headers: buildRoleHeaders(user, {
            "Content-Type": "application/json",
          }),
        }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Mise a jour du document impossible.");
      }

      await loadCandidateDocuments(candidate.id, { silent: true });
      pushToast(payload?.message || "Document mis a jour.", "success", 2200);
    } catch (error) {
      pushToast(error?.message || "Mise a jour du document impossible.", "error", 3400);
    } finally {
      setDocumentActionDrafts((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  };

  const openCandidateDossier = (candidateId) => {
    navigate(`/candidats/test/${candidateId}/dossier?from=contracts`);
  };

  const handleValidateDossier = async (candidate) => {
    const workflow = computeCandidateWorkflow(candidate, documentsByCandidateId);
    if (workflow.dossierValide) {
      pushToast(`Le dossier de ${candidate.nomComplet} est deja valide.`, "info");
      return;
    }
    if (!workflow.progress.isComplete) {
      pushToast("Le dossier ne peut pas etre valide : documents manquants.", "error", 3200);
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
    const workflow = computeCandidateWorkflow(candidate, documentsByCandidateId);
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
        typeContrat: normalizedTypeContrat,
        lieu_signature: selectedLieu,
        type_contrat: normalizedTypeContrat,
      },
    });

    const result = await signerContratCandidat(candidate.id, {
      lieuSignature: selectedLieu,
      typeContrat: normalizedTypeContrat,
    });
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

  const activeQueue = activeTab === TAB_VALIDES ? validatedQueue : ongoingQueue;
  const hasTrackedCandidates = ongoingQueue.length > 0 || validatedQueue.length > 0;

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
          <span>Dossiers suivis</span>
        </div>
      </header>

      <div className="dossier-search-row">
        <label className="dossier-search-field">
          <span>Recherche</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher par nom, CIN ou type de contrat"
          />
        </label>
      </div>

      <div className="dossier-tabs">
        <button
          className={`dossier-tab ${activeTab === TAB_EN_COURS ? "active" : ""}`}
          onClick={() => setActiveTab(TAB_EN_COURS)}
          type="button"
        >
          Dossiers en cours
          <span>{ongoingQueue.length}</span>
        </button>
        <button
          className={`dossier-tab ${activeTab === TAB_VALIDES ? "active" : ""}`}
          onClick={() => setActiveTab(TAB_VALIDES)}
          type="button"
        >
          Dossiers valides
          <span>{validatedQueue.length}</span>
        </button>
      </div>

      {!hasTrackedCandidates ? (
        <div className="dossier-empty-state">Aucun candidat a l'etape DOSSIER_CONTRAT.</div>
      ) : activeQueue.length === 0 ? (
        <div className="dossier-empty-state">Aucun candidat trouve.</div>
      ) : (
        <div className="dossier-list">
          {activeQueue.map((candidate) => {
            const workflow = computeCandidateWorkflow(candidate, documentsByCandidateId);
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
            const isLoadingDocuments = Boolean(documentsLoadingByCandidateId[candidate.id]);
            const isSavingType = Boolean(savingTypeDrafts[candidate.id]);
            const canSignContract = Boolean(normalizeContractType(candidate?.type_contrat || candidate?.typeContrat));
            const isExpanded = expandedCandidateId === candidate.id;
            const showValidatedView = activeTab === TAB_VALIDES;

            return (
              <article
                key={candidate.id}
                className={`dossier-card-compact ${isExpanded ? "expanded" : ""} ${showValidatedView ? "validated" : ""}`}
              >
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

                {showValidatedView ? (
                  <div className="validated-summary-grid">
                    <div>
                      <span>Statut contrat</span>
                      <strong>{candidate?.statutContrat || candidate?.statut_contrat || contratLabel}</strong>
                    </div>
                    <div>
                      <span>Statut dossier</span>
                      <strong>{candidate?.statutDossier || candidate?.statut_dossier || "VALIDE"}</strong>
                    </div>
                    <div>
                      <span>Date signature</span>
                      <strong>{formatDateTime(candidate?.dateSignature || candidate?.date_signature)}</strong>
                    </div>
                  </div>
                ) : (
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
                )}

                {!showValidatedView && (
                  <div className="summary-main-actions">
                    <button className="btn-secondary" onClick={() => openCandidateDossier(candidate.id)} type="button">
                      Consulter dossier
                    </button>
                    <button className="btn-toggle-docs" onClick={() => toggleExpanded(candidate.id)} type="button">
                      {isExpanded ? "Masquer les documents" : "Afficher les documents"}
                    </button>
                  </div>
                )}

                {isExpanded && !showValidatedView && (
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
                          {isLoadingDocuments ? (
                            <tr>
                              <td colSpan="3">Chargement des documents...</td>
                            </tr>
                          ) : progress.requiredDocs.length > 0 ? (
                            progress.requiredDocs.map((doc) => {
                              const received = toBooleanFlag(doc.est_recu);
                              const actionKey = `${candidate.id}:${doc.type_document_id}`;
                              const isSavingDocument = Boolean(documentActionDrafts[actionKey]);

                              return (
                                <tr key={`${candidate.id}-${doc.type_document_id}`}>
                                  <td>{doc.document}</td>
                                  <td>
                                    <span className={`doc-status ${received ? "ok" : "missing"}`}>
                                      {received ? "Recu" : "Manquant"}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className={`doc-toggle-btn ${received ? "missing" : "ok"}`}
                                      onClick={() =>
                                        void toggleDocumentStatus(candidate, doc.type_document_id, received)
                                      }
                                      disabled={isSavingDocument}
                                      type="button"
                                    >
                                      {received ? "Marquer manquant" : "Marquer recu"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="3">Aucun document contrat disponible.</td>
                            </tr>
                          )}
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
