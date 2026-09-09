const User = require("../models/User");
const Friendship = require("../models/Friendship");
const {
  canAccept,
  canCancel,
  canDecline,
  canUnfriend,
  findPair,
  idString,
  otherParticipant,
  otherUserId,
  requestDecision,
} = require("../utils/friends");
const { slugifyUserName, userNameMatchRegex } = require("../utils/username");

function displayName(user) {
  if (!user) return "Someone";
  return user.realName || user.userName || "Someone";
}

function relationFor(friendship, viewerId) {
  if (!friendship) return "none";
  if (friendship.status === "accepted") return "friends";
  const viewer = idString(viewerId);
  if (idString(friendship.requester) === viewer) return "outgoing";
  if (idString(friendship.addressee) === viewer) return "incoming";
  return "none";
}

async function friendshipMapForUsers(viewerId, userIds) {
  if (!userIds.length) return new Map();
  const rows = await Friendship.find({
    $or: [
      { requester: viewerId, addressee: { $in: userIds } },
      { addressee: viewerId, requester: { $in: userIds } },
    ],
  }).lean();
  const map = new Map();
  for (const row of rows) {
    map.set(otherUserId(row, viewerId), row);
  }
  return map;
}

function withRelation(user, friendship, viewerId) {
  return {
    id: user._id,
    userName: user.userName,
    realName: user.realName,
    friendshipId: friendship && friendship._id,
    relation: relationFor(friendship, viewerId),
  };
}

