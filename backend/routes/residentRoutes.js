const express = require("express");
const residentController = require("../controllers/residentController");

const router = express.Router();

router.get("/resident/:foyer_id", residentController.getResidentsByFoyerId);
router.post("/resident", residentController.createResident);
router.put("/resident/:id", residentController.updateResident);
router.delete("/resident/:id", residentController.deleteResident);

module.exports = router;

