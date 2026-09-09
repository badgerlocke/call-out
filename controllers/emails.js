// Contains alert email wording.
const Users = require("../models/User");
const { escapeHtml } = require("../utils/html");

async function findUser(trip) {
  return Users.findById(trip.user);
}

function senderAddress() {
  return process.env.EMAIL
    ? `"Call Out App" <${process.env.EMAIL}>`
    : "Call Out App";
}

async function resolveUser(trip, user) {
  return user || findUser(trip);
}

module.exports = {
  reminderEmail: async (trip, suppliedUser) => {
    const user = await resolveUser(trip, suppliedUser);
    const words = `Your trip was expected to return at ${trip.returnTime}. Please log in to Call Out and check in before ${trip.notifyTime}.`;
    return {
      from: senderAddress(),
      to: user.email,
      subject: "Reminder to check in",
      text: words,
      html: `<p>${escapeHtml(words)}</p>`,
    };
  },

  overdueEmail: async (trip, suppliedUser) => {
    const user = await resolveUser(trip, suppliedUser);
    const words = `You have not checked in for your trip that was expected to return at ${trip.returnTime}. Please log in to Call Out and check in as soon as you are safe.`;
    return {
      from: senderAddress(),
      to: user.email,
      subject: "You are overdue — please check in",
      text: words,
      html: `<p>${escapeHtml(words)}</p>`,
    };
  },

  contactSosEmail: (trip, user, contacts) => {
    const displayName = user.realName || user.userName || "A Call Out user";
    const words = `Please check on ${displayName}. They have not checked in for a trip that was expected to return at ${trip.returnTime}.`;
    return {
      from: senderAddress(),
      to: contacts.map((contact) => contact.email),
      subject: `${displayName} has not checked in`,
      text: words,
      html: `<p>${escapeHtml(words)}</p>`,
    };
  },
};

