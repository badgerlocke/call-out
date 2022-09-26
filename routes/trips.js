const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const tripsController = require("../controllers/trips");
const { ensureAuth, ensureGuest } = require("../middleware/auth");

//Trip Routes - simplified for now
router.get("/:id", ensureAuth, tripsController.getTrip);
router.get("/newtrip", ensureAuth, tripsController.getNewTrip);

router.post("/createTrip", tripsController.createTrip);

router.put("/likeTrip/:id", tripsController.likeTrip);

router.delete("/deleteTrip/:id", tripsController.deleteTrip);

module.exports = router;
