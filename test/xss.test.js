const test = require("node:test");
const assert = require("node:assert/strict");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

const templates = require("../controllers/emails");
const { escapeHtml, plainText } = require("../utils/html");
const { CONTENT_SECURITY_POLICY, securityHeaders } = require("../middleware/security-headers");

const XSS = '<img src=x onerror=alert(1)><script>alert(1)</script>" autofocus onfocus=alert(1) x="';

test("escapeHtml encodes markup so it cannot run as HTML", () => {
  const encoded = escapeHtml(XSS);
  assert.equal(encoded.includes("<"), false);
  assert.equal(encoded.includes(">"), false);
  assert.match(encoded, /&lt;img/);
  assert.match(encoded, /&quot;/);
});

test("plainText drops null bytes and enforces a max length", () => {
  assert.equal(plainText("  hello\0world  ", 20), "helloworld");
  assert.equal(plainText("abcdef", 3), "abc");
  assert.equal(plainText(123), "");
});

test("alert emails HTML-escape attacker-controlled names", () => {
  const payload = templates.contactSosEmail(
    { returnTime: new Date("2026-09-08T20:00:00.000Z") },
    { realName: XSS, userName: XSS },
    [{ email: "contact@example.com" }]
  );

  assert.equal(payload.html.includes("<img"), false);
  assert.equal(payload.html.includes("<script>"), false);
  assert.match(payload.html, /&lt;img/);
  assert.match(payload.html, /&lt;script&gt;/);
});

test("EJS flash messages escape stored HTML", () => {
  const file = path.join(__dirname, "../views/partials/flash-messages.ejs");
  const html = ejs.render(
    fs.readFileSync(file, "utf8"),
    { messages: { errors: [{ msg: XSS }], info: [], success: [] } },
    { filename: file }
  );

  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("<script>"), false);
  assert.match(html, /&lt;img/);
});

test("EJS attribute values escape quotes from user names", () => {
  const html = ejs.render('<input value="<%= name %>">', {
    name: '" autofocus onfocus=alert(1) x="',
  });
  assert.equal(html.includes("&#34;"), true);
  assert.equal(html.includes('value="" autofocus'), false);
});

test("security headers send a script-src self CSP", () => {
  const headers = {};
  const res = {
    setHeader(name, value) {
      headers[name] = value;
    },
  };
  let continued = false;
  securityHeaders({}, res, () => {
    continued = true;
  });

  assert.equal(headers["Content-Security-Policy"], CONTENT_SECURITY_POLICY);
  assert.match(headers["Content-Security-Policy"], /script-src 'self'/);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(continued, true);
});

test("friend rows escape attacker-controlled names", () => {
  const file = path.join(__dirname, "../views/partials/friend-row.ejs");
  const html = ejs.render(
    fs.readFileSync(file, "utf8"),
    {
      showProfileLink: true,
      person: {
        userName: XSS,
        realName: XSS,
        relation: "none",
      },
    },
    { filename: file }
  );

  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("<script>"), false);
  assert.match(html, /&lt;img/);
});
