const sql = require("mssql");
const config = require("../../config");

const ALLOWED_ETAPES = new Set(["DOSSIER_CONTRAT", "CONTRAT_A_SIGNER"]);

class DocumentContratError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "DocumentContratError";
        this.status = status;
    }
}

function toPositiveInt(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFamilyStatus(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function isMarriedStatus(value) {
    const normalized = normalizeFamilyStatus(value);
    if (!normalized || normalized.includes("non marie")) return false;
    return normalized.includes("marie");
}

async function getCandidateContext(pool, candidatId) {
    const result = await pool.request()
        .input("candidat_id", sql.Int, candidatId)
        .query(`
            SELECT TOP 1
                id,
                UPPER(LTRIM(RTRIM(ISNULL(etape, '')))) AS etape,
                situation_familiale
            FROM dbo.candidats
            WHERE id = @candidat_id;
        `);

    const candidate = result.recordset?.[0] || null;
    if (!candidate) {
        throw new DocumentContratError("Candidat introuvable.", 404);
    }

    if (!ALLOWED_ETAPES.has(candidate.etape)) {
        throw new DocumentContratError(
            "Les documents contrat sont disponibles seulement pour les candidats en dossier contrat ou contrat a signer.",
            409
        );
    }

    return {
        id: Number(candidate.id),
        etape: candidate.etape,
        isMarried: isMarriedStatus(candidate.situation_familiale),
    };
}

async function ensureEligibleTypeDocument(pool, typeDocumentId, isMarried) {
    const result = await pool.request()
        .input("type_document_id", sql.Int, typeDocumentId)
        .input("is_married", sql.Bit, isMarried ? 1 : 0)
        .query(`
            SELECT TOP 1
                id
            FROM dbo.types_documents_contrat
            WHERE id = @type_document_id
              AND ISNULL(actif, 1) = 1
              AND (ISNULL(familial, 0) = 0 OR @is_married = 1);
        `);

    if (!result.recordset?.[0]) {
        throw new DocumentContratError("Document contrat introuvable ou indisponible pour ce candidat.", 404);
    }
}

async function getDocumentsByCandidatId(candidatId) {
    const normalizedCandidatId = toPositiveInt(candidatId);
    if (!normalizedCandidatId) {
        throw new DocumentContratError("candidatId invalide.", 400);
    }

    const pool = await sql.connect(config);
    const candidate = await getCandidateContext(pool, normalizedCandidatId);

    const result = await pool.request()
        .input("candidat_id", sql.Int, normalizedCandidatId)
        .input("is_married", sql.Bit, candidate.isMarried ? 1 : 0)
        .query(`
            SELECT
                td.id AS type_document_id,
                td.code_document,
                td.libelle AS document,
                CAST(ISNULL(td.familial, 0) AS bit) AS familial,
                CAST(ISNULL(cdc.est_recu, 0) AS bit) AS est_recu,
                CASE
                    WHEN ISNULL(cdc.est_recu, 0) = 1 THEN 'Recu'
                    ELSE 'Manquant'
                END AS statut_document,
                cdc.date_reception
            FROM (
                SELECT
                    @candidat_id AS candidat_id,
                    @is_married AS is_married
            ) AS c
            CROSS JOIN dbo.types_documents_contrat td
            LEFT JOIN dbo.candidat_documents_contrat cdc
                ON cdc.candidat_id = c.candidat_id
               AND cdc.type_document_id = td.id
            WHERE ISNULL(td.actif, 1) = 1
              AND (ISNULL(td.familial, 0) = 0 OR c.is_married = 1)
            ORDER BY
                CASE WHEN td.ordre IS NULL THEN 1 ELSE 0 END,
                td.ordre ASC,
                td.id ASC;
        `);

    return result.recordset || [];
}

async function markDocumentReceived(candidatId, typeDocumentId) {
    const normalizedCandidatId = toPositiveInt(candidatId);
    const normalizedTypeDocumentId = toPositiveInt(typeDocumentId);

    if (!normalizedCandidatId) {
        throw new DocumentContratError("candidatId invalide.", 400);
    }
    if (!normalizedTypeDocumentId) {
        throw new DocumentContratError("documentId invalide.", 400);
    }

    const pool = await sql.connect(config);
    const candidate = await getCandidateContext(pool, normalizedCandidatId);
    await ensureEligibleTypeDocument(pool, normalizedTypeDocumentId, candidate.isMarried);

    await pool.request()
        .input("candidat_id", sql.Int, normalizedCandidatId)
        .input("type_document_id", sql.Int, normalizedTypeDocumentId)
        .query(`
            MERGE dbo.candidat_documents_contrat WITH (HOLDLOCK) AS target
            USING (
                SELECT
                    @candidat_id AS candidat_id,
                    @type_document_id AS type_document_id
            ) AS source
            ON target.candidat_id = source.candidat_id
               AND target.type_document_id = source.type_document_id
            WHEN MATCHED THEN
                UPDATE SET
                    est_recu = 1,
                    date_reception = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (candidat_id, type_document_id, est_recu, date_reception, date_creation)
                VALUES (source.candidat_id, source.type_document_id, 1, GETDATE(), GETDATE());
        `);
}

async function markDocumentMissing(candidatId, typeDocumentId) {
    const normalizedCandidatId = toPositiveInt(candidatId);
    const normalizedTypeDocumentId = toPositiveInt(typeDocumentId);

    if (!normalizedCandidatId) {
        throw new DocumentContratError("candidatId invalide.", 400);
    }
    if (!normalizedTypeDocumentId) {
        throw new DocumentContratError("documentId invalide.", 400);
    }

    const pool = await sql.connect(config);
    const candidate = await getCandidateContext(pool, normalizedCandidatId);
    await ensureEligibleTypeDocument(pool, normalizedTypeDocumentId, candidate.isMarried);

    await pool.request()
        .input("candidat_id", sql.Int, normalizedCandidatId)
        .input("type_document_id", sql.Int, normalizedTypeDocumentId)
        .query(`
            MERGE dbo.candidat_documents_contrat WITH (HOLDLOCK) AS target
            USING (
                SELECT
                    @candidat_id AS candidat_id,
                    @type_document_id AS type_document_id
            ) AS source
            ON target.candidat_id = source.candidat_id
               AND target.type_document_id = source.type_document_id
            WHEN MATCHED THEN
                UPDATE SET
                    est_recu = 0,
                    date_reception = NULL
            WHEN NOT MATCHED THEN
                INSERT (candidat_id, type_document_id, est_recu, date_reception, date_creation)
                VALUES (source.candidat_id, source.type_document_id, 0, NULL, GETDATE());
        `);
}

module.exports = {
    DocumentContratError,
    getDocumentsByCandidatId,
    markDocumentReceived,
    markDocumentMissing,
};
