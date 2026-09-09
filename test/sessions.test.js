const test = require("node:test");
const assert = require("node:assert/strict");

const { destroyUserSessions, userSessionFilter } = require("../utils/sessions");

test("session filters match both object and stringified passport payloads", () => {
  const filter = userSessionFilter("507f1f77bcf86cd799439011");
  assert.deepEqual(filter.$or[0], {
    "session.passport.user": "507f1f77bcf86cd799439011",
  });
  assert.equal(
    filter.$or[1].session.$regex,
    `"passport":\\{"user":"507f1f77bcf86cd799439011"`
  );
});

test("destroyUserSessions deletes matching sessions and can keep one", async () => {
  const deleted = [];
  const collection = {
    deleteMany: async (filter) => {
      deleted.push(filter);
    },
  };

  await destroyUserSessions("user-1", { keepSessionId: "keep-me" }, collection);

  assert.equal(deleted.length, 1);
  assert.equal(deleted[0]._id.$ne, "keep-me");
  assert.equal(deleted[0].$or[0]["session.passport.user"], "user-1");
});

test("destroyUserSessions no-ops without a user or collection", async () => {
  await destroyUserSessions("", {}, { deleteMany: async () => {
    throw new Error("should not run");
  } });
  await destroyUserSessions("user-1");
});
