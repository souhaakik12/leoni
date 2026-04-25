const express = require("express");
const router = express.Router();

const seanceContratController = require("../controllers/seanceContratController");

router.post("/:seanceId/reset", seanceContratController.resetSeanceContrat);
router.post("/:seanceId/close", seanceContratController.cloturerSeanceEtEnvoyerDossier);
router.post("/:seanceId/cloturer", seanceContratController.cloturerSeanceEtEnvoyerDossier);

module.exports = router;
