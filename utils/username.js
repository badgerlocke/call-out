const User = require("../models/User");

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// Route names and words we do not want showing up as a handle.
const RESERVED = new Set([
  "admin",
  "api",
  "auth",
  "callout",
  "call_out",
  "feed",
  "friends",
  "help",
  "home",
  "login",
  "logout",
  "me",
  "mytrips",
  "profile",
  "root",
  "settings",
  "signup",
  "support",
  "template",
  "trips",
  "user",
  "users",
]);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function userNameMatchRegex(userName, { prefix = false } = {}) {
  const escaped = escapeRegex(userName);
  return new RegExp(`^${escaped}${prefix ? "" : "$"}`, "i");
}

// "Sage Williams" -> "sage_williams"; accents are folded so the handle stays ASCII.
function slugifyUserName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/_+$/, "");
}

// Case-insensitive so legacy mixed-case handles still count as taken.
async function isUserNameTaken(userName, excludeUserId) {
  const query = {
    userName: { $regex: userNameMatchRegex(userName) },
  };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  return Boolean(await User.exists(query));
}

function validateUserName(userName) {
  if (!userName) {
    return "Username is required.";
  }
  if (userName.length < MIN_LENGTH || userName.length > MAX_LENGTH) {
    return `Username must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(userName)) {
    return "Username can only use lowercase letters, numbers, and underscores.";
  }
  if (RESERVED.has(userName)) {
    return "That username is reserved. Please choose another.";
  }
  return null;
}

// Used when we generate a handle for the user (signup, Google sign-in).
async function uniqueUserName(baseName) {
  const slug = slugifyUserName(baseName) || "user";
  const base = slug.padEnd(MIN_LENGTH, "0");
  let candidate = base;
  let suffix = 0;

  while ((await isUserNameTaken(candidate)) || RESERVED.has(candidate)) {
    suffix += 1;
    const tail = `_${suffix}`;
    candidate = `${base.slice(0, MAX_LENGTH - tail.length)}${tail}`;
  }

  return candidate;
}

module.exports = {
  MAX_LENGTH,
  MIN_LENGTH,
  escapeRegex,
  isUserNameTaken,
  slugifyUserName,
  uniqueUserName,
  userNameMatchRegex,
  validateUserName,
};
