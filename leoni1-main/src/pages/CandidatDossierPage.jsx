import { useMemo, useState } from "react";
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
      { key: "fiche_renseignement", title: "Fiche de Renseignement", note: "Formulaire informations personnelles" },
      { key: "guide_entretien", title: "Guide d'Entretien", note: "Guide questions entretien" },
      { key: "engagement", title: "Engagement", note: "Document engagement candidat" },
    ],
  },
  {
    title: "Tests Non Critiques",
    items: [
      { key: "test_preselection_01", title: "Test de Preselection 01", note: "Resultat test 01" },
      { key: "test_preselection_02", title: "Test de Preselection 02", note: "Resultat test 02" },
      { key: "test_preselection_03", title: "Test de Preselection 03", note: "Resultat test 03" },
    ],
  },
  {
    title: "Entretien & Identite",
    items: [
      { key: "fiche_entretien", title: "Fiche d'Entretien", note: "Observation et evaluation entretien" },
      { key: "cin_recto", title: "CIN Recto", note: "Carte d'identite nationale (recto)" },
      { key: "cin_verso", title: "CIN Verso", note: "Carte d'identite nationale (verso)" },
    ],
  },
  {
    title: "Documents Administratifs",
    items: [
      { key: "extrait_naissance", title: "Extrait de Naissance", note: "Document naissance" },
      { key: "fiche_medicale", title: "Fiche Medicale", note: "Aptitude medicale" },
      { key: "certificat_scolaire", title: "Certificat Scolaire", note: "Attestation niveau scolaire" },
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
  const fromContracts = search.includes("from=contracts") || user?.role === "contrats";
  const backPath = fromContracts ? "/contracts/reception" : "/candidats/test";

  const documents = candidat?.documents || {};
  const allDocKeys = useMemo(
    () => documentGroups.flatMap((group) => group.items.map((item) => item.key)),
    []
  );
  const docsDone = allDocKeys.filter((key) => documents[key]).length;

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

  const saveInterviewInfo = () => {
    const next = { ...candidat, ...form };
    if (form.entretienResult === ENTRETIEN_OK) {
      next.typeCandidat = "contact_contract";
      next.statut = "Accepte";
    } else if (form.entretienResult === ENTRETIEN_NOK) {
      next.typeCandidat = "test_passed";
      next.statut = "Refuse";
    }
    updateCandidat(next);
    const messageText =
      form.entretienResult === ENTRETIEN_OK
        ? "Entretien OK: candidat envoye au service Contrats."
        : form.entretienResult === ENTRETIEN_NOK
          ? "Entretien NOK enregistre."
          : "Informations entretien enregistrees.";
    setMessage(messageText);
    setTimeout(() => setMessage(""), 2200);
    if (form.entretienResult === ENTRETIEN_OK) {
      setTimeout(() => navigate(backPath), 700);
    }
  };

  const toggleDocument = (key) => {
    updateCandidat({
      ...candidat,
      documents: {
        ...documents,
        [key]: !documents[key],
      },
    });
    setMessage(documents[key] ? "Document marque comme manquant." : "Document enregistre.");
    setTimeout(() => setMessage(""), 1500);
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
          <p>CIN: {candidat.cin} | Telephone: {candidat.telephone || "-"} | Email: {candidat.email || "-"}</p>
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
            <div><label>Nom</label><strong>{candidat.nomComplet || "-"}</strong></div>
            <div><label>CIN</label><strong>{candidat.cin || "-"}</strong></div>
            <div><label>Residence</label><strong>{candidat.gouvernoratResidence || "-"}</strong></div>
            <div><label>Niveau</label><strong>{candidat.niveauEtudes || "-"}</strong></div>
          </div>
        </article>

        <article className="dossier-card">
          <h3>Test & Entretien</h3>
          <div className="dossier-form-grid">
            <div>
              <label>Test effectue</label>
              <select value={form.testPasse} onChange={(e) => setForm((p) => ({ ...p, testPasse: e.target.value }))}>
                {testOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Entretien avec</label>
              <input
                value={form.entretienAvec}
                onChange={(e) => setForm((p) => ({ ...p, entretienAvec: e.target.value }))}
                placeholder="Nom intervieweur"
              />
            </div>
            <div>
              <label>Fonction</label>
              <input
                value={form.fonction}
                onChange={(e) => setForm((p) => ({ ...p, fonction: e.target.value }))}
                placeholder="Fonction"
              />
            </div>
            <div>
              <label>Segment</label>
              <input
                value={form.segment}
                onChange={(e) => setForm((p) => ({ ...p, segment: e.target.value }))}
                placeholder="Segment"
              />
            </div>
            <div>
              <label>Projet</label>
              <input
                value={form.projet}
                onChange={(e) => setForm((p) => ({ ...p, projet: e.target.value }))}
                placeholder="Projet"
              />
            </div>
            <div>
              <label>Resultat entretien</label>
              <select
                value={form.entretienResult}
                onChange={(e) => setForm((p) => ({ ...p, entretienResult: e.target.value }))}
              >
                <option value={ENTRETIEN_ATTENTE}>En attente</option>
                <option value={ENTRETIEN_OK}>OK</option>
                <option value={ENTRETIEN_NOK}>NOK</option>
              </select>
            </div>
          </div>
          <button onClick={saveInterviewInfo} className="dossier-save">Enregistrer infos entretien</button>
        </article>
      </section>

      <section className="dossier-doc-section">
        {documentGroups.map((group) => (
          <article key={group.title} className="dossier-doc-group">
            <h3>{group.title}</h3>
            <div className="dossier-doc-grid">
              {group.items.map((doc) => {
                const isDone = !!documents[doc.key];
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
                      <button onClick={() => toggleDocument(doc.key)}>
                        {isDone ? "Retirer" : "Enregistrer"}
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
