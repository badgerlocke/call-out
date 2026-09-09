const Friendship = require("../models/Friendship");

const VISIBILITY = new Set(["private", "friends"]);
const FEED_LIMIT = 100;

function idString(value) {
  if (!value) return "";
  if (value._id) return String(value._id);
  return String(value);
}

function sortedPair(idA, idB) {
  const a = idString(idA);
  const b = idString(idB);
  if (!a || !b || a === b) return null;
  return a < b ? { userLow: a, userHigh: b } : { userLow: b, userHigh: a };
}

function otherUserId(friendship, viewerId) {
  const viewer = idString(viewerId);
  if (idString(friendship.requester) === viewer) {
    return idString(friendship.addressee);
  }
  if (idString(friendship.addressee) === viewer) {
    return idString(friendship.requester);
  }
  return "";
}

function otherParticipant(friendship, viewerId) {
  if (!friendship || !friendship.requester || !friendship.addressee) {
    return null;
  }
  const viewer = idString(viewerId);
  if (idString(friendship.requester) === viewer) return friendship.addressee;
  if (idString(friendship.addressee) === viewer) return friendship.requester;
  return null;
}

function isParticipant(friendship, userId) {
  const uid = idString(userId);
  return (
    idString(friendship.requester) === uid ||
    idString(friendship.addressee) === uid
  );
}

function canAccept(actorId, friendship) {
  return (
    friendship &&
    friendship.status === "pending" &&
    idString(friendship.addressee) === idString(actorId)
  );
}

function canDecline(actorId, friendship) {
  return canAccept(actorId, friendship);
}

function canCancel(actorId, friendship) {
  return (
    friendship &&
    friendship.status === "pending" &&
    idString(friendship.requester) === idString(actorId)
  );
}

function canUnfriend(actorId, friendship) {
  return (
    friendship &&
    friendship.status === "accepted" &&
    isParticipant(friendship, actorId)
  );
}

function requestDecision(existing, requesterId) {
  if (!existing) return { action: "create" };
  if (existing.status === "accepted") {
    return { action: "alreadyFriends" };
  }
  if (existing.status === "pending") {
    if (idString(existing.requester) === idString(requesterId)) {
      return { action: "alreadyPending" };
    }
    if (idString(existing.addressee) === idString(requesterId)) {
      return { action: "acceptIncoming" };
    }
  }
  return { action: "create" };
}

function resolveTripVisibility(bodyVisibility, userDefault) {
  if (VISIBILITY.has(bodyVisibility)) return bodyVisibility;
  return userDefault === "friends" ? "friends" : "private";
}

function tripOwnerId(trip) {
  return idString(trip && trip.user);
}

function canViewTrip(viewerId, trip, isFriend) {
  if (!viewerId || !trip) return false;
  if (tripOwnerId(trip) === idString(viewerId)) return true;
  return trip.visibility === "friends" && Boolean(isFriend);
}

function friendsFeedQuery(friendIds) {
  return {
    user: { $in: friendIds },
    visibility: "friends",
  };
}

async function areFriends(userA, userB) {
  const pair = sortedPair(userA, userB);
  if (!pair) return false;
  return Boolean(
    await Friendship.exists({
      userLow: pair.userLow,
      userHigh: pair.userHigh,
      status: "accepted",
    })
  );
}

async function findPair(userA, userB) {
  const pair = sortedPair(userA, userB);
  if (!pair) return null;
  return Friendship.findOne({
    userLow: pair.userLow,
    userHigh: pair.userHigh,
  });
}

async function ensureAcceptedFriendship(
  requesterId,
  addresseeId,
  FriendshipModel = Friendship
) {
  const pair = sortedPair(requesterId, addresseeId);
  if (!pair) return null;

  const update = {
    $set: { status: "accepted" },
    $setOnInsert: {
      requester: requesterId,
      addressee: addresseeId,
      userLow: pair.userLow,
      userHigh: pair.userHigh,
    },
  };

  try {
    return await FriendshipModel.findOneAndUpdate(pair, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return FriendshipModel.findOneAndUpdate(
        pair,
        { $set: { status: "accepted" } },
        { new: true }
      );
    }
    throw error;
  }
}

async function acceptedFriendIds(userId) {
  const uid = idString(userId);
  if (!uid) return [];
  const rows = await Friendship.find({
    status: "accepted",
    $or: [{ requester: uid }, { addressee: uid }],
  }).lean();
  return rows.map((row) => otherUserId(row, uid)).filter(Boolean);
}

module.exports = {
  FEED_LIMIT,
  VISIBILITY,
  acceptedFriendIds,
  areFriends,
  canAccept,
  canCancel,
  canDecline,
  canUnfriend,
  canViewTrip,
  ensureAcceptedFriendship,
  findPair,
  friendsFeedQuery,
  idString,
  isParticipant,
  otherParticipant,
  otherUserId,
  requestDecision,
  resolveTripVisibility,
  sortedPair,
  tripOwnerId,
};
