import ContractOnboardingPanel from "../components/ContractOnboardingPanel.jsx";

export default function ContractReceptionPage() {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
          Service Contrats - Reception Candidats
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
          Ici, la signature contrat et la validation dossier sont gerees separement. Le candidat est finalise uniquement quand les deux sont valides.
        </p>
      </div>

      <ContractOnboardingPanel />
    </div>
  );
}
