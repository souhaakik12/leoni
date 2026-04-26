const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const candidatRoutes = require("./src/routes/candidatRoutes");
const documentContratRoutes = require("./src/routes/documentContratRoutes");
const seanceContratRoutes = require("./src/routes/seanceContratRoutes");
const testEntretienRoutes = require("./src/routes/testEntretienRoutes");
const referenceRoutes = require("./src/routes/referenceRoutes");
const documentRoutes = require("./src/routes/documentRoutes");
const authRoutes = require("./src/routes/authRoutes");
const utilisateurRoutes = require("./src/routes/utilisateurRoutes");
const foyerRoutes = require("./routes/foyerRoutes");
const residentRoutes = require("./routes/residentRoutes");
const {
    CONTRACT_ALLOWED_ROLES,
    attachRequestUser,
    requireRole,
} = require("./src/middleware/roleMiddleware");

const app = express();
console.log("[BOOT] candidatRoutes import charge :", typeof candidatRoutes);
app.use(cors());
app.use(express.json());
app.use(attachRequestUser);
app.use("/api/candidats", (req, _res, next) => {
    console.log(`[DEBUG server] ${req.method} ${req.originalUrl}`);
    next();
});
console.log("[BOOT] montage des routes /api/candidats");
app.use("/api/candidats", candidatRoutes);
app.use("/api/candidats", documentContratRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/utilisateurs", utilisateurRoutes);
app.use("/api/seances-contrat", requireRole(CONTRACT_ALLOWED_ROLES));
app.use("/api/seances-contrat", seanceContratRoutes);
app.use("/api/test-entretien", testEntretienRoutes);
app.use("/api/references", referenceRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api", foyerRoutes);
app.use("/api", residentRoutes);

app.get("/api/contracts/import", requireRole(CONTRACT_ALLOWED_ROLES), async (_req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT
                TOP 500
                id_contrat,
                matricule,
                nom_prenom,
                genre,
                type_contrat,
                date_debut_contrat,
                date_fin_contrat,
                fonction,
                date_entree,
                site,
                projet,
                responsable
            FROM dbo.vw_contrats_page
            ORDER BY
                CASE WHEN date_debut_contrat IS NULL THEN 1 ELSE 0 END,
                date_debut_contrat DESC;
        `);

        return res.json(result.recordset || []);
    } catch (err) {
        console.error("Erreur /api/contracts/import :", err);
        return res.status(500).json({ message: "Impossible de charger les contrats." });
    }
});

const config = {
    user: "sa",
    password: "1292003",
    server: "localhost",
    port: 1433,
    database: "GestionRecrutement",
    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

const CONTRACT_TYPES = ["CDI", "CAIP", "CIVP", "CDI SANS ESSAI", "SIVP"];
const CONTRACT_WORKFLOW_STATUS = {
    WAITING_SESSION: "en_attente_seance",
    WAITING_DOSSIER: "en_attente_dossier",
    SIGNED: "contrat_signe",
};
const CONTRACT_WORKFLOW_STATUS_ALIASES = {
    en_attente_seance: CONTRACT_WORKFLOW_STATUS.WAITING_SESSION,
    seance_contrat: CONTRACT_WORKFLOW_STATUS.WAITING_SESSION,
    en_attente_dossier: CONTRACT_WORKFLOW_STATUS.WAITING_DOSSIER,
    dossier_contrat: CONTRACT_WORKFLOW_STATUS.WAITING_DOSSIER,
    contrat_signe: CONTRACT_WORKFLOW_STATUS.SIGNED,
};
const SEANCE_WORKFLOW_STATUS = {
    IN_PROGRESS: "en_cours",
    COMPLETED: "terminee",
};

function toPositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
}

function normalizeContractType(value) {
    const normalized = String(value ?? "").trim().toUpperCase();
    return CONTRACT_TYPES.includes(normalized) ? normalized : null;
}

function normalizeContractWorkflowStatus(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return CONTRACT_WORKFLOW_STATUS_ALIASES[normalized] || null;
}

function normalizeSeanceWorkflowStatus(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    const values = Object.values(SEANCE_WORKFLOW_STATUS);
    return values.includes(normalized) ? normalized : null;
}

function isValidSqlDate(value) {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
}

function isValidHourFormat(value) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value ?? "").trim());
}

async function ensureContractWorkflowSchema() {
    const pool = await sql.connect(config);
    await pool.request().query(`
        IF OBJECT_ID('dbo.SeanceContrat', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.SeanceContrat (
                id INT IDENTITY(1,1) PRIMARY KEY,
                date DATE NOT NULL,
                heure VARCHAR(5) NOT NULL,
                responsable_id INT NOT NULL,
                statut_seance VARCHAR(20) NOT NULL DEFAULT 'en_cours',
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
            );
        END;

        IF OBJECT_ID('dbo.SeanceContrat', 'U') IS NOT NULL AND COL_LENGTH('dbo.SeanceContrat', 'statut_seance') IS NULL
        BEGIN
            ALTER TABLE dbo.SeanceContrat
            ADD statut_seance VARCHAR(20) NOT NULL DEFAULT 'en_cours' WITH VALUES;
        END;

        IF OBJECT_ID('dbo.SeanceContratCandidat', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.SeanceContratCandidat (
                seance_id INT NOT NULL,
                candidat_id INT NOT NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                CONSTRAINT PK_SeanceContratCandidat PRIMARY KEY (seance_id, candidat_id),
                CONSTRAINT FK_SeanceContratCandidat_Seance
                    FOREIGN KEY (seance_id) REFERENCES dbo.SeanceContrat(id) ON DELETE CASCADE
            );
        END;

        IF OBJECT_ID('dbo.Candidat', 'U') IS NOT NULL AND COL_LENGTH('dbo.Candidat', 'type_contrat') IS NULL
        BEGIN
            ALTER TABLE dbo.Candidat ADD type_contrat VARCHAR(30) NULL;
        END;

        IF OBJECT_ID('dbo.Candidat', 'U') IS NOT NULL AND COL_LENGTH('dbo.Candidat', 'type_contrat') < 30
        BEGIN
            ALTER TABLE dbo.Candidat ALTER COLUMN type_contrat VARCHAR(30) NULL;
        END;

        IF OBJECT_ID('dbo.Candidat', 'U') IS NOT NULL AND COL_LENGTH('dbo.Candidat', 'statut_contrat') IS NULL
        BEGIN
            ALTER TABLE dbo.Candidat ADD statut_contrat VARCHAR(40) NULL;
        END;

        IF OBJECT_ID('dbo.SeanceContratCandidat', 'U') IS NOT NULL
           AND OBJECT_ID('dbo.Candidat', 'U') IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_SeanceContratCandidat_Candidat')
        BEGIN
            ALTER TABLE dbo.SeanceContratCandidat WITH CHECK
            ADD CONSTRAINT FK_SeanceContratCandidat_Candidat
                FOREIGN KEY (candidat_id) REFERENCES dbo.Candidat(id);
        END;
    `);
}

async function hasCandidatTable() {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
        SELECT CASE WHEN OBJECT_ID('dbo.Candidat', 'U') IS NULL THEN 0 ELSE 1 END AS has_table;
    `);
    return Boolean(result.recordset?.[0]?.has_table);
}

// route test
app.get("/", (req, res) => {
    res.send("Backend fonctionne !");
});

// âœ… route employes
app.get("/employes", async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query("SELECT * FROM Employe");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get("/api/seances-contrat", async (req, res) => {
    try {
        await ensureContractWorkflowSchema();
        const pool = await sql.connect(config);
        const seancesResult = await pool.request().query(`
            SELECT
                s.id,
                s.date,
                s.heure,
                s.responsable_id,
                ISNULL(s.statut_seance, '${SEANCE_WORKFLOW_STATUS.IN_PROGRESS}') AS statut_seance,
                ISNULL(s.nb_presents, 0) AS nb_presents,
                ISNULL(s.nb_absents, 0) AS nb_absents,
                s.date_cloture
            FROM dbo.SeanceContrat s
            ORDER BY s.date DESC, s.heure DESC, s.id DESC;
        `);
        const relationsResult = await pool.request().query(`
            SELECT seance_id, candidat_id
            FROM dbo.SeanceContratCandidat
            ORDER BY seance_id DESC, candidat_id ASC;
        `);
        res.json({
            seances: seancesResult.recordset || [],
            relations: relationsResult.recordset || [],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Impossible de charger les seances contrat." });
    }
});

app.get("/api/seances-contrat/:id/candidats", async (req, res) => {
    try {
        await ensureContractWorkflowSchema();
        const seanceId = toPositiveInt(req.params.id);
        if (!seanceId) {
            return res.status(400).json({ message: "Seance id invalide." });
        }

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input("seance_id", sql.Int, seanceId)
            .query(`
                IF OBJECT_ID('dbo.Candidat', 'U') IS NULL
                BEGIN
                    SELECT
                        sc.seance_id,
                        sc.candidat_id,
                        CAST(NULL AS VARCHAR(255)) AS nom_complet,
                        CAST(NULL AS VARCHAR(30)) AS type_contrat,
                        CAST(NULL AS VARCHAR(40)) AS statut_contrat
                    FROM dbo.SeanceContratCandidat sc
                    WHERE sc.seance_id = @seance_id
                    ORDER BY sc.created_at DESC;
                END
                ELSE
                BEGIN
                    SELECT
                        sc.seance_id,
                        sc.candidat_id,
                        c.nom_complet,
                        c.type_contrat,
                        c.statut_contrat
                    FROM dbo.SeanceContratCandidat sc
                    LEFT JOIN dbo.Candidat c ON c.id = sc.candidat_id
                    WHERE sc.seance_id = @seance_id
                    ORDER BY sc.created_at DESC;
                END
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Impossible de charger les candidats de la seance." });
    }
});

app.post("/api/seances-contrat", async (req, res) => {
    try {
        await ensureContractWorkflowSchema();
        const date = req.body?.date;
        const heure = req.body?.heure;
        const responsableId = toPositiveInt(req.body?.responsable_id) || 1;
        const statutSeance = normalizeSeanceWorkflowStatus(req.body?.statut_seance) || SEANCE_WORKFLOW_STATUS.IN_PROGRESS;

        if (!date || !isValidSqlDate(date)) {
            return res.status(400).json({ message: "Date invalide." });
        }
        if (!isValidHourFormat(heure)) {
            return res.status(400).json({ message: "Heure invalide. Format attendu HH:mm." });
        }

        const pool = await sql.connect(config);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const createSeanceResult = await transaction.request()
                .input("date", sql.Date, date)
                .input("heure", sql.VarChar(5), heure)
                .input("responsable_id", sql.Int, responsableId)
                .input("statut_seance", sql.VarChar(20), statutSeance)
                .query(`
                    INSERT INTO dbo.SeanceContrat (date, heure, responsable_id, statut_seance)
                    OUTPUT INSERTED.*
                    VALUES (@date, @heure, @responsable_id, @statut_seance);
                `);

            const createdSeance = createSeanceResult.recordset?.[0];
            const seanceId = toPositiveInt(createdSeance?.id);
            if (!seanceId) {
                throw new Error("Creation de seance echouee: id introuvable.");
            }

            const candidatsMeta = await transaction.request().query(`
                SELECT
                    CASE WHEN OBJECT_ID('candidats', 'U') IS NULL THEN 0 ELSE 1 END AS has_table,
                    CASE WHEN COL_LENGTH('candidats', 'etape') IS NULL THEN 0 ELSE 1 END AS has_etape,
                    CASE WHEN COL_LENGTH('candidats', 'statut') IS NULL THEN 0 ELSE 1 END AS has_statut;
            `);
            const hasCandidatsTable = Boolean(candidatsMeta.recordset?.[0]?.has_table);
            const hasEtape = Boolean(candidatsMeta.recordset?.[0]?.has_etape);
            const hasStatut = Boolean(candidatsMeta.recordset?.[0]?.has_statut);

            let assignedCandidateIds = [];
            let updatedCount = 0;

            if (hasCandidatsTable && hasEtape && hasStatut) {
                await transaction.request()
                    .input("seance_id", sql.Int, seanceId)
                    .input("source_etape", sql.VarChar(50), "SEANCE_INFO")
                    .input("source_statut", sql.VarChar(80), "En attente seance contrat")
                    .query(`
                        INSERT INTO dbo.SeanceContratCandidat (seance_id, candidat_id)
                        SELECT @seance_id, c.id
                        FROM candidats c
                        WHERE UPPER(LTRIM(RTRIM(ISNULL(c.etape, '')))) = @source_etape
                          AND LTRIM(RTRIM(ISNULL(c.statut, ''))) = @source_statut
                          AND NOT EXISTS (
                              SELECT 1
                              FROM dbo.SeanceContratCandidat sc
                              WHERE sc.seance_id = @seance_id
                                AND sc.candidat_id = c.id
                          );
                    `);

                const linkedCandidatesResult = await transaction.request()
                    .input("seance_id", sql.Int, seanceId)
                    .query(`
                        SELECT sc.candidat_id
                        FROM dbo.SeanceContratCandidat sc
                        WHERE sc.seance_id = @seance_id
                        ORDER BY sc.candidat_id ASC;
                    `);

                assignedCandidateIds = (linkedCandidatesResult.recordset || [])
                    .map((row) => Number(row.candidat_id))
                    .filter((id) => Number.isInteger(id) && id > 0);

                if (assignedCandidateIds.length > 0) {
                    const updateCandidatesResult = await transaction.request()
                        .input("seance_id", sql.Int, seanceId)
                        .input("next_statut", sql.VarChar(80), "SEANCE_CONTRAT")
                        .query(`
                            UPDATE c
                            SET c.statut = @next_statut
                            FROM candidats c
                            INNER JOIN dbo.SeanceContratCandidat sc ON sc.candidat_id = c.id
                            WHERE sc.seance_id = @seance_id;
                        `);
                    updatedCount = updateCandidatesResult.rowsAffected?.[0] || 0;
                }
            }

            await transaction.commit();

            res.status(201).json({
                ...createdSeance,
                assigned_count: assignedCandidateIds.length,
                assigned_candidate_ids: assignedCandidateIds,
                updated_count: updatedCount,
                message: "Seance creee et candidats affectes avec succes.",
            });
        } catch (innerErr) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error("Rollback erreur /api/seances-contrat:", rollbackErr);
            }
            throw innerErr;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Creation de seance contrat echouee." });
    }
});

app.post("/api/seances-contrat/:id/candidats", async (req, res) => {
    try {
        await ensureContractWorkflowSchema();
        const seanceId = toPositiveInt(req.params.id);
        const candidatId = toPositiveInt(req.body?.candidat_id);
        if (!seanceId || !candidatId) {
            return res.status(400).json({ message: "seance_id ou candidat_id invalide." });
        }

        const pool = await sql.connect(config);
        const seanceCheck = await pool.request()
            .input("seance_id", sql.Int, seanceId)
            .input("statut_seance_en_cours", sql.VarChar(20), SEANCE_WORKFLOW_STATUS.IN_PROGRESS)
            .query(`
                SELECT id
                FROM dbo.SeanceContrat
                WHERE id = @seance_id
                  AND ISNULL(statut_seance, @statut_seance_en_cours) = @statut_seance_en_cours;
            `);
        if (!seanceCheck.recordset?.length) {
            return res.status(409).json({ message: "La seance est introuvable ou deja terminee." });
        }

        await pool.request()
            .input("seance_id", sql.Int, seanceId)
            .input("candidat_id", sql.Int, candidatId)
            .input("statut_contrat", sql.VarChar(40), CONTRACT_WORKFLOW_STATUS.WAITING_SESSION)
            .input("statut_seance_en_cours", sql.VarChar(20), SEANCE_WORKFLOW_STATUS.IN_PROGRESS)
            .query(`
                IF EXISTS (
                    SELECT 1
                    FROM dbo.SeanceContrat
                    WHERE id = @seance_id
                      AND ISNULL(statut_seance, @statut_seance_en_cours) = @statut_seance_en_cours
                )
                BEGIN
                    DELETE sc
                    FROM dbo.SeanceContratCandidat sc
                    INNER JOIN dbo.SeanceContrat s ON s.id = sc.seance_id
                    WHERE sc.candidat_id = @candidat_id
                      AND sc.seance_id <> @seance_id
                      AND ISNULL(s.statut_seance, @statut_seance_en_cours) = @statut_seance_en_cours;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM dbo.SeanceContratCandidat
                        WHERE seance_id = @seance_id AND candidat_id = @candidat_id
                    )
                    BEGIN
                        INSERT INTO dbo.SeanceContratCandidat (seance_id, candidat_id)
                        VALUES (@seance_id, @candidat_id);
                    END;
                END;

                IF OBJECT_ID('dbo.Candidat', 'U') IS NOT NULL
                BEGIN
                    UPDATE dbo.Candidat
                    SET statut_contrat = @statut_contrat
                    WHERE id = @candidat_id;
                END;
            `);

        res.status(201).json({ message: "Candidat affecte a la seance contrat." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Affectation du candidat a la seance impossible." });
    }
});

app.post("/api/candidats/:id/assignation-seance-auto", async (req, res) => {
    try {
        await ensureContractWorkflowSchema();
        const candidatId = toPositiveInt(req.params.id);
        if (!candidatId) {
            return res.status(400).json({ message: "candidat id invalide." });
        }

        const pool = await sql.connect(config);
        const openSeanceResult = await pool.request()
            .input("statut_seance", sql.VarChar(20), SEANCE_WORKFLOW_STATUS.IN_PROGRESS)
            .query(`
                SELECT TOP 1 id
                FROM dbo.SeanceContrat
                WHERE ISNULL(statut_seance, @statut_seance) = @statut_seance
                ORDER BY date ASC, heure ASC, id ASC;
            `);

        const openSeanceId = openSeanceResult.recordset?.[0]?.id || null;
        if (!openSeanceId) {
            if (await hasCandidatTable()) {
                await pool.request()
                    .input("candidat_id", sql.Int, candidatId)
                    .input("statut_contrat", sql.VarChar(40), CONTRACT_WORKFLOW_STATUS.WAITING_SESSION)
                    .query(`
                        UPDATE dbo.Candidat
                        SET statut_contrat = @statut_contrat
                        WHERE id = @candidat_id;
                    `);
            }
            return res.json({
                assigned: false,
                waiting: true,
                seance_id: null,
                message: "Aucune seance en cours. Candidat conserve en attente seance.",
            });
        }

        await pool.request()
            .input("seance_id", sql.Int, openSeanceId)
            .input("candidat_id", sql.Int, candidatId)
            .input("statut_contrat", sql.VarChar(40), CONTRACT_WORKFLOW_STATUS.WAITING_SESSION)
            .input("statut_seance", sql.VarChar(20), SEANCE_WORKFLOW_STATUS.IN_PROGRESS)
            .query(`
                DELETE sc
                FROM dbo.SeanceContratCandidat sc
                INNER JOIN dbo.SeanceContrat s ON s.id = sc.seance_id
                WHERE sc.candidat_id = @candidat_id
                  AND sc.seance_id <> @seance_id
                  AND ISNULL(s.statut_seance, @statut_seance) = @statut_seance;

                IF NOT EXISTS (
                    SELECT 1
                    FROM dbo.SeanceContratCandidat
                    WHERE seance_id = @seance_id
                      AND candidat_id = @candidat_id
                )
                BEGIN
                    INSERT INTO dbo.SeanceContratCandidat (seance_id, candidat_id)
                    VALUES (@seance_id, @candidat_id);
                END;

                IF OBJECT_ID('dbo.Candidat', 'U') IS NOT NULL
                BEGIN
                    UPDATE dbo.Candidat
                    SET statut_contrat = @statut_contrat
                    WHERE id = @candidat_id;
                END;
            `);

        return res.json({
            assigned: true,
            waiting: false,
            seance_id: openSeanceId,
            message: "Candidat affecte automatiquement a une seance en cours.",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Affectation automatique impossible." });
    }
});

app.put("/api/candidats/:id/type-contrat", requireRole(CONTRACT_ALLOWED_ROLES), async (req, res) => {
    try {
        const candidatId = toPositiveInt(req.params.id);
        const typeContrat = normalizeContractType(req.body?.type_contrat);
        if (!candidatId) {
            return res.status(400).json({ message: "candidat id invalide." });
        }
        if (!typeContrat) {
            return res.status(400).json({ message: "type_contrat invalide (CDI, CAIP, CIVP, CDI SANS ESSAI ou SIVP)." });
        }

        const pool = await sql.connect(config);
        const tableCheck = await pool.request().query(`
            SELECT CASE WHEN OBJECT_ID('dbo.candidats', 'U') IS NULL THEN 0 ELSE 1 END AS has_table;
        `);
        if (!tableCheck.recordset?.[0]?.has_table) {
            return res.status(501).json({ message: "Table candidats absente. Workflow contrat indisponible." });
        }

        await pool.request().query(`
            IF COL_LENGTH('dbo.candidats', 'type_contrat') IS NULL
            BEGIN
                ALTER TABLE dbo.candidats ADD type_contrat VARCHAR(30) NULL;
            END
            ELSE IF COL_LENGTH('dbo.candidats', 'type_contrat') < 30
            BEGIN
                ALTER TABLE dbo.candidats ALTER COLUMN type_contrat VARCHAR(30) NULL;
            END
        `);

        const result = await pool.request()
            .input("id", sql.Int, candidatId)
            .input("type_contrat", sql.VarChar(30), typeContrat)
            .query(`
                UPDATE dbo.candidats
                SET type_contrat = @type_contrat
                OUTPUT INSERTED.id, INSERTED.type_contrat
                WHERE id = @id;
            `);

        if (!result.rowsAffected[0]) {
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Mise a jour type_contrat impossible." });
    }
});

app.put("/api/candidats/:id/statut-contrat", requireRole(CONTRACT_ALLOWED_ROLES), async (req, res) => {
    try {
        await ensureContractWorkflowSchema();
        if (!(await hasCandidatTable())) {
            return res.status(501).json({ message: "Table Candidat absente. Workflow contrat indisponible." });
        }
        const candidatId = toPositiveInt(req.params.id);
        const statutContrat = normalizeContractWorkflowStatus(req.body?.statut_contrat);
        if (!candidatId) {
            return res.status(400).json({ message: "candidat id invalide." });
        }
        if (!statutContrat) {
            return res.status(400).json({
                message: "statut_contrat invalide (SEANCE_CONTRAT/en_attente_seance, DOSSIER_CONTRAT/en_attente_dossier, contrat_signe)."
            });
        }

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input("id", sql.Int, candidatId)
            .input("statut_contrat", sql.VarChar(40), statutContrat)
            .query(`
                UPDATE dbo.Candidat
                SET statut_contrat = @statut_contrat
                OUTPUT INSERTED.id, INSERTED.statut_contrat
                WHERE id = @id;
            `);

        if (!result.rowsAffected[0]) {
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Mise a jour statut_contrat impossible." });
    }
});

app.put("/api/seances-contrat/:seanceId/candidats/:candidatId/finaliser", requireRole(CONTRACT_ALLOWED_ROLES), async (req, res) => {
    try {
        await ensureContractWorkflowSchema();
        if (!(await hasCandidatTable())) {
            return res.status(501).json({ message: "Table Candidat absente. Workflow contrat indisponible." });
        }
        const seanceId = toPositiveInt(req.params.seanceId);
        const candidatId = toPositiveInt(req.params.candidatId);
        if (!seanceId || !candidatId) {
            return res.status(400).json({ message: "IDs invalides." });
        }

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input("seance_id", sql.Int, seanceId)
            .input("candidat_id", sql.Int, candidatId)
            .input("statut_contrat", sql.VarChar(40), CONTRACT_WORKFLOW_STATUS.WAITING_DOSSIER)
            .input("statut_seance_en_cours", sql.VarChar(20), SEANCE_WORKFLOW_STATUS.IN_PROGRESS)
            .query(`
                IF EXISTS (
                    SELECT 1
                    FROM dbo.SeanceContratCandidat sc
                    INNER JOIN dbo.SeanceContrat s ON s.id = sc.seance_id
                    WHERE sc.seance_id = @seance_id
                      AND sc.candidat_id = @candidat_id
                      AND ISNULL(s.statut_seance, @statut_seance_en_cours) = @statut_seance_en_cours
                )
                BEGIN
                    UPDATE dbo.Candidat
                    SET statut_contrat = @statut_contrat
                    OUTPUT INSERTED.id, INSERTED.statut_contrat
                    WHERE id = @candidat_id;
                END;
            `);

        if (!result.rowsAffected[0]) {
            return res.status(404).json({ message: "Candidat non affecte a cette seance." });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Finalisation de seance impossible." });
    }
});

// lancer serveur
app.listen(3000, () => {
    console.log("Server running on port 3000");
    ensureContractWorkflowSchema()
        .then(() => {
            console.log("Contract workflow schema ready.");
        })
        .catch((err) => {
            console.error("Failed to init contract workflow schema:", err.message);
        });
}); 


