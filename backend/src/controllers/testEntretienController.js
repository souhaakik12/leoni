const sql = require("mssql");
const config = require("../../config");

const RESULT_OK = "OK";
const RESULT_NOK = "NOK";
const RESULT_PENDING = "En attente";
const RESULT_TERMINATED = "TERMINE";
const REQUIRED_INTERVIEW_DETAILS_MESSAGE = "Veuillez compl\u00e9ter la fonction, le segment, le projet et le site avant de valider l\u2019entretien.";

function toPositiveInt(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeResult(rawResult) {
    const normalized = String(rawResult ?? "").trim().toLowerCase();
    if (normalized === "ok") return RESULT_OK;
    if (normalized === "nok") return RESULT_NOK;
    if (normalized === "en attente" || normalized === "en_attente" || normalized === "en attente entretien") {
        return RESULT_PENDING;
    }
    return null;
}

function normalizeWorkflowStep(value) {
    return String(value ?? "").trim().toUpperCase();
}

function hasRequiredInterviewDetails(values = {}) {
    return ["fonction", "segment", "projet", "site"].every((key) => String(values?.[key] ?? "").trim() !== "");
}

function isCompleteOkInterview(values = {}) {
    return hasRequiredInterviewDetails(values) && normalizeResult(values?.resultat_entretien) === RESULT_OK;
}

function resolveMovementActor(user) {
    const rawUserId = user?.id ?? user?.Id ?? null;
    const normalizedUserId = Number.parseInt(rawUserId, 10);
    const utilisateurNom = String(
        user?.nom || user?.name || user?.NomComplet || user?.nomComplet || ""
    ).trim() || "Utilisateur inconnu";
    const utilisateurRole = String(user?.role || user?.Role || "").trim() || null;

    return {
        utilisateur_id: Number.isInteger(normalizedUserId) && normalizedUserId > 0 ? normalizedUserId : null,
        utilisateur_nom: utilisateurNom,
        utilisateur_role: utilisateurRole,
    };
}

function bindMovementActor(request, actor = {}) {
    return request
        .input("utilisateur_id", sql.Int, actor.utilisateur_id ?? null)
        .input("utilisateur_nom", sql.NVarChar(255), actor.utilisateur_nom || "Utilisateur inconnu")
        .input("utilisateur_role", sql.NVarChar(100), actor.utilisateur_role ?? null);
}

async function getCandidateById(pool, candidatId) {
    const result = await pool.request()
        .input("candidat_id", sql.Int, candidatId)
        .query(`
            SELECT TOP 1 id, etape, statut
            FROM dbo.candidats
            WHERE id = @candidat_id;
        `);
    return result.recordset?.[0] || null;
}

exports.createTestEntretien = async (req, res) => {
    const candidatId = toPositiveInt(req.body?.candidat_id);
    const testEffectue = String(req.body?.test_effectue ?? "").trim();
    const intervieweur = String(req.body?.intervieweur ?? "").trim();
    const fonction = String(req.body?.fonction ?? "").trim();
    const segment = String(req.body?.segment ?? "").trim();
    const projet = String(req.body?.projet ?? "").trim();
    const site = String(req.body?.site ?? "").trim();
    const resultatEntretien = normalizeResult(req.body?.resultat_entretien);

    if (!candidatId) {
        return res.status(400).json({ message: "candidat_id invalide." });
    }
    if (!resultatEntretien) {
        return res.status(400).json({ message: "resultat_entretien invalide (OK, NOK, En attente)." });
    }
    if (resultatEntretien === RESULT_OK && !hasRequiredInterviewDetails({ fonction, segment, projet, site })) {
        return res.status(400).json({ message: REQUIRED_INTERVIEW_DETAILS_MESSAGE });
    }

    let pool;
    let transaction;
    const actor = resolveMovementActor(req.user);

    try {
        pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const candidate = await transaction.request()
            .input("candidat_id", sql.Int, candidatId)
            .query(`
                SELECT TOP 1 id, etape, statut
                FROM dbo.candidats
                WHERE id = @candidat_id;
            `);

        if (!candidate.recordset?.length) {
            await transaction.rollback();
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        const latestInterviewResult = await transaction.request()
            .input("candidat_id", sql.Int, candidatId)
            .query(`
                SELECT TOP 1
                    id,
                    candidat_id,
                    fonction,
                    segment,
                    projet,
                    site,
                    resultat_entretien,
                    date_entretien
                FROM dbo.test_entretien WITH (UPDLOCK, HOLDLOCK)
                WHERE candidat_id = @candidat_id
                ORDER BY date_entretien DESC, id DESC;
            `);

        const latestInterview = latestInterviewResult.recordset?.[0] || null;
        const latestResult = normalizeResult(latestInterview?.resultat_entretien);
        const latestInterviewIsCompleteOk = isCompleteOkInterview(latestInterview);

        if (latestInterview && latestResult === RESULT_OK && latestInterviewIsCompleteOk) {
            await transaction.rollback();
            return res.status(409).json({
                message: "Le dernier entretien est deja valide. Aucun nouvel entretien n'est autorise.",
                already_validated: true,
            });
        }

        let persistedInterview = null;
        let interviewAction = "inserted";

        if (
            latestInterview &&
            (
                latestResult === RESULT_PENDING ||
                (latestResult === RESULT_OK && !latestInterviewIsCompleteOk)
            )
        ) {
            const updateResult = await transaction.request()
                .input("interview_id", sql.Int, latestInterview.id)
                .input("test_effectue", sql.NVarChar(255), testEffectue || null)
                .input("intervieweur", sql.NVarChar(255), intervieweur || null)
                .input("fonction", sql.NVarChar(255), fonction || null)
                .input("segment", sql.NVarChar(255), segment || null)
                .input("projet", sql.NVarChar(255), projet || null)
                .input("site", sql.NVarChar(300), site || null)
                .input("resultat_entretien", sql.NVarChar(50), resultatEntretien)
                .query(`
                    UPDATE dbo.test_entretien
                    SET test_effectue = @test_effectue,
                        intervieweur = @intervieweur,
                        fonction = @fonction,
                        segment = @segment,
                        projet = @projet,
                        site = @site,
                        resultat_entretien = @resultat_entretien,
                        updated_at = GETDATE(),
                        date_entretien = GETDATE()
                    OUTPUT INSERTED.*
                    WHERE id = @interview_id;
                `);

            persistedInterview = updateResult.recordset?.[0] || null;
            interviewAction = "updated_open";
        } else {
            const insertResult = await transaction.request()
                .input("candidat_id", sql.Int, candidatId)
                .input("test_effectue", sql.NVarChar(255), testEffectue || null)
                .input("intervieweur", sql.NVarChar(255), intervieweur || null)
                .input("fonction", sql.NVarChar(255), fonction || null)
                .input("segment", sql.NVarChar(255), segment || null)
                .input("projet", sql.NVarChar(255), projet || null)
                .input("site", sql.NVarChar(300), site || null)
                .input("resultat_entretien", sql.NVarChar(50), resultatEntretien)
                .query(`
                    INSERT INTO dbo.test_entretien
                    (
                        candidat_id,
                        test_effectue,
                        intervieweur,
                        fonction,
                        segment,
                        projet,
                        site,
                        resultat_entretien,
                        date_saisie,
                        updated_at,
                        date_entretien
                    )
                    OUTPUT INSERTED.*
                    VALUES
                    (
                        @candidat_id,
                        @test_effectue,
                        @intervieweur,
                        @fonction,
                        @segment,
                        @projet,
                        @site,
                        @resultat_entretien,
                        GETDATE(),
                        GETDATE(),
                        GETDATE()
                    );
                `);

            persistedInterview = insertResult.recordset?.[0] || null;
            interviewAction = "inserted_new";
        }

        if (!persistedInterview) {
            throw new Error("Impossible de sauvegarder l'entretien.");
        }

        let closedOldPendingCount = 0;
        if (resultatEntretien === RESULT_OK || resultatEntretien === RESULT_NOK) {
            const closeOldPendingResult = await transaction.request()
                .input("candidat_id", sql.Int, candidatId)
                .input("current_interview_id", sql.Int, persistedInterview.id)
                .input("pending_result", sql.NVarChar(50), RESULT_PENDING)
                .input("terminated_result", sql.NVarChar(50), RESULT_TERMINATED)
                .query(`
                    UPDATE dbo.test_entretien
                    SET resultat_entretien = @terminated_result,
                        updated_at = GETDATE()
                    WHERE candidat_id = @candidat_id
                      AND id <> @current_interview_id
                      AND (
                          resultat_entretien = @pending_result
                          OR resultat_entretien = 'EN_ATTENTE'
                          OR resultat_entretien = 'en attente'
                      );
                `);
            closedOldPendingCount = closeOldPendingResult.rowsAffected?.[0] || 0;
        }

        const candidateRow = candidate.recordset?.[0] || null;
        const previousEtape = String(candidateRow?.etape ?? "").trim();

        if (resultatEntretien === RESULT_OK) {
            await transaction.request()
                .input("candidat_id", sql.Int, candidatId)
                .input("next_etape", sql.VarChar(50), "SEANCE_INFO")
                .input("next_statut", sql.VarChar(80), "En attente seance contrat")
                .query(`
                    UPDATE dbo.candidats
                    SET etape = @next_etape,
                        statut = @next_statut
                    WHERE id = @candidat_id;
                `);

            if (normalizeWorkflowStep(previousEtape) !== "SEANCE_INFO") {
                await transaction.request()
                    .input("candidat_id", sql.Int, candidatId)
                    .input("ancienne_etape", sql.VarChar(50), previousEtape || "TEST_ENTRETIEN")
                    .input("nouvelle_etape", sql.VarChar(50), "SEANCE_INFO")
                    .input("action", sql.NVarChar(255), "Entretien OK - Envoyer vers Séance Contrat")
                    .input("utilisateur_id", sql.Int, actor.utilisateur_id ?? null)
                    .input("utilisateur_nom", sql.NVarChar(255), actor.utilisateur_nom || "Utilisateur inconnu")
                    .input("utilisateur_role", sql.NVarChar(100), actor.utilisateur_role ?? null)
                    .query(`
                        IF OBJECT_ID('dbo.candidat_mouvements', 'U') IS NOT NULL
                        BEGIN
                            INSERT INTO dbo.candidat_mouvements
                            (
                                candidat_id,
                                ancienne_etape,
                                nouvelle_etape,
                                action,
                                commentaire,
                                utilisateur_id,
                                utilisateur_nom,
                                utilisateur_role,
                                created_at
                            )
                            VALUES
                            (
                                @candidat_id,
                                @ancienne_etape,
                                @nouvelle_etape,
                                @action,
                                NULL,
                                @utilisateur_id,
                                @utilisateur_nom,
                                @utilisateur_role,
                                GETDATE()
                            );
                        END
                    `);
            }
        } else {
            // NOK or En attente: keep candidate in TEST_ENTRETIEN stage with Nouveau status.
            await transaction.request()
                .input("candidat_id", sql.Int, candidatId)
                .input("current_etape", sql.VarChar(50), "TEST_ENTRETIEN")
                .input("current_statut", sql.VarChar(80), "Nouveau")
                .query(`
                    UPDATE dbo.candidats
                    SET etape = @current_etape,
                        statut = @current_statut
                    WHERE id = @candidat_id;
                `);
        }

        const updatedCandidateResult = await transaction.request()
            .input("candidat_id", sql.Int, candidatId)
            .query(`
                SELECT TOP 1 id, etape, statut
                FROM dbo.candidats
                WHERE id = @candidat_id;
            `);

        await transaction.commit();

        const updatedCandidate = updatedCandidateResult.recordset?.[0] || null;

        const responseStatus = interviewAction === "updated_open" ? 200 : 201;

        return res.status(responseStatus).json({
            ok: true,
            interview: persistedInterview,
            candidat: updatedCandidate,
            interview_action: interviewAction,
            updated_existing_open_interview: interviewAction === "updated_open",
            closed_old_pending_count: closedOldPendingCount,
            moved_to_seance: resultatEntretien === RESULT_OK,
            message: resultatEntretien === RESULT_OK
                ? "Entretien valide. Candidat transfere vers seance contrat."
                : resultatEntretien === RESULT_NOK
                    ? "Entretien enregistre en NOK. Candidat conserve en test/entretien."
                    : "Entretien en attente enregistre.",
        });
    } catch (err) {
        try {
            if (transaction && transaction._aborted !== true) {
                await transaction.rollback();
            }
        } catch (rollbackErr) {
            console.error("Rollback createTestEntretien:", rollbackErr);
        }
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur pendant la creation du test entretien." });
    }
};

exports.getLatestTestEntretienByCandidate = async (req, res) => {
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

        const latestResult = await pool.request()
            .input("candidat_id", sql.Int, candidatId)
            .query(`
                SELECT TOP 1
                    id,
                    candidat_id,
                    test_effectue,
                    intervieweur,
                    fonction,
                    segment,
                    projet,
                    site,
                    resultat_entretien,
                    date_saisie,
                    updated_at,
                    date_entretien
                FROM dbo.test_entretien
                WHERE candidat_id = @candidat_id
                ORDER BY date_entretien DESC, id DESC;
            `);

        return res.json({
            ok: true,
            interview: latestResult.recordset?.[0] || null,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur pendant la lecture du dernier test entretien." });
    }
};

exports.getTestEntretienHistoryByCandidate = async (req, res) => {
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

        const historyResult = await pool.request()
            .input("candidat_id", sql.Int, candidatId)
            .query(`
                SELECT
                    id,
                    candidat_id,
                    test_effectue,
                    intervieweur,
                    fonction,
                    segment,
                    projet,
                    site,
                    resultat_entretien,
                    date_saisie,
                    updated_at,
                    date_entretien
                FROM dbo.test_entretien
                WHERE candidat_id = @candidat_id
                ORDER BY date_entretien DESC, id DESC;
            `);

        return res.json({
            ok: true,
            interviews: historyResult.recordset || [],
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur pendant la lecture de l'historique des entretiens." });
    }
};
