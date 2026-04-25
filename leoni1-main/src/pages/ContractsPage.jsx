import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import "./ContractsPage.css";

const seedContracts = [
  {
    id: 1,
    cin: "12458796",
    nomPrenom: "Fatima Zahra El Idrissi",
    telephone: "22 458 796",
    email: "fatima.elidrissi@leoni.test",
    poste: "Operatrice chaine",
    typeContrat: "CDD",
    dateSignature: "08/02/2026",
    dateDebutContrat: "10/02/2026",
    dateFinContrat: "15/04/2026",
    statutContrat: "Expire",
  },
  {
    id: 2,
    cin: "11895237",
    nomPrenom: "Amina Bennani",
    telephone: "20 895 237",
    email: "amina.bennani@leoni.test",
    poste: "Chargee logistique",
    typeContrat: "CDD",
    dateSignature: "16/02/2026",
    dateDebutContrat: "18/02/2026",
    dateFinContrat: "20/04/2026",
    statutContrat: "Expire",
  },
  {
    id: 3,
    cin: "13145789",
    nomPrenom: "Khadija Alami",
    telephone: "21 145 789",
    email: "khadija.alami@leoni.test",
    poste: "Controleuse qualite",
    typeContrat: "CDD",
    dateSignature: "01/03/2026",
    dateDebutContrat: "03/03/2026",
    dateFinContrat: "28/04/2026",
    statutContrat: "A renouveler",
  },
  {
    id: 4,
    cin: "10774589",
    nomPrenom: "Mohamed Tahar",
    telephone: "29 774 589",
    email: "mohamed.tahar@leoni.test",
    poste: "Technicien maintenance",
    typeContrat: "CDI",
    dateSignature: "10/01/2026",
    dateDebutContrat: "12/01/2026",
    dateFinContrat: "-",
    statutContrat: "Actif",
  },
  {
    id: 5,
    cin: "11590248",
    nomPrenom: "Sana Karoui",
    telephone: "25 590 248",
    email: "sana.karoui@leoni.test",
    poste: "Assistante RH",
    typeContrat: "CDI",
    dateSignature: "05/01/2026",
    dateDebutContrat: "07/01/2026",
    dateFinContrat: "-",
    statutContrat: "Actif",
  },
];

