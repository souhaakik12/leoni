const express = require("express");

const controller = require("../controllers/documentContratController");
const { CONTRACT_ALLOWED_ROLES, requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(requireRole(CONTRACT_ALLOWED_ROLES));

router.get("/:candidatId/documents-contrat", controller.getDocumentsContrat);
router.post("/:candidatId/documents-contrat/:documentId/recu", controller.markDocumentReceived);
router.post("/:candidatId/documents-contrat/:documentId/manquant", controller.markDocumentMissing);

module.exports = router;
