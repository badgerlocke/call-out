const express = require("express");
const { ensureAdmin } = require("../middleware/auth");
const adminController = require("../controllers/admin");

const router = express.Router();

router.use(ensureAdmin);

router.get("/", adminController.getDashboard);
router.post("/users/:id/ban", adminController.banUser);
router.post("/users/:id/unban", adminController.unbanUser);
router.delete("/users/:id", adminController.deleteUser);
router.delete("/trips/:id", adminController.deleteTrip);

module.exports = router;
