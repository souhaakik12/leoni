const express = require("express");
const { ROLE_ADMIN, requireRole } = require("../middleware/roleMiddleware");
const utilisateurController = require("../controllers/utilisateurController");

const router = express.Router();

router.use(requireRole([ROLE_ADMIN]));

router.get("/", utilisateurController.getUsers);
router.post("/", utilisateurController.createUser);
router.put("/:id", utilisateurController.updateUser);
router.delete("/:id", utilisateurController.deleteUser);

module.exports = router;
