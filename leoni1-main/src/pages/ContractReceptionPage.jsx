import ContractOnboardingPanel from "../components/ContractOnboardingPanel.jsx";

export default function ContractReceptionPage() {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
          Service Contrats - Reception Candidats
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
          Candidats valides apres entretien: signature contrat et verification dossier.
        </p>
      </div>

      <ContractOnboardingPanel />
    </div>
  );
}
