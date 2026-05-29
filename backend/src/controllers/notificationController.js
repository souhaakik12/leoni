const notificationModel = require("../models/notificationModel");

function readPositiveInteger(source, ...keys) {
    for (const key of keys) {
        const value = source?.[key];
        if (value === undefined || value === null || value === "") {
            continue;
        }

        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return null;
}

exports.getNotificationsByUserId = async (req, res) => {
    try {
        const userId = readPositiveInteger(req.params, "userId");
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }

        const notifications = await notificationModel.getNotificationsByUserId(userId);

        return res.json({
            success: true,
            notifications,
        });
    } catch (error) {
        console.error("Erreur GET /api/notifications/:userId :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de charger les notifications.",
        });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = readPositiveInteger(req.params, "userId");
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }

        const count = await notificationModel.getUnreadCount(userId);

        return res.json({
            success: true,
            count,
        });
    } catch (error) {
        console.error("Erreur GET /api/notifications/:userId/unread-count :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de charger le nombre de notifications non lues.",
        });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const notificationId = readPositiveInteger(req.params, "notificationId");
        const userId = readPositiveInteger(req.body, "userId");
        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant notification invalide.",
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }

        const notification = await notificationModel.markAsRead(notificationId, userId);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification introuvable.",
            });
        }

        return res.json({
            success: true,
            notification,
        });
    } catch (error) {
        console.error("Erreur PUT /api/notifications/:notificationId/read :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de marquer la notification comme lue.",
        });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = readPositiveInteger(req.params, "userId");
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }

        const updatedCount = await notificationModel.markAllAsRead(userId);

        return res.json({
            success: true,
            updatedCount,
        });
    } catch (error) {
        console.error("Erreur PUT /api/notifications/:userId/read-all :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de marquer toutes les notifications comme lues.",
        });
    }
};