const PAGE_SIZE_OPTIONS = [6, 10, 14];
const STATIC_RENEWAL_ALERTS = [
  {
    id: "renewal-urgent",
    title: "Contrat proche d'expiration",
    headline: "CAIP arrive a expiration dans 7 jours",
    nomPrenom: "Ines Ben Salem",
    matricule: "CAIP-1042",
    typeContrat: "CAIP",
    dateDebutContrat: "01/11/2025",
    dateFinContrat: "01/05/2026",
    joursRestants: 7,
    segment: "Assemblage",
    fonction: "Operatrice cablage",
    projet: "Harness A1",
    site: "Mghira",
    responsable: "Nadia Salem",
    statutAlerte: "Ouverte",
    niveau: "urgent",
    description:
      "Le contrat temporaire entre dans sa fenetre critique de renouvellement. Sans arbitrage rapide, la continuite de presence sur ligne risque d'etre interrompue.",
    detail:
      "Le collaborateur a termine l'ensemble des etapes contractuelles et le besoin production reste confirme par le manager de secteur. La date de fin approche sans decision formelle enregistree.",
    actionRecommandee:
      "Valider la decision de renouvellement avant le 29/04/2026, preparer l'avenant et confirmer le circuit de signature avec le responsable contrat.",
    suivi:
      "Derniere relance RH envoyee ce matin. Le responsable d'unite a confirme le maintien du besoin, en attente de validation finale.",
    criticite: 92,
    timeline: [
      { label: "Signal detecte", state: "done" },
      { label: "Verification RH", state: "current" },
      { label: "Decision manager", state: "upcoming" },
    ],
  },
  {
    id: "renewal-action",
    title: "Renouvellement a preparer",
    headline: "CIVP arrive a expiration dans 15 jours",
    nomPrenom: "Amani Triki",
    matricule: "CIVP-2078",
    typeContrat: "CIVP",
    dateDebutContrat: "09/11/2025",
    dateFinContrat: "09/05/2026",
    joursRestants: 15,
    segment: "Qualite",
    fonction: "Controleuse qualite",
    projet: "Quality Q4",
    site: "Mghira",
    responsable: "Imen Trabelsi",
    statutAlerte: "A planifier",
    niveau: "action",
    description:
      "Le contrat doit etre examine dans le prochain point RH afin d'anticiper le renouvellement et d'eviter une validation en urgence.",
    detail:
      "Le poste reste actif et l'equipe qualite souhaite conserver la ressource. Les pieces administratives sont a jour mais la planification de signature n'est pas encore reservee.",
    actionRecommandee:
      "Programmer la revue contrat cette semaine, verifier l'enveloppe disponible et lancer la preparation du dossier de prolongation.",
    suivi:
      "Le dossier est complet a 80 %. La date de passage en comite est proposee pour la semaine prochaine.",
    criticite: 67,
    timeline: [
      { label: "Signal detecte", state: "done" },
      { label: "Revue contrat", state: "current" },
      { label: "Preparation signature", state: "upcoming" },
    ],
  },
  {
    id: "renewal-info",
    title: "Contrat a surveiller",
    headline: "SIVP arrive a expiration dans 30 jours",
    nomPrenom: "Mariem Chiboub",
    matricule: "SIVP-3315",
    typeContrat: "SIVP",
    dateDebutContrat: "24/11/2025",
    dateFinContrat: "24/05/2026",
    joursRestants: 30,
    segment: "Logistique",
    fonction: "Assistante logistique",
    projet: "Supply B2",
    site: "Sousse",
    responsable: "Rym Gharbi",
    statutAlerte: "Information",
    niveau: "info",
    description:
      "Le contrat n'est pas encore critique mais doit etre inscrit dans le plan de suivi mensuel pour garder une vision claire des echeances a venir.",
    detail:
      "Le besoin metier reste stable et aucune non-conformite n'est remontee. L'alerte sert surtout a garder une trace centralisee dans l'interface contrats.",
    actionRecommandee:
      "Maintenir le contrat dans le radar hebdomadaire et confirmer l'intention de renouvellement lors du prochain point manager.",
    suivi:
      "Aucun blocage identifie. Le prochain controle administratif est prevu dans deux semaines.",
    criticite: 38,
    timeline: [
      { label: "Surveillance", state: "current" },
      { label: "Point manager", state: "upcoming" },
      { label: "Decision RH", state: "upcoming" },
    ],
  },
];

