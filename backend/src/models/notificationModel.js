const sql = require("mssql");
const config = require("../../config");

const MISSION_AFFECTATION_TYPE = "MISSION_AFFECTATION";

function normalizeText(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

function normalizePositiveInt(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function toIsoDate(value) {
    if (!value) return "";

    if (typeof value === "string") {
        const trimmed = value.trim();
        const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) return isoMatch[1];

        const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (frMatch) {
            return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
        }
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function toDisplayDate(value) {
    const isoDate = toIsoDate(value);
    if (!isoDate) return "";

    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
}

function mapNotificationRow(row) {
    const notificationId = normalizePositiveInt(row?.Id);
    if (!notificationId) return null;

    return {
        Id: notificationId,
        UtilisateurId: normalizePositiveInt(row?.UtilisateurId),
        MissionId: normalizePositiveInt(row?.MissionId),
        TypeNotification: normalizeText(row?.TypeNotification),
        Message: normalizeText(row?.Message),
        Lu: Boolean(row?.Lu),
        CreeLe: row?.CreeLe || null,
    };
}

async function getRequest() {
    const pool = await sql.connect(config);
    return pool.request();
}

async function createMissionNotificationWithRequest(request, utilisateurId, missionId, message) {
    const normalizedUserId = normalizePositiveInt(utilisateurId);
    const normalizedMissionId = normalizePositiveInt(missionId);
    const normalizedMessage = normalizeText(message);
    if (!normalizedUserId || !normalizedMissionId || !normalizedMessage) return null;

    const result = await request
        .input("UtilisateurId", sql.Int, normalizedUserId)
        .input("MissionId", sql.Int, normalizedMissionId)
        .input("TypeNotification", sql.NVarChar(100), MISSION_AFFECTATION_TYPE)
        .input("Message", sql.NVarChar(sql.MAX), normalizedMessage)
        .query(`
            IF NOT EXISTS (
                SELECT 1
                FROM dbo.Notifications
                WHERE UtilisateurId = @UtilisateurId
                  AND MissionId = @MissionId
                  AND TypeNotification = @TypeNotification
                  AND Message = @Message
            )
            BEGIN
                INSERT INTO dbo.Notifications (
                    UtilisateurId,
                    MissionId,
                    TypeNotification,
                    Message,
                    Lu,
                    CreeLe
                )
                OUTPUT
                    INSERTED.Id,
                    INSERTED.UtilisateurId,
                    INSERTED.MissionId,
                    INSERTED.TypeNotification,
                    INSERTED.Message,
                    INSERTED.Lu,
                    INSERTED.CreeLe
                VALUES (
                    @UtilisateurId,
                    @MissionId,
                    @TypeNotification,
                    @Message,
                    0,
                    GETDATE()
                );
            END;
        `);

    return mapNotificationRow(result.recordset?.[0]);
}

function buildMissionNotificationMessage(mission = {}) {
    const missionId = normalizePositiveInt(mission?.Id || mission?.MissionId);
    const codeMission = normalizeText(mission?.CodeMission) || (missionId ? `M${missionId}` : "Mission");
    const gouvernorat = normalizeText(mission?.Gouvernorat);
    const delegation = normalizeText(mission?.Delegation);
    const destination = [gouvernorat, delegation].filter(Boolean).join(" / ");
    const dateMission = toDisplayDate(mission?.DateMission || mission?.date);

    let message = `Vous \u00eates affect\u00e9 \u00e0 la mission ${codeMission}`;
    if (destination) {
        message += ` - ${destination}`;
    }
    if (dateMission) {
        message += ` le ${dateMission}`;
    }

    return `${message}.`;
}

async function getNotificationsByUserId(userId) {
    const normalizedUserId = normalizePositiveInt(userId);
    if (!normalizedUserId) return [];

    const result = await (await getRequest())
        .input("UtilisateurId", sql.Int, normalizedUserId)
        .query(`
            SELECT
                Id,
                UtilisateurId,
                MissionId,
                TypeNotification,
                Message,
                Lu,
                CreeLe
            FROM dbo.Notifications
            WHERE UtilisateurId = @UtilisateurId
            ORDER BY CreeLe DESC, Id DESC;
        `);

    return (result.recordset || []).map(mapNotificationRow).filter(Boolean);
}

async function getUnreadCount(userId) {
    const normalizedUserId = normalizePositiveInt(userId);
    if (!normalizedUserId) return 0;

    const result = await (await getRequest())
        .input("UtilisateurId", sql.Int, normalizedUserId)
        .query(`
            SELECT COUNT(1) AS UnreadCount
            FROM dbo.Notifications
            WHERE UtilisateurId = @UtilisateurId
              AND ISNULL(Lu, 0) = 0;
        `);

    return Number(result.recordset?.[0]?.UnreadCount || 0);
}

async function markAsRead(notificationId, userId) {
    const normalizedNotificationId = normalizePositiveInt(notificationId);
    const normalizedUserId = normalizePositiveInt(userId);
    if (!normalizedNotificationId || !normalizedUserId) return null;

    const result = await (await getRequest())
        .input("NotificationId", sql.Int, normalizedNotificationId)
        .input("UtilisateurId", sql.Int, normalizedUserId)
        .query(`
            UPDATE dbo.Notifications
            SET Lu = 1
            OUTPUT
                INSERTED.Id,
                INSERTED.UtilisateurId,
                INSERTED.MissionId,
                INSERTED.TypeNotification,
                INSERTED.Message,
                INSERTED.Lu,
                INSERTED.CreeLe
            WHERE Id = @NotificationId
              AND UtilisateurId = @UtilisateurId;
        `);

    return mapNotificationRow(result.recordset?.[0]);
}

async function markAllAsRead(userId) {
    const normalizedUserId = normalizePositiveInt(userId);
    if (!normalizedUserId) return 0;

    const result = await (await getRequest())
        .input("UtilisateurId", sql.Int, normalizedUserId)
        .query(`
            UPDATE dbo.Notifications
            SET Lu = 1
            WHERE UtilisateurId = @UtilisateurId
              AND ISNULL(Lu, 0) = 0;
        `);

    return result.rowsAffected?.[0] || 0;
}

async function createMissionNotification(utilisateurId, missionId, message) {
    return createMissionNotificationWithRequest(
        await getRequest(),
        utilisateurId,
        missionId,
        message
    );
}

module.exports = {
    MISSION_AFFECTATION_TYPE,
    buildMissionNotificationMessage,
    createMissionNotificationWithRequest,
    getNotificationsByUserId,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createMissionNotification,
};
