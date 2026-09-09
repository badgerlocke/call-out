require("dotenv").config({ path: "./config/.env" });

const mongoose = require("mongoose");
const User = require("../models/User");
const Friendship = require("../models/Friendship");
const { backfillDefaultFriendships } = require("../utils/default-friend");
const { userNameMatchRegex } = require("../utils/username");

function resolveAdminUserName(argv = process.argv, env = process.env) {
  const raw = argv[2] || env.ADMIN_USERNAME || "";
  const userName = String(raw)
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
  if (!userName) {
    throw new Error(
      "Usage: node scripts/bootstrap-admin.js <adminUsername> (or set ADMIN_USERNAME)."
    );
  }
  return userName;
}

async function main() {
  const userName = resolveAdminUserName();

  if (!process.env.DB_STRING) {
    throw new Error("DB_STRING is required.");
  }

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

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = {
  resolveAdminUserName,
};
