const mongoose = require("mongoose");

const FriendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userLow: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userHigh: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

FriendshipSchema.index({ userLow: 1, userHigh: 1 }, { unique: true });
FriendshipSchema.index({ addressee: 1, status: 1 });
FriendshipSchema.index({ requester: 1, status: 1 });

FriendshipSchema.pre("validate", function setPair(next) {
  if (!this.requester || !this.addressee) {
    return next();
  }
  const a = String(this.requester);
  const b = String(this.addressee);
  if (a === b) {
    this.invalidate("addressee", "You cannot add yourself as a friend.");
    return next();
  }
  if (a < b) {
    this.userLow = this.requester;
    this.userHigh = this.addressee;
  } else {
    this.userLow = this.addressee;
    this.userHigh = this.requester;
  }
  next();
});

const Friendship = mongoose.model("Friendship", FriendshipSchema);

async function syncFriendshipIndexes(attempt = 1) {
  try {
    await Friendship.syncIndexes();
  } catch (err) {
    console.error(
      `Failed to sync Friendship indexes (attempt ${attempt}):`,
      err.message
    );
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      return syncFriendshipIndexes(attempt + 1);
    }
    process.exit(1);
  }
}

if (mongoose.connection.readyState === 1) {
  syncFriendshipIndexes();
} else {
  mongoose.connection.once("connected", syncFriendshipIndexes);
}

module.exports = Friendship;
