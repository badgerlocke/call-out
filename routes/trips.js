const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const tripsController = require("../controllers/trips");
const { ensureAuth, ensureGuest } = require("../middleware/auth");
//Enable SMS reminders if Twilio acount info is available
if (process.env.TWILIO_ACCOUNT_SID) {
    const enableReminders = require('../controllers/reminders')
} else {
    console.log('Reminders disabled--see README for info on how to enable them')
} 

//Trip Routes - simplified for now
// router.get("/:id", ensureAuth, tripsController.getTrip); This is interfering with the line below
router.get("/newtrip", ensureAuth, tripsController.getNewTrip);

router.post("/createTrip", tripsController.createTrip);

router.put("/checkIn/:id", tripsController.checkIn)

router.delete("/deleteTrip/:id", tripsController.deleteTrip);


module.exports = router;
