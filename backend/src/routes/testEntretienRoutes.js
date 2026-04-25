const express = require("express");
const router = express.Router();

const testEntretienController = require("../controllers/testEntretienController");

router.post("/", testEntretienController.createTestEntretien);
router.get("/:candidatId/latest", testEntretienController.getLatestTestEntretienByCandidate);
router.get("/:candidatId", testEntretienController.getTestEntretienHistoryByCandidate);

module.exports = router;
