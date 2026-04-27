import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { buildRoleHeaders } from "../utils/roles.js";
import "./ContractsPage.css";

const CONTRACTS_API_ENDPOINT = "http://localhost:3000/api/contrats";
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const TAB_CONTRACTS = "liste";
const TAB_ALERTS = "alertes";

const RENEWAL_ALERT_THEMES = {
  urgent: {
    label: "Urgent",
    className: "is-urgent",
    indicatorLabel: "Traitement immediat requis",
  },
  action: {
    label: "A traiter",
    className: "is-action",
    indicatorLabel: "Traitement prioritaire",
  },
  info: {
    label: "Information",
    className: "is-info",
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

function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  const normalizedValue = String(value).trim();
  if (!normalizedValue) return null;

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
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

function formatNumericDays(days) {
  if (days < 0) return `Expir\u00e9`;
  if (days <= 1) return `${days} jour`;
  return `${days} jours`;
}

function formatDaysValue(daysValue, displayValue) {
  const explicitDisplay = String(displayValue ?? "").trim();
  if (explicitDisplay) {
    const explicitNumber = toFiniteNumber(explicitDisplay);
    if (explicitNumber !== null) {
      return formatNumericDays(explicitNumber);
    }
    return explicitDisplay;
  }

  const numericDays = toFiniteNumber(daysValue);
  if (numericDays === null) return "-";

  return formatNumericDays(numericDays);
}

function getCompactPagination(currentPage, totalPages) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  return [currentPage - 1, currentPage, currentPage + 1].filter(
    (page) => page >= 1 && page <= totalPages
  );
}

function mapContractRow(contract, index) {
  return {
    id: contract.id_contrat ?? contract.id ?? `contract-${contract.cin || "row"}-${index + 1}`,
    cin: String(contract.cin ?? "").trim() || "-",
    nomPrenom: contract.nom_prenom ?? contract.nomPrenom ?? "-",
    genre: contract.genre ?? "-",
    fonction: contract.fonction ?? "-",
    segment: contract.segment ?? "-",
    projet: contract.projet ?? "-",
    site: contract.site ?? "-",
    typeContrat: contract.type_contrat ?? contract.typeContrat ?? "-",
    dateSignature: contract.date_signature ?? contract.dateSignature ?? "-",
    dateDebutContrat: contract.date_debut_contrat ?? contract.dateDebutContrat ?? "-",
    dateFinContrat: contract.date_fin_contrat ?? contract.dateFinContrat ?? "-",
    statutContrat: contract.statut_contrat ?? contract.statutContrat ?? "",
    joursRestants: toFiniteNumber(contract.jours_restants ?? contract.joursRestants),
    joursRestantsAffichage:
      contract.jours_restants_affichage ?? contract.joursRestantsAffichage ?? "",
    alerte: contract.alerte ?? "",
  };
}

function deriveContractStatus(contract) {
  const explicitStatus = normalizeText(contract?.statutContrat || contract?.statut_contrat);
  if (explicitStatus.includes("expire")) return "EXPIRE";
  if (explicitStatus.includes("renouvel")) return "RENOUVELE";
  if (explicitStatus.includes("signe")) return "SIGNE";
  if (explicitStatus.includes("actif")) return "ACTIF";

  const alertState = deriveAlertState(contract);
  if (alertState.tone === "danger") return "EXPIRE";

  return "ACTIF";
}

function deriveAlertState(contract) {
  const explicitAlert = normalizeText(contract?.alerte);
  if (explicitAlert.includes("proche")) {
    return { label: "Proche expiration", tone: "warning" };
  }
  if (explicitAlert.includes("expir")) {
    return { label: `Expir\u00e9`, tone: "danger" };
  }
  if (explicitAlert.includes("date manquante")) {
    return { label: "Date manquante", tone: "soft" };
  }
  if (explicitAlert.includes("actif")) {
    return { label: "Actif", tone: "success" };
  }

  const normalizedType = normalizeText(contract?.typeContrat);
  const daysRemaining = toFiniteNumber(contract?.joursRestants);
  const hasEndDate = Boolean(parseDateValue(contract?.dateFinContrat));

  if (!hasEndDate || normalizedType === "cdi" || normalizedType.includes("sans essai")) {
    return { label: "Date manquante", tone: "soft" };
  }

  if (daysRemaining === null) {
    return { label: "Actif", tone: "success" };
  }

  if (daysRemaining < 0) {
    return { label: `Expir\u00e9`, tone: "danger" };
  }

  if (daysRemaining <= 45) {
    return { label: "Proche expiration", tone: "warning" };
  }

  return { label: "Actif", tone: "success" };
}

function formatDaysRemaining(contract) {
  return formatDaysValue(contract?.joursRestants, contract?.joursRestantsAffichage);
}

function getDaysClassName(contract) {
  const daysLabel = formatDaysRemaining(contract);
  if (daysLabel === "-") {
    return "contracts-days is-empty";
  }

  const alertState = deriveAlertState(contract);
  if (alertState.tone === "danger") return "contracts-days is-expired";
  if (alertState.tone === "warning") return "contracts-days is-warning";
  if (alertState.tone === "success") return "contracts-days is-positive";

  return "contracts-days is-empty";
}

function getRenewalAlertTheme(level) {
  return RENEWAL_ALERT_THEMES[level] || RENEWAL_ALERT_THEMES.info;
}

function formatRenewalCountdown(daysRemaining, displayValue) {
  return formatDaysValue(daysRemaining, displayValue);
}

function buildAlertLevel(alertTone) {
  if (alertTone === "danger") return "urgent";
  if (alertTone === "warning") return "action";
  return "info";
}

function buildAlertCriticity(alertTone, daysRemaining) {
  if (alertTone === "danger") return 94;
  if (alertTone === "warning") {
    if (daysRemaining === null) return 70;
    return Math.max(58, Math.min(88, 90 - Math.max(daysRemaining, 0)));
  }
  return 38;
}

function buildAlertTimeline(level) {
  if (level === "urgent") {
    return [
      { label: "Signal detecte", state: "done" },
      { label: "Verification RH", state: "current" },
      { label: "Decision manager", state: "upcoming" },
    ];
  }

  if (level === "action") {
    return [
      { label: "Signal detecte", state: "done" },
      { label: "Revue contrat", state: "current" },
      { label: "Preparation signature", state: "upcoming" },
    ];
  }

  return [
    { label: "Surveillance", state: "current" },
    { label: "Point manager", state: "upcoming" },
    { label: "Decision RH", state: "upcoming" },
  ];
}

function buildRenewalAlert(contract) {
  const alertState = deriveAlertState(contract);
  const level = buildAlertLevel(alertState.tone);
  const typeContrat = contract.typeContrat || "Contrat";
  const nomPrenom = contract.nomPrenom || "Collaborateur";
  const joursRestants = toFiniteNumber(contract.joursRestants);
  const joursRestantsAffichage = contract.joursRestantsAffichage;
  const daysLabel = formatRenewalCountdown(joursRestants, joursRestantsAffichage);
  const isExpired = alertState.tone === "danger";
  const criticite = buildAlertCriticity(alertState.tone, joursRestants);
  const functionLabel = contract.fonction || "fonction non renseignee";
  const projectLabel = contract.projet || "projet non renseigne";
  const siteLabel = contract.site || "site non renseigne";
  const segmentLabel = contract.segment || "segment non renseigne";

  return {
    id: `alert-${contract.id}`,
    sourceId: contract.id,
    title: isExpired ? "Contrat expire" : "Contrat proche d'expiration",
    headline: isExpired
      ? `${typeContrat} a depasse sa date de fin contractuelle`
      : `${typeContrat} arrive a expiration dans ${daysLabel.toLowerCase()}`,
    nomPrenom,
    cin: contract.cin || "-",
    typeContrat,
    dateDebutContrat: contract.dateDebutContrat,
    dateFinContrat: contract.dateFinContrat,
    joursRestants,
    joursRestantsAffichage,
    segment: contract.segment,
    fonction: contract.fonction,
    projet: contract.projet,
    site: contract.site,
    statutAlerte: alertState.label,
    niveau: level,
    description: isExpired
      ? `Le contrat de ${nomPrenom} a atteint son echeance et demande une decision rapide pour eviter une rupture de suivi administratif.`
      : `Le contrat de ${nomPrenom} entre dans la fenetre de surveillance RH et doit etre traite avant la date limite de fin.`,
    detail: `${nomPrenom} occupe la fonction ${functionLabel} sur ${projectLabel} (${siteLabel}), dans le segment ${segmentLabel}. La date de fin enregistree est ${formatDate(contract.dateFinContrat)}.`,
    actionRecommandee: isExpired
      ? "Verifier immediatement la situation contractuelle, arbitrer la suite a donner et preparer les validations necessaires."
      : "Planifier le renouvellement, confirmer le besoin metier avec l'encadrement et lancer le circuit de signature avant l'echeance.",
    suivi: `Statut contrat ${deriveContractStatus(contract)}. Alerte ${alertState.label}. Derniere verification a programmer avec le service RH.`,
    criticite,
    timeline: buildAlertTimeline(level),
  };
}

function buildContractsUrl({ search, type }) {
  const params = new URLSearchParams();

  params.set("type", type === TAB_ALERTS ? TAB_ALERTS : TAB_CONTRACTS);

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();
  return query ? `${CONTRACTS_API_ENDPOINT}?${query}` : CONTRACTS_API_ENDPOINT;
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
  let tone = "is-default";

  if (normalizedValue === "cdi") tone = "is-type-cdi";
  else if (normalizedValue === "cdd") tone = "is-type-cdd";
  else if (normalizedValue === "cdi sans essai") tone = "is-type-cdi-sans-essai";
  else if (["caip", "civp", "sivp"].includes(normalizedValue)) tone = "is-type-program";

  return <span className={`contracts-badge ${tone}`}>{value || "-"}</span>;
}

function ContractStatusBadge({ contract }) {
  const value = deriveContractStatus(contract);
  const normalizedValue = normalizeText(value);
  let tone = "is-status-active";
  if (normalizedValue.includes("expire")) tone = "is-status-danger";
  else if (normalizedValue.includes("renouvel")) tone = "is-status-renewed";
  else if (normalizedValue.includes("signe")) tone = "is-status-info";

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
    </div>
  );
}

