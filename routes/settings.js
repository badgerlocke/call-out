const express = require("express");
const { ensureAuth } = require("../middleware/auth");
const settingsController = require("../controllers/settings");

const router = express.Router();

router.use(ensureAuth);

router.get("/", settingsController.getSettings);
router.put("/profile", settingsController.updateProfile);
router.put("/password", settingsController.updatePassword);
router.put("/theme", settingsController.updateTheme);
router.post("/contacts", settingsController.createContact);
router.put("/contacts/:contactId", settingsController.updateContact);
router.delete("/contacts/:contactId", settingsController.deleteContact);

module.exports = router;
