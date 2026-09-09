const test = require("node:test");
const assert = require("node:assert/strict");

const {
  canAccept,
  canCancel,
  canDecline,
  canUnfriend,
  canViewTrip,
  FEED_LIMIT,
  friendsFeedQuery,
  otherParticipant,
  requestDecision,
  resolveTripVisibility,
  sortedPair,
} = require("../utils/friends");
const { userNameMatchRegex, validateUserName } = require("../utils/username");

const A = "507f1f77bcf86cd799439011";
const B = "507f1f77bcf86cd799439012";
const C = "507f1f77bcf86cd799439013";

test("sortedPair stores the lower id first so A-B and B-A collide", () => {
  assert.deepEqual(sortedPair(B, A), sortedPair(A, B));
  assert.equal(sortedPair(A, A), null);
  assert.equal(sortedPair(A, B).userLow, A);
  assert.equal(sortedPair(A, B).userHigh, B);
});

test("only the addressee can accept or decline a pending request", () => {
  const pending = { requester: A, addressee: B, status: "pending" };
  assert.equal(canAccept(B, pending), true);
  assert.equal(canDecline(B, pending), true);
  assert.equal(canAccept(A, pending), false);
  assert.equal(canDecline(A, pending), false);
  assert.equal(canAccept(C, pending), false);
});

test("only the requester can cancel a pending request", () => {
  const pending = { requester: A, addressee: B, status: "pending" };
  assert.equal(canCancel(A, pending), true);
  assert.equal(canCancel(B, pending), false);
  assert.equal(canCancel(A, { ...pending, status: "accepted" }), false);
});

test("either accepted friend can unfriend", () => {
  const accepted = { requester: A, addressee: B, status: "accepted" };
  assert.equal(canUnfriend(A, accepted), true);
  assert.equal(canUnfriend(B, accepted), true);
  assert.equal(canUnfriend(C, accepted), false);
  assert.equal(
    canUnfriend(A, { requester: A, addressee: B, status: "pending" }),
    false
  );
});

test("a reverse request accepts the incoming pending friendship", () => {
  const pending = { requester: A, addressee: B, status: "pending" };
  assert.equal(requestDecision(null, A).action, "create");
  assert.equal(requestDecision(pending, A).action, "alreadyPending");
  assert.equal(requestDecision(pending, B).action, "acceptIncoming");
  assert.equal(
    requestDecision({ ...pending, status: "accepted" }, A).action,
    "alreadyFriends"
  );
});

test("owners always see their trips; private trips never leak to friends", () => {
  const privateTrip = { user: A, visibility: "private" };
  const friendsTrip = { user: A, visibility: "friends" };

  assert.equal(canViewTrip(A, privateTrip, true), true);
  assert.equal(canViewTrip(B, privateTrip, true), false);
  assert.equal(canViewTrip(B, privateTrip, false), false);
  assert.equal(canViewTrip(B, friendsTrip, true), true);
  assert.equal(canViewTrip(B, friendsTrip, false), false);
  assert.equal(canViewTrip(C, friendsTrip, false), false);
  assert.equal(canViewTrip(A, friendsTrip, false), true);
});

test("friends feed query only includes friends-visible trips from friend ids", () => {
  const query = friendsFeedQuery([A, B]);
  assert.deepEqual(query.user.$in, [A, B]);
  assert.equal(query.visibility, "friends");
  assert.equal(FEED_LIMIT, 100);
});

test("new trips default to private unless the body or account default says friends", () => {
  assert.equal(resolveTripVisibility("friends", "private"), "friends");
  assert.equal(resolveTripVisibility("private", "friends"), "private");
  assert.equal(resolveTripVisibility("public", "friends"), "friends");
  assert.equal(resolveTripVisibility(undefined, "private"), "private");
  assert.equal(resolveTripVisibility("nope", undefined), "private");
});

test("friends is a reserved username", () => {
  assert.equal(
    validateUserName("friends"),
    "That username is reserved. Please choose another."
  );
});

test("username search matches mixed-case handles as a prefix", () => {
  const exact = userNameMatchRegex("sage");
  const prefix = userNameMatchRegex("sage", { prefix: true });
  assert.equal(exact.test("Sage"), true);
  assert.equal(exact.test("sage_1"), false);
  assert.equal(prefix.test("Sage_1"), true);
  assert.equal(prefix.flags.includes("i"), true);
});

test("otherParticipant skips friendships with a missing user", () => {
  const accepted = { requester: { _id: A }, addressee: { _id: B }, status: "accepted" };
  assert.equal(otherParticipant(accepted, A)._id, B);
  assert.equal(otherParticipant({ requester: null, addressee: { _id: B } }, A), null);
  assert.equal(otherParticipant({ requester: { _id: A }, addressee: null }, A), null);
});
