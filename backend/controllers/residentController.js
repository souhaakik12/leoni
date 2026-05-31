const residentModel = require("../models/residentModel");

const MIN_RESIDENT_AGE = 18;
const MAX_RESIDENT_AGE = 99;
const TWO_DIGITS_REGEX = /^\d{2}$/;
// Option: passer à true si vous voulez bloquer aussi les matricules déjà utilisés par des résidentes quittées.
const BLOCK_DUPLICATE_MATRICULE_FOR_QUITTEE_HISTORY = false;
const NEXT_MONTH_COTISATION = 60;
const ONE_MONTH_DAYS = 30;

function toNullableNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

function getDayNumber(dateValue) {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return date.getDate();
}

function isQuitteeStatus(status) {
    return String(status ?? "").toLowerCase().includes("quitt");
}

function normalizeResidentType(type) {
    const normalized = String(type ?? "").trim().toLowerCase();
    if (normalized === "ancienne" || normalized === "anciennes") return "ancienne";
    if (normalized === "nouvelle" || normalized === "nouvelles") return "nouvelle";
    return "";
}

function toSqlDateValue(value) {
    if (!value) return null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const normalized = `${match[1]}-${match[2]}-${match[3]}`;
        const date = new Date(`${normalized}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) return null;
        return normalized;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

function hasCompletedFirstMonth(entryDate) {
    if (!entryDate) return false;
    const entry = new Date(entryDate);
    if (Number.isNaN(entry.getTime())) return false;
    const now = new Date();
    const diffMs = now.getTime() - entry.getTime();
    return diffMs >= ONE_MONTH_DAYS * 24 * 60 * 60 * 1000;
}

function computeResidentFinance(entryDate, exitDate, type, status) {
    let normalizedType = normalizeResidentType(type);
    const exitDay = getDayNumber(exitDate);
    const entryDay = getDayNumber(entryDate);

    if (!normalizedType) {
        normalizedType = hasCompletedFirstMonth(entryDate) ? "ancienne" : "nouvelle";
    }

    if (isQuitteeStatus(status) && exitDay === null) {
        return { type: normalizedType, cotisation: null, reste: null };
    }

    if (isQuitteeStatus(status) && exitDay !== null) {
        const cotisation = exitDay <= 15 ? 30 : 60;
        return { type: normalizedType, cotisation, reste: 0 };
    }

    if (normalizedType === "nouvelle" && hasCompletedFirstMonth(entryDate)) {
        normalizedType = "ancienne";
    }

    if (normalizedType === "ancienne") {
        return { type: "ancienne", cotisation: 60, reste: 0 };
    }

    if (entryDay === null) {
        return { type: "nouvelle", cotisation: null, reste: null };
    }

    const cotisation = (entryDay >= 28 && entryDay <= 31)
        ? 60
        : (entryDay <= 15 ? 60 : 30);
    const reste = (entryDay >= 28 && entryDay <= 31)
        ? 0
        : (cotisation + NEXT_MONTH_COTISATION);

    return {
        type: "nouvelle",
        cotisation,
        reste,
    };
}

function normalizeResidentPayload(input, options = {}) {
    const status = isQuitteeStatus(input.etat) ? "Quittee" : "Au foyer";
    const dateEntree = toSqlDateValue(input.date_entree);
    const dateSortie = isQuitteeStatus(status) ? toSqlDateValue(input.date_sortie) : null;
    if (isQuitteeStatus(status) && !dateSortie) {
        return { error: "date_sortie is required when etat is Quittee" };
    }

    const baseType = normalizeResidentType(input.type) || (options.defaultType || "nouvelle");
    const finance = computeResidentFinance(dateEntree, dateSortie, baseType, status);

    return {
        data: {
            nom_complet: input.nom_complet,
            matricule: typeof input.matricule === "string" ? input.matricule.trim() : (input.matricule == null ? "" : String(input.matricule)),
            age: toNullableNumber(input.age),
            telephone: input.telephone || null,
            tel_parent: input.tel_parent || null,
            chambre: input.chambre || null,
            etat: status,
            type: finance.type,
            cotisation: toNullableNumber(finance.cotisation),
            reste: toNullableNumber(finance.reste),
            date_entree: dateEntree,
            date_sortie: dateSortie,
            cin: toNullableNumber(input.cin),
            email: input.email || null,
            foyer_id: toNullableNumber(input.foyer_id),
        },
    };
}

function hasNonEmptyText(value) {
    return String(value ?? "").trim() !== "";
}

function validateResidentAge(ageValue) {
    const ageText = String(ageValue ?? "").trim();
    if (!ageText) return "L\u2019\u00e2ge doit \u00eatre plus que  18 ans";
    if (!TWO_DIGITS_REGEX.test(ageText)) return "L\u2019\u00e2ge doit \u00eatre compris entre 18 et 99 ans";

    const ageNumber = Number(ageText);
    if (!Number.isInteger(ageNumber) || ageNumber < MIN_RESIDENT_AGE || ageNumber > MAX_RESIDENT_AGE) {
        return "verifier l'age ";
    }

    return "";
}

function validateCreateResidentInput(input, normalizedData) {
    if (!hasNonEmptyText(input.nom_complet)) return "nom_complet is required";
    if (!hasNonEmptyText(input.matricule)) return "matricule is required";
    if (!hasNonEmptyText(input.cin)) return "cin is required";
    if (!hasNonEmptyText(input.etat)) return "etat is required";
    if (!hasNonEmptyText(input.type)) return "type is required";
    if (!normalizedData.date_entree) return "date_entree is required and must be yyyy-mm-dd";
    if (!normalizedData.foyer_id) return "foyer_id is required";
    const ageError = validateResidentAge(input.age);
    if (ageError) return ageError;
    return "";
}

async function getResidentsByFoyerId(req, res) {
    try {
        const foyerId = Number(req.params.foyer_id);
        if (Number.isNaN(foyerId)) {
            return res.status(400).json({ message: "Invalid foyer id" });
        }

        const residents = await residentModel.getResidentsByFoyerId(foyerId);
        return res.json(residents);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur lors du chargement des residents." });
    }
}

async function createResident(req, res) {
    try {
        const normalized = normalizeResidentPayload(req.body, { defaultType: "nouvelle" });
        if (normalized.error) {
            return res.status(400).json({ message: normalized.error });
        }

        const validationError = validateCreateResidentInput(req.body || {}, normalized.data);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        if (!isQuitteeStatus(normalized.data.etat)) {
            const foyerStats = await residentModel.getFoyerCapacityAndOccupied(normalized.data.foyer_id);
            if (!foyerStats) {
                return res.status(404).json({ message: "Foyer introuvable." });
            }

            if (foyerStats.occupied >= foyerStats.capacite) {
                return res.status(400).json({
                    message: "La capacité maximale du foyer est atteinte.",
                });
            }
        }

        if (normalized.data.type === "nouvelle") {
            const existingActiveResident = await residentModel.findActiveResidentByMatricule(
                normalized.data.matricule,
                { includeQuitteeHistory: BLOCK_DUPLICATE_MATRICULE_FOR_QUITTEE_HISTORY }
            );
            if (existingActiveResident) {
                return res.status(400).json({
                    message: "Ce matricule existe déjà pour une résidente active.",
                });
            }
        }

        const resident = await residentModel.createResident(normalized.data);
        return res.status(201).json(resident || { message: "Resident ajoute" });
    } catch (err) {
        console.error("CREATE RESIDENT ERROR:", err);
        return res.status(500).json({
            message: "Erreur serveur lors de la creation du resident.",
            error: err.message,
        });
    }
}

async function updateResident(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid resident id" });
        }

        const ageError = validateResidentAge(req.body?.age);
        if (ageError) {
            return res.status(400).json({ message: ageError });
        }

        const normalized = normalizeResidentPayload(req.body, { defaultType: "nouvelle" });
        if (normalized.error) {
            return res.status(400).json({ message: normalized.error });
        }
        if (!normalized.data.foyer_id) {
            return res.status(400).json({ message: "foyer_id is required" });
        }

        const result = await residentModel.updateResident(id, normalized.data);
        if (!result.rowsAffected) {
            return res.status(404).json({ message: "Resident not found" });
        }

        return res.json(result.resident || { message: "Resident modifie" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur lors de la mise a jour du resident." });
    }
}

async function deleteResident(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid resident id" });
        }

        const deletedCount = await residentModel.deleteResident(id);
        if (!deletedCount) {
            return res.status(404).json({ message: "Resident not found" });
        }

        return res.json({ message: "Resident supprime" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur lors de la suppression du resident." });
    }
}

module.exports = {
    getResidentsByFoyerId,
    createResident,
    updateResident,
    deleteResident,
};
