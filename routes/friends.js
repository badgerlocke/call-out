const express = require("express");
const { ensureAuth } = require("../middleware/auth");
const { friendRequestLimit } = require("../middleware/rate-limit");
const friendsController = require("../controllers/friends");

const router = express.Router();

router.use(ensureAuth);

router.get("/", friendsController.getFriends);
router.get("/u/:userName", friendsController.getFriendProfile);
router.post("/request", friendRequestLimit, friendsController.requestFriend);
router.post("/:id/accept", friendsController.acceptFriend);
router.post("/:id/decline", friendsController.declineFriend);
router.post("/:id/cancel", friendsController.cancelFriend);
router.post("/:id/unfriend", friendsController.unfriend);

module.exports = router;
