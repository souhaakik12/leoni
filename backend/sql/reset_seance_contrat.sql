/*
  Reset + suppression d'une seance contrat de test
  - Ne supprime aucun candidat
  - Ne reset que les candidats lies a la seance cible
*/

DECLARE @SeanceId INT = 1; -- TODO: remplacer par l'id cible

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.SeanceContrat
        WHERE id = @SeanceId
    )
    BEGIN
        RAISERROR('SeanceContrat introuvable pour id %d.', 16, 1, @SeanceId);
    END

    DECLARE @LinkedCandidates TABLE (
        candidat_id INT PRIMARY KEY
    );

    INSERT INTO @LinkedCandidates (candidat_id)
    SELECT sc.candidat_id
    FROM dbo.SeanceContratCandidat sc
    WHERE sc.seance_id = @SeanceId;

    DECLARE @LinkedCount INT = (SELECT COUNT(1) FROM @LinkedCandidates);

    -- 1) supprimer les liens seance <-> candidat
    DELETE FROM dbo.SeanceContratCandidat
    WHERE seance_id = @SeanceId;
    DECLARE @DeletedRelationsCount INT = @@ROWCOUNT;

    -- 2) reset uniquement les candidats lies a cette seance
    UPDATE c
    SET c.etape = 'SEANCE_INFO',
        c.statut = 'En attente seance contrat'
    FROM dbo.candidats c
    INNER JOIN @LinkedCandidates lc ON lc.candidat_id = c.id;
    DECLARE @ResetCandidatesCount INT = @@ROWCOUNT;

    -- 3) supprimer la seance (historique de test)
    DELETE FROM dbo.SeanceContrat
    WHERE id = @SeanceId;
    DECLARE @DeletedSeanceCount INT = @@ROWCOUNT;

    IF @DeletedRelationsCount <> @LinkedCount
    BEGIN
        RAISERROR(
            'Incoherence suppression relations: %d supprimees / %d attendues.',
            16, 1, @DeletedRelationsCount, @LinkedCount
        );
    END

    IF @ResetCandidatesCount <> @LinkedCount
    BEGIN
        RAISERROR(
            'Incoherence reset candidats: %d resets / %d attendus.',
            16, 1, @ResetCandidatesCount, @LinkedCount
        );
    END

    IF @DeletedSeanceCount <> 1
    BEGIN
        RAISERROR(
            'Suppression seance echouee pour id %d.',
            16, 1, @SeanceId
        );
    END

    COMMIT TRANSACTION;

    SELECT
        CAST(1 AS BIT) AS ok,
        @SeanceId AS seance_id,
        @LinkedCount AS linked_candidates_count,
        @DeletedRelationsCount AS deleted_relations_count,
        @ResetCandidatesCount AS reset_candidates_count,
        @DeletedSeanceCount AS deleted_seance_count;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    SELECT
        CAST(0 AS BIT) AS ok,
        ERROR_NUMBER() AS error_number,
        ERROR_MESSAGE() AS error_message,
        ERROR_LINE() AS error_line;
END CATCH;
