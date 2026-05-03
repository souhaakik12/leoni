const sql = require("mssql");
const config = require("../../config");

const CANAL_CANDIDAT = "Candidat";
const ETAPE_CANDIDAT = "CANDIDAT";
const STATUT_NOUVEAU = "Nouveau";
const TYPE_CANDIDATURE = "NOUVEAU";
const CONTRACT_TYPES_SIX_MONTHS = new Set(["CDI", "2CDI", "CDI SANS ESSAI", "CDD"]);
const CONTRACT_TYPES_TWELVE_MONTHS = new Set(["CAIP", "CIVP", "SIVP"]);

class CandidatContractError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "CandidatContractError";
        this.status = status;
    }
}

function normalizeContractType(value) {
    const normalized = String(value ?? "").trim().toUpperCase();
    if (!normalized || normalized === "NON RENSEIGNE") {
        return "";
    }
    const normalizedSpaces = normalized.replace(/\s+/g, " ");
    return [
        "CDD",
        "CAIP",
        "CIVP",
        "SIVP",
        "CDI",
        "CDI SANS ESSAI",
        "2CDI",
    ].includes(normalizedSpaces)
        ? normalizedSpaces
        : "";
}

function computeContractEndDate(startDate, typeContrat) {
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
        return null;
    }

    const dateFin = new Date(startDate);
    if (CONTRACT_TYPES_TWELVE_MONTHS.has(typeContrat)) {
        dateFin.setMonth(dateFin.getMonth() + 12);
        return dateFin;
    }

    if (CONTRACT_TYPES_SIX_MONTHS.has(typeContrat)) {
        dateFin.setMonth(dateFin.getMonth() + 6);
        return dateFin;
    }

    dateFin.setMonth(dateFin.getMonth() + 6);
    return dateFin;
}

function toBooleanFlag(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return ["1", "true", "oui", "yes"].includes(normalized);
    }
    return false;
}

async function findCandidatByCin(cin) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("cin", sql.VarChar, cin)
        .query(`
            SELECT TOP 1 id, cin
            FROM dbo.candidats
            WHERE cin = @cin;
        `);

    return result.recordset?.[0] || null;
}

async function getCandidateSchema(pool) {
    const schemaResult = await pool.request().query(`
        SELECT
            CASE WHEN COL_LENGTH('dbo.candidats', 'age') IS NULL THEN 0 ELSE 1 END AS has_age,
            CASE WHEN COL_LENGTH('dbo.candidats', 'niveau_scolaire') IS NULL THEN 0 ELSE 1 END AS has_niveau_scolaire,
            CASE WHEN COL_LENGTH('dbo.candidats', 'adresse') IS NULL THEN 0 ELSE 1 END AS has_adresse,
            CASE WHEN COL_LENGTH('dbo.candidats', 'canal') IS NULL THEN 0 ELSE 1 END AS has_canal,
            CASE WHEN COL_LENGTH('dbo.candidats', 'etape') IS NULL THEN 0 ELSE 1 END AS has_etape,
            CASE WHEN COL_LENGTH('dbo.candidats', 'statut') IS NULL THEN 0 ELSE 1 END AS has_statut,
            CASE WHEN COL_LENGTH('dbo.candidats', 'type_candidature') IS NULL THEN 0 ELSE 1 END AS has_type_candidature,
            CASE WHEN COL_LENGTH('dbo.candidats', 'created_at') IS NULL THEN 0 ELSE 1 END AS has_created_at;
    `);

    return schemaResult.recordset?.[0] || {};
}

