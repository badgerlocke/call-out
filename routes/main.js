const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const tripsController = require("../controllers/trips");
const { ensureAuth } = require("../middleware/auth");

//Main Routes
router.get("/", ensureAuth, tripsController.getHome);
router.get("/home", (req, res) => {
  const queryIndex = req.originalUrl.indexOf("?");
  const query = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);
  res.redirect(`/${query}`);
});
router.get("/profile", ensureAuth, tripsController.getProfile);
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
