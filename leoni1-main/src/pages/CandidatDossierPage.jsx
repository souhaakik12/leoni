import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import "./CandidatDossierPage.css";

const testOptions = [
  "Test de Preselection 01",
  "Test de Preselection 02",
  "Test de Preselection 03",
];

const ENTRETIEN_OK = "OK";
const ENTRETIEN_NOK = "NOK";
const ENTRETIEN_ATTENTE = "EN_ATTENTE";

const documentGroups = [
  {
    title: "Dossier RH Initial",
    items: [
      { key: "Fiche de Renseignement", title: "Fiche de Renseignement", note: "Formulaire informations personnelles" },
      { key: "Guide d'Entretien", title: "Guide d'Entretien", note: "Guide questions entretien" },
      { key: "Engagement", title: "Engagement", note: "Document engagement candidat" },
    ],
  },
  {
    title: "Tests Non Critiques",
    items: [
      { key: "Test de Preselection 01", title: "Test de Preselection 01", note: "Resultat test 01" },
      { key: "Test de Preselection 02", title: "Test de Preselection 02", note: "Resultat test 02" },
      { key: "Test de Preselection 03", title: "Test de Preselection 03", note: "Resultat test 03" },
    ],
  },
  {
    title: "Tests Critiques",
    items: [
      { key: "Test attention page 01", title: "Test attention page 01", note: "Evaluation critique page 01" },
      { key: "Test attention page 02", title: "Test attention page 02", note: "Evaluation critique page 02" },
      { key: "Test attention page 03", title: "Test attention page 03", note: "Evaluation critique page 03" },
    ],
  },
  {
    title: "Entretien",
    items: [
      { key: "Fiche d'Entretien", title: "Fiche d'Entretien", note: "Observation et evaluation entretien" },
    ],
  },
  {
    title: "Documents Administratifs",
    items: [
      { key: "Extrait de Naissance", title: "Extrait de Naissance", note: "Document naissance" },
      { key: "Fiche Medicale", title: "Fiche Medicale", note: "Aptitude medicale" },
      { key: "Certificat Scolaire", title: "Certificat Scolaire", note: "Attestation niveau scolaire" },
    ],
  },
  {
    title: "Pieces Justificatives",
    items: [
      { key: "B3", title: "B3", note: "Bulletin numero 3" },
      { key: "Photo d'identite", title: "Photo d'identite", note: "Photo d'identite recente" },
      { key: "RIB banque", title: "RIB banque", note: "Releve d'identite bancaire" },
      { key: "Copie CIN", title: "Copie CIN", note: "Copie de la carte d'identite nationale" },
    ],
  },
];

function getInitialForm(candidat) {
  return {
    testPasse: candidat?.testPasse || "Test de Preselection 01",
    entretienAvec: candidat?.entretienAvec || "",
    fonction: candidat?.fonction || "",
    segment: candidat?.segment || "",
    projet: candidat?.projet || "",
    entretienResult: candidat?.entretienResult || ENTRETIEN_ATTENTE,
  };
}

function normalizeDocumentName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isDocumentRegistered(doc) {
  return doc && String(doc.statut || "").trim().toUpperCase() === "ENREGISTRE";
}

function normalizeInterviewResult(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "ok") return ENTRETIEN_OK;
  if (normalized === "nok") return ENTRETIEN_NOK;
  if (normalized === "en attente" || normalized === "en_attente" || normalized === "en attente entretien") {
    return ENTRETIEN_ATTENTE;
  }
  if (normalized === "termine") return "TERMINE";
  return ENTRETIEN_ATTENTE;
}

function getInterviewFormFromInterview(interview, candidat) {
  return {
    testPasse: interview?.test_effectue || candidat?.testPasse || "Test de Preselection 01",
    entretienAvec: interview?.intervieweur || "",
    fonction: interview?.fonction || "",
    segment: interview?.segment || "",
    projet: interview?.projet || "",
    entretienResult: normalizeInterviewResult(interview?.resultat_entretien || candidat?.entretienResult),
  };
}

