import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { buildRoleHeaders } from "../utils/roles.js";

const NotificationsContext = createContext(null);
const API_BASE_URL = "http://localhost:3000/api/notifications";

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeNotification(input) {
  const notificationId = normalizePositiveInt(input?.Id ?? input?.id);
  if (!notificationId) return null;

  return {
    ...input,
    Id: notificationId,
    id: notificationId,
    UtilisateurId: normalizePositiveInt(input?.UtilisateurId ?? input?.utilisateurId),
    MissionId: normalizePositiveInt(input?.MissionId ?? input?.missionId),
    TypeNotification: normalizeText(input?.TypeNotification ?? input?.typeNotification),
    Message: normalizeText(input?.Message ?? input?.message),
    Lu: Boolean(input?.Lu ?? input?.lu),
    CreeLe: input?.CreeLe ?? input?.creeLe ?? null,
  };
}

function countUnreadNotifications(list) {
  return list.reduce((count, notification) => count + (notification?.Lu ? 0 : 1), 0);
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const currentUserId = normalizePositiveInt(user?.Id ?? user?.id);

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    setNotificationsError("");
    setLoadingNotifications(false);
  };

  const refreshNotifications = async () => {
    if (!currentUserId) {
      clearNotifications();
      return {
        notifications: [],
        count: 0,
      };
    }

    setLoadingNotifications(true);
    setNotificationsError("");

    try {
      const headers = buildRoleHeaders(user);
      const [notificationsResponse, countResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/${currentUserId}`, { headers }),
        fetch(`${API_BASE_URL}/${currentUserId}/unread-count`, { headers }),
      ]);

      const notificationsPayload = await notificationsResponse.json().catch(() => ({}));
      if (!notificationsResponse.ok || notificationsPayload?.success === false) {
        throw new Error(notificationsPayload?.message || "Impossible de charger les notifications.");
      }

      const nextNotifications = (Array.isArray(notificationsPayload?.notifications)
        ? notificationsPayload.notifications
        : []
      )
        .map(normalizeNotification)
        .filter(Boolean);

      let nextUnreadCount = countUnreadNotifications(nextNotifications);

      if (countResponse.ok) {
        const countPayload = await countResponse.json().catch(() => ({}));
        if (countPayload?.success !== false) {
          const parsedCount = Number(countPayload?.count);
          if (Number.isInteger(parsedCount) && parsedCount >= 0) {
            nextUnreadCount = parsedCount;
          }
        }
      }

      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);

      return {
        notifications: nextNotifications,
        count: nextUnreadCount,
      };
    } catch (error) {
      const message = error?.message || "Impossible de charger les notifications.";
      setNotificationsError(message);
      throw error;
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    const normalizedNotificationId = normalizePositiveInt(notificationId);
    if (!currentUserId || !normalizedNotificationId) {
      throw new Error("Notification invalide.");
    }

    const response = await fetch(`${API_BASE_URL}/${normalizedNotificationId}/read`, {
      method: "PUT",
      headers: buildRoleHeaders(user, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        userId: currentUserId,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Impossible de marquer la notification comme lue.");
    }

    const updatedNotification = normalizeNotification(data?.notification) || {
      Id: normalizedNotificationId,
      Lu: true,
    };
    const previousNotification = notifications.find(
      (notification) => notification.Id === normalizedNotificationId
    );

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.Id === normalizedNotificationId
          ? { ...notification, ...updatedNotification, Lu: true }
          : notification
      )
    );

    if (previousNotification && !previousNotification.Lu) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    return updatedNotification;
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUserId) {
      throw new Error("Utilisateur invalide.");
    }

    const response = await fetch(`${API_BASE_URL}/${currentUserId}/read-all`, {
      method: "PUT",
      headers: buildRoleHeaders(user),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Impossible de marquer toutes les notifications comme lues.");
    }

    setNotifications((prev) => prev.map((notification) => ({ ...notification, Lu: true })));
    setUnreadCount(0);

    return data;
  };

  useEffect(() => {
    if (!currentUserId) {
      clearNotifications();
      return;
    }

    refreshNotifications().catch(() => {});
  }, [currentUserId, user?.role]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loadingNotifications,
        notificationsError,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
