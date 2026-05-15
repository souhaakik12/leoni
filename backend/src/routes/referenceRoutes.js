const express = require("express");
const router = express.Router();

const referenceController = require("../controllers/referenceController");

router.get("/candidat-options", referenceController.getCandidatOptions);
router.get("/entretien-options", referenceController.getEntretienOptions);

module.exports = router;
