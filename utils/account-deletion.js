const mongoose = require("mongoose");
const User = require("../models/User");
const Trip = require("../models/Trip");
const Friendship = require("../models/Friendship");
const { destroyUserSessions } = require("./sessions");

function sessionsCollection() {
  return mongoose.connection.collection("sessions");
}

async function deleteAccountData(
  userId,
  {
    UserModel = User,
    TripModel = Trip,
    FriendshipModel = Friendship,
    collection = sessionsCollection(),
  } = {}
) {
  if (!userId) {
    throw new Error("A user id is required.");
  }

  await TripModel.deleteMany({ user: userId });
  await FriendshipModel.deleteMany({
    $or: [{ requester: userId }, { addressee: userId }],
  });
  await destroyUserSessions(userId, {}, collection);
  return UserModel.deleteOne({ _id: userId });
}

module.exports = {
  deleteAccountData,
  sessionsCollection,
};