async function createCandidat(data) {
    const pool = await sql.connect(config);
    const schema = await getCandidateSchema(pool);
    const columns = ["nom", "cin", "telephone", "poste", "genre"];
    const values = ["@nom", "@cin", "@telephone", "@poste", "@genre"];

    const request = pool.request()
        .input("nom", sql.VarChar, data.nom)
        .input("cin", sql.VarChar, data.cin)
        .input("telephone", sql.VarChar, data.telephone)
        .input("poste", sql.VarChar, data.poste)
        .input("genre", sql.NVarChar(20), data.genre);

    if (schema.has_age) {
        columns.push("age");
        values.push("@age");
        request.input("age", sql.Int, data.age);
    }

    if (schema.has_niveau_scolaire) {
        columns.push("niveau_scolaire");
        values.push("@niveau_scolaire");
        request.input("niveau_scolaire", sql.VarChar, data.niveau_scolaire);
    }

    if (schema.has_adresse) {
        columns.push("adresse");
        values.push("@adresse");
        request.input("adresse", sql.VarChar, data.adresse);
    }

    if (schema.has_canal) {
        columns.push("canal");
        values.push("@canal");
        request.input("canal", sql.VarChar, CANAL_CANDIDAT);
    }

    if (schema.has_etape) {
        columns.push("etape");
        values.push("@etape");
        request.input("etape", sql.VarChar, ETAPE_CANDIDAT);
    }

    if (schema.has_statut) {
        columns.push("statut");
        values.push("@statut");
        request.input("statut", sql.VarChar, STATUT_NOUVEAU);
    }

    if (schema.has_type_candidature) {
        columns.push("type_candidature");
        values.push("@type_candidature");
        request.input("type_candidature", sql.VarChar, TYPE_CANDIDATURE);
    }

    if (schema.has_created_at) {
        columns.push("created_at");
        values.push("GETDATE()");
    }

    const query = `
        INSERT INTO dbo.candidats (${columns.join(", ")})
        VALUES (${values.join(", ")});

        SELECT *
        FROM dbo.candidats
        WHERE id = SCOPE_IDENTITY();
    `;

    const result = await request.query(query);
    return result.recordset?.[0] || null;
}

async function updateCandidat(id, data) {
    const pool = await sql.connect(config);
    const schema = await getCandidateSchema(pool);
    const setClauses = [
        "nom = @nom",
        "cin = @cin",
        "telephone = @telephone",
        "poste = @poste",
    ];

    const request = pool.request()
        .input("id", sql.Int, id)
        .input("nom", sql.VarChar, data.nom)
        .input("cin", sql.VarChar, data.cin)
        .input("telephone", sql.VarChar, data.telephone)
        .input("poste", sql.VarChar, data.poste);

    if (schema.has_age) {
        setClauses.push("age = @age");
        request.input("age", sql.Int, data.age);
    }

    if (schema.has_niveau_scolaire) {
        setClauses.push("niveau_scolaire = @niveau_scolaire");
        request.input("niveau_scolaire", sql.VarChar, data.niveau_scolaire);
    }

    if (schema.has_adresse) {
        setClauses.push("adresse = @adresse");
        request.input("adresse", sql.VarChar, data.adresse);
    }

    if (Object.prototype.hasOwnProperty.call(data, "genre")) {
        setClauses.push("genre = @genre");
        request.input("genre", sql.NVarChar(20), data.genre);
    }

    const query = `
        UPDATE dbo.candidats
        SET ${setClauses.join(", ")}
        WHERE id = @id;

        SELECT *
        FROM dbo.candidats
        WHERE id = @id;
    `;

    const result = await request.query(query);
    return result.recordset?.[0] || null;
}

