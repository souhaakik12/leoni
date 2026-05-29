import { Fragment, useEffect, useMemo, useState } from "react";
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
    idContrat: contract.id_contrat ?? contract.id ?? null,
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
    traitePar: contract.traite_par ?? contract.traitePar ?? "-",
    renouvellementsCount: Number(contract.renouvellements_count ?? contract.renouvellementsCount ?? 0) || 0,
    sourceDonnee: contract.source_donnee ?? contract.sourceDonnee ?? "",
  };
}

function mapRenewalHistoryRow(item) {
  return {
    id: item.id ?? `${item.id_contrat}-${item.date_renouvellement}`,
    ancienneDateDebut: item.ancienne_date_debut ?? item.ancienneDateDebut ?? null,
    ancienneDateFin: item.ancienne_date_fin ?? item.ancienneDateFin ?? null,
    nouvelleDateDebut: item.nouvelle_date_debut ?? item.nouvelleDateDebut ?? null,
    nouvelleDateFin: item.nouvelle_date_fin ?? item.nouvelleDateFin ?? null,
    dateRenouvellement: item.date_renouvellement ?? item.dateRenouvellement ?? null,
    utilisateurNom: item.utilisateur_nom ?? item.utilisateurNom ?? "-",
  };
}

function getHistoryKey(contract) {
  return `${contract?.idContrat ?? contract?.id ?? "unknown"}:${contract?.sourceDonnee ?? ""}`;
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

function buildContractsUrl({ search }) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();
  return query ? `${CONTRACTS_API_ENDPOINT}?${query}` : CONTRACTS_API_ENDPOINT;
}

