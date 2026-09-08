const test = require("node:test");
const assert = require("node:assert/strict");

const templates = require("../controllers/emails");
const {
  contactAlertsEnabled,
  notifyContacts,
  userAlertsEnabled,
} = require("../controllers/reminders");

const trip = {
  _id: "trip-1",
  returnTime: new Date("2026-09-08T20:00:00.000Z"),
  notifyTime: new Date("2026-09-08T20:30:00.000Z"),
};

const user = {
  email: "user@example.com",
  realName: "Alex",
  emergencyContacts: [
    { _id: "contact-1", email: "contact@example.com" },
  ],
};

test("user alert flags default to configured email credentials", () => {
  assert.equal(userAlertsEnabled({ EMAIL: "sender@example.com", EMAIL_PW: "secret" }), true);
  assert.equal(userAlertsEnabled({ EMAIL: "sender@example.com" }), false);
  assert.equal(
    userAlertsEnabled({
      USER_ALERTS_ENABLED: "false",
      EMAIL: "sender@example.com",
      EMAIL_PW: "secret",
    }),
    false
  );
  assert.equal(userAlertsEnabled({ USER_ALERTS_ENABLED: "true" }), true);
});

test("contact alerts default off and require an explicit true value", () => {
  assert.equal(contactAlertsEnabled({}), false);
  assert.equal(contactAlertsEnabled({ CONTACT_ALERTS_ENABLED: "false" }), false);
  assert.equal(contactAlertsEnabled({ CONTACT_ALERTS_ENABLED: "TRUE" }), true);
});

test("reminder and overdue messages address only the account holder", async () => {
  const reminder = await templates.reminderEmail(trip, user);
  const overdue = await templates.overdueEmail(trip, user);

  assert.equal(reminder.to, user.email);
  assert.equal(overdue.to, user.email);
  assert.equal(reminder.cc, undefined);
  assert.equal(reminder.bcc, undefined);
  assert.equal(overdue.cc, undefined);
  assert.equal(overdue.bcc, undefined);
  assert.equal(reminder.text.includes("contact@example.com"), false);
  assert.equal(overdue.text.includes("contact@example.com"), false);
});

test("contact notification builds a payload but dry-runs without delivery", async () => {
  let deliveries = 0;
  const logs = [];
  const result = await notifyContacts(trip, user, {
    enabled: false,
    transporter: {
      sendMail: async () => {
        deliveries += 1;
      },
    },
    logger: {
      info: (entry) => logs.push(entry),
    },
  });

  assert.equal(deliveries, 0);
  assert.deepEqual(result.payload.to, ["contact@example.com"]);
  assert.deepEqual(logs, [
    {
      event: "contact-alert-dry-run",
      tripId: "trip-1",
      contactIds: ["contact-1"],
      wouldSend: true,
    },
  ]);
});

test("enabling contact alerts does not send to unconsented contacts", async () => {
  let deliveries = 0;
  await notifyContacts(trip, user, {
    enabled: true,
    transporter: {
      sendMail: async () => {
        deliveries += 1;
      },
    },
    logger: { info: () => {} },
  });

  assert.equal(deliveries, 0);
});
