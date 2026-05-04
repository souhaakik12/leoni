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

exports.renouvelerContrat = async (req, res) => {
    try {
        const result = await contratModel.renouvelerContrat(
            req.params.id,
            req.body?.source_donnee
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
