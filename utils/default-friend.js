const User = require("../models/User");
const Friendship = require("../models/Friendship");
const { ensureAcceptedFriendship, idString } = require("./friends");
const { userNameMatchRegex } = require("./username");

const DEFAULT_FRIEND_USERNAME = "badgerlocke";

function configuredDefaultFriendUserName() {
  return process.env.DEFAULT_FRIEND_USERNAME || DEFAULT_FRIEND_USERNAME;
}

async function findDefaultFriend(UserModel = User) {
  return UserModel.findOne({
    userName: {
      $regex: userNameMatchRegex(configuredDefaultFriendUserName()),
    },
  });
}

async function addDefaultFriend(
  userId,
  { UserModel = User, FriendshipModel = Friendship } = {}
) {
  if (!userId) return null;
  const defaultFriend = await findDefaultFriend(UserModel);
  if (!defaultFriend || idString(defaultFriend) === idString(userId)) {
    return null;
  }
  return ensureAcceptedFriendship(
    userId,
    defaultFriend._id,
    FriendshipModel
  );
}

async function backfillDefaultFriendships(
  { UserModel = User, FriendshipModel = Friendship } = {}
) {
  const defaultFriend = await findDefaultFriend(UserModel);
  if (!defaultFriend) {
    return { defaultFriend: null, createdOrUpdated: 0 };
  }

  const users = await UserModel.find({ _id: { $ne: defaultFriend._id } })
    .select("_id")
    .lean();
  for (const user of users) {
    await ensureAcceptedFriendship(
      user._id,
      defaultFriend._id,
      FriendshipModel
    );
  }
  return {
    defaultFriend,
    createdOrUpdated: users.length,
  };
}

module.exports = {
  DEFAULT_FRIEND_USERNAME,
  addDefaultFriend,
  backfillDefaultFriendships,
  configuredDefaultFriendUserName,
  findDefaultFriend,
};
