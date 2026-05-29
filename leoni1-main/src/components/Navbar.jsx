import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationsContext.jsx";
import { ROLE_RESPONSABLE_CONTRAT, normalizeRole } from "../utils/roles.js";
import leoniLogo from "../assets/leon-logo.svg";
import "./Navbar.css";

const pageTitles = {
  "/": { title: "Dashboard", sub: "Vue d'ensemble de votre activite" },
  "/admin/dashboards": {
    title: "Tableaux de bord",
    sub: "Suivi des candidats, contrats et missions",
  },
  "/dorms": { title: "Gestion des Foyers", sub: "Gerez les foyers et hebergements" },
  "/missions": { title: "Gestion des Missions", sub: "Gerez les missions de recrutement" },
  "/candidats/candidat": {
    title: "Candidats - Entrée",
    
  },
  "/candidats/test": {
    title: "Candidats - Test",
    
  },
  "/candidats/test/dossier": {
    title: "Dossier Candidat",
    
  },
  "/contracts": {
    title: "Gestion des Contrats",
    
  },
  "/contracts/reception": {
    title: "Service Contrats - Dossiers",
    
  },
  "/contracts/sessions": {
    title: "Service Contrats - Séances",
    
  },
  "/profile": {
    title: "Mon Profil",
    
  },
  "/change-password": {
    title: "Mot de Passe",
  
  },
  "/employees": {
    title: "Utilisateurs",
    
  },
};

const roleBadge = {
  admin: {
    label: "Admin",
    bg: "rgba(23, 67, 148, 0.1)",
    color: "#174394",
    border: "rgba(23, 67, 148, 0.14)",
  },
  recruteur: {
    label: "Recruteur",
    bg: "rgba(109, 88, 164, 0.1)",
    color: "#5f4c94",
    border: "rgba(95, 76, 148, 0.14)",
  },
  [ROLE_RESPONSABLE_CONTRAT]: {
    label: "Responsable Contrat",
    bg: "rgba(161, 94, 43, 0.1)",
    color: "#8f5126",
    border: "rgba(143, 81, 38, 0.14)",
  },
};

function formatNotificationDate(value) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function resolveNotificationTarget(notification, role) {
  if (!notification?.MissionId && notification?.TypeNotification !== "MISSION_AFFECTATION") {
    return "/profile";
  }

  return normalizeRole(role) === ROLE_RESPONSABLE_CONTRAT ? "/profile" : "/missions";
}

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loadingNotifications,
    notificationsError,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationActionError, setNotificationActionError] = useState("");
  const [activeNotificationId, setActiveNotificationId] = useState(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const notificationsRef = useRef(null);
  const isDossierPath = /^\/candidats\/test\/\d+\/dossier/.test(pathname);
  const fallbackCandidats = isDossierPath
    ? pageTitles["/candidats/test/dossier"]
    : pathname.startsWith("/candidats/")
      ? pageTitles["/candidats/candidat"]
      : null;
  const { title, sub } = pageTitles[pathname] || fallbackCandidats || { title: "LEONI", sub: "" };
  const badge = roleBadge[normalizeRole(user?.role)] || {};
  const roleChipStyle = badge.label
    ? {
        "--chip-bg": badge.bg,
        "--chip-color": badge.color,
        "--chip-border": badge.border,
      }
    : undefined;
  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    setNotificationsOpen(false);
    setNotificationActionError("");
  }, [pathname]);

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    setNotificationActionError("");
    setActiveNotificationId(notification.Id);

    try {
      if (!notification.Lu) {
        await markNotificationAsRead(notification.Id);
      }

      setNotificationsOpen(false);
      navigate(resolveNotificationTarget(notification, user?.role));
    } catch (error) {
      setNotificationActionError(
        error?.message || "Impossible d'ouvrir cette notification."
      );
    } finally {
      setActiveNotificationId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotificationActionError("");
    setMarkingAllAsRead(true);

    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      setNotificationActionError(
        error?.message || "Impossible de marquer toutes les notifications comme lues."
      );
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  return (
    <header className="app-header">
      <div className="app-header__identity">
        <img src={leoniLogo} alt="LEONI" className="app-header__identity-logo" />
        <div className="app-header__brand-copy">
          <p className="app-header__brand-title">Recrutement</p>
        </div>
      </div>

      <div className="app-header__page">
        <button
          type="button"
          className="app-header__menu-button"
          onClick={onToggleSidebar}
          aria-label="Basculer la navigation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="app-header__divider" aria-hidden="true" />

        <div className="app-header__page-copy">
          <h1 className="app-header__page-title">{title}</h1>
          {sub ? <p className="app-header__page-subtitle">{sub}</p> : null}
        </div>
      </div>

      <div className="app-header__actions">
        {badge.label ? (
          <span className="app-header__chip app-header__chip--role" style={roleChipStyle}>
            {badge.label}
          </span>
        ) : null}
        {user ? (
          <div className="app-header__notifications" ref={notificationsRef}>
            <button
              type="button"
              className="app-header__notifications-button"
              aria-label={unreadCount > 0 ? `${unreadCount} notifications non lues` : "Notifications"}
              aria-expanded={notificationsOpen}
              aria-haspopup="menu"
              onClick={() => setNotificationsOpen((prev) => !prev)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M10 17a2 2 0 0 0 4 0" />
              </svg>
              {unreadCount > 0 ? (
                <span className="app-header__notifications-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div className="app-header__notifications-dropdown" role="menu">
                <div className="app-header__notifications-head">
                  <div>
                    <h3>Notifications</h3>
                    <p>
                      {unreadCount > 0
                        ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                        : "Aucune notification non lue"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="app-header__notifications-mark-all"
                    onClick={handleMarkAllAsRead}
                    disabled={!hasNotifications || unreadCount === 0 || markingAllAsRead}
                  >
                    {markingAllAsRead ? "Traitement..." : "Tout marquer comme lu"}
                  </button>
                </div>

                {notificationActionError ? (
                  <div className="app-header__notifications-feedback app-header__notifications-feedback--error">
                    {notificationActionError}
                  </div>
                ) : null}

                <div className="app-header__notifications-list">
                  {loadingNotifications ? (
                    <div className="app-header__notifications-empty">Chargement des notifications...</div>
                  ) : notificationsError ? (
                    <div className="app-header__notifications-empty app-header__notifications-empty--error">
                      {notificationsError}
                    </div>
                  ) : !hasNotifications ? (
                    <div className="app-header__notifications-empty">Aucune notification</div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.Id}
                        type="button"
                        className={`app-header__notification-item${notification.Lu ? "" : " app-header__notification-item--unread"}`}
                        onClick={() => handleNotificationClick(notification)}
                        disabled={activeNotificationId === notification.Id}
                      >
                        <div className="app-header__notification-item-top">
                          <span className="app-header__notification-item-status">
                            {notification.Lu ? "Lu" : "Non lu"}
                          </span>
                          <span className="app-header__notification-item-date">
                            {formatNotificationDate(notification.CreeLe)}
                          </span>
                        </div>
                        <p className="app-header__notification-item-message">
                          {notification.Message || "Notification"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="app-header__avatar-shell">
          <div className="app-header__avatar">
            {user?.avatar}
          </div>
        </div>
      </div>
    </header>
  );
}
