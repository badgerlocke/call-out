require("dotenv").config({ path: "./config/.env" });

const mongoose = require("mongoose");
const User = require("../models/User");
const Friendship = require("../models/Friendship");
const { backfillDefaultFriendships } = require("../utils/default-friend");
const { userNameMatchRegex } = require("../utils/username");

async function main() {
  const userName = String(
    process.argv[2] || process.env.DEFAULT_FRIEND_USERNAME || "badgerlocke"
  )
    .replace(/^@/, "")
    .toLowerCase();

  if (!process.env.DB_STRING) {
    throw new Error("DB_STRING is required.");
  }

  process.env.DEFAULT_FRIEND_USERNAME = userName;
  await mongoose.connect(process.env.DB_STRING);
  await Promise.all([User.syncIndexes(), Friendship.syncIndexes()]);

  const admin = await User.findOneAndUpdate(
    { userName: { $regex: userNameMatchRegex(userName) } },
    {
      $set: {
        role: "admin",
        bannedAt: null,
        banReason: "",
      },
    },
    { new: true }
  );
  if (!admin) {
    throw new Error(`Could not find @${userName}. Create that account first.`);
  }

  const result = await backfillDefaultFriendships();
  console.log(
    `Promoted @${admin.userName} and updated ${result.createdOrUpdated} default friendships.`
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
