import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_RESPONSABLE_CONTRAT, normalizeRole } from "../utils/roles.js";

const pageTitles = {
  "/": { title: "Dashboard", sub: "Vue d'ensemble de votre activite" },
  "/dorms": { title: "Gestion des Foyers", sub: "Gerez les foyers et hebergements" },
  "/missions": { title: "Gestion des Missions", sub: "Gerez les missions de recrutement" },
  "/candidats/candidat": {
    title: "Candidats - Entree",
    sub: "Candidats ajoutes directement au debut du processus",
  },
  "/candidats/test": {
    title: "Candidats - Test",
    sub: "Entretien candidat: resultat OK ou NOK",
  },
  "/candidats/reintegres": {
    title: "Candidats - Reintegres",
    sub: "En attente de l'avis juridique avant signature contrat",
  },
  "/candidats/test/dossier": {
    title: "Dossier Candidat",
    sub: "Test, entretien et documents du candidat",
  },
  "/contracts": {
    title: "Gestion des Contrats",
    sub: "Gerez les contrats des employes",
  },
  "/contracts/reception": {
    title: "Service Contrats - Dossiers",
    sub: "Reception des candidats valides et finalisation contrat",
  },
  "/contracts/sessions": {
    title: "Service Contrats - Seances",
    sub: "Seances d'information contrat et affectation du type CDI/CAIP",
  },
};

const roleBadge = {
  admin: { label: "Admin", bg: "#1e40af", color: "#fff" },
  recruteur: { label: "Recruteur", bg: "#7c3aed", color: "#fff" },
  [ROLE_RESPONSABLE_CONTRAT]: { label: "Responsable Contrat", bg: "#ea580c", color: "#fff" },
};

export default function Navbar({ onToggleSidebar }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isDossierPath = /^\/candidats\/test\/\d+\/dossier/.test(pathname);
  const fallbackCandidats = isDossierPath
    ? pageTitles["/candidats/test/dossier"]
    : pathname.startsWith("/candidats/")
      ? pageTitles["/candidats/candidat"]
      : null;
  const { title, sub } = pageTitles[pathname] || fallbackCandidats || { title: "LEONI", sub: "" };
  const badge = roleBadge[normalizeRole(user?.role)] || {};

  return (
    <header
      style={{
        height: 60,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        background: "#fff",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 7,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div style={{ width: 1, height: 24, background: "var(--border)" }} />
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            background: "#F5C200",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 800,
            color: "#000",
            letterSpacing: "0.06em",
          }}
        >
          LEONI
        </span>
        <span
          style={{
            background: badge.bg,
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {user?.avatar}
        </div>
      </div>
    </header>
  );
}
