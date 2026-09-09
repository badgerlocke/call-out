const express = require("express");
const router = express.Router();
const tripsController = require("../controllers/trips");
const { ensureAuth } = require("../middleware/auth");

//Trip Routes - simplified for now
// router.get("/:id", ensureAuth, tripsController.getTrip); This is interfering with the line below
router.get("/newtrip", ensureAuth, tripsController.getNewTrip);

router.post("/createTrip", ensureAuth, tripsController.createTrip);

router.put("/checkIn/:id", ensureAuth, tripsController.checkIn)

router.put("/:id/visibility", ensureAuth, tripsController.updateVisibility)

router.delete("/deleteTrip/:id", ensureAuth, tripsController.deleteTrip);


module.exports = router;