exports.getFriends = async (req, res, next) => {
  try {
    const viewerId = req.user.id;
    const query = slugifyUserName(req.query.q || "");

    const [incoming, outgoing, accepted] = await Promise.all([
      Friendship.find({ addressee: viewerId, status: "pending" })
        .populate("requester", "userName realName")
        .sort({ createdAt: -1 })
        .lean(),
      Friendship.find({ requester: viewerId, status: "pending" })
        .populate("addressee", "userName realName")
        .sort({ createdAt: -1 })
        .lean(),
      Friendship.find({
        status: "accepted",
        $or: [{ requester: viewerId }, { addressee: viewerId }],
      })
        .populate("requester", "userName realName")
        .populate("addressee", "userName realName")
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    let searchResults = [];
    if (query) {
      const users = await User.find({
        userName: { $regex: userNameMatchRegex(query, { prefix: true }) },
        _id: { $ne: viewerId },
      })
        .select("userName realName")
        .limit(10)
        .lean();
      const map = await friendshipMapForUsers(
        viewerId,
        users.map((user) => user._id)
      );
      searchResults = users.map((user) =>
        withRelation(user, map.get(String(user._id)), viewerId)
      );
    }

    const friends = accepted.flatMap((row) => {
      const other = otherParticipant(row, viewerId);
      return other ? [withRelation(other, row, viewerId)] : [];
    });

    res.render("friends", {
      user: req.user,
      query: req.query.q || "",
      searchResults,
      incoming: incoming.flatMap((row) =>
        row.requester
          ? [{ friendshipId: row._id, user: row.requester }]
          : []
      ),
      outgoing: outgoing.flatMap((row) =>
        row.addressee
          ? [{ friendshipId: row._id, user: row.addressee }]
          : []
      ),
      friends,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getFriendProfile = async (req, res, next) => {
  try {
    const handle = slugifyUserName(req.params.userName);
    if (!handle) {
      req.flash("errors", { msg: "User not found." });
      return res.redirect("/friends");
    }

    const found = await User.findOne({
      userName: { $regex: userNameMatchRegex(handle) },
    })
      .select("userName realName")
      .lean();

    if (!found) {
      req.flash("errors", { msg: "User not found." });
      return res.redirect("/friends");
    }

    if (String(found._id) === String(req.user.id)) {
      return res.redirect("/settings#profile");
    }

    const friendship = await findPair(req.user.id, found._id);
    res.render("friend-profile", {
      user: req.user,
      profile: withRelation(found, friendship && friendship.toObject(), req.user.id),
    });
  } catch (err) {
    return next(err);
  }
};

exports.requestFriend = async (req, res, next) => {
  const handle = slugifyUserName(req.body.userName);
  if (!handle) {
    req.flash("errors", { msg: "Enter a username to add." });
    return res.redirect("/friends");
  }

  let found;
  try {
    found = await User.findOne({
      userName: { $regex: userNameMatchRegex(handle) },
    }).select("_id userName realName");

    if (!found) {
      req.flash("errors", { msg: "No account uses that username." });
      return res.redirect("/friends");
    }

    if (String(found._id) === String(req.user.id)) {
      req.flash("errors", { msg: "You cannot add yourself as a friend." });
      return res.redirect("/friends");
    }

    const existing = await findPair(req.user.id, found._id);
    const decision = requestDecision(existing, req.user.id);

    if (decision.action === "alreadyFriends") {
      flashRequestDecision(req, decision.action, found);
      return res.redirect("/friends");
    }
    if (decision.action === "alreadyPending") {
      flashRequestDecision(req, decision.action, found);
      return res.redirect("/friends");
    }
    if (decision.action === "acceptIncoming") {
      existing.status = "accepted";
      await existing.save();
      flashRequestDecision(req, decision.action, found);
      return res.redirect("/friends");
    }

    await Friendship.create({
      requester: req.user.id,
      addressee: found._id,
    });
    flashRequestDecision(req, "create", found);
    return res.redirect("/friends");
  } catch (err) {
    if (err.code === 11000) {
      try {
        if (!found) {
          req.flash("info", { msg: "A friend request is already pending." });
          return res.redirect("/friends");
        }
        const raced = await findPair(req.user.id, found._id);
        const racedDecision = requestDecision(raced, req.user.id);
        if (racedDecision.action === "acceptIncoming") {
          raced.status = "accepted";
          await raced.save();
        }
        const flashAction =
          racedDecision.action === "create" ? "alreadyPending" : racedDecision.action;
        flashRequestDecision(req, flashAction, found);
        return res.redirect("/friends");
      } catch (lookupErr) {
        return next(lookupErr);
      }
    }
    return next(err);
  }
};

function flashRequestDecision(req, action, found) {
  if (action === "alreadyFriends") {
    req.flash("info", { msg: `You are already friends with ${displayName(found)}.` });
    return;
  }
  if (action === "alreadyPending") {
    req.flash("info", { msg: "Friend request already sent." });
    return;
  }
  if (action === "acceptIncoming") {
    req.flash("success", { msg: `You and ${displayName(found)} are now friends.` });
    return;
  }
  if (action === "create") {
    req.flash("success", { msg: `Friend request sent to @${found.userName}.` });
    return;
  }
  req.flash("info", { msg: "A friend request is already pending." });
}

async function loadOwnFriendship(req) {
  const friendship = await Friendship.findById(req.params.id);
  if (!friendship) return null;
  if (
    String(friendship.requester) !== String(req.user.id) &&
    String(friendship.addressee) !== String(req.user.id)
  ) {
    return null;
  }
  return friendship;
}

exports.acceptFriend = async (req, res, next) => {
  try {
    const friendship = await loadOwnFriendship(req);
    if (!canAccept(req.user.id, friendship)) {
      req.flash("errors", { msg: "Friend request not found." });
      return res.redirect("/friends");
    }
    friendship.status = "accepted";
    await friendship.save();
    req.flash("success", { msg: "Friend request accepted." });
    return res.redirect("/friends");
  } catch (err) {
    return next(err);
  }
};

exports.declineFriend = async (req, res, next) => {
  try {
    const friendship = await loadOwnFriendship(req);
    if (!canDecline(req.user.id, friendship)) {
      req.flash("errors", { msg: "Friend request not found." });
      return res.redirect("/friends");
    }
    await friendship.deleteOne();
    req.flash("success", { msg: "Friend request declined." });
    return res.redirect("/friends");
  } catch (err) {
    return next(err);
  }
};

exports.cancelFriend = async (req, res, next) => {
  try {
    const friendship = await loadOwnFriendship(req);
    if (!canCancel(req.user.id, friendship)) {
      req.flash("errors", { msg: "Friend request not found." });
      return res.redirect("/friends");
    }
    await friendship.deleteOne();
    req.flash("success", { msg: "Friend request canceled." });
    return res.redirect("/friends");
  } catch (err) {
    return next(err);
  }
};

exports.unfriend = async (req, res, next) => {
  try {
    const friendship = await loadOwnFriendship(req);
    if (!canUnfriend(req.user.id, friendship)) {
      req.flash("errors", { msg: "Friendship not found." });
      return res.redirect("/friends");
    }
    await friendship.deleteOne();
    req.flash("success", { msg: "Removed from friends." });
    return res.redirect("/friends");
  } catch (err) {
    return next(err);
  }
};
