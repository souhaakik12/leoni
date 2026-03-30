import { useMemo, useState } from "react";
import { useRecrutements } from "../context/RecrutementsContext.jsx";

const STATUS_ACCEPTE = "Accepte";

const requiredDocDefinitions = [
  { key: "rib_banque", label: "RIB banque", maleOnly: false },
  { key: "b3", label: "B3 (homme)", maleOnly: true },
  { key: "copie_cin", label: "Copie carte d'identite", maleOnly: false },
  { key: "certificat_scolaire", label: "Certificat scolaire", maleOnly: false },
  { key: "photo_identite", label: "Photo d'identite", maleOnly: false },
];

function norm(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isMaleCandidate(candidat) {
  const sexe = norm(candidat?.sexe);
  return sexe.includes("homme") || sexe.includes("male") || sexe.includes("garcon");
}

function getRequiredDocs(candidat) {
  const isMale = isMaleCandidate(candidat);
  return requiredDocDefinitions.filter((doc) => !doc.maleOnly || isMale);
}

function isContractDossierComplete(candidat) {
  const docs = candidat.documentsContrat || {};
  const requiredDocs = getRequiredDocs(candidat);
  const hasAllDocs = requiredDocs.every((doc) => Boolean(docs[doc.key]));
  return hasAllDocs && Boolean(candidat.contratSigne);
}

export default function ContractOnboardingPanel() {
  const { candidats, updateCandidat } = useRecrutements();
  const [toast, setToast] = useState("");

  const queue = useMemo(
    () => candidats.filter((c) => c.typeCandidat === "contact_contract"),
    [candidats]
  );

  const pendingCount = queue.filter((c) => !c.contratValide).length;

  const pushToast = (message, timeout = 2200) => {
    setToast(message);
    setTimeout(() => setToast(""), timeout);
  };

  const toggleDocument = (candidate, key) => {
    const docs = candidate.documentsContrat || {};
    const next = {
      ...candidate,
      documentsContrat: { ...docs, [key]: !docs[key] },
      contratValide: false,
      statut: STATUS_ACCEPTE,
    };
    updateCandidat(next);
    pushToast(`Document mis a jour pour ${candidate.nomComplet}.`, 1400);
  };

  const toggleSignature = (candidate) => {
    const nextSigned = !candidate.contratSigne;
    const next = {
      ...candidate,
      contratSigne: nextSigned,
      contratValide: false,
      statut: STATUS_ACCEPTE,
    };
    updateCandidat(next);
    pushToast(
      nextSigned
        ? `Contrat signe pour ${candidate.nomComplet}.`
        : `Signature retiree pour ${candidate.nomComplet}.`,
      1600
    );
  };

  const validateDossier = (candidate) => {
    if (!isContractDossierComplete(candidate)) {
      pushToast("Dossier incomplet: verifier toutes les pieces et la signature.");
      return;
    }
    updateCandidat({
      ...candidate,
      contratValide: true,
      statut: STATUS_ACCEPTE,
    });
    pushToast(`Dossier contrat valide pour ${candidate.nomComplet}.`);
  };

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 18,
      }}
    >
      {toast && (
        <div
          style={{
            marginBottom: 12,
            border: "1px solid #d8c8f4",
            background: "#f6f0ff",
            color: "#5f34a4",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {toast}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#5f34a4" }}>
            Candidats envoyes par recrutement
          </h3>
          <p style={{ marginTop: 3, fontSize: 12, color: "#6f57a8" }}>
            Entretien valide (OK): signature contrat + verification dossier.
          </p>
        </div>
        <div
          style={{
            border: "1px solid #d8c8f4",
            background: "#faf7ff",
            borderRadius: 9,
            padding: "6px 10px",
            fontSize: 12,
            color: "#5f34a4",
            fontWeight: 700,
          }}
        >
          {pendingCount}/{queue.length} en cours
        </div>
      </div>

      {queue.length === 0 ? (
        <div
          style={{
            border: "1px dashed #d8c8f4",
            borderRadius: 10,
            background: "#faf7ff",
            color: "#6f57a8",
            fontSize: 13,
            padding: 14,
          }}
        >
          Aucun candidat en attente de traitement contrat.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {queue.map((candidate) => {
            const docs = candidate.documentsContrat || {};
            const requiredDocs = getRequiredDocs(candidate);
            const docsDone = requiredDocs.filter((doc) => docs[doc.key]).length;
            const dossierComplete = isContractDossierComplete(candidate);
            return (
              <article
                key={candidate.id}
                style={{
                  border: "1px solid #d8c8f4",
                  borderRadius: 10,
                  background: "#faf7ff",
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#4f288c" }}>
                      {candidate.nomComplet}
                    </div>
                    <div style={{ fontSize: 12, color: "#6f57a8", marginTop: 2 }}>
                      CIN: {candidate.cin || "-"} | Tel: {candidate.telephone || "-"}
                    </div>
                  </div>
                  <div
                    style={{
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: candidate.contratValide ? "#def4e9" : "#f4ecff",
                      color: candidate.contratValide ? "#1f885c" : "#5f34a4",
                      border: `1px solid ${candidate.contratValide ? "#bce3cd" : "#d8c8f4"}`,
                    }}
                  >
                    {candidate.contratValide ? "Contrat valide" : "Traitement contrat"}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {requiredDocs.map((doc) => {
                    const done = Boolean(docs[doc.key]);
                    return (
                      <button
                        key={doc.key}
                        onClick={() => toggleDocument(candidate, doc.key)}
                        style={{
                          border: `1px solid ${done ? "#bce3cd" : "#d8c8f4"}`,
                          background: done ? "#ecfaf2" : "#f4ecff",
                          color: done ? "#1f885c" : "#5f34a4",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "7px 8px",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        {doc.label} - {done ? "OK" : "Manquant"}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() => toggleSignature(candidate)}
                    style={{
                      border: `1px solid ${candidate.contratSigne ? "#15803d" : "#ea580c"}`,
                      background: candidate.contratSigne ? "#16a34a" : "#f97316",
                      color: "#fff",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "8px 12px",
                      minWidth: 170,
                      cursor: "pointer",
                      boxShadow: candidate.contratSigne
                        ? "0 2px 8px rgba(22,163,74,0.25)"
                        : "0 2px 8px rgba(249,115,22,0.25)",
                    }}
                  >
                    {candidate.contratSigne ? "Contrat signe" : "Signer le contrat"}
                  </button>
                  <button
                    onClick={() => validateDossier(candidate)}
                    style={{
                      border: "1px solid #6d3eb7",
                      background: "#6d3eb7",
                      color: "#fff",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "7px 10px",
                      cursor: "pointer",
                      opacity: dossierComplete ? 1 : 0.65,
                    }}
                  >
                    Valider dossier contrat
                  </button>
                  <span style={{ fontSize: 12, color: "#6f57a8", fontWeight: 700 }}>
                    Pieces: {docsDone}/{requiredDocs.length}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
