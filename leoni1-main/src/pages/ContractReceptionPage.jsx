import ContractOnboardingPanel from "../components/ContractOnboardingPanel.jsx";

export default function ContractReceptionPage() {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
          Service Contrats - Réception Candidats
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
        
        </p>
      </div>

      <ContractOnboardingPanel />
    </div>
  );
}
