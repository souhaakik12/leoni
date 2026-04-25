import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import {
  STATUS_EN_ATTENTE_DOSSIER,
  STATUS_SEANCE_EN_COURS,
  STATUS_SEANCE_TERMINEE,
  TYPE_CONTRAT_OPTIONS,
} from "../data/contractWorkflow.js";
import { buildRoleHeaders } from "../utils/roles.js";
import "./ContractSessionsPage.css";

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function seanceStatusLabel(statutSeance) {
  return statutSeance === STATUS_SEANCE_TERMINEE ? "Terminee" : "En cours";
}

export default function ContractSessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    seancesWithCandidats,
    waitingSeanceCandidates,
    assignCandidatToSeance,
    setCandidatTypeContrat,
    sendSeanceCandidatesToDossier,
    refreshCandidatsFromApi,
    refreshSeancesFromApi,
  } = useRecrutements();

  const [toast, setToast] = useState({ type: "info", message: "" });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedSeanceId, setExpandedSeanceId] = useState(null);
  const [manualCandidateId, setManualCandidateId] = useState("");
  const [manualSeanceId, setManualSeanceId] = useState("");
  const [createForm, setCreateForm] = useState({
    date: todayIsoDate(),
    heure: "09:00",
    responsable: "Service Contrats",
  });

  const sortedSeances = useMemo(
    () =>
      [...seancesWithCandidats].sort((a, b) => {
        const keyA = `${a.date || ""} ${a.heure || ""} ${String(a.id).padStart(8, "0")}`;
        const keyB = `${b.date || ""} ${b.heure || ""} ${String(b.id).padStart(8, "0")}`;
        if (keyA === keyB) return 0;
        return keyA < keyB ? 1 : -1;
      }),
    [seancesWithCandidats]
  );

  const openSeances = useMemo(
    () => sortedSeances.filter((seance) => seance.statutSeance === STATUS_SEANCE_EN_COURS),
    [sortedSeances]
  );

  const doneSeances = useMemo(
    () => sortedSeances.filter((seance) => seance.statutSeance === STATUS_SEANCE_TERMINEE),
    [sortedSeances]
  );

  const pushToast = (message, type = "info", timeout = 2400) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current.message === message ? { type: "info", message: "" } : current));
    }, timeout);
  };

  const cancelCreateForm = () => {
    setCreateForm({
      date: todayIsoDate(),
      heure: "09:00",
      responsable: "Service Contrats",
    });
    setShowCreateForm(false);
  };

  const handleValiderSeance = async () => {
    if (!createForm.date || !createForm.heure || !createForm.responsable.trim()) {
      pushToast("Completez date, heure et responsable.", "error");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/seances-contrat", {
        method: "POST",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          date: createForm.date,
          heure: createForm.heure,
          responsable_id: 1,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Creation de seance impossible.");
      }

      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }
      if (typeof refreshSeancesFromApi === "function") {
        await refreshSeancesFromApi();
      }

      const createdId = Number(payload?.id) || null;
      if (createdId) setExpandedSeanceId(createdId);
      setShowCreateForm(false);

      const assignedCount = Number(payload?.assigned_count || 0);
      const message =
        assignedCount > 0
          ? `Seance #${createdId || "?"} creee. ${assignedCount} candidat(s) affecte(s).`
          : `Seance contrat #${createdId || "?"} creee avec succes.`;
      pushToast(message, "success");
    } catch (error) {
      console.error(error);
      pushToast(error?.message || "Creation de seance impossible.", "error");
    }
  };

  const handleSimpleAssign = async () => {
    const candidateId = Number(manualCandidateId || 0);
    const seanceId = Number(manualSeanceId || 0);
    if (!candidateId || !seanceId) {
      pushToast("Selectionnez un candidat et une seance en cours.", "error");
      return;
    }
    const result = await assignCandidatToSeance(candidateId, seanceId);
    if (!result?.ok) {
      pushToast(result?.message || "Affectation impossible (seance terminee ou donnees invalides).", "error");
      return;
    }
    setManualCandidateId("");
    pushToast(result?.message || "Affectation ajustee avec succes.", "success");
  };

  const handleSetType = async (candidateId, typeContrat) => {
    if (!typeContrat) return;
    const result = await setCandidatTypeContrat(candidateId, typeContrat);
    if (!result?.ok) {
      pushToast(result?.message || "Mise a jour du type contrat impossible.", "error", 2800);
      return;
    }
    pushToast(result?.message || `Type contrat mis a jour (${typeContrat}).`, "success", 1600);
  };

  const openCandidateDossier = (candidateId) => {
    navigate(`/candidats/test/${candidateId}/dossier?from=contracts`);
  };

  const handleCloseSeance = async (seance) => {
    const result = await sendSeanceCandidatesToDossier(seance.id);
    if (!result.ok) {
      if (result.reason === "missing_contract_type") {
        const names = result.missingType.map((candidate) => candidate.nomComplet).join(", ");
        pushToast(`Type contrat manquant pour: ${names}.`, "error", 3600);
        return;
      }
      if (result.reason === "empty_session") {
        pushToast("Aucun candidat dans cette seance.", "error");
        return;
      }
      if (result.reason === "session_closed") {
        pushToast("Cette seance est deja terminee.", "info");
        return;
      }
      pushToast(result.message || "Action impossible pour cette seance.", "error");
      return;
    }

    if (typeof refreshCandidatsFromApi === "function") {
      await refreshCandidatsFromApi();
    }
    if (typeof refreshSeancesFromApi === "function") {
      await refreshSeancesFromApi();
    }

    const successMessage =
      result.updatedCount > 0
        ? `${result.updatedCount} candidat(s) envoye(s) vers dossier contrat.${result.alreadyCount ? ` (${result.alreadyCount} deja traites)` : ""}`
        : "Seance cloturee. Les candidats etaient deja en attente dossier.";
    pushToast(successMessage, "success", 2800);
    setTimeout(() => navigate("/contracts/reception"), 900);
  };

  const handleResetSeance = async (seance) => {
    const shouldReset = window.confirm(
      `Confirmer la suppression/reset de la seance #${seance.id} ? Cette action supprime la seance et remet ses candidats en attente seance contrat.`
    );
    if (!shouldReset) return;

    try {
      const response = await fetch(`http://localhost:3000/api/seances-contrat/${seance.id}/reset`, {
        method: "POST",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Reset de seance impossible.");
      }

      if (typeof refreshSeancesFromApi === "function") {
        await refreshSeancesFromApi();
      }
      if (typeof refreshCandidatsFromApi === "function") {
        await refreshCandidatsFromApi();
      }

      setExpandedSeanceId((prev) => (prev === seance.id ? null : prev));
      pushToast(payload?.message || `Seance #${seance.id} supprimee et reinitialisee.`, "success", 3000);
    } catch (error) {
      console.error(error);
      pushToast(error?.message || "Reset de seance impossible.", "error", 3200);
    }
  };

  const renderSessionCard = (seance) => {
    const isExpanded = expandedSeanceId === seance.id;
    const sentCount = seance.candidats.filter((candidate) => candidate.statut === STATUS_EN_ATTENTE_DOSSIER).length;
    const isTerminee = seance.statutSeance === STATUS_SEANCE_TERMINEE;

    return (
      <article key={seance.id} className={`session-card ${isExpanded ? "is-expanded" : ""}`}>
        <div className="session-row">
          <div className="session-row-main">
            <div className="session-row-identity">
              <span className="session-kicker">Seance #{seance.id}</span>
              <h3>{seance.date || "-"} · {seance.heure || "-"}</h3>
            </div>
            <div className="session-row-responsable">
              <span>Responsable</span>
              <strong>{seance.responsableNom || "-"}</strong>
            </div>
          </div>
          <div className="session-row-side">
            <div className="session-inline-stats">
              <span className="session-inline-badge">{seance.candidats.length} candidat{seance.candidats.length > 1 ? "s" : ""}</span>
              <span className="session-inline-badge">{sentCount} dossier{sentCount > 1 ? "s" : ""}</span>
            </div>
            <span className={`status-badge ${isTerminee ? "is-done" : "is-open"}`}>
              {seanceStatusLabel(seance.statutSeance)}
            </span>
            <div className="session-row-actions">
              <button
                type="button"
                className="btn btn-outline btn-compact"
                onClick={() => setExpandedSeanceId((prev) => (prev === seance.id ? null : seance.id))}
              >
                {isExpanded ? "Masquer details" : "Voir details"}
              </button>
              <button
                type="button"
                className="btn btn-success btn-compact"
                onClick={() => handleCloseSeance(seance)}
                disabled={isTerminee}
              >
                Cloturer seance
              </button>
              <button type="button" className="btn btn-danger btn-compact" onClick={() => handleResetSeance(seance)}>
                Supprimer
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="session-details">
            {isTerminee && <div className="session-note">Cette seance est terminee.</div>}
            {seance.candidats.length === 0 ? (
              <div className="session-empty">Aucun candidat dans cette seance.</div>
            ) : (
              <div className="session-table-wrap">
                <table className="session-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>CIN</th>
                      <th>Telephone</th>
                      <th>Type contrat</th>
                      <th>Statut</th>
                      <th>Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seance.candidats.map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="candidate-name">{candidate.nomComplet}</td>
                        <td>{candidate.cin || "-"}</td>
                        <td>{candidate.telephone || "-"}</td>
                        <td>
                          <select
                            value={candidate.typeContrat || candidate.type_contrat || ""}
                            onChange={(event) => handleSetType(candidate.id, event.target.value)}
                            disabled={isTerminee}
                            className="type-select"
                          >
                            <option value="">Type...</option>
                            {TYPE_CONTRAT_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{candidate.statut || "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-subtle"
                            onClick={() => openCandidateDossier(candidate.id)}
                          >
                            Voir details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="seance-page">
      {toast.message && <div className={`seance-toast ${toast.type}`}>{toast.message}</div>}

      <section className="seance-header-card">
        <div className="seance-header-copy">
          <span className="seance-header-eyebrow">Organisation RH</span>
          <h1>Séances Contrat</h1>
          <p>Planifiez les sessions, affectez les candidats et suivez l’avancement des dossiers contrat.</p>
        </div>
        <button
          type="button"
          className={`btn btn-primary ${showCreateForm ? "is-active" : ""}`}
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          Créer séance
        </button>
      </section>

      {showCreateForm && (
        <section className="seance-create-card">
          <div className="seance-create-head">
            <div>
              <h2>Nouvelle séance</h2>
              <p>Définissez la date, l’heure et le responsable avant validation.</p>
            </div>
          </div>
          <div className="seance-create-grid">
            <label className="field-shell">
              <span>Date</span>
              <input
                type="date"
                value={createForm.date}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </label>
            <label className="field-shell">
              <span>Heure</span>
              <input
                type="time"
                value={createForm.heure}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, heure: event.target.value }))}
              />
            </label>
            <label className="field-shell">
              <span>Responsable</span>
              <input
                value={createForm.responsable}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, responsable: event.target.value }))}
                placeholder="Responsable"
              />
            </label>
            <div className="seance-create-actions">
              <button type="button" className="btn btn-primary" onClick={handleValiderSeance}>
                Valider séance
              </button>
              <button type="button" className="btn btn-outline" onClick={cancelCreateForm}>
                Annuler
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="seance-waiting-card">
        <div className="section-title-row">
          <div>
            <h2>Candidats en attente</h2>
            <p className="section-subtitle">Candidats prêts à être rattachés à une séance en cours.</p>
          </div>
          <span className="section-count">{waitingSeanceCandidates.length}</span>
        </div>

        {waitingSeanceCandidates.length === 0 ? (
          <div className="waiting-empty-state">
            <strong>Aucun candidat en attente</strong>
            <span>Les candidats affectables apparaîtront ici automatiquement.</span>
          </div>
        ) : (
          <ul className="waiting-chip-list">
            {waitingSeanceCandidates.map((candidate) => (
              <li key={candidate.id} className="waiting-chip">
                #{candidate.id} {candidate.nomComplet}
              </li>
            ))}
          </ul>
        )}

        {waitingSeanceCandidates.length > 0 && (
          <div className="seance-assign-block">
            {openSeances.length === 0 ? (
              <div className="section-muted-text">
                Aucune séance en cours : ces candidats restent automatiquement en attente.
              </div>
            ) : (
              <div className="seance-assign-row">
                <select value={manualCandidateId} onChange={(event) => setManualCandidateId(event.target.value)}>
                  <option value="">Candidat en attente</option>
                  {waitingSeanceCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      #{candidate.id} {candidate.nomComplet}
                    </option>
                  ))}
                </select>
                <select value={manualSeanceId} onChange={(event) => setManualSeanceId(event.target.value)}>
                  <option value="">Seance en cours</option>
                  {openSeances.map((seance) => (
                    <option key={seance.id} value={seance.id}>
                      #{seance.id} - {seance.date} {seance.heure}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary" onClick={handleSimpleAssign}>
                  Affecter à la séance
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="session-groups">
        <div className="session-group">
          <div className="group-head">
            <div>
              <h2>Sessions en cours</h2>
              <p>Sessions actives en attente de clôture et d’envoi vers dossier.</p>
            </div>
            <span>{openSeances.length}</span>
          </div>
          {openSeances.length === 0 ? (
            <div className="session-empty-card">Aucune session en cours.</div>
          ) : (
            <div className="session-card-list">{openSeances.map((seance) => renderSessionCard(seance))}</div>
          )}
        </div>

        <div className="session-group">
          <div className="group-head">
            <div>
              <h2>Sessions terminées</h2>
              <p>Historique des séances déjà clôturées.</p>
            </div>
            <span>{doneSeances.length}</span>
          </div>
          {doneSeances.length === 0 ? (
            <div className="session-empty-card">Aucune session terminee.</div>
          ) : (
            <div className="session-card-list">{doneSeances.map((seance) => renderSessionCard(seance))}</div>
          )}
        </div>
      </section>
    </div>
  );
}
