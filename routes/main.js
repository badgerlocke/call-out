const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const tripsController = require("../controllers/trips");
const { ensureAuth } = require("../middleware/auth");
const { authPostLimit } = require("../middleware/rate-limit");

//Main Routes
router.get("/", ensureAuth, tripsController.getHome);
router.get("/home", (req, res) => {
  const queryIndex = req.originalUrl.indexOf("?");
  const query = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);
  res.redirect(`/${query}`);
});
router.get("/profile", ensureAuth, (req, res) => res.redirect("/settings"));
router.get("/feed", ensureAuth, tripsController.getFeed);
router.get("/mytrips", ensureAuth, tripsController.getMyTrips);

//Routes for user login/signup
router.get("/login", authController.getLogin);
router.post("/login", authPostLimit, authController.postLogin);
router.get("/logout", authController.logout);
router.get("/signup", authController.getSignup);
router.post("/signup", authPostLimit, authController.postSignup);
router.get("/forgot-password", authController.getForgotPassword);
router.post("/forgot-password", authPostLimit, authController.postForgotPassword);
router.get("/reset-password/:token", authController.getResetPassword);
router.post("/reset-password/:token", authPostLimit, authController.postResetPassword);

router.get("/template", ensureAuth, (req, res) => res.redirect("/"));

module.exports = router;
