const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const homeController = require("../controllers/home");
const tripsController = require("../controllers/trips");
const { ensureAuth, ensureGuest } = require("../middleware/auth");

//Main Routes - simplified for now
router.get("/", homeController.getIndex);
router.get("/profile", ensureAuth, tripsController.getProfile);
router.get("/feed", ensureAuth, tripsController.getFeed);
router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);
router.get("/logout", authController.logout);
router.get("/signup", authController.getSignup);
router.get("/template", tripsController.getTemplate);
router.get("/mytrips", tripsController.getMyTrips);

router.post("/signup", authController.postSignup);

module.exports = router;
