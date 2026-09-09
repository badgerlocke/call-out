const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RESET_TOKEN_TTL_MS,
  canIssuePasswordReset,
  createResetToken,
  hashResetToken,
  isResetToken,
  passwordResetConfigured,
  resetUrl,
} = require("../utils/password-reset");

test("password reset tokens are random, hashed, and expire in one hour", () => {
  const now = Date.parse("2026-09-08T20:00:00.000Z");
  const first = createResetToken(now);
  const second = createResetToken(now);

  assert.notEqual(first.token, second.token);
  assert.equal(first.token.length, 64);
  assert.equal(first.tokenHash, hashResetToken(first.token));
  assert.notEqual(first.tokenHash, first.token);
  assert.equal(first.expiresAt.getTime(), now + RESET_TOKEN_TTL_MS);
});

test("password reset links prefer the configured public app URL", () => {
  const req = {
    protocol: "http",
    get: () => "untrusted.example",
  };

  assert.equal(
    resetUrl(req, "abc123", { APP_URL: "https://callout.example/" }),
    "https://callout.example/reset-password/abc123"
  );
});

test("password reset links fall back to the request origin in development", () => {
  const req = {
    protocol: "http",
    get: () => "localhost:3000",
  };

  assert.equal(
    resetUrl(req, "abc123", {}),
    "http://localhost:3000/reset-password/abc123"
  );
});

test("password reset links require a configured origin in production", () => {
  const req = {
    protocol: "https",
    get: () => "untrusted.example",
  };

  assert.throws(
    () => resetUrl(req, "abc123", { NODE_ENV: "production" }),
    /APP_URL is required/
  );
});

test("password reset is not issued for missing or banned accounts", () => {
  assert.equal(canIssuePasswordReset(null), false);
  assert.equal(canIssuePasswordReset({ bannedAt: new Date() }), false);
  assert.equal(canIssuePasswordReset({ bannedAt: null }), true);
});

test("password reset is configured only when email credentials exist", () => {
  assert.equal(passwordResetConfigured({}), false);
  assert.equal(passwordResetConfigured({ EMAIL: "a@example.com" }), false);
  assert.equal(
    passwordResetConfigured({ EMAIL: "a@example.com", EMAIL_PW: "secret" }),
    true
  );
});

test("reset tokens must be 64 hex characters", () => {
  assert.equal(isResetToken("abc123"), false);
  assert.equal(isResetToken("a".repeat(64)), true);
  assert.equal(isResetToken("A".repeat(64)), true);
  assert.equal(isResetToken(`${"a".repeat(63)}g`), false);
});
