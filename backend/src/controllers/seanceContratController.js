const sql = require("mssql");
const config = require("../../config");

function toPositiveInt(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
}

exports.cloturerSeanceEtEnvoyerDossier = async (req, res) => {
    const seanceId = toPositiveInt(req.params.seanceId);
    if (!seanceId) {
        return res.status(400).json({ message: "Seance id invalide." });
    }

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const seanceResult = await transaction.request()
            .input("seance_id", sql.Int, seanceId)
            .query(`
                SELECT
                    id,
                    ISNULL(statut_seance, 'en_cours') AS statut_seance
                FROM dbo.SeanceContrat
                WHERE id = @seance_id;
            `);

        const seance = seanceResult.recordset?.[0];
        if (!seance) {
            await transaction.rollback();
            return res.status(404).json({ message: "Seance introuvable." });
        }

        const linkedCandidatesResult = await transaction.request()
            .input("seance_id", sql.Int, seanceId)
            .query(`
                SELECT candidat_id
                FROM dbo.SeanceContratCandidat
                WHERE seance_id = @seance_id;
            `);

        const linkedCandidates = (linkedCandidatesResult.recordset || [])
            .map((row) => Number(row.candidat_id))
            .filter((id) => Number.isInteger(id) && id > 0);

        console.log(
            `[close-seance] seance_id=${seanceId} linked_candidates_count=${linkedCandidates.length}`
        );

        if (seance.statut_seance === "terminee" && linkedCandidates.length === 0) {
            await transaction.rollback();
            return res.status(409).json({ message: "La seance est deja terminee." });
        }

        const nbPresents = linkedCandidates.length;

        let updatedCount = 0;
        if (nbPresents > 0) {
            const updateCandidatsResult = await transaction.request()
                .input("seance_id", sql.Int, seanceId)
                .input("next_etape", sql.VarChar(50), "DOSSIER_CONTRAT")
                .input("next_statut", sql.VarChar(80), "EN_ATTENTE_DOSSIER")
                .query(`
                    UPDATE c
                    SET c.etape = @next_etape,
                        c.statut = @next_statut
                    FROM dbo.candidats c
                    INNER JOIN dbo.SeanceContratCandidat sc ON sc.candidat_id = c.id
                    WHERE sc.seance_id = @seance_id;
                `);

            updatedCount = Number(updateCandidatsResult.rowsAffected?.[0] || 0);
            console.log(
                `[close-seance] seance_id=${seanceId} updated_candidates_count=${updatedCount}`
            );

            if (updatedCount !== nbPresents) {
                throw new Error(
                    `Transfert incomplet: ${updatedCount}/${nbPresents} candidats mis a jour pour la seance ${seanceId}.`
                );
            }
        }

        const updateSeanceResult = await transaction.request()
            .input("seance_id", sql.Int, seanceId)
            .input("statut_seance", sql.VarChar(20), "terminee")
            .input("nb_presents", sql.Int, nbPresents)
            .input("nb_absents", sql.Int, 0)
            .query(`
                UPDATE dbo.SeanceContrat
                SET statut_seance = @statut_seance,
                    nb_presents = @nb_presents,
                    nb_absents = @nb_absents,
                    date_cloture = GETDATE()
                WHERE id = @seance_id;
            `);

        const updatedSeanceCount = Number(updateSeanceResult.rowsAffected?.[0] || 0);
        if (updatedSeanceCount !== 1) {
            throw new Error(`Mise a jour seance impossible pour id ${seanceId}.`);
        }

        const deleteRelationsResult = await transaction.request()
            .input("seance_id", sql.Int, seanceId)
            .query(`
                DELETE FROM dbo.SeanceContratCandidat
                WHERE seance_id = @seance_id;
            `);

        const removedRelationsCount = Number(deleteRelationsResult.rowsAffected?.[0] || 0);
        if (removedRelationsCount !== nbPresents) {
            throw new Error(
                `Suppression relations incoherente: ${removedRelationsCount}/${nbPresents} pour la seance ${seanceId}.`
            );
        }

        await transaction.commit();
        console.log(
            `[close-seance] seance_id=${seanceId} removed_relations_count=${removedRelationsCount}`
        );

        return res.json({
            ok: true,
            seance_id: seanceId,
            statut_seance: "terminee",
            nb_presents: nbPresents,
            nb_absents: 0,
            linked_candidates_count: nbPresents,
            total_count: nbPresents,
            updated_count: updatedCount,
            already_count: 0,
            removed_relations_count: removedRelationsCount,
            etape_cible: "DOSSIER_CONTRAT",
            statut_cible: "EN_ATTENTE_DOSSIER",
            message: nbPresents > 0
                ? "Seance cloturee et candidats envoyes vers dossier."
                : "Seance cloturee sans candidats lies.",
        });
    } catch (err) {
        try {
            if (transaction._aborted !== true) {
                await transaction.rollback();
            }
        } catch (rollbackErr) {
            console.error("Rollback cloturerSeanceEtEnvoyerDossier:", rollbackErr);
        }
        console.error(err);
        return res.status(500).json({ message: "Cloture de seance impossible." });
    }
};

