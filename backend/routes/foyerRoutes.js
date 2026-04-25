const express = require("express");
const foyerController = require("../controllers/foyerController");

const router = express.Router();

router.get("/foyers", foyerController.getAllFoyers);
router.get("/foyer/:id", foyerController.getFoyerById);

module.exports = router;