const RENEWAL_ALERT_THEMES = {
  urgent: {
    label: "Urgent",
    className: "is-urgent",
    accentTone: "danger",
    indicatorLabel: "Traitement immediat requis",
  },
  action: {
    label: "A traiter",
    className: "is-action",
    accentTone: "warning",
    indicatorLabel: "Traitement prioritaire",
  },
  info: {
    label: "Information",
    className: "is-info",
    accentTone: "info",
    indicatorLabel: "Surveillance active",
  },
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseDateValue(value) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue || normalizedValue === "-" || normalizedValue === "—") return null;

  if (normalizedValue.includes("/")) {
    const [day, month, year] = normalizedValue.split("/");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(value) {
  const date = parseDateValue(value);
  if (!date) return "-";

  return date.toLocaleDateString("fr-TN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function computeDaysRemaining(dateFin) {
  const endDate = parseDateValue(dateFin);
  if (!endDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const diffMs = endDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getCompactPagination(currentPage, totalPages) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  return [currentPage - 1, currentPage, currentPage + 1].filter(
    (page) => page >= 1 && page <= totalPages
  );
}

function deriveContractStatus(contract) {
  const explicitStatus = normalizeText(contract?.statutContrat || contract?.statut_contrat);
  if (explicitStatus.includes("expire")) return "Expire";
  if (explicitStatus.includes("renouvel")) return "A renouveler";
  if (explicitStatus.includes("attente")) return "En attente";
  if (explicitStatus.includes("signe")) return "Signe";
  if (explicitStatus.includes("actif")) return "Actif";

  const daysRemaining = contract?.joursRestants;
  if (daysRemaining !== null && daysRemaining !== undefined) {
    if (daysRemaining < 0) return "Expire";
    if (daysRemaining <= 45) return "A renouveler";
  }

  return "Actif";
}

function deriveAlertState(contract) {
  const normalizedType = normalizeText(contract?.typeContrat);
  const daysRemaining = contract?.joursRestants;
  const hasEndDate = Boolean(parseDateValue(contract?.dateFinContrat));

  if (!hasEndDate || normalizedType === "cdi" || normalizedType.includes("sans date fin")) {
    return { label: "CDI / Sans date fin", tone: "soft" };
  }

  if (daysRemaining === null || daysRemaining === undefined) {
    return { label: "Actif", tone: "success" };
  }

  if (daysRemaining < 0) {
    return { label: "Expire", tone: "danger" };
  }

  if (daysRemaining <= 45) {
    return { label: "Proche expiration", tone: "warning" };
  }

  return { label: "Actif", tone: "success" };
}

function formatDaysRemaining(contract) {
  const hasEndDate = Boolean(parseDateValue(contract?.dateFinContrat));
  const daysRemaining = contract?.joursRestants;

  if (!hasEndDate || daysRemaining === null || daysRemaining === undefined) {
    return "-";
  }

  if (daysRemaining < 0) return "Expire";
  if (daysRemaining <= 1) return `${daysRemaining} jour`;
  return `${daysRemaining} jours`;
}

function getDaysClassName(contract) {
  const hasEndDate = Boolean(parseDateValue(contract?.dateFinContrat));
  const daysRemaining = contract?.joursRestants;

  if (!hasEndDate || daysRemaining === null || daysRemaining === undefined) {
    return "contracts-days is-empty";
  }

  if (daysRemaining < 0) return "contracts-days is-expired";
  if (daysRemaining <= 45) return "contracts-days is-warning";
  return "contracts-days is-positive";
}

function getRenewalAlertTheme(level) {
  return RENEWAL_ALERT_THEMES[level] || RENEWAL_ALERT_THEMES.info;
}

function formatRenewalCountdown(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) return "-";
  if (daysRemaining < 0) return "Expire";
  if (daysRemaining <= 1) return `${daysRemaining} jour`;
  return `${daysRemaining} jours`;
}

function PaginationButton({ active, className = "", children, ...props }) {
  return (
    <button
      type="button"
      className={`contracts-pagination__button ${active ? "is-active" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

function TypeBadge({ value }) {
  const normalizedValue = normalizeText(value);
  const tone =
    normalizedValue === "cdi" || normalizedValue.includes("sans date fin")
      ? "is-cdi"
      : normalizedValue === "cdd"
        ? "is-cdd"
        : "is-default";

  return <span className={`contracts-badge ${tone}`}>{value || "-"}</span>;
}

function ContractStatusBadge({ contract }) {
  const value = deriveContractStatus(contract);
  const normalizedValue = normalizeText(value);
  let tone = "is-status-active";
  if (normalizedValue.includes("expire")) tone = "is-status-danger";
  else if (normalizedValue.includes("renouvel")) tone = "is-status-warning";
  else if (normalizedValue.includes("attente") || normalizedValue.includes("signe")) tone = "is-status-info";

  return <span className={`contracts-badge ${tone}`}>{value}</span>;
}

function AlertBadge({ contract }) {
  const alertState = deriveAlertState(contract);
  return <span className={`contracts-badge is-alert-${alertState.tone}`}>{alertState.label}</span>;
}

function ActionMenu({ onConsult }) {
  return (
    <div className="contracts-table__actions">
      <button type="button" className="contracts-action contracts-action--inline-primary" onClick={onConsult}>
        Consulter
      </button>
      <button type="button" className="contracts-action contracts-action--inline-secondary">
        Renouveler
      </button>
      <button type="button" className="contracts-icon-button" title="Modifier">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button type="button" className="contracts-icon-button" title="Actions">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
    </div>
  );
}

export default function ContractsPage() {
  const navigate = useNavigate();
  const { candidats } = useRecrutements();
  const [tab, setTab] = useState("liste");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAlertId, setSelectedAlertId] = useState(STATIC_RENEWAL_ALERTS[0]?.id ?? null);

  const signedContracts = useMemo(
    () => candidats.filter((c) => c.typeCandidat === "contact_contract" && c.contratSigne),
    [candidats]
  );

  const dynamicSignedRows = useMemo(
    () =>
      signedContracts.map((candidate) => {
        const dateDebutContrat = candidate.dateDebutContrat || candidate.dateDebut || "-";
        const dateFinContrat = candidate.dateFinContrat || candidate.dateFin || "-";
        const dateSignature =
          candidate.dateSignature ||
          candidate.date_signature ||
          candidate.signatureDate ||
          candidate.contractSignedAt ||
          "-";
        return {
          id: `cand-${candidate.id}`,
          candidateId: candidate.id,
          fromCandidate: true,
          cin: candidate.cin || candidate.numeroCin || candidate.CIN || "-",
          nomPrenom: candidate.nomComplet || candidate.nom || "-",
          telephone: candidate.telephone || candidate.phone || candidate.tel || "-",
          email: candidate.email || candidate.mail || candidate.adresseEmail || "-",
          poste: candidate.poste || candidate.posteVise || candidate.fonction || "-",
          typeContrat: candidate.typeContrat || candidate.type_contrat || "CDD",
          dateSignature,
          dateDebutContrat,
          dateFinContrat,
          statutContrat:
            candidate.statutContrat ||
            candidate.statut_contrat ||
            candidate.contractStatus ||
            candidate.statutContratLabel ||
            "Actif",
          joursRestants: computeDaysRemaining(dateFinContrat),
        };
      }),
    [signedContracts]
  );

  const seedRowsWithCandidate = useMemo(
    () =>
      seedContracts.map((row) => {
        const linked = candidats.find(
          (candidate) =>
            normalizeText(candidate.nomComplet) === normalizeText(row.nomPrenom) ||
            (candidate.matricule && row.matricule && candidate.matricule === row.matricule)
        );

        return {
          ...row,
          candidateId: linked?.id || null,
          joursRestants: computeDaysRemaining(row.dateFinContrat),
        };
      }),
    [candidats]
  );

  const contractsData = useMemo(
    () => [...dynamicSignedRows, ...seedRowsWithCandidate],
    [dynamicSignedRows, seedRowsWithCandidate]
  );

  const alertes = STATIC_RENEWAL_ALERTS;

  const filteredContracts = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    if (!normalizedSearch) return contractsData;

    return contractsData.filter((contract) =>
      [
        contract.cin,
        contract.nomPrenom,
        contract.telephone,
        contract.email,
        contract.poste,
        contract.typeContrat,
        contract.dateSignature,
        contract.dateDebutContrat,
        contract.dateFinContrat,
        contract.statutContrat,
      ].some((value) => normalizeText(value).includes(normalizedSearch))
    );
  }, [contractsData, search]);

  const filteredAlertes = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    if (!normalizedSearch) return alertes;

    return alertes.filter((alert) =>
      [
        alert.title,
        alert.headline,
        alert.nomPrenom,
        alert.matricule,
        alert.typeContrat,
        alert.segment,
        alert.fonction,
        alert.projet,
        alert.site,
        alert.responsable,
        alert.statutAlerte,
        alert.niveau,
      ].some((value) => normalizeText(value).includes(normalizedSearch))
    );
  }, [alertes, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, search, tab]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / rowsPerPage));

  useEffect(() => {
    if (filteredAlertes.length === 0) return;
    if (!filteredAlertes.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(filteredAlertes[0].id);
    }
  }, [filteredAlertes, selectedAlertId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredContracts.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredContracts, rowsPerPage]);

  const paginationItems = useMemo(
    () => getCompactPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const pageStart = filteredContracts.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(currentPage * rowsPerPage, filteredContracts.length);
  const selectedAlert =
    filteredAlertes.find((alert) => alert.id === selectedAlertId) || filteredAlertes[0] || null;
  const selectedAlertTheme = getRenewalAlertTheme(selectedAlert?.niveau);
  const nearbyAlertes = filteredAlertes.filter((alert) => alert.id !== selectedAlert?.id).slice(0, 3);

  const openCandidateDossier = () => {
    navigate("/contracts/reception");
  };

  return (
    <div className="contracts-page">
      <section className="contracts-shell">
        <header className="contracts-shell__header">
          <div className="contracts-shell__copy">
            <span className="contracts-shell__eyebrow">Administration RH</span>
            <h2>Gestion des contrats</h2>
            <p>Liste des contrats importes et suivi de leur etat</p>
          </div>

          <div className="contracts-shell__header-actions">
            <label className="contracts-search" htmlFor="contracts-search-input">
              <span className="contracts-search__icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.65" y1="16.65" x2="21" y2="21" />
                </svg>
              </span>
              <input
                id="contracts-search-input"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un contrat..."
              />
            </label>

            <button type="button" className="contracts-action contracts-action--filter">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4" />
              </svg>
              Filtrer
            </button>
          </div>
        </header>

        <div className="contracts-shell__tabs" role="tablist" aria-label="Navigation contrats">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "liste"}
            className={`contracts-tabs__button ${tab === "liste" ? "is-active" : ""}`}
            onClick={() => setTab("liste")}
          >
            Liste des contrats
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "alertes"}
            className={`contracts-tabs__button ${tab === "alertes" ? "is-active" : ""}`}
            onClick={() => setTab("alertes")}
          >
            Alertes renouvellement
            {alertes.length > 0 ? <span className="contracts-tabs__badge">{alertes.length}</span> : null}
          </button>
        </div>

        {tab === "liste" ? (
          <>
            <div className="contracts-shell__toolbar">
              <div className="contracts-shell__toolbar-strip">
                <label className="contracts-page-size">
                  <span>Lignes</span>
                  <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))}>
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="contracts-toolbar__meta">
                  <strong>{filteredContracts.length}</strong>
                  <span>contrats affiches</span>
                </div>

                <div className="contracts-toolbar__meta">
                  <strong>
                    {currentPage} / {totalPages}
                  </strong>
                  <span>page courante</span>
                </div>
              </div>
            </div>

            <div className="contracts-table-wrap">
              <table className="contracts-table">
                <thead>
                  <tr>
                    <th>CIN</th>
                    <th>Nom &amp; Prenom</th>
                    <th>Telephone</th>
                    <th>Email</th>
                    <th>Poste</th>
                    <th>Type de contrat</th>
                    <th>Date signature</th>
                    <th>Date debut contrat</th>
                    <th>Date fin contrat</th>
                    <th>Statut contrat</th>
                    <th>Jours restants</th>
                    <th>Alerte</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContracts.length > 0 ? (
                    paginatedContracts.map((contract) => (
                      <tr key={contract.id}>
                        <td className="contracts-table__cell--mono">{contract.cin || "-"}</td>
                        <td className="contracts-table__cell--strong">{contract.nomPrenom || "-"}</td>
                        <td className="contracts-table__cell--mono">{contract.telephone || "-"}</td>
                        <td className="contracts-table__cell--email">{contract.email || "-"}</td>
                        <td className="contracts-table__cell--muted">{contract.poste || "-"}</td>
                        <td>
                          <TypeBadge value={contract.typeContrat} />
                        </td>
                        <td className="contracts-table__cell--date">{formatDate(contract.dateSignature)}</td>
                        <td className="contracts-table__cell--date">{formatDate(contract.dateDebutContrat)}</td>
                        <td className="contracts-table__cell--date">{formatDate(contract.dateFinContrat)}</td>
                        <td>
                          <ContractStatusBadge contract={contract} />
                        </td>
                        <td>
                          <span className={getDaysClassName(contract)}>{formatDaysRemaining(contract)}</span>
                        </td>
                        <td>
                          <AlertBadge contract={contract} />
                        </td>
                        <td>
                          <ActionMenu onConsult={openCandidateDossier} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="13" className="contracts-table__empty">
                        Aucun contrat ne correspond a votre recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="contracts-shell__footer">
              <div className="contracts-footer__summary">
                <span>Affichage</span>
                <strong>
                  {pageStart} - {pageEnd}
                </strong>
                <span>sur {filteredContracts.length} contrats</span>
              </div>

              <div className="contracts-pagination">
                <PaginationButton
                  className="contracts-pagination__button--nav"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Precedent
                </PaginationButton>

                <div className="contracts-pagination__pages" aria-label="Pagination">
                  {paginationItems.map((pageNumber) => (
                    <PaginationButton
                      key={pageNumber}
                      active={pageNumber === currentPage}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </PaginationButton>
                  ))}
                </div>

                <div className="contracts-pagination__status">Page {currentPage} sur {totalPages}</div>

                <PaginationButton
                  className="contracts-pagination__button--nav"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </PaginationButton>
              </div>
            </footer>
          </>
        ) : (
          <div className="contracts-alerts-view">
            {selectedAlert ? (
              <>
                <section className={`contracts-monitor__hero ${selectedAlertTheme.className}`}>
                  <div className="contracts-monitor__hero-copy">
                    <span className="contracts-monitor__hero-kicker">{selectedAlertTheme.label}</span>
                    <h3>{selectedAlert.title}</h3>
                    <p>{selectedAlert.headline}</p>
                  </div>

                  <div className="contracts-monitor__hero-actions">
                    <button
                      type="button"
                      className="contracts-action contracts-action--monitor-primary"
                      onClick={openCandidateDossier}
                    >
                      Traiter
                    </button>
                    <button type="button" className="contracts-action contracts-action--monitor-secondary">
                      Reporter
                    </button>
                    <button type="button" className="contracts-action contracts-action--monitor-ghost">
                      Voir historique
                    </button>
                  </div>
                </section>

                <div className="contracts-monitor__layout">
                  <section className="contracts-monitor__main">
                    <header className="contracts-monitor__main-header">
                      <div>
                        <span className="contracts-monitor__section-label">Alerte active</span>
                        <h4>{selectedAlert.nomPrenom}</h4>
                        <p>{selectedAlert.description}</p>
                      </div>

                      <div className="contracts-monitor__tags">
                        <TypeBadge value={selectedAlert.typeContrat} />
                        <span
                          className={`contracts-monitor__level-badge ${selectedAlertTheme.className}`}
                        >
                          {selectedAlertTheme.label}
                        </span>
                      </div>
                    </header>

                    <div className="contracts-monitor__facts">
                      <div>
                        <span>Type contrat</span>
                        <strong>{selectedAlert.typeContrat}</strong>
                      </div>
                      <div>
                        <span>Date fin contrat</span>
                        <strong>{formatDate(selectedAlert.dateFinContrat)}</strong>
                      </div>
                      <div>
                        <span>Jours restants</span>
                        <strong>{formatRenewalCountdown(selectedAlert.joursRestants)}</strong>
                      </div>
                    </div>

                    <section className="contracts-monitor__section">
                      <span>Detail</span>
                      <p>{selectedAlert.detail}</p>
                    </section>

                    <section className="contracts-monitor__section">
                      <span>Action recommandee</span>
                      <p>{selectedAlert.actionRecommandee}</p>
                    </section>

                    <section className="contracts-monitor__section">
                      <span>Suivi</span>
                      <p>{selectedAlert.suivi}</p>
                    </section>
                  </section>

                  <aside className="contracts-monitor__aside">
                    <section className="contracts-monitor__panel">
                      <div className="contracts-monitor__panel-head">
                        <div>
                          <span className="contracts-monitor__panel-kicker">Resume</span>
                          <h4>Informations contrat</h4>
                        </div>
                        <span className={`contracts-monitor__status-pill ${selectedAlertTheme.className}`}>
                          {selectedAlert.statutAlerte}
                        </span>
                      </div>

                      <dl className="contracts-monitor__summary-grid">
                        <div>
                          <dt>Matricule</dt>
                          <dd>{selectedAlert.matricule}</dd>
                        </div>
                        <div>
                          <dt>Type contrat</dt>
                          <dd>{selectedAlert.typeContrat}</dd>
                        </div>
                        <div>
                          <dt>Date debut</dt>
                          <dd>{formatDate(selectedAlert.dateDebutContrat)}</dd>
                        </div>
                        <div>
                          <dt>Date fin</dt>
                          <dd>{formatDate(selectedAlert.dateFinContrat)}</dd>
                        </div>
                        <div>
                          <dt>Statut alerte</dt>
                          <dd>{selectedAlert.statutAlerte}</dd>
                        </div>
                        <div>
                          <dt>Niveau</dt>
                          <dd>{selectedAlertTheme.label}</dd>
                        </div>
                      </dl>
                    </section>

                    <section className="contracts-monitor__panel">
                      <div className="contracts-monitor__panel-head">
                        <div>
                          <span className="contracts-monitor__panel-kicker">Indicateur</span>
                          <h4>Criticite</h4>
                        </div>
                        <strong>{selectedAlert.criticite}%</strong>
                      </div>

                      <p className="contracts-monitor__indicator-copy">
                        {selectedAlertTheme.indicatorLabel}
                      </p>

                      <div className="contracts-monitor__indicator-bar">
                        <span
                          className={selectedAlertTheme.className}
                          style={{ width: `${selectedAlert.criticite}%` }}
                        />
                      </div>

                      <ul className="contracts-monitor__timeline">
                        {selectedAlert.timeline.map((step) => (
                          <li key={`${selectedAlert.id}-${step.label}`} className={`is-${step.state}`}>
                            <span className="contracts-monitor__timeline-dot" aria-hidden="true" />
                            <span>{step.label}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="contracts-monitor__panel">
                      <div className="contracts-monitor__panel-head">
                        <div>
                          <span className="contracts-monitor__panel-kicker">Surveillance</span>
                          <h4>Alertes proches</h4>
                        </div>
                      </div>

                      <div className="contracts-monitor__mini-list">
                        {nearbyAlertes.length > 0 ? (
                          nearbyAlertes.map((alert) => {
                            const alertTheme = getRenewalAlertTheme(alert.niveau);
                            return (
                              <button
                                key={alert.id}
                                type="button"
                                className="contracts-monitor__mini-item"
                                onClick={() => setSelectedAlertId(alert.id)}
                              >
                                <div>
                                  <strong>{alert.nomPrenom}</strong>
                                  <span>{alert.typeContrat}</span>
                                </div>
                                <span className={`contracts-monitor__mini-badge ${alertTheme.className}`}>
                                  {formatRenewalCountdown(alert.joursRestants)}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="contracts-monitor__mini-empty">
                            Aucune autre alerte visible pour cette recherche.
                          </div>
                        )}
                      </div>
                    </section>
                  </aside>
                </div>

                <section className="contracts-monitor__secondary">
                  <div className="contracts-monitor__secondary-head">
                    <div>
                      <span className="contracts-monitor__secondary-kicker">Liste secondaire</span>
                      <h4>Autres alertes de renouvellement</h4>
                    </div>
                    <p>Selectionnez une ligne pour afficher le detail principal.</p>
                  </div>

                  <div className="contracts-monitor__secondary-table" role="list">
                    {filteredAlertes.map((alert) => {
                      const alertTheme = getRenewalAlertTheme(alert.niveau);
                      return (
                        <button
                          key={alert.id}
                          type="button"
                          role="listitem"
                          className={`contracts-monitor__secondary-row ${
                            alert.id === selectedAlert.id ? "is-active" : ""
                          }`}
                          onClick={() => setSelectedAlertId(alert.id)}
                        >
                          <span className="contracts-monitor__secondary-name">{alert.nomPrenom}</span>
                          <span>{alert.typeContrat}</span>
                          <span>{formatDate(alert.dateFinContrat)}</span>
                          <span>{formatRenewalCountdown(alert.joursRestants)}</span>
                          <span className={`contracts-monitor__secondary-level ${alertTheme.className}`}>
                            {alertTheme.label}
                          </span>
                          <span className="contracts-monitor__secondary-action">Ouvrir</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : (
              <div className="contracts-monitor__empty">
                Aucune alerte ne correspond a votre recherche.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
