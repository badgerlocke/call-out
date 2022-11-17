const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const homeController = require("../controllers/home");
const tripsController = require("../controllers/trips");
const { ensureAuth, ensureGuest } = require("../middleware/auth");

//Main Routes
router.get("/", homeController.getIndex);
router.get("/profile", ensureAuth, tripsController.getProfile);
router.get("/home", ensureAuth, tripsController.getHome);
router.get("/feed", ensureAuth, tripsController.getFeed);
router.get("/mytrips", tripsController.getMyTrips);

//Routes for user login/signup
router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);
router.get("/logout", authController.logout);
router.get("/signup", authController.getSignup);
router.post("/signup", authController.postSignup);

//Testing
router.get("/template", tripsController.getTemplate);

module.exports = router;
