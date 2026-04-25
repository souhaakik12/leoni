const sql = require("mssql");
const config = require("../../config");

const DOSSIER_STATUS_EN_COURS = "EN_COURS";
const DOCUMENT_STATUS_ENREGISTRE = "ENREGISTRE";

function toPositiveInt(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeDocumentName(value) {
    const normalized = String(value ?? "").trim();
    return normalized.length > 0 ? normalized : null;
}

async function getCandidateById(pool, candidatId) {
    const result = await pool.request()
        .input("candidat_id", sql.Int, candidatId)
        .query(`
            SELECT TOP 1 id
            FROM dbo.candidats
            WHERE id = @candidat_id;
        `);

    return result.recordset?.[0] || null;
}

exports.registerDocument = async (req, res) => {
    const candidatId = toPositiveInt(req.body?.candidat_id);
    const documentName = normalizeDocumentName(req.body?.document_name);

    if (!candidatId) {
        return res.status(400).json({ message: "candidat_id invalide." });
    }
    if (!documentName) {
        return res.status(400).json({ message: "document_name est obligatoire." });
    }

    let pool;
    let transaction;

    try {
        pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const candidate = await getCandidateById(transaction, candidatId);
        if (!candidate) {
            await transaction.rollback();
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        const dossierResult = await transaction.request()
            .input("candidat_id", sql.Int, candidatId)
            .query(`
                SELECT TOP 1 id
                FROM dbo.dossiers WITH (UPDLOCK, HOLDLOCK)
                WHERE candidat_id = @candidat_id
                ORDER BY date_creation DESC, id DESC;
            `);

        let dossierId = Number(dossierResult.recordset?.[0]?.id || 0);
        if (!Number.isInteger(dossierId) || dossierId <= 0) {
            const createDossierResult = await transaction.request()
                .input("candidat_id", sql.Int, candidatId)
                .input("statut_dossier", sql.VarChar(50), DOSSIER_STATUS_EN_COURS)
                .query(`
                    INSERT INTO dbo.dossiers (candidat_id, statut_dossier, date_creation)
                    OUTPUT INSERTED.id
                    VALUES (@candidat_id, @statut_dossier, GETDATE());
                `);

            dossierId = Number(createDossierResult.recordset?.[0]?.id || 0);
            if (!Number.isInteger(dossierId) || dossierId <= 0) {
                throw new Error("Creation dossier impossible.");
            }
        }

        const typeResult = await transaction.request()
            .input("document_name", sql.NVarChar(255), documentName)
            .query(`
                SELECT TOP 1 id, nom
                FROM dbo.types_documents
                WHERE LOWER(LTRIM(RTRIM(nom))) = LOWER(@document_name)
                   OR LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(nom)), '''', ''), NCHAR(8217), ''), ' ', ''))
                    = LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(@document_name)), '''', ''), NCHAR(8217), ''), ' ', ''));
            `);

        const typeDocument = typeResult.recordset?.[0] || null;
        if (!typeDocument) {
            await transaction.rollback();
            return res.status(404).json({ message: `Type document introuvable: ${documentName}` });
        }

        const typeDocumentId = Number(typeDocument.id);
        const existingResult = await transaction.request()
            .input("dossier_id", sql.Int, dossierId)
            .input("type_document_id", sql.Int, typeDocumentId)
            .query(`
                SELECT TOP 1 id, statut, date_upload
                FROM dbo.documents WITH (UPDLOCK, HOLDLOCK)
                WHERE dossier_id = @dossier_id
                  AND type_document_id = @type_document_id
                ORDER BY date_upload DESC, id DESC;
            `);

        const existingDocument = existingResult.recordset?.[0] || null;
        let persistedDocument = null;
        let alreadyRegistered = false;

        if (existingDocument) {
            alreadyRegistered = true;
            const normalizeExistingStatus = String(existingDocument.statut || "").trim().toUpperCase();

            if (normalizeExistingStatus !== DOCUMENT_STATUS_ENREGISTRE) {
                const updateExistingResult = await transaction.request()
                    .input("document_id", sql.Int, Number(existingDocument.id))
                    .input("status", sql.VarChar(30), DOCUMENT_STATUS_ENREGISTRE)
                    .query(`
                        UPDATE dbo.documents
                        SET statut = @status
                        OUTPUT INSERTED.id, INSERTED.statut, INSERTED.date_upload
                        WHERE id = @document_id;
                    `);

                persistedDocument = updateExistingResult.recordset?.[0] || existingDocument;
            } else {
                persistedDocument = existingDocument;
            }
        } else {
            const insertDocumentResult = await transaction.request()
                .input("dossier_id", sql.Int, dossierId)
                .input("type_document_id", sql.Int, typeDocumentId)
                .input("status", sql.VarChar(30), DOCUMENT_STATUS_ENREGISTRE)
                .query(`
                    INSERT INTO dbo.documents
                    (
                        dossier_id,
                        type_document_id,
                        statut,
                        fichier,
                        date_upload
                    )
                    OUTPUT INSERTED.id, INSERTED.statut, INSERTED.date_upload
                    VALUES
                    (
                        @dossier_id,
                        @type_document_id,
                        @status,
                        NULL,
                        GETDATE()
                    );
                `);

            persistedDocument = insertDocumentResult.recordset?.[0] || null;
        }

        await transaction.commit();

        return res.status(alreadyRegistered ? 200 : 201).json({
            ok: true,
            candidat_id: candidatId,
            dossier_id: dossierId,
            document_id: Number(persistedDocument?.id || existingDocument?.id || 0),
            type_document_id: typeDocumentId,
            document_name: typeDocument.nom || documentName,
            statut: DOCUMENT_STATUS_ENREGISTRE,
            alreadyExists: alreadyRegistered,
            already_registered: alreadyRegistered,
            message: alreadyRegistered
                ? "Document deja enregistre."
                : "Document enregistre avec succes.",
        });
    } catch (err) {
        try {
            if (transaction && transaction._aborted !== true) {
                await transaction.rollback();
            }
        } catch (rollbackErr) {
            console.error("Rollback registerDocument:", rollbackErr);
        }
        console.error(err);
        return res.status(500).json({ message: "Enregistrement document impossible." });
    }
};

exports.getRegisteredDocumentsByCandidate = async (req, res) => {
    const candidatId = toPositiveInt(req.params.candidatId);
    if (!candidatId) {
        return res.status(400).json({ message: "candidatId invalide." });
    }

    try {
        const pool = await sql.connect(config);

        const candidate = await getCandidateById(pool, candidatId);
        if (!candidate) {
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        const result = await pool.request()
            .input("candidat_id", sql.Int, candidatId)
            .query(`
                WITH RankedDocuments AS (
                    SELECT
                        d.id AS document_id,
                        d.dossier_id,
                        td.id AS type_document_id,
                        td.nom AS document_name,
                        d.statut,
                        d.date_upload,
                        ROW_NUMBER() OVER (
                            PARTITION BY LOWER(LTRIM(RTRIM(td.nom)))
                            ORDER BY d.date_upload DESC, d.id DESC
                        ) AS rn
                    FROM dbo.dossiers ds
                    INNER JOIN dbo.documents d ON d.dossier_id = ds.id
                    INNER JOIN dbo.types_documents td ON td.id = d.type_document_id
                    WHERE ds.candidat_id = @candidat_id
                )
                SELECT
                    document_id,
                    dossier_id,
                    type_document_id,
                    document_name,
                    statut,
                    date_upload
                FROM RankedDocuments
                WHERE rn = 1
                ORDER BY document_name ASC;
            `);

        const documents = result.recordset || [];
        const registeredNames = documents
            .map((doc) => String(doc.document_name || "").trim())
            .filter((name) => name.length > 0);

        return res.json({
            ok: true,
            candidat_id: candidatId,
            documents,
            registered_document_names: registeredNames,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Chargement des documents impossible." });
    }
};