async function deleteCandidat(id) {
    const normalizedId = Number(id);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        throw new CandidatContractError("Identifiant candidat invalide.", 400);
    }

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const candidatResult = await transaction.request()
            .input("id", sql.Int, normalizedId)
            .query(`
                SELECT TOP 1
                    id
                FROM dbo.candidats
                WHERE id = @id;
            `);

        const candidat = candidatResult.recordset?.[0] || null;
        if (!candidat) {
            await transaction.rollback();
            return { deleted: false, notFound: true };
        }

        const contractGuardResult = await transaction.request()
            .input("id", sql.Int, normalizedId)
            .query(`
                DECLARE @hasSignedContract BIT = 0;

                IF COL_LENGTH('dbo.candidats', 'contrat_signe') IS NOT NULL
                   AND EXISTS (
                       SELECT 1
                       FROM dbo.candidats
                       WHERE id = @id
                         AND ISNULL(contrat_signe, 0) = 1
                   )
                BEGIN
                    SET @hasSignedContract = 1;
                END

                IF @hasSignedContract = 0
                   AND OBJECT_ID('dbo.contrats', 'U') IS NOT NULL
                   AND EXISTS (
                       SELECT 1
                       FROM dbo.contrats
                       WHERE candidat_id = @id
                   )
                BEGIN
                    SET @hasSignedContract = 1;
                END

                SELECT @hasSignedContract AS has_signed_contract;
            `);

        if (Boolean(contractGuardResult.recordset?.[0]?.has_signed_contract)) {
            throw new CandidatContractError(
                "Ce candidat est deja lie a un contrat signe. Suppression impossible.",
                409
            );
        }

        await transaction.request()
            .input("id", sql.Int, normalizedId)
            .query(`
                IF OBJECT_ID('dbo.documents', 'U') IS NOT NULL
                   AND OBJECT_ID('dbo.dossiers', 'U') IS NOT NULL
                BEGIN
                    DELETE d
                    FROM dbo.documents d
                    INNER JOIN dbo.dossiers dos ON d.dossier_id = dos.id
                    WHERE dos.candidat_id = @id;
                END

                IF OBJECT_ID('dbo.dossiers', 'U') IS NOT NULL
                BEGIN
                    DELETE FROM dbo.dossiers
                    WHERE candidat_id = @id;
                END

                IF OBJECT_ID('dbo.test_entretien', 'U') IS NOT NULL
                BEGIN
                    DELETE FROM dbo.test_entretien
                    WHERE candidat_id = @id;
                END

                IF OBJECT_ID('dbo.SeanceContratCandidat', 'U') IS NOT NULL
                BEGIN
                    DELETE FROM dbo.SeanceContratCandidat
                    WHERE candidat_id = @id;
                END

                DELETE FROM dbo.candidats
                WHERE id = @id;
            `);

        await transaction.commit();
        return { deleted: true, notFound: false };
    } catch (error) {
        try {
            if (!transaction._aborted) {
                await transaction.rollback();
            }
        } catch (rollbackError) {
            console.error("Rollback deleteCandidat:", rollbackError);
        }
        throw error;
    }
}

