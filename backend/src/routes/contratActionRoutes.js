const express = require("express");

const controller = require("../controllers/contratActionController");
const { CONTRACT_ALLOWED_ROLES, requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(requireRole(CONTRACT_ALLOWED_ROLES));

router.get("/:id/actions-contrat", controller.getActionsContratByCandidat);

module.exports = router;
