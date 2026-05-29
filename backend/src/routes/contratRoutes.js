const express = require("express");

const controller = require("../controllers/contratController");
const { CONTRACT_ALLOWED_ROLES, requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(requireRole(CONTRACT_ALLOWED_ROLES));

router.get("/", controller.getContrats);
router.get("/:id/renouvellements", controller.getHistoriqueRenouvellementsContrat);
router.post("/:id/renouveler", controller.renouvelerContrat);

module.exports = router;