async function signerContratCandidat(candidatId, typeContrat) {
    const normalizedCandidateId = Number(candidatId);
    const normalizedTypeContrat = normalizeContractType(typeContrat);

    if (!Number.isInteger(normalizedCandidateId) || normalizedCandidateId <= 0) {
        throw new CandidatContractError("Identifiant candidat invalide.", 400);
    }

    if (!normalizedTypeContrat) {
        throw new CandidatContractError("Veuillez selectionner un type de contrat valide avant de signer.", 400);
    }

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const candidatResult = await transaction.request()
            .input("id", sql.Int, normalizedCandidateId)
            .query(`
                SELECT TOP 1
                    id,
                    nom,
                    cin,
                    type_contrat,
                    contrat_signe,
                    dossier_valide,
                    date_signature,
                    statut_contrat,
                    etape,
                    statut
                FROM dbo.candidats
                WHERE id = @id;
            `);

        const candidat = candidatResult.recordset?.[0] || null;
        if (!candidat) {
            throw new CandidatContractError("Candidat introuvable.", 404);
        }

        const activeContractResult = await transaction.request()
            .input("candidat_id", sql.Int, normalizedCandidateId)
            .query(`
                SELECT TOP 1
                    id
                FROM dbo.contrats
                WHERE candidat_id = @candidat_id
                  AND UPPER(LTRIM(RTRIM(ISNULL(statut_contrat, '')))) = 'ACTIF'
                ORDER BY id DESC;
            `);

        if (activeContractResult.recordset?.[0]?.id) {
            throw new CandidatContractError("Ce candidat possede deja un contrat actif.", 409);
        }

        const now = new Date();
        const dateDebut = new Date(now);
        const dateFin = computeContractEndDate(dateDebut, normalizedTypeContrat);
        const dossierValide = toBooleanFlag(candidat.dossier_valide);
        const finalise = dossierValide;
        const nextEtape = finalise ? "NOUVEAU_RECRUTE" : candidat.etape;
        const nextStatut = finalise ? "CONTRAT_FINALISE" : candidat.statut;

        const candidatUpdateResult = await transaction.request()
            .input("id", sql.Int, normalizedCandidateId)
            .input("type_contrat", sql.VarChar(30), normalizedTypeContrat)
            .input("date_signature", sql.DateTime, now)
            .input("statut_contrat", sql.VarChar(20), "SIGNE")
            .input("etape", sql.VarChar(50), nextEtape || null)
            .input("statut", sql.VarChar(80), nextStatut || null)
            .query(`
                UPDATE dbo.candidats
                SET contrat_signe = 1,
                    type_contrat = @type_contrat,
                    date_signature = @date_signature,
                    statut_contrat = @statut_contrat,
                    etape = @etape,
                    statut = @statut
                OUTPUT
                    INSERTED.id,
                    INSERTED.contrat_signe,
                    INSERTED.dossier_valide,
                    INSERTED.type_contrat,
                    INSERTED.date_signature,
                    INSERTED.statut_contrat,
                    INSERTED.etape,
                    INSERTED.statut
                WHERE id = @id;
            `);

        const updatedCandidat = candidatUpdateResult.recordset?.[0] || null;
        if (!updatedCandidat) {
            throw new CandidatContractError("Mise a jour du candidat impossible.", 500);
        }

        const contratInsertResult = await transaction.request()
            .input("candidat_id", sql.Int, normalizedCandidateId)
            .input("type_contrat", sql.VarChar(30), normalizedTypeContrat)
            .input("date_signature", sql.DateTime, now)
            .input("date_debut", sql.DateTime, dateDebut)
            .input("date_fin", sql.DateTime, dateFin)
            .input("statut_contrat", sql.VarChar(20), "ACTIF")
            .query(`
                INSERT INTO dbo.contrats (
                    candidat_id,
                    type_contrat,
                    date_signature,
                    date_debut,
                    date_fin,
                    statut_contrat,
                    contrat_parent_id,
                    date_creation
                )
                OUTPUT INSERTED.id
                VALUES (
                    @candidat_id,
                    @type_contrat,
                    @date_signature,
                    @date_debut,
                    @date_fin,
                    @statut_contrat,
                    NULL,
                    GETDATE()
                );
            `);

        await transaction.commit();

        return {
            candidat_id: normalizedCandidateId,
            contrat_id: contratInsertResult.recordset?.[0]?.id || null,
            contrat_signe: true,
            dossier_valide: toBooleanFlag(updatedCandidat.dossier_valide),
            type_contrat: normalizedTypeContrat,
            date_signature: updatedCandidat.date_signature || now,
            date_debut: dateDebut,
            date_fin: dateFin,
            statut_contrat: "ACTIF",
            etape: updatedCandidat.etape || nextEtape || null,
            statut: updatedCandidat.statut || nextStatut || null,
            finalise,
            contract_inserted: true,
            duplicate_prevented: false,
        };
    } catch (error) {
        try {
            if (!transaction._aborted) {
                await transaction.rollback();
            }
        } catch (rollbackError) {
            console.error("Rollback signerContratCandidat:", rollbackError);
        }
        throw error;
    }
}

module.exports = {
    createCandidat,
    updateCandidat,
    deleteCandidat,
    findCandidatByCin,
    signerContratCandidat,
    CandidatContractError,
    CANAL_CANDIDAT,
    ETAPE_CANDIDAT,
    STATUT_NOUVEAU,
};
