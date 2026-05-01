const express = require("express");
const missionController = require("../controllers/missionController");

const router = express.Router();

router.get("/assigned/:userId", missionController.getAssignedMissions);
router.get("/responsables", missionController.getResponsables);
router.get("/", missionController.getMissions);
router.post("/", missionController.createMission);
router.put("/:id", missionController.updateMission);
router.delete("/:id", missionController.deleteMission);

module.exports = router;