function buildActionUserPayload(user) {
  return {
    utilisateur_id: user?.id ?? null,
    utilisateur_nom: user?.nom || user?.name || user?.nomComplet || "",
    utilisateur_role: user?.role || "",
  };
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

function canRenewContract(contract) {
  const normalizedAlert = normalizeText(contract?.alerte);
  return normalizedAlert === "expire" || normalizedAlert === "proche expiration";
}

function ActionMenu({
  alertMode = false,
  disabled = false,
  loading = false,
  historyLoading = false,
  showHistory = false,
  onRenew,
  onHistory,
}) {
  return (
    <div className={`contracts-table__actions ${alertMode ? "is-alerts" : ""}`.trim()}>
      {showHistory ? (
        <button
          type="button"
          className="contracts-action contracts-action--inline-secondary"
          onClick={onHistory}
          disabled={historyLoading}
        >
          {historyLoading ? "Chargement..." : "Historique"}
        </button>
      ) : null}
      <button
        type="button"
        className={`contracts-action ${
          alertMode ? "contracts-action--inline-alert" : "contracts-action--inline-secondary"
        }`}
        onClick={onRenew}
        disabled={disabled || loading}
        title={disabled ? "Ce contrat n'est pas eligible au renouvellement." : ""}
      >
        {loading ? "Renouvellement..." : "Renouveler"}
      </button>
    </div>
  );
}

export default function ContractsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(TAB_CONTRACTS);
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [contracts, setContracts] = useState([]);
  const [contractsTotal, setContractsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [renewingContractId, setRenewingContractId] = useState(null);
  const [historyOpenKey, setHistoryOpenKey] = useState("");
  const [historyLoadingKey, setHistoryLoadingKey] = useState("");
  const [historyErrorByKey, setHistoryErrorByKey] = useState({});
  const [historyByKey, setHistoryByKey] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  const normalizedSearch = search.trim();

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, search, tab]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    if (!user) {
      setContracts([]);
      setContractsTotal(0);
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
        const nextTotal = Number(payload?.total);

        if (!ignore) {
          setContracts(nextContracts);
          setContractsTotal(Number.isFinite(nextTotal) ? nextTotal : nextContracts.length);
        }
      } catch (loadError) {
        if (!ignore && loadError?.name !== "AbortError") {
          console.error("Erreur chargement contrats:", loadError);
          setContracts([]);
          setContractsTotal(0);
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
  }, [user, normalizedSearch, reloadKey]);

  const alertContracts = useMemo(
    () =>
      contracts.filter((contract) => {
        const normalizedAlert = normalizeText(contract.alerte);
        return normalizedAlert === "expire" || normalizedAlert === "proche expiration";
      }),
    [contracts]
  );

  const displayedContracts = tab === TAB_ALERTS ? alertContracts : contracts;
  const alertsTotal = alertContracts.length;
  const displayedTotal = tab === TAB_ALERTS ? alertsTotal : contractsTotal;

  const totalPages = Math.max(1, Math.ceil(displayedContracts.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return displayedContracts.slice(startIndex, startIndex + rowsPerPage);
  }, [displayedContracts, currentPage, rowsPerPage]);

  const paginationItems = useMemo(
    () => getCompactPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const pageStart = displayedContracts.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = pageStart === 0 ? 0 : Math.min(currentPage * rowsPerPage, displayedContracts.length);

  const totalLabel = tab === TAB_ALERTS ? "alertes affichees" : "contrats affiches";
  const summaryLabel = tab === TAB_ALERTS ? "alertes affichees" : "contrats affiches";

  const handleRenewContract = async (contract) => {
    if (!contract || !canRenewContract(contract)) {
      window.alert("Ce contrat n’est pas éligible au renouvellement.");
      return;
    }

    if (!contract.idContrat || !contract.sourceDonnee) {
      window.alert("Impossible de renouveler : identifiant ou source du contrat manquant.");
      return;
    }

    setRenewingContractId(contract.id);
    try {
      const response = await fetch(`${CONTRACTS_API_ENDPOINT}/${contract.idContrat}/renouveler`, {
        method: "POST",
        headers: buildRoleHeaders(user, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          source_donnee: contract.sourceDonnee,
          ...buildActionUserPayload(user),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Impossible de renouveler le contrat.");
      }

      setReloadKey((value) => value + 1);
    } catch (renewError) {
      console.error("Erreur renouvellement contrat:", renewError);
      window.alert(renewError?.message || "Impossible de renouveler le contrat.");
    } finally {
      setRenewingContractId(null);
    }
  };

  const handleToggleHistory = async (contract) => {
    const historyKey = getHistoryKey(contract);
    if (!contract?.idContrat || !contract?.sourceDonnee) {
      window.alert("Impossible de charger l'historique : identifiant ou source du contrat manquant.");
      return;
    }

    if (historyOpenKey === historyKey) {
      setHistoryOpenKey("");
      return;
    }

    setHistoryOpenKey(historyKey);
    if (historyByKey[historyKey] || historyLoadingKey === historyKey) {
      return;
    }

    setHistoryLoadingKey(historyKey);
    setHistoryErrorByKey((prev) => {
      const next = { ...prev };
      delete next[historyKey];
      return next;
    });

    try {
      const params = new URLSearchParams({
        source_donnee: contract.sourceDonnee,
      });
      const response = await fetch(
        `${CONTRACTS_API_ENDPOINT}/${contract.idContrat}/renouvellements?${params.toString()}`,
        {
          headers: buildRoleHeaders(user, {
            "Content-Type": "application/json",
          }),
        }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Impossible de charger l'historique des renouvellements.");
      }

      const renouvellements = Array.isArray(payload?.renouvellements)
        ? payload.renouvellements.map(mapRenewalHistoryRow)
        : [];

      setHistoryByKey((prev) => ({
        ...prev,
        [historyKey]: renouvellements,
      }));
    } catch (historyError) {
      console.error("Erreur chargement historique renouvellement:", historyError);
      setHistoryErrorByKey((prev) => ({
        ...prev,
        [historyKey]:
          historyError?.message || "Impossible de charger l'historique des renouvellements.",
      }));
    } finally {
      setHistoryLoadingKey((current) => (current === historyKey ? "" : current));
    }
  };

  const renderHistoryRow = (contract, columnSpan) => {
    const historyKey = getHistoryKey(contract);
    if (historyOpenKey !== historyKey) return null;

    const historyItems = Array.isArray(historyByKey[historyKey]) ? historyByKey[historyKey] : [];
    const historyError = historyErrorByKey[historyKey] || "";
    const isHistoryLoading = historyLoadingKey === historyKey;

    return (
      <tr className="contracts-history-row" key={`${contract.id}-history`}>
        <td colSpan={columnSpan}>
          <div className="contracts-history-panel">
            <div className="contracts-history-panel__header">
              <div>
                <h5>Historique des renouvellements</h5>
                <p>Suivi des anciennes et nouvelles périodes pour ce contrat.</p>
              </div>
            </div>

            {isHistoryLoading ? (
              <div className="contracts-history-panel__empty">Chargement de l'historique...</div>
            ) : historyError ? (
              <div className="contracts-history-panel__empty">{historyError}</div>
            ) : historyItems.length > 0 ? (
              <div className="contracts-history-list">
                {historyItems.map((historyItem) => (
                  <article key={historyItem.id} className="contracts-history-item">
                    <div className="contracts-history-item__period">
                      <span>Ancienne période</span>
                      <strong>
                        {formatDate(historyItem.ancienneDateDebut)} → {formatDate(historyItem.ancienneDateFin)}
                      </strong>
                    </div>
                    <div className="contracts-history-item__period">
                      <span>Nouvelle période</span>
                      <strong>
                        {formatDate(historyItem.nouvelleDateDebut)} → {formatDate(historyItem.nouvelleDateFin)}
                      </strong>
                    </div>
                    <div className="contracts-history-item__meta">
                      <span>Renouvelé par</span>
                      <strong>{historyItem.utilisateurNom || "-"}</strong>
                    </div>
                    <div className="contracts-history-item__meta">
                      <span>Date de renouvellement</span>
                      <strong>{formatDate(historyItem.dateRenouvellement)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="contracts-history-panel__empty">
                Aucun renouvellement enregistré pour ce contrat.
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

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
              <strong>{displayedTotal}</strong>
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
                  <th>Contrat trait&eacute; par</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="16" className="contracts-table__empty">
                      Chargement des contrats...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="16" className="contracts-table__empty">
                      {error}
                    </td>
                  </tr>
                ) : paginatedContracts.length > 0 ? (
                  paginatedContracts.map((contract) => {
                    const historyKey = getHistoryKey(contract);
                    return (
                      <Fragment key={contract.id}>
                        <tr>
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
                          <td className="contracts-table__cell--muted">{contract.traitePar || "-"}</td>
                          <td>
                            <ActionMenu
                              disabled={!canRenewContract(contract)}
                              loading={renewingContractId === contract.id}
                              historyLoading={historyLoadingKey === historyKey}
                              showHistory={contract.renouvellementsCount > 0}
                              onHistory={() => void handleToggleHistory(contract)}
                              onRenew={() => void handleRenewContract(contract)}
                            />
                          </td>
                        </tr>
                        {renderHistoryRow(contract, 16)}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="16" className="contracts-table__empty">
                      Aucun contrat trouv&eacute;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="contracts-alerts-view">
            <header className="contracts-alerts-header">
              <div className="contracts-alerts-header__content">
                <span className="contracts-alerts-header__icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>

                <div className="contracts-alerts-header__copy">
                  <span className="contracts-alerts-header__eyebrow">Surveillance RH</span>
                  <h4>Alertes de renouvellement</h4>
                  <p>Contrats expir&eacute;s ou proches de leur date de fin.</p>
                </div>
              </div>

              <span className="contracts-alerts-header__badge">
                {alertsTotal} {alertsTotal > 1 ? "alertes" : "alerte"}
              </span>
            </header>

            <section className="contracts-monitor__secondary">
              <div className="contracts-monitor__secondary-head">
                <div>
                  <span className="contracts-monitor__secondary-kicker">Contrats a surveiller</span>
                  <h4>Alertes renouvellement</h4>
                </div>
                <p>Contrats expires ou proches de leur date de fin.</p>
              </div>

              <div className="contracts-table-wrap contracts-table-wrap--alerts">
                <table className="contracts-table contracts-table--alerts">
                  <thead>
                    <tr>
                      <th>CIN</th>
                      <th>Nom &amp; Pr&eacute;nom</th>
                      <th>Fonction</th>
                      <th>Segment</th>
                      <th>Projet</th>
                      <th>Site</th>
                      <th>Type de contrat</th>
                      <th>Date fin contrat</th>
                      <th>Jours restants</th>
                      <th>Alerte</th>
                      <th>Contrat trait&eacute; par</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="12" className="contracts-table__empty">
                          Chargement des alertes...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="12" className="contracts-table__empty">
                          {error}
                        </td>
                      </tr>
                    ) : paginatedContracts.length > 0 ? (
                      paginatedContracts.map((contract) => {
                        const historyKey = getHistoryKey(contract);
                        return (
                          <Fragment key={contract.id}>
                            <tr>
                              <td className="contracts-table__cell--mono">{contract.cin || "-"}</td>
                              <td className="contracts-table__cell--strong">{contract.nomPrenom || "-"}</td>
                              <td className="contracts-table__cell--wrap">{contract.fonction || "-"}</td>
                              <td className="contracts-table__cell--muted">{contract.segment || "-"}</td>
                              <td className="contracts-table__cell--wrap">{contract.projet || "-"}</td>
                              <td className="contracts-table__cell--muted">{contract.site || "-"}</td>
                              <td>
                                <TypeBadge value={contract.typeContrat} />
                              </td>
                              <td className="contracts-table__cell--date">{formatDate(contract.dateFinContrat)}</td>
                              <td>
                                <span className={getDaysClassName(contract)}>{formatDaysRemaining(contract)}</span>
                              </td>
                              <td>
                                <AlertBadge contract={contract} />
                              </td>
                              <td className="contracts-table__cell--muted">{contract.traitePar || "-"}</td>
                              <td>
                                <ActionMenu
                                  alertMode
                                  disabled={!canRenewContract(contract)}
                                  loading={renewingContractId === contract.id}
                                  historyLoading={historyLoadingKey === historyKey}
                                  showHistory={contract.renouvellementsCount > 0}
                                  onHistory={() => void handleToggleHistory(contract)}
                                  onRenew={() => void handleRenewContract(contract)}
                                />
                              </td>
                            </tr>
                            {renderHistoryRow(contract, 12)}
                          </Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="12" className="contracts-table__empty">
                          Aucune alerte de renouvellement pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        <footer className="contracts-shell__footer">
          <div className="contracts-footer__summary">
            <span>Affichage</span>
            <strong>
              {pageStart} - {pageEnd}
            </strong>
            <span>sur {displayedTotal} {summaryLabel}</span>
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
