const crypto = require("crypto");

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

function isResetToken(token) {
  return typeof token === "string" && RESET_TOKEN_PATTERN.test(token);
}

function passwordResetConfigured(env = process.env) {
  return Boolean(env.EMAIL && env.EMAIL_PW);
}

function canIssuePasswordReset(user) {
  return Boolean(user && !user.bannedAt);
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createResetToken(now = Date.now()) {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now + RESET_TOKEN_TTL_MS),
  };
}

function resetUrl(req, token, env = process.env) {
  const configuredBaseUrl =
    typeof env.APP_URL === "string" ? env.APP_URL.trim() : "";
  if (!configuredBaseUrl && env.NODE_ENV === "production") {
    throw new Error("APP_URL is required to send password resets in production.");
  }
  const baseUrl =
    configuredBaseUrl.replace(/\/+$/, "") ||
    `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/reset-password/${token}`;
}

module.exports = {
  RESET_TOKEN_TTL_MS,
  canIssuePasswordReset,
  createResetToken,
  hashResetToken,
  isResetToken,
  passwordResetConfigured,
  resetUrl,
};
