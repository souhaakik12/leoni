const missionModel = require("../models/missionModel");

const PLANIFIED_STATUS = "Planifi\u00e9e";
const IN_PROGRESS_STATUS = "En cours";
const COMPLETED_STATUS = "Termin\u00e9e";
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

function readNonNegativeInteger(source, ...keys) {
    const parsed = readNullableInteger(source, ...keys);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function toIsoDate(value) {
    const raw = readTrimmed({ value }, "value");
    if (!raw) return "";

    const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const frMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (frMatch) {
        return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";

    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
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

function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function toDisplayDate(value) {
    const raw = readTrimmed({ value }, "value");
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }

    return raw;
}

async function findFirstBusyResponsable(payload, missionIdToExclude = null) {
    const busyResponsables = await missionModel.findBusyResponsables(
        payload.DateMission,
        payload.responsablesIds,
        missionIdToExclude
    );

    return busyResponsables[0] || null;
}

function computeMissionStatus(dateMission) {
    const missionDate = toIsoDate(dateMission);
    if (!missionDate) return "";

    const currentDate = todayIso();
    if (missionDate > currentDate) return PLANIFIED_STATUS;
    if (missionDate < currentDate) return COMPLETED_STATUS;
    return IN_PROGRESS_STATUS;
}

function buildMissionPayload(body = {}, requestUser = null) {
    const responsablesIds = normalizeResponsablesIds(body.responsablesIds);
    const creePar = readPositiveInteger(body, "CreePar", "creePar")
        || readPositiveInteger(requestUser, "Id", "id");
    const dateMission = toIsoDate(readTrimmed(body, "DateMission", "dateMission"));

    return {
        TypeMission: readTrimmed(body, "TypeMission", "typeMission"),
        DateMission: dateMission,
        Gouvernorat: readTrimmed(body, "Gouvernorat", "gouvernorat"),
        Delegation: readTrimmed(body, "Delegation", "delegation"),
        Transport: readTrimmed(body, "Transport", "transport"),
        Objectif: readTrimmed(body, "Objectif", "objectif"),
        ResultatMission: readTrimmed(body, "ResultatMission", "resultatMission"),
        NombreRecrutes: readNullableInteger(body, "NombreRecrutes", "nombreRecrutes"),
        Observations: readTrimmed(body, "Observations", "observations"),
        Statut: computeMissionStatus(dateMission),
        CreePar: creePar || null,
        responsablesIds,
    };
}

function validateMissionPayload(payload, options = {}) {
    const { rejectPastDate = false } = options;

    if (!payload.TypeMission) return "TypeMission obligatoire.";
    if (!payload.DateMission) return "DateMission obligatoire.";
    if (!payload.Gouvernorat) return "Gouvernorat obligatoire.";
    if (!payload.Delegation) return "Delegation obligatoire.";
    if (!payload.Transport) return "Transport obligatoire.";
    if (!Array.isArray(payload.responsablesIds) || payload.responsablesIds.length === 0) {
        return "Au moins un responsable doit etre selectionne.";
    }
    if (rejectPastDate && payload.DateMission < todayIso()) {
        return "Impossible de creer une mission avec une date passee.";
    }

    return "";
}

exports.getResponsables = async (req, res) => {
    try {
        const missionDate = readTrimmed(req.query, "date", "dateMission");
        const responsables = await missionModel.getResponsables(missionDate || null);

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

exports.updateMissionResult = async (req, res) => {
    try {
        const missionId = readPositiveInteger(req.params, "id");
        const userId = readPositiveInteger(req.body, "userId");
        const nombreCandidatsPotentiels = readNonNegativeInteger(
            req.body,
            "NombreCandidatsPotentiels",
            "nombreCandidatsPotentiels"
        );
        const observations = readTrimmed(req.body, "Observations", "observations");

        if (!missionId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant mission invalide.",
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }

        if (nombreCandidatsPotentiels === null) {
            return res.status(400).json({
                success: false,
                message: "Le nombre de candidats potentiels est obligatoire.",
            });
        }

        const assignedMission = await missionModel.getAssignedMissionByIdForUser(missionId, userId);
        if (!assignedMission) {
            return res.status(403).json({
                success: false,
                message: "Vous n'etes pas affecte a cette mission.",
            });
        }

        const missionDate = toIsoDate(assignedMission.DateMission || assignedMission.date);
        if (missionDate && missionDate > todayIso()) {
            return res.status(400).json({
                success: false,
                message: "Impossible de saisir le resultat d'une mission future.",
            });
        }

        const mission = await missionModel.updateMissionResult(missionId, {
            NombreCandidatsPotentiels: nombreCandidatsPotentiels,
            Observations: observations,
            Statut: COMPLETED_STATUS,
        });

        if (!mission) {
            return res.status(404).json({
                success: false,
                message: "Mission introuvable.",
            });
        }

        return res.json({
            success: true,
            message: "Resultat de mission enregistre avec succes.",
            mission,
        });
    } catch (error) {
        console.error("Erreur PUT /api/missions/:id/resultat :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible d'enregistrer le resultat de la mission.",
        });
    }
};

exports.createMission = async (req, res) => {
    try {
        const payload = buildMissionPayload(req.body, req.user);
        const validationMessage = validateMissionPayload(payload, { rejectPastDate: true });

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const busyResponsable = await findFirstBusyResponsable(payload);
        if (busyResponsable) {
            return res.status(409).json({
                success: false,
                message: `Le responsable ${busyResponsable.NomComplet} est deja affecte a une mission le ${toDisplayDate(busyResponsable.DateMission || payload.DateMission)}.`,
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

        const busyResponsable = await findFirstBusyResponsable(payload, missionId);
        if (busyResponsable) {
            return res.status(409).json({
                success: false,
                message: `Le responsable ${busyResponsable.NomComplet} est deja affecte a une mission le ${toDisplayDate(busyResponsable.DateMission || payload.DateMission)}.`,
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
