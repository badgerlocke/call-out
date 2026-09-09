// Monitors active trips and sends email alerts independently of SMS/Twilio.
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const Trips = require("../models/Trip");
const Users = require("../models/User");
const templates = require("./emails");

const ALERT_CRON = "*/5 * * * *";

function flagIsTrue(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "true";
}

function userAlertsEnabled(env = process.env) {
  if (env.USER_ALERTS_ENABLED !== undefined) {
    return flagIsTrue(env.USER_ALERTS_ENABLED);
  }
  return Boolean(env.EMAIL && env.EMAIL_PW);
}

function contactAlertsEnabled(env = process.env) {
  return flagIsTrue(env.CONTACT_ALERTS_ENABLED);
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PW,
    },
  });
}

function startAlertWorker() {
  if (!userAlertsEnabled()) {
    console.log(
      "User alerts disabled. Set USER_ALERTS_ENABLED=true and configure EMAIL/EMAIL_PW to enable them."
    );
    return null;
  }

  if (!process.env.EMAIL || !process.env.EMAIL_PW) {
    console.error(
      "User alerts requested, but EMAIL and EMAIL_PW are not both configured."
    );
    return null;
  }

  const transporter = createTransporter();
  console.log(`User alert cron scheduled (${ALERT_CRON})`);
  return cron.schedule(ALERT_CRON, () => {
    checkForLate({ transporter }).catch((error) => {
      console.error("User alert run failed:", error);
    });
  });
}

function validContacts(user) {
  if (!user || !Array.isArray(user.emergencyContacts)) return [];
  return user.emergencyContacts.filter(
    (contact) => contact && typeof contact.email === "string" && contact.email
  );
}

async function notifyContacts(
  trip,
  user,
  { transporter, logger = console, enabled = contactAlertsEnabled() } = {}
) {
  const resolvedContacts =
    user && Array.isArray(user.emergencyContacts)
      ? user.emergencyContacts
      : [];
  const contacts = validContacts(user);
  const payload = templates.contactSosEmail(trip, user, contacts);
  const contactIds = resolvedContacts.map((contact) => String(contact._id));

  if (!enabled) {
    logger.info({
      event: "contact-alert-dry-run",
      tripId: String(trip._id),
      contactIds,
      wouldSend: true,
    });
    return { delivered: false, payload };
  }

  // Contact delivery remains consent-only. The settings model does not add
  // consent state yet, so enabling the flag cannot mail unconsented contacts.
  const consentedContacts = contacts.filter(
    (contact) => contact.status === "accepted"
  );
  if (consentedContacts.length === 0) {
    logger.info({
      event: "contact-alert-no-consented-recipients",
      tripId: String(trip._id),
      contactIds,
      wouldSend: false,
    });
    return { delivered: false, payload };
  }

  const consentedPayload = templates.contactSosEmail(
    trip,
    user,
    consentedContacts
  );
  const mailer = transporter || createTransporter();
  await mailer.sendMail(consentedPayload);
  return { delivered: true, payload: consentedPayload };
}

async function checkForLate({ transporter = createTransporter() } = {}) {
  const remindTrips = await findTripsDue();
  console.log(`Sending user reminders for ${remindTrips.length} trips.`);
  for (const trip of remindTrips) {
    try {
      const user = await Users.findById(trip.user);
      if (!user || !user.email) {
        console.error(`Reminder skipped for trip ${trip.id}: user email missing`);
        continue;
      }
      await transporter.sendMail(await templates.reminderEmail(trip, user));
      await markSent(trip, "reminderSent");
    } catch (error) {
      console.error(`Reminder failed for trip ${trip.id}:`, error);
    }
  }

  const lateTrips = await findLate();
  console.log(`Sending user overdue alerts for ${lateTrips.length} trips.`);
  for (const trip of lateTrips) {
    try {
      const user = await Users.findById(trip.user);
      if (!user || !user.email) {
        console.error(`Overdue alert skipped for trip ${trip.id}: user email missing`);
        continue;
      }
      await transporter.sendMail(await templates.overdueEmail(trip, user));
      await notifyContacts(trip, user, { transporter });
      await markSent(trip, "sosSent");
    } catch (error) {
      console.error(`Overdue alert failed for trip ${trip.id}:`, error);
    }
  }
}

// Find unchecked trips past their notification deadline.
async function findLate(now = new Date()) {
  return Trips.find({
    checkedIn: false,
    sosSent: false,
    notify: { $ne: false },
    notifyTime: { $lte: now },
  });
}

// Find unchecked trips past return time but before their notification deadline.
async function findTripsDue(now = new Date()) {
  return Trips.find({
    checkedIn: false,
    reminderSent: false,
    notify: { $ne: false },
    returnTime: { $lte: now },
    notifyTime: { $gt: now },
  });
}

async function markSent(trip, type) {
  await Trips.findOneAndUpdate(
    { _id: trip.id, checkedIn: false, [type]: false },
    { [type]: true }
  );
}

module.exports = {
  ALERT_CRON,
  checkForLate,
  contactAlertsEnabled,
  findLate,
  findTripsDue,
  notifyContacts,
  startAlertWorker,
  userAlertsEnabled,
};