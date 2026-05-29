const express = require("express");
const router = express.Router();

const controller = require("../controllers/candidatController");
const { CONTRACT_ALLOWED_ROLES, requireRole } = require("../middleware/roleMiddleware");

console.log("[BOOT] candidatRoutes.js charge");

router.use((req, _res, next) => {
    console.log(`[DEBUG candidatRoutes] ${req.method} ${req.originalUrl}`);
    next();
});

router.get("/mouvements", controller.listerMouvements);
router.get("/", controller.listerCandidats);
router.post("/", controller.createCandidat);
router.put("/:id", (req, _res, next) => {
    console.log(`[DEBUG candidatRoutes] PUT /api/candidats/${req.params.id} atteint`);
    next();
}, controller.updateCandidat);
router.delete("/:id", controller.deleteCandidat);
router.put("/:id/etape", controller.updateEtape);
router.post("/:id/contrat/signer", requireRole(CONTRACT_ALLOWED_ROLES), controller.signerContratCandidat);
router.post("/:id/dossier-contrat/valider", requireRole(CONTRACT_ALLOWED_ROLES), controller.validerDossierContrat);
router.put("/:id/suivi-contrat", requireRole(CONTRACT_ALLOWED_ROLES), controller.updateSuiviContrat);

module.exports = router;
