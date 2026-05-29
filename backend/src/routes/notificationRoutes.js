const express = require("express");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.get("/:userId/unread-count", notificationController.getUnreadCount);
router.get("/:userId", notificationController.getNotificationsByUserId);
router.put("/:notificationId/read", notificationController.markAsRead);
router.put("/:userId/read-all", notificationController.markAllAsRead);

module.exports = router;
