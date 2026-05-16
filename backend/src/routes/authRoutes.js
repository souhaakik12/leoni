const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/login", authController.login);
router.put("/profile", authController.updateProfile);
router.post("/change-password", authController.changePassword);
router.post("/forgot-password", authController.forgotPassword);
router.get("/reset-password/:token", authController.validateResetPasswordToken);
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