function buildSelectOptions(options, currentValue) {
  const normalizedCurrentValue = String(currentValue || "").trim();
  if (!normalizedCurrentValue) {
    return options;
  }
  return options.includes(normalizedCurrentValue)
    ? options
    : [normalizedCurrentValue, ...options];
}

function getInterviewResultLabel(value) {
  const normalized = normalizeInterviewResult(value);
  if (normalized === ENTRETIEN_OK) return "OK";
  if (normalized === ENTRETIEN_NOK) return "NOK";
  if (normalized === "TERMINE") return "Termine";
  return "En attente";
}

function getInterviewResultClass(value) {
  const normalized = normalizeInterviewResult(value);
  if (normalized === ENTRETIEN_OK) return "ok";
  if (normalized === ENTRETIEN_NOK) return "nok";
  if (normalized === "TERMINE") return "termine";
  return "pending";
}

function formatInterviewDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR");
}

function displayCandidateValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }
  return "-";
}

export default function CandidatDossierPage() {
  const { candidatId } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { candidats, updateCandidat } = useRecrutements();

  const id = Number(candidatId);
  const candidat = candidats.find((c) => c.id === id);
  const [form, setForm] = useState(() => getInitialForm(candidat));
  const [message, setMessage] = useState("");
  const [registeredDocumentsByName, setRegisteredDocumentsByName] = useState({});
  const [savingDocumentName, setSavingDocumentName] = useState("");
  const [latestInterview, setLatestInterview] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [isInterviewLoading, setIsInterviewLoading] = useState(false);
  const [isInterviewSaving, setIsInterviewSaving] = useState(false);
  const [allowNewInterview, setAllowNewInterview] = useState(false);
  const [fonctionOptions, setFonctionOptions] = useState([]);
  const [segmentOptions, setSegmentOptions] = useState([]);
  const [projetOptions, setProjetOptions] = useState([]);
  const fromContracts = search.includes("from=contracts") || user?.role === "contrats";
  const backPath = fromContracts ? "/contracts/reception" : "/candidats/test";

  const allDocKeys = useMemo(
    () => documentGroups.flatMap((group) => group.items.map((item) => item.key)),
    []
  );
  const getRegisteredDocument = (doc) =>
    registeredDocumentsByName[normalizeDocumentName(doc?.title || doc?.key)] || null;
  const docsDone = allDocKeys.filter((key) => isDocumentRegistered(getRegisteredDocument({ key }))).length;
  const latestInterviewResult = normalizeInterviewResult(latestInterview?.resultat_entretien);
  const interviewLockedByOk = latestInterviewResult === ENTRETIEN_OK;
  const interviewLockedByNok = latestInterviewResult === ENTRETIEN_NOK && !allowNewInterview;
  const isInterviewFormDisabled = isInterviewLoading || isInterviewSaving || interviewLockedByOk || interviewLockedByNok;
  const fonctionSelectOptions = buildSelectOptions(fonctionOptions, form.fonction);
  const segmentSelectOptions = buildSelectOptions(segmentOptions, form.segment);
  const projetSelectOptions = buildSelectOptions(projetOptions, form.projet);

  useEffect(() => {
    let cancelled = false;

    async function loadEntretienOptions() {
      try {
        const response = await fetch("http://localhost:3000/api/references/entretien-options");
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || "Chargement des options entretien impossible.");
        }

        if (!cancelled) {
          setFonctionOptions(Array.isArray(payload?.fonctions) ? payload.fonctions : []);
          setSegmentOptions(Array.isArray(payload?.segments) ? payload.segments : []);
          setProjetOptions(Array.isArray(payload?.projets) ? payload.projets : []);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFonctionOptions([]);
          setSegmentOptions([]);
          setProjetOptions([]);
        }
      }
    }

    loadEntretienOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadRegisteredDocuments = async (candidateId, options = {}) => {
    const { silent = false } = options;

    if (!candidateId) {
      setRegisteredDocumentsByName({});
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/documents/candidat/${candidateId}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Chargement des documents impossible.");
      }

      const nextDocumentsByName = Array.isArray(payload?.documents)
        ? payload.documents.reduce((acc, doc) => {
            const normalizedName = normalizeDocumentName(doc?.document_name);
            if (!normalizedName) return acc;
            acc[normalizedName] = doc;
            return acc;
          }, {})
        : {};

      setRegisteredDocumentsByName(nextDocumentsByName);
    } catch (error) {
      console.error(error);
      setRegisteredDocumentsByName({});
      if (!silent) {
        const errorMessage = error?.message || "Chargement des documents impossible.";
        setMessage(errorMessage);
        setTimeout(() => setMessage(""), 1800);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function syncRegisteredDocuments() {
      if (!candidat?.id) {
        if (!cancelled) {
          setRegisteredDocumentsByName({});
        }
        return;
      }

      try {
        const response = await fetch(`http://localhost:3000/api/documents/candidat/${candidat.id}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || "Chargement des documents impossible.");
        }

        if (!cancelled) {
          const nextDocumentsByName = Array.isArray(payload?.documents)
            ? payload.documents.reduce((acc, doc) => {
                const normalizedName = normalizeDocumentName(doc?.document_name);
                if (!normalizedName) return acc;
                acc[normalizedName] = doc;
                return acc;
              }, {})
            : {};

          setRegisteredDocumentsByName(nextDocumentsByName);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setRegisteredDocumentsByName({});
        }
      }
    }

    syncRegisteredDocuments();

    return () => {
      cancelled = true;
    };
  }, [candidat?.id]);

  const loadInterviewData = async (candidateId, options = {}) => {
    const { silent = false } = options;

    if (!candidateId) {
      setLatestInterview(null);
      setInterviewHistory([]);
      setAllowNewInterview(false);
      setForm(getInitialForm(candidat));
      return;
    }

    try {
      setIsInterviewLoading(true);
      const [latestResponse, historyResponse] = await Promise.all([
        fetch(`http://localhost:3000/api/test-entretien/${candidateId}/latest`),
        fetch(`http://localhost:3000/api/test-entretien/${candidateId}`),
      ]);

      const latestPayload = await latestResponse.json().catch(() => null);
      const historyPayload = await historyResponse.json().catch(() => null);

      if (!latestResponse.ok) {
        throw new Error(latestPayload?.message || "Chargement du dernier entretien impossible.");
      }
      if (!historyResponse.ok) {
        throw new Error(historyPayload?.message || "Chargement de l'historique des entretiens impossible.");
      }

      const nextLatestInterview = latestPayload?.interview || null;
      const nextHistory = Array.isArray(historyPayload?.interviews) ? historyPayload.interviews : [];

      setLatestInterview(nextLatestInterview);
      setInterviewHistory(nextHistory);
      setAllowNewInterview(false);
      setForm(nextLatestInterview ? getInterviewFormFromInterview(nextLatestInterview, candidat) : getInitialForm(candidat));
    } catch (error) {
      console.error(error);
      setLatestInterview(null);
      setInterviewHistory([]);
      setAllowNewInterview(false);
      setForm(getInitialForm(candidat));
      if (!silent) {
        const errorMessage = error?.message || "Chargement des entretiens impossible.";
        setMessage(errorMessage);
        setTimeout(() => setMessage(""), 1800);
      }
    } finally {
      setIsInterviewLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function syncInterviewData() {
      if (!candidat?.id) {
        if (!cancelled) {
          setLatestInterview(null);
          setInterviewHistory([]);
          setAllowNewInterview(false);
          setForm(getInitialForm(candidat));
        }
        return;
      }

      try {
        setIsInterviewLoading(true);
        const [latestResponse, historyResponse] = await Promise.all([
          fetch(`http://localhost:3000/api/test-entretien/${candidat.id}/latest`),
          fetch(`http://localhost:3000/api/test-entretien/${candidat.id}`),
        ]);

        const latestPayload = await latestResponse.json().catch(() => null);
        const historyPayload = await historyResponse.json().catch(() => null);

        if (!latestResponse.ok) {
          throw new Error(latestPayload?.message || "Chargement du dernier entretien impossible.");
        }
        if (!historyResponse.ok) {
          throw new Error(historyPayload?.message || "Chargement de l'historique des entretiens impossible.");
        }

        if (!cancelled) {
          const nextLatestInterview = latestPayload?.interview || null;
          setLatestInterview(nextLatestInterview);
          setInterviewHistory(Array.isArray(historyPayload?.interviews) ? historyPayload.interviews : []);
          setAllowNewInterview(false);
          setForm(nextLatestInterview ? getInterviewFormFromInterview(nextLatestInterview, candidat) : getInitialForm(candidat));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLatestInterview(null);
          setInterviewHistory([]);
          setAllowNewInterview(false);
          setForm(getInitialForm(candidat));
        }
      } finally {
        if (!cancelled) {
          setIsInterviewLoading(false);
        }
      }
    }

    syncInterviewData();

    return () => {
      cancelled = true;
    };
  }, [candidat?.id]);

  if (!candidat) {
    return (
      <div className="dossier-page">
        <div className="dossier-not-found">
          <h2>Candidat introuvable</h2>
          <button onClick={() => navigate(backPath)}>Retourner</button>
        </div>
      </div>
    );
  }

  const saveInterviewInfo = async () => {
    if (!candidat?.id || isInterviewFormDisabled) {
      return;
    }

    try {
      setIsInterviewSaving(true);

      const response = await fetch("http://localhost:3000/api/test-entretien", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidat_id: candidat.id,
          test_effectue: form.testPasse,
          intervieweur: form.entretienAvec,
          fonction: form.fonction,
          segment: form.segment,
          projet: form.projet,
          resultat_entretien: form.entretienResult,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Enregistrement de l'entretien impossible.");
      }

      updateCandidat({
        ...candidat,
        testPasse: form.testPasse,
        entretienAvec: form.entretienAvec,
        fonction: form.fonction,
        segment: form.segment,
        projet: form.projet,
        entretienResult: normalizeInterviewResult(payload?.interview?.resultat_entretien || form.entretienResult),
        etape: payload?.candidat?.etape || candidat.etape,
        statut: payload?.candidat?.statut || candidat.statut,
      });

      await loadInterviewData(candidat.id, { silent: true });

      const savedResult = normalizeInterviewResult(payload?.interview?.resultat_entretien || form.entretienResult);
      const messageText =
        savedResult === ENTRETIEN_OK
          ? "Entretien validé. Candidat transféré vers séance contrat."
          : savedResult === ENTRETIEN_NOK
            ? "Entretien enregistré en NOK. Candidat reste en étape Test / Entretien."
            : "Entretien en attente enregistré.";

      setMessage(messageText);
      setTimeout(() => setMessage(""), 2200);
    } catch (error) {
      const errorMessage = error?.message || "Enregistrement de l'entretien impossible.";
      setMessage(errorMessage);
      setTimeout(() => setMessage(""), 2200);
    } finally {
      setIsInterviewSaving(false);
    }
  };

  const scheduleNewInterview = () => {
    setAllowNewInterview(true);
    setForm(getInitialForm(candidat));
    setMessage("");
  };

  const registerDocument = async (documentName) => {
    if (!candidat?.id || !documentName) {
      return;
    }

    try {
      setSavingDocumentName(documentName);

      const response = await fetch("http://localhost:3000/api/documents/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidat_id: candidat.id,
          document_name: documentName,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Enregistrement document impossible.");
      }

      await loadRegisteredDocuments(candidat.id, { silent: true });
      setMessage(payload?.message || "Document enregistre.");
      setTimeout(() => setMessage(""), 1500);
    } catch (error) {
      const errorMessage = error?.message || "Enregistrement document impossible.";
      setMessage(errorMessage);
      setTimeout(() => setMessage(""), 1800);
    } finally {
      setSavingDocumentName("");
    }
  };

  return (
    <div className="dossier-page">
      {message && <div className="dossier-toast">{message}</div>}

      <div className="dossier-head">
        <button onClick={() => navigate(backPath)} className="dossier-back">
          {fromContracts ? "Retour service contrats" : "Retour page Test"}
        </button>
        <div className="dossier-title-wrap">
          <h2>Dossier Candidat - {candidat.nomComplet}</h2>
          <p>CIN: {candidat.cin || "-"} | Telephone: {candidat.telephone || "-"} | Age: {candidat.age || "-"}</p>
        </div>
        <div className="dossier-progress">
          <strong>{docsDone}/{allDocKeys.length}</strong>
          <span>documents enregistres</span>
        </div>
      </div>

      <section className="dossier-info-grid">
        <article className="dossier-card">
          <h3>Informations Personnelles</h3>
          <div className="dossier-mini-grid">
            <div><label>NOM</label><strong>{displayCandidateValue(candidat.nomComplet, candidat.nom)}</strong></div>
            <div><label>CIN</label><strong>{displayCandidateValue(candidat.cin)}</strong></div>
            <div><label>TELEPHONE</label><strong>{displayCandidateValue(candidat.telephone)}</strong></div>
            <div><label>AGE</label><strong>{displayCandidateValue(candidat.age)}</strong></div>
            <div><label>GENRE</label><strong>{displayCandidateValue(candidat.genre, candidat.sexe)}</strong></div>
            <div><label>NIVEAU SCOLAIRE</label><strong>{displayCandidateValue(candidat.niveauEtudes, candidat.niveau_scolaire, candidat.niveau_etudes)}</strong></div>
            <div><label>POSTE</label><strong>{displayCandidateValue(candidat.posteVise, candidat.poste)}</strong></div>
            <div><label>ADRESSE</label><strong>{displayCandidateValue(candidat.adresse)}</strong></div>
          </div>
        </article>

        <article className="dossier-card">
          <h3>Test & Entretien</h3>
          <div className="dossier-form-grid">
            <div>
              <label>Test effectue</label>
              <input
                type="text"
                list="tests-list"
                placeholder="Nom du test"
                value={form.testPasse}
                onChange={(e) => setForm((p) => ({ ...p, testPasse: e.target.value }))}
                disabled={isInterviewFormDisabled}
              />
              <datalist id="tests-list">
                {testOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div>
              <label>Entretien avec</label>
              <input
                value={form.entretienAvec}
                onChange={(e) => setForm((p) => ({ ...p, entretienAvec: e.target.value }))}
                placeholder="Nom intervieweur"
                disabled={isInterviewFormDisabled}
              />
            </div>
            <div>
              <label>Fonction</label>
              <select
                value={form.fonction}
                onChange={(e) => setForm((p) => ({ ...p, fonction: e.target.value }))}
                disabled={isInterviewFormDisabled}
              >
                <option value="">Sélectionner une fonction</option>
                {fonctionSelectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Segment</label>
              <select
                value={form.segment}
                onChange={(e) => setForm((p) => ({ ...p, segment: e.target.value }))}
                disabled={isInterviewFormDisabled}
              >
                <option value="">Sélectionner un segment</option>
                {segmentSelectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Projet</label>
              <select
                value={form.projet}
                onChange={(e) => setForm((p) => ({ ...p, projet: e.target.value }))}
                disabled={isInterviewFormDisabled}
              >
                <option value="">Sélectionner un projet</option>
                {projetSelectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Resultat entretien</label>
              <select
                value={form.entretienResult}
                onChange={(e) => setForm((p) => ({ ...p, entretienResult: e.target.value }))}
                disabled={isInterviewFormDisabled}
              >
                <option value={ENTRETIEN_ATTENTE}>En attente</option>
                <option value={ENTRETIEN_OK}>OK</option>
                <option value={ENTRETIEN_NOK}>NOK</option>
              </select>
            </div>
          </div>

          {latestInterview && (
            <div className="interview-summary">
              <div className="interview-summary-head">
                <strong>Dernier entretien</strong>
                <span className={`interview-result-badge ${getInterviewResultClass(latestInterview.resultat_entretien)}`}>
                  {getInterviewResultLabel(latestInterview.resultat_entretien)}
                </span>
              </div>
              <p>Test: {latestInterview.test_effectue || "-"}</p>
              <p>Intervieweur: {latestInterview.intervieweur || "-"}</p>
              <p>Date: {formatInterviewDate(latestInterview.date_entretien || latestInterview.updated_at || latestInterview.date_saisie)}</p>
            </div>
          )}

          {latestInterviewResult === ENTRETIEN_OK && (
            <div className="interview-summary">
              <div className="interview-summary-head">
                <strong>Statut entretien</strong>
                <span className="interview-result-badge ok">OK</span>
              </div>
              <p>Entretien validé. Candidat transféré vers séance contrat.</p>
            </div>
          )}

          <div className="interview-action-row">
            {latestInterviewResult === ENTRETIEN_NOK && !allowNewInterview && (
              <button onClick={scheduleNewInterview} className="dossier-save secondary">
                Programmer un nouvel entretien
              </button>
            )}

            {latestInterviewResult !== ENTRETIEN_OK && (!latestInterview || latestInterviewResult !== ENTRETIEN_NOK || allowNewInterview) && (
              <button onClick={saveInterviewInfo} className="dossier-save" disabled={isInterviewFormDisabled}>
                {isInterviewSaving ? "Enregistrement..." : "Enregistrer infos entretien"}
              </button>
            )}
          </div>

          <div className="interview-summary">
            <div className="interview-summary-head">
              <strong>Historique des entretiens</strong>
              <span>{interviewHistory.length}</span>
            </div>
            {interviewHistory.length === 0 ? (
              <p>Aucun entretien enregistre pour ce candidat.</p>
            ) : (
              <div className="interview-history-list">
                {interviewHistory.map((interview) => (
                  <div key={interview.id} className="interview-history-item">
                    <div className="interview-history-main">
                      <strong>{interview.test_effectue || "Test non renseigne"}</strong>
                      <span>
                        Intervieweur: {interview.intervieweur || "-"} | Fonction: {interview.fonction || "-"}
                      </span>
                    </div>
                    <div className="interview-history-meta">
                      <span>{formatInterviewDate(interview.date_entretien || interview.updated_at || interview.date_saisie)}</span>
                      <span className={`interview-result-badge ${getInterviewResultClass(interview.resultat_entretien)}`}>
                        {getInterviewResultLabel(interview.resultat_entretien)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="dossier-doc-section">
        {documentGroups.map((group) => (
          <article key={group.title} className="dossier-doc-group">
            <h3>{group.title}</h3>
            <div className="dossier-doc-grid">
              {group.items.map((doc) => {
                const documentRecord = getRegisteredDocument(doc);
                const isDone = isDocumentRegistered(documentRecord);
                const isSaving = savingDocumentName === doc.key;
                return (
                  <div key={doc.key} className={`doc-card ${isDone ? "done" : ""}`}>
                    <div className="doc-preview">{doc.title}</div>
                    <div className="doc-text">
                      <strong>{doc.title}</strong>
                      <p>{doc.note}</p>
                    </div>
                    <div className="doc-actions">
                      <span className={`doc-status ${isDone ? "ok" : "missing"}`}>
                        {isDone ? "Enregistre" : "Manquant"}
                      </span>
                      <button onClick={() => registerDocument(doc.title)} disabled={isSaving || isDone}>
                        {isDone ? "Enregistre" : isSaving ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
