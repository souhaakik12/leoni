import { useState } from "react";
import "./AdminPowerBIPage.css";

const POWERBI_REPORTS = {
  recrutement: {
    title: "Tableau de bord recrutement",
    url: "https://app.powerbi.com/reportEmbed?reportId=38416229-5f47-4806-a503-fd9afb465f25&autoAuth=true&ctid=473589e1-58a6-410a-88b9-844304b94936",
  },
  contrats: {
    title: "Tableau de bord contrats",
    url: "https://app.powerbi.com/reportEmbed?reportId=f7af3692-d4ca-4808-a827-b313dfd2bafc&autoAuth=true&ctid=473589e1-58a6-410a-88b9-844304b94936",
  },
  missions: {
    title: "Tableau de bord missions",
    url: "https://app.powerbi.com/reportEmbed?reportId=12a8adbd-45ef-4e61-b00d-b1962479d240&autoAuth=true&ctid=473589e1-58a6-410a-88b9-844304b94936",
  },
};

const REPORT_TABS = [
  { key: "recrutement", label: "Recrutement" },
  { key: "contrats", label: "Contrats" },
  { key: "missions", label: "Missions" },
];

function isConfiguredPowerBIUrl(url) {
  return Boolean(url) && !url.startsWith("COLLER_ICI_");
}

export default function AdminPowerBIPage() {
  const [activeTab, setActiveTab] = useState("recrutement");
  const activeReport = POWERBI_REPORTS[activeTab];
  const isReady = isConfiguredPowerBIUrl(activeReport?.url);

  return (
    <div className="admin-powerbi-page">
      <section className="admin-powerbi-hero">
        <div className="admin-powerbi-hero-badge">Administration RH</div>
        <h2>Tableaux de bord </h2>
        <p>Suivi des candidats, contrats et missions</p>
      </section>

      <section className="admin-powerbi-content">
        <div className="admin-powerbi-tabs" role="tablist" aria-label="Tableaux de bord Power BI">
          {REPORT_TABS.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`admin-powerbi-tab${isActive ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="admin-powerbi-card">
          <div className="admin-powerbi-card-header">
            <div>
              <span className="admin-powerbi-card-label">Power BI</span>
              <h3>{activeReport.title}</h3>
            </div>
            <p>Affichage integre du reporting decisionnel pour l'administration.</p>
          </div>

          {isReady ? (
            <iframe
              className="admin-powerbi-frame"
              src={activeReport.url}
              title={activeReport.title}
              loading="lazy"
              allowFullScreen
            />
          ) : (
            <div className="admin-powerbi-placeholder">
              <div className="admin-powerbi-placeholder-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </div>
              <h4>Lien Power BI a configurer</h4>
              <p>
                Collez l'URL d'integration du rapport actif dans
                {" "}
                <code>{`POWERBI_REPORTS.${activeTab}.url`}</code>
                {" "}
                dans
                {" "}
                <code>src/pages/AdminPowerBIPage.jsx</code>.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
