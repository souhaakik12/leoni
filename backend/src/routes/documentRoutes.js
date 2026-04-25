const express = require("express");
const router = express.Router();

const documentController = require("../controllers/documentController");

router.post("/register", documentController.registerDocument);
router.get("/candidat/:candidatId", documentController.getRegisteredDocumentsByCandidate);

module.exports = router;
