const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/login", authController.login);
router.put("/profile", authController.updateProfile);
router.post("/change-password", authController.changePassword);

module.exports = router;
