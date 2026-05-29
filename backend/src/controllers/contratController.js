const contratModel = require("../models/contratModel");

function handleError(res, error, fallbackMessage) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const message = error?.message || fallbackMessage;
    console.error("Erreur contratController:", error);
    return res.status(status).json({
        ok: false,
        message,
    });
}

function readActionUser(body, requestUser) {
    return {
        utilisateur_id: body?.utilisateur_id ?? requestUser?.id ?? null,
        utilisateur_nom:
            body?.utilisateur_nom ??
            requestUser?.nom ??
            requestUser?.name ??
            requestUser?.nomComplet ??
            "",
        utilisateur_role: body?.utilisateur_role ?? requestUser?.role ?? "",
    };
}

exports.getContrats = async (req, res) => {
    try {
        const result = await contratModel.getContratsFront({
            search: req.query.search,
        });

        return res.json({
            ok: true,
            contrats: result.contrats,
            total: result.total,
        });
    } catch (error) {
        return handleError(res, error, "Impossible de charger les contrats.");
    }
};

exports.getHistoriqueRenouvellementsContrat = async (req, res) => {
    try {
        const renouvellements = await contratModel.getHistoriqueRenouvellementsContrat(
            req.params.id,
            req.query?.source_donnee
        );

        return res.json({
            ok: true,
            renouvellements,
        });
    } catch (error) {
        return handleError(res, error, "Impossible de charger l'historique des renouvellements.");
    }
};

exports.renouvelerContrat = async (req, res) => {
    try {
        const actionUser = readActionUser(req.body, req.user);
        const result = await contratModel.renouvelerContrat(
            req.params.id,
            req.body?.source_donnee,
            actionUser
        );

        return res.json({
            ok: true,
            message: "Contrat renouvelé avec succès.",
            ...result,
        });
    } catch (error) {
        return handleError(res, error, "Impossible de renouveler le contrat.");
    }
};
