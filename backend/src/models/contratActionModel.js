const sql = require("mssql");

class ContratActionError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "ContratActionError";
        this.status = status;
    }
}

function normalizeSourceDonnee(value) {
    const normalized = String(value ?? "").trim().toUpperCase();
    return normalized === "IMPORT" || normalized === "SYSTEME" ? normalized : null;
}

function resolveActionActor(source = {}) {
    const rawUserId = source?.utilisateur_id ?? source?.id ?? source?.userId ?? null;
    const parsedUserId = Number.parseInt(rawUserId, 10);
    const utilisateurNom = String(
        source?.utilisateur_nom ||
        source?.nom ||
        source?.name ||
        source?.fullName ||
        source?.username ||
        source?.nomComplet ||
        source?.NomComplet ||
        source?.email ||
        ""
    ).trim() || "Utilisateur inconnu";
    const utilisateurRole = String(
        source?.utilisateur_role || source?.role || source?.Role || ""
    ).trim() || null;

    return {
        utilisateur_id: Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null,
        utilisateur_nom: utilisateurNom,
        utilisateur_role: utilisateurRole,
    };
}

async function enregistrerActionContrat(runner, actionData = {}) {
    if (!runner || typeof runner.request !== "function") {
        throw new ContratActionError("Contexte SQL invalide pour la traçabilite contrat.");
    }

    const actionType = String(actionData.action_type ?? "").trim().toUpperCase();
    if (!actionType) {
        throw new ContratActionError("Type d'action contrat invalide.");
    }

    const actor = resolveActionActor(actionData);

    await runner.request()
        .input("id_contrat", sql.Int, Number.isInteger(Number(actionData.id_contrat)) ? Number(actionData.id_contrat) : null)
        .input("source_donnee", sql.VarChar(20), normalizeSourceDonnee(actionData.source_donnee))
        .input("candidat_id", sql.Int, Number.isInteger(Number(actionData.candidat_id)) ? Number(actionData.candidat_id) : null)
        .input("cin", sql.VarChar(50), String(actionData.cin ?? "").trim() || null)
        .input("nom_prenom", sql.NVarChar(255), String(actionData.nom_prenom ?? "").trim() || null)
        .input("action_type", sql.VarChar(60), actionType)
        .input(
            "action_description",
            sql.NVarChar(500),
            String(actionData.action_description ?? "").trim() || null
        )
        .input("utilisateur_id", sql.Int, actor.utilisateur_id)
        .input("utilisateur_nom", sql.NVarChar(255), actor.utilisateur_nom)
        .input("utilisateur_role", sql.NVarChar(100), actor.utilisateur_role)
        .query(`
            INSERT INTO dbo.contrats_actions (
                id_contrat,
                source_donnee,
                candidat_id,
                cin,
                nom_prenom,
                action_type,
                action_description,
                utilisateur_id,
                utilisateur_nom,
                utilisateur_role,
                date_action
            )
            VALUES (
                @id_contrat,
                @source_donnee,
                @candidat_id,
                @cin,
                @nom_prenom,
                @action_type,
                @action_description,
                @utilisateur_id,
                @utilisateur_nom,
                @utilisateur_role,
                GETDATE()
            );
        `);
}

async function getActionsContratByCandidat(candidatId, runner = null) {
    const normalizedCandidateId = Number.parseInt(candidatId, 10);
    if (!Number.isInteger(normalizedCandidateId) || normalizedCandidateId <= 0) {
        throw new ContratActionError("Identifiant candidat invalide.", 400);
    }

    const executor =
        runner && typeof runner.request === "function"
            ? runner
            : await sql.connect(config);

    const result = await executor.request()
        .input("candidatId", sql.Int, normalizedCandidateId)
        .query(`
            SELECT
                id,
                id_contrat,
                source_donnee,
                candidat_id,
                cin,
                nom_prenom,
                action_type,
                action_description,
                utilisateur_nom,
                utilisateur_role,
                date_action
            FROM dbo.contrats_actions
            WHERE candidat_id = @candidatId
            ORDER BY date_action DESC;
        `);

    return result.recordset || [];
}

module.exports = {
    ContratActionError,
    enregistrerActionContrat,
    getActionsContratByCandidat,
    resolveActionActor,
};
