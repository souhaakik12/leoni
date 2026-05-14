const contratActionModel = require("../models/contratActionModel");

function handleError(res, error, fallbackMessage) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const message = error?.message || fallbackMessage;
    console.error("Erreur contratActionController:", error);
    return res.status(status).json({
        ok: false,
        message,
    });
}

exports.getActionsContratByCandidat = async (req, res) => {
    try {
        const actions = await contratActionModel.getActionsContratByCandidat(req.params.id);
        return res.json({
            ok: true,
            actions,
        });
    } catch (error) {
        return handleError(res, error, "Impossible de charger l'historique des actions contrat.");
    }
};
