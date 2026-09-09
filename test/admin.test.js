const test = require("node:test");
const assert = require("node:assert/strict");

const User = require("../models/User");
const {
  ensureAdmin,
  ensureAuth,
  isActiveUser,
  isAdminUser,
} = require("../middleware/auth");
const { deleteAccountData } = require("../utils/account-deletion");
const { ensureAcceptedFriendship } = require("../utils/friends");
const {
  addDefaultFriend,
  backfillDefaultFriendships,
} = require("../utils/default-friend");
const {
  ACCOUNT_LIST_SORT,
  wouldRemoveLastAdmin,
} = require("../controllers/admin");
const { resolveAdminUserName } = require("../scripts/bootstrap-admin");

const A = "507f1f77bcf86cd799439011";
const B = "507f1f77bcf86cd799439012";
const C = "507f1f77bcf86cd799439013";

function responseRecorder() {
  return {
    redirectedTo: null,
    redirect(path) {
      this.redirectedTo = path;
      return path;
    },
  };
}

test("account list sorts admin before user so admins stay in the first page", () => {
  assert.deepEqual(ACCOUNT_LIST_SORT, { role: 1, userName: 1 });
  assert.ok("admin" < "user");
});

test("bootstrap admin requires an explicit username", () => {
  assert.equal(
    resolveAdminUserName(["node", "scripts/bootstrap-admin.js", "@Ada"], {}),
    "ada"
  );
  assert.equal(
    resolveAdminUserName(["node", "scripts/bootstrap-admin.js"], {
      ADMIN_USERNAME: "ada",
      DEFAULT_FRIEND_USERNAME: "badgerlocke",
    }),
    "ada"
  );
  assert.throws(
    () =>
      resolveAdminUserName(["node", "scripts/bootstrap-admin.js"], {
        DEFAULT_FRIEND_USERNAME: "badgerlocke",
      }),
    /adminUsername/
  );
});

test("new users default to a normal active role", () => {
  const user = new User({
    userName: "new_user",
    email: "new@example.com",
  });
  assert.equal(user.role, "user");
  assert.equal(user.bannedAt, null);
  assert.equal(isActiveUser(user), true);
  assert.equal(isAdminUser(user), false);
});

test("admin middleware rejects normal and banned users", () => {
  const normalReq = {
    user: { role: "user", bannedAt: null },
    isAuthenticated: () => true,
    flash: () => {},
  };
  const normalRes = responseRecorder();
  ensureAdmin(normalReq, normalRes, () => assert.fail("should not continue"));
  assert.equal(normalRes.redirectedTo, "/");

  const bannedReq = {
    user: { role: "admin", bannedAt: new Date() },
    isAuthenticated: () => true,
  };
  const bannedRes = responseRecorder();
  ensureAuth(bannedReq, bannedRes, () => assert.fail("should not continue"));
  assert.equal(bannedRes.redirectedTo, "/login");
});

test("admin middleware allows an active admin", () => {
  let continued = false;
  ensureAdmin(
    {
      user: { role: "admin", bannedAt: null },
      isAuthenticated: () => true,
    },
    responseRecorder(),
    () => {
      continued = true;
    }
  );
  assert.equal(continued, true);
});

test("last active admin is protected without blocking banned admin cleanup", async () => {
  const UserModel = {
    countDocuments: async () => 1,
  };
  assert.equal(
    await wouldRemoveLastAdmin(
      { role: "admin", bannedAt: null },
      UserModel
    ),
    true
  );
  assert.equal(
    await wouldRemoveLastAdmin(
      { role: "admin", bannedAt: new Date() },
      UserModel
    ),
    false
  );
});

test("account deletion removes trips, friendships, sessions, then user", async () => {
  const calls = [];
  await deleteAccountData(A, {
    TripModel: {
      deleteMany: async (filter) => calls.push(["trips", filter]),
    },
    FriendshipModel: {
      deleteMany: async (filter) => calls.push(["friendships", filter]),
    },
    UserModel: {
      deleteOne: async (filter) => calls.push(["user", filter]),
    },
    collection: {
      deleteMany: async (filter) => calls.push(["sessions", filter]),
    },
  });

  assert.deepEqual(
    calls.map(([name]) => name),
    ["trips", "friendships", "sessions", "user"]
  );
  assert.deepEqual(calls[0][1], { user: A });
  assert.deepEqual(calls[2][1].$or[0], {
    "session.passport.user": A,
  });
});

test("accepted friendship upsert is idempotent and upgrades pending rows", async () => {
  const calls = [];
  const FriendshipModel = {
    findOneAndUpdate: async (...args) => {
      calls.push(args);
      return { status: "accepted" };
    },
  };

  const result = await ensureAcceptedFriendship(A, B, FriendshipModel);
  assert.equal(result.status, "accepted");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].$set.status, "accepted");
  assert.equal(calls[0][2].upsert, true);
  assert.equal(calls[0][0].userLow, A);
  assert.equal(calls[0][0].userHigh, B);
});

test("default friendship skips Tom and accepts everyone else", async () => {
  const updates = [];
  const defaultFriend = { _id: A, userName: "badgerlocke" };
  const UserModel = {
    findOne: async () => defaultFriend,
  };
  const FriendshipModel = {
    findOneAndUpdate: async (...args) => {
      updates.push(args);
      return { status: "accepted" };
    },
  };

  assert.equal(
    await addDefaultFriend(A, { UserModel, FriendshipModel }),
    null
  );
  await addDefaultFriend(B, { UserModel, FriendshipModel });
  assert.equal(updates.length, 1);
  assert.equal(updates[0][1].$set.status, "accepted");
});

test("backfill creates accepted friendships for all non-Tom users", async () => {
  const updatedPairs = [];
  const defaultFriend = { _id: A, userName: "badgerlocke" };
  const UserModel = {
    findOne: async () => defaultFriend,
    find: () => ({
      select: () => ({
        lean: async () => [{ _id: B }, { _id: C }],
      }),
    }),
  };
  const FriendshipModel = {
    findOneAndUpdate: async (pair) => {
      updatedPairs.push(pair);
      return { status: "accepted" };
    },
  };

  const result = await backfillDefaultFriendships({
    UserModel,
    FriendshipModel,
  });
  assert.equal(result.createdOrUpdated, 2);
  assert.equal(updatedPairs.length, 2);
});