exports.resetSeanceContrat = async (req, res) => {
    const seanceId = toPositiveInt(req.params.seanceId);
    if (!seanceId) {
        return res.status(400).json({ message: "Seance id invalide." });
    }

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const seanceResult = await transaction.request()
            .input("seance_id", sql.Int, seanceId)
            .query(`
                SELECT id
                FROM dbo.SeanceContrat
                WHERE id = @seance_id;
            `);

        if (!seanceResult.recordset?.length) {
            await transaction.rollback();
            return res.status(404).json({ message: "Seance introuvable." });
        }

        const linkedCandidatesResult = await transaction.request()
            .input("seance_id", sql.Int, seanceId)
            .query(`
                SELECT candidat_id
                FROM dbo.SeanceContratCandidat
                WHERE seance_id = @seance_id
                ORDER BY candidat_id ASC;
            `);

        const linkedCandidateIds = (linkedCandidatesResult.recordset || [])
            .map((row) => Number(row.candidat_id))
            .filter((id) => Number.isInteger(id) && id > 0);

        const linkedCount = linkedCandidateIds.length;

        const deleteRelationsResult = await transaction.request()
            .input("seance_id", sql.Int, seanceId)
            .query(`
                DELETE FROM dbo.SeanceContratCandidat
                WHERE seance_id = @seance_id;
            `);

        const deletedRelationsCount = Number(deleteRelationsResult.rowsAffected?.[0] || 0);

        let resetCandidatesCount = 0;
        if (linkedCount > 0) {
            const resetCandidatesRequest = transaction.request()
                .input("target_etape", sql.VarChar(50), "SEANCE_INFO")
                .input("target_statut", sql.VarChar(80), "En attente seance contrat");

            const candidatePlaceholders = linkedCandidateIds.map((candidateId, index) => {
                const paramName = `candidat_id_${index}`;
                resetCandidatesRequest.input(paramName, sql.Int, candidateId);
                return `@${paramName}`;
            });

            const resetCandidatesResult = await resetCandidatesRequest.query(`
                UPDATE dbo.candidats
                SET etape = @target_etape,
                    statut = @target_statut
                WHERE id IN (${candidatePlaceholders.join(", ")});
            `);

            resetCandidatesCount = Number(resetCandidatesResult.rowsAffected?.[0] || 0);
        }

        const deleteSeanceResult = await transaction.request()
            .input("seance_id", sql.Int, seanceId)
            .query(`
                DELETE FROM dbo.SeanceContrat
                WHERE id = @seance_id;
            `);

        const deletedSeanceCount = Number(deleteSeanceResult.rowsAffected?.[0] || 0);
        if (deletedSeanceCount === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: "Seance introuvable." });
        }

        await transaction.commit();

        return res.json({
            ok: true,
            seance_id: seanceId,
            linked_candidates_count: linkedCount,
            reset_candidates_count: resetCandidatesCount,
            deleted_relations_count: deletedRelationsCount,
            deleted_seance_count: deletedSeanceCount,
            etape_reset: "SEANCE_INFO",
            statut_reset: "En attente seance contrat",
            message: "Seance supprimee avec succes",
        });
    } catch (err) {
        try {
            if (transaction._aborted !== true) {
                await transaction.rollback();
            }
        } catch (rollbackErr) {
            console.error("Rollback resetSeanceContrat:", rollbackErr);
        }
        console.error(err);
        return res.status(500).json({ message: "Reset de seance impossible." });
    }
};
