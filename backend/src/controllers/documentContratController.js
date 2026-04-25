const documentContratModel = require("../models/documentContratModel");

function handleError(res, error, fallbackMessage) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const message = error?.message || fallbackMessage;
    console.error("Erreur documentContratController:", error);
    return res.status(status).json({
        ok: false,
        message,
    });
}

exports.getDocumentsContrat = async (req, res) => {
    try {
        const documents = await documentContratModel.getDocumentsByCandidatId(req.params.candidatId);
        return res.json({
            ok: true,
            documents,
        });
    } catch (error) {
        return handleError(res, error, "Impossible de charger les documents contrat.");
    }
};

exports.markDocumentReceived = async (req, res) => {
    try {
        await documentContratModel.markDocumentReceived(req.params.candidatId, req.params.documentId);
        return res.json({
            ok: true,
            message: "Document marque comme recu.",
        });
    } catch (error) {
        return handleError(res, error, "Impossible de marquer le document comme recu.");
    }
};

exports.markDocumentMissing = async (req, res) => {
    try {
        await documentContratModel.markDocumentMissing(req.params.candidatId, req.params.documentId);
        return res.json({
            ok: true,
            message: "Document marque comme manquant.",
        });
    } catch (error) {
        return handleError(res, error, "Impossible de marquer le document comme manquant.");
    }
};
