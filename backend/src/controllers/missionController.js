const missionModel = require("../models/missionModel");

const DEFAULT_MISSION_STATUS = "Planifi\u00e9e";

function readTrimmed(source, ...keys) {
    for (const key of keys) {
        const value = source?.[key];
        if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
        }
    }

    return "";
}

function readNullableInteger(source, ...keys) {
    for (const key of keys) {
        const value = source?.[key];
        if (value === undefined || value === null || value === "") {
            continue;
        }

        const parsed = Number(value);
        if (Number.isInteger(parsed)) {
            return parsed;
        }
    }

    return null;
}

function readPositiveInteger(source, ...keys) {
    const parsed = readNullableInteger(source, ...keys);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeResponsablesIds(value) {
    if (!Array.isArray(value)) return [];

    const seen = new Set();
    const ids = [];

    for (const entry of value) {
        const parsed = Number(entry);
        if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) {
            continue;
        }

        seen.add(parsed);
        ids.push(parsed);
    }

    return ids;
}

function buildMissionPayload(body = {}, requestUser = null) {
    const responsablesIds = normalizeResponsablesIds(body.responsablesIds);
    const creePar = readPositiveInteger(body, "CreePar", "creePar")
        || readPositiveInteger(requestUser, "Id", "id");

    return {
        TypeMission: readTrimmed(body, "TypeMission", "typeMission"),
        DateMission: readTrimmed(body, "DateMission", "dateMission"),
        Gouvernorat: readTrimmed(body, "Gouvernorat", "gouvernorat"),
        Delegation: readTrimmed(body, "Delegation", "delegation"),
        Transport: readTrimmed(body, "Transport", "transport"),
        Objectif: readTrimmed(body, "Objectif", "objectif"),
        ResultatMission: readTrimmed(body, "ResultatMission", "resultatMission"),
        NombreRecrutes: readNullableInteger(body, "NombreRecrutes", "nombreRecrutes"),
        Observations: readTrimmed(body, "Observations", "observations"),
        Statut: readTrimmed(body, "Statut", "statut") || DEFAULT_MISSION_STATUS,
        CreePar: creePar || null,
        responsablesIds,
    };
}

function validateMissionPayload(payload) {
    if (!payload.TypeMission) return "TypeMission obligatoire.";
    if (!payload.DateMission) return "DateMission obligatoire.";
    if (!payload.Gouvernorat) return "Gouvernorat obligatoire.";
    if (!payload.Delegation) return "Delegation obligatoire.";
    if (!payload.Transport) return "Transport obligatoire.";
    if (!Array.isArray(payload.responsablesIds) || payload.responsablesIds.length === 0) {
        return "Au moins un responsable doit etre selectionne.";
    }

    return "";
}

exports.getResponsables = async (_req, res) => {
    try {
        const responsables = await missionModel.getResponsables();

        return res.json({
            success: true,
            responsables,
        });
    } catch (error) {
        console.error("Erreur GET /api/missions/responsables :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de charger les responsables de mission.",
        });
    }
};

exports.getMissions = async (_req, res) => {
    try {
        const missions = await missionModel.getAllMissions();

        return res.json({
            success: true,
            missions,
        });
    } catch (error) {
        console.error("Erreur GET /api/missions :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de charger les missions.",
        });
    }
};

exports.getAssignedMissions = async (req, res) => {
    try {
        const userId = readPositiveInteger(req.params, "userId");
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }

        const missions = await missionModel.getAssignedMissions(userId);

        return res.json({
            success: true,
            missions,
        });
    } catch (error) {
        console.error("Erreur GET /api/missions/assigned/:userId :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de charger les missions affectees.",
        });
    }
};

exports.createMission = async (req, res) => {
    try {
        const payload = buildMissionPayload(req.body, req.user);
        const validationMessage = validateMissionPayload(payload);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const mission = await missionModel.createMission(payload);

        return res.status(201).json({
            success: true,
            message: "Mission cr\u00e9\u00e9e avec succ\u00e8s.",
            mission,
        });
    } catch (error) {
        console.error("Erreur POST /api/missions :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de creer la mission.",
        });
    }
};

exports.updateMission = async (req, res) => {
    try {
        const missionId = readPositiveInteger(req.params, "id");
        if (!missionId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant mission invalide.",
            });
        }

        const payload = buildMissionPayload(req.body, req.user);
        const validationMessage = validateMissionPayload(payload);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const mission = await missionModel.updateMission(missionId, payload);
        if (!mission) {
            return res.status(404).json({
                success: false,
                message: "Mission introuvable.",
            });
        }

        return res.json({
            success: true,
            message: "Mission modifi\u00e9e avec succ\u00e8s.",
            mission,
        });
    } catch (error) {
        console.error("Erreur PUT /api/missions/:id :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de modifier la mission.",
        });
    }
};

exports.deleteMission = async (req, res) => {
    try {
        const missionId = readPositiveInteger(req.params, "id");
        if (!missionId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant mission invalide.",
            });
        }

        const deleted = await missionModel.deleteMission(missionId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Mission introuvable.",
            });
        }

        return res.json({
            success: true,
            message: "Mission supprim\u00e9e avec succ\u00e8s.",
        });
    } catch (error) {
        console.error("Erreur DELETE /api/missions/:id :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de supprimer la mission.",
        });
    }
};
