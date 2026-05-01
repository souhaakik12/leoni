const express = require("express");
const { ROLE_ADMIN, requireRole } = require("../middleware/roleMiddleware");
const utilisateurController = require("../controllers/utilisateurController");

const router = express.Router();

router.get("/invite/:token", utilisateurController.getInviteByToken);
router.post("/invite/:token/setup", utilisateurController.setupAccount);

router.use(requireRole([ROLE_ADMIN]));

router.get("/", utilisateurController.listUtilisateurs);
router.post("/", utilisateurController.createUtilisateur);
router.put("/:id", utilisateurController.updateUtilisateur);
router.delete("/:id", utilisateurController.deleteUtilisateur);

module.exports = router;
