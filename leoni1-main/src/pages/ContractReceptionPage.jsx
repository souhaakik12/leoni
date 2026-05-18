import ContractOnboardingPanel from "../components/ContractOnboardingPanel.jsx";

export default function ContractReceptionPage() {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
          Service Contrats - Réception Candidats
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
          Ici, la signature du contrat et la validation du dossier sont gérées séparément. Le
          candidat est finalisé uniquement lorsque les deux sont validées.
        </p>
      </div>

      <ContractOnboardingPanel />
    </div>
  );
}