export default function ContractsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState(TAB_CONTRACTS);
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  const normalizedSearch = search.trim();
  const activeContractsType = tab === TAB_ALERTS ? TAB_ALERTS : TAB_CONTRACTS;

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, search, tab]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    if (!user) {
      setContracts([]);
      setLoading(false);
      setError("");
      return () => {
        ignore = true;
        controller.abort();
      };
    }

    async function loadContracts() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          buildContractsUrl({
            search: normalizedSearch,
            type: activeContractsType,
          }),
          {
            headers: buildRoleHeaders(user, {
              "Content-Type": "application/json",
            }),
            signal: controller.signal,
          }
        );

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message || "Impossible de charger les contrats.");
        }

        const nextContracts = Array.isArray(payload?.contrats)
          ? payload.contrats.map(mapContractRow)
          : [];

        if (!ignore) {
          setContracts(nextContracts);
        }
      } catch (loadError) {
        if (!ignore && loadError?.name !== "AbortError") {
          console.error("Erreur chargement contrats:", loadError);
          setContracts([]);
          setError(loadError?.message || "Impossible de charger les contrats.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadContracts();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [user, normalizedSearch, activeContractsType]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    if (!user) {
      setAlertsTotal(0);
      return () => {
        ignore = true;
        controller.abort();
      };
    }

    if (tab === TAB_ALERTS) {
      setAlertsTotal(contracts.length);
      return () => {
        ignore = true;
        controller.abort();
      };
    }

    async function loadAlertsCount() {
      try {
        const response = await fetch(
          buildContractsUrl({
            search: normalizedSearch,
            type: TAB_ALERTS,
          }),
          {
            headers: buildRoleHeaders(user, {
              "Content-Type": "application/json",
            }),
            signal: controller.signal,
          }
        );

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message || "Impossible de charger le total des alertes.");
        }

        if (!ignore) {
          setAlertsTotal(Array.isArray(payload?.contrats) ? payload.contrats.length : 0);
        }
      } catch (countError) {
        if (!ignore && countError?.name !== "AbortError") {
          console.error("Erreur total alertes:", countError);
          setAlertsTotal(0);
        }
      }
    }

    loadAlertsCount();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [user, normalizedSearch, tab, contracts.length]);

  const totalPages = Math.max(1, Math.ceil(contracts.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return contracts.slice(startIndex, startIndex + rowsPerPage);
  }, [contracts, currentPage, rowsPerPage]);

  const paginationItems = useMemo(
    () => getCompactPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const pageStart = contracts.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = pageStart === 0 ? 0 : Math.min(currentPage * rowsPerPage, contracts.length);

  const alertDetails = useMemo(() => contracts.map(buildRenewalAlert), [contracts]);

  useEffect(() => {
    if (tab !== TAB_ALERTS) return;

    if (alertDetails.length === 0) {
      if (selectedAlertId !== null) {
        setSelectedAlertId(null);
      }
      return;
    }

    if (!alertDetails.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(alertDetails[0].id);
    }
  }, [tab, alertDetails, selectedAlertId]);

  const selectedAlert =
    alertDetails.find((alert) => alert.id === selectedAlertId) || alertDetails[0] || null;
  const selectedAlertTheme = getRenewalAlertTheme(selectedAlert?.niveau);
  const nearbyAlertes = alertDetails.filter((alert) => alert.id !== selectedAlert?.id).slice(0, 3);

  const openCandidateDossier = () => {
    navigate("/contracts/reception");
  };

  const totalLabel = tab === TAB_ALERTS ? "alertes affichees" : "contrats affiches";
  const summaryLabel = tab === TAB_ALERTS ? "alertes affichees" : "contrats affiches";

  return (
    <div className="contracts-page">
      <section className="contracts-shell">
        <header className="contracts-shell__header">
          <div className="contracts-shell__copy">
            <span className="contracts-shell__eyebrow">Administration RH</span>
            <h2>Gestion des contrats</h2>
            <p>Liste des contrats et suivi de leur etat</p>
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
            aria-selected={tab === TAB_CONTRACTS}
            className={`contracts-tabs__button ${tab === TAB_CONTRACTS ? "is-active" : ""}`}
            onClick={() => setTab(TAB_CONTRACTS)}
          >
            Liste des contrats
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === TAB_ALERTS}
            className={`contracts-tabs__button ${tab === TAB_ALERTS ? "is-active" : ""}`}
            onClick={() => setTab(TAB_ALERTS)}
          >
            Alertes renouvellement
            {alertsTotal > 0 ? <span className="contracts-tabs__badge">{alertsTotal}</span> : null}
          </button>
        </div>

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
              <strong>{contracts.length}</strong>
              <span>{totalLabel}</span>
            </div>

            <div className="contracts-toolbar__meta">
              <strong>
                {currentPage} / {totalPages}
              </strong>
              <span>page courante</span>
            </div>
          </div>
        </div>

        {tab === TAB_CONTRACTS ? (
          <div className="contracts-table-wrap">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>CIN</th>
                  <th>Nom &amp; Pr&eacute;nom</th>
                  <th>Genre</th>
                  <th>Fonction</th>
                  <th>Segment</th>
                  <th>Projet</th>
                  <th>Site</th>
                  <th>Type de contrat</th>
                  <th>Date signature</th>
                  <th>Date d&eacute;but contrat</th>
                  <th>Date fin contrat</th>
                  <th>Statut contrat</th>
                  <th>Jours restants</th>
                  <th>Alerte</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="15" className="contracts-table__empty">
                      Chargement des contrats...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="15" className="contracts-table__empty">
                      {error}
                    </td>
                  </tr>
                ) : paginatedContracts.length > 0 ? (
                  paginatedContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td className="contracts-table__cell--mono">{contract.cin || "-"}</td>
                      <td className="contracts-table__cell--strong">{contract.nomPrenom || "-"}</td>
                      <td className="contracts-table__cell--muted">{contract.genre || "-"}</td>
                      <td className="contracts-table__cell--wrap">{contract.fonction || "-"}</td>
                      <td className="contracts-table__cell--muted">{contract.segment || "-"}</td>
                      <td className="contracts-table__cell--wrap">{contract.projet || "-"}</td>
                      <td className="contracts-table__cell--muted">{contract.site || "-"}</td>
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
                    <td colSpan="15" className="contracts-table__empty">
                      Aucun contrat trouv&eacute;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="contracts-alerts-view">
            {loading ? (
              <div className="contracts-monitor__empty">Chargement des alertes...</div>
            ) : error ? (
              <div className="contracts-monitor__empty">{error}</div>
            ) : selectedAlert ? (
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
                        <span className={`contracts-monitor__level-badge ${selectedAlertTheme.className}`}>
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
                        <strong>
                          {formatRenewalCountdown(
                            selectedAlert.joursRestants,
                            selectedAlert.joursRestantsAffichage
                          )}
                        </strong>
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
                          <dt>CIN</dt>
                          <dd>{selectedAlert.cin}</dd>
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
                                  {formatRenewalCountdown(
                                    alert.joursRestants,
                                    alert.joursRestantsAffichage
                                  )}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="contracts-monitor__mini-empty">Aucune autre alerte visible.</div>
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
                    {alertDetails.map((alert) => {
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
                          <span>
                            {formatRenewalCountdown(alert.joursRestants, alert.joursRestantsAffichage)}
                          </span>
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
              <div className="contracts-monitor__empty">Aucun contrat trouv&eacute;.</div>
            )}
          </div>
        )}

        <footer className="contracts-shell__footer">
          <div className="contracts-footer__summary">
            <span>Affichage</span>
            <strong>
              {pageStart} - {pageEnd}
            </strong>
            <span>sur {contracts.length} {summaryLabel}</span>
          </div>

          <div className="contracts-pagination">
            <PaginationButton
              className="contracts-pagination__button--nav"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={loading || currentPage === 1}
            >
              Precedent
            </PaginationButton>

            <div className="contracts-pagination__pages" aria-label="Pagination">
              {paginationItems.map((pageNumber) => (
                <PaginationButton
                  key={pageNumber}
                  active={pageNumber === currentPage}
                  onClick={() => setCurrentPage(pageNumber)}
                  disabled={loading}
                >
                  {pageNumber}
                </PaginationButton>
              ))}
            </div>

            <div className="contracts-pagination__status">
              Page {currentPage} sur {totalPages}
            </div>

            <PaginationButton
              className="contracts-pagination__button--nav"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={loading || currentPage === totalPages}
            >
              Suivant
            </PaginationButton>
          </div>
        </footer>
      </section>
    </div>
  );
}
