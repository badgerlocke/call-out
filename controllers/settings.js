const mongoose = require("mongoose");
const validator = require("validator");
const User = require("../models/User");
const {
  isUserNameTaken,
  slugifyUserName,
  validateUserName,
} = require("../utils/username");
const { destroyUserSessions } = require("../utils/sessions");
const { plainText } = require("../utils/html");

const THEMES = new Set(["light", "forest"]);

function field(value, maxLength = 500) {
  return plainText(value, maxLength);
}

function normalizedEmail(value) {
  const email = field(value, 254);
  if (!email) return "";
  return (
    validator.normalizeEmail(email, { gmail_remove_dots: false }) ||
    email.toLowerCase()
  );
}

function contactFromBody(body) {
  return {
    name: field(body.name, 100),
    email: normalizedEmail(body.email),
    phone: field(body.phone, 40),
    relationship: field(body.relationship, 100),
    notes: field(body.notes, 1000),
  };
}

function validateContact(contact) {
  const errors = [];
  if (!contact.name) errors.push({ msg: "Contact name is required." });
  if (contact.email && !validator.isEmail(contact.email)) {
    errors.push({ msg: "Please enter a valid contact email address." });
  }
  if (!contact.email && !contact.phone) {
    errors.push({ msg: "Add an email address or phone number for the contact." });
  }
  return errors;
}

function comparePassword(user, password) {
  return new Promise((resolve, reject) => {
    user.comparePassword(password, (err, isMatch) => {
      if (err) return reject(err);
      resolve(isMatch);
    });
  });
}

exports.getSettings = (req, res) => {
  const user = req.user.toObject({ virtuals: true });
  const hasPassword = Boolean(user.password);
  delete user.password;
  res.render("settings", {
    title: "Settings",
    user,
    hasPassword,
  });
};

exports.updateProfile = async (req, res, next) => {
  const realName = field(req.body.realName, 100);
  const submittedUserName = field(req.body.userName, 40);
  const userName = slugifyUserName(submittedUserName);
  const errors = [];

  if (!realName) {
    errors.push({ msg: "Display name is required." });
  }

  const userNameError =
    submittedUserName && !userName
      ? "Username needs at least one letter or number."
      : validateUserName(userName);
  if (userNameError) {
    errors.push({ msg: userNameError });
  }

  if (errors.length) {
    req.flash("errors", errors);
    return res.redirect("/settings#profile");
  }

  try {
    if (await isUserNameTaken(userName, req.user.id)) {
      req.flash("errors", { msg: "That username is already taken." });
      return res.redirect("/settings#profile");
    }

    req.user.realName = realName;
    req.user.userName = userName;
    await req.user.save();
    req.flash("success", { msg: "Profile updated." });
    return res.redirect("/settings#profile");
  } catch (err) {
    if (err.code === 11000) {
      req.flash("errors", { msg: "That username is already taken." });
      return res.redirect("/settings#profile");
    }
    return next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  const hadPassword = Boolean(req.user.password);
  const currentPassword =
    typeof req.body.currentPassword === "string"
      ? req.body.currentPassword
      : "";
  const password =
    typeof req.body.password === "string" ? req.body.password : "";
  const confirmPassword =
    typeof req.body.confirmPassword === "string"
      ? req.body.confirmPassword
      : "";
  const errors = [];

  if (!validator.isLength(password, { min: 8 })) {
    errors.push({ msg: "Password must be at least 8 characters long." });
  }
  if (password !== confirmPassword) {
    errors.push({ msg: "New passwords do not match." });
  }

  try {
    if (hadPassword) {
      const matches = await comparePassword(req.user, currentPassword);
      if (!matches) errors.push({ msg: "Current password is incorrect." });
    }

    if (errors.length) {
      req.flash("errors", errors);
      return res.redirect("/settings#password");
    }

    req.user.password = password;
    await req.user.save();
    try {
      await destroyUserSessions(
        req.user.id,
        { keepSessionId: req.sessionID },
        mongoose.connection.collection("sessions")
      );
    } catch (error) {
      console.error(
        "Failed to invalidate other sessions after password change:",
        error.message
      );
    }
    req.flash("success", {
      msg: hadPassword
        ? "Password changed."
        : "Password set. You can now log in with your email.",
    });
    return res.redirect("/settings#password");
  } catch (err) {
    return next(err);
  }
};

exports.updateTheme = async (req, res, next) => {
  const theme = field(req.body.theme, 20);
  if (!THEMES.has(theme)) {
    return res.status(400).json({ error: "Invalid theme." });
  }

  try {
    await User.updateOne({ _id: req.user.id }, { $set: { theme } });
    return res.sendStatus(204);
  } catch (err) {
    return next(err);
  }
};

exports.createContact = async (req, res, next) => {
  const contact = contactFromBody(req.body);
  const errors = validateContact(contact);
  if (errors.length) {
    req.flash("errors", errors);
    return res.redirect("/settings#contacts");
  }

  try {
    req.user.emergencyContacts.push(contact);
    await req.user.save();
    req.flash("success", { msg: "Emergency contact added." });
    return res.redirect("/settings#contacts");
  } catch (err) {
    return next(err);
  }
};

exports.updateContact = async (req, res, next) => {
  const contact = contactFromBody(req.body);
  const errors = validateContact(contact);
  if (errors.length) {
    req.flash("errors", errors);
    return res.redirect("/settings#contacts");
  }

  try {
    const existing = req.user.emergencyContacts.id(req.params.contactId);
    if (!existing) {
      req.flash("errors", { msg: "Emergency contact not found." });
      return res.redirect("/settings#contacts");
    }
    existing.set(contact);
    await req.user.save();
    req.flash("success", { msg: "Emergency contact updated." });
    return res.redirect("/settings#contacts");
  } catch (err) {
    return next(err);
  }
};

exports.deleteContact = async (req, res, next) => {
  try {
    const contact = req.user.emergencyContacts.id(req.params.contactId);
    if (!contact) {
      req.flash("errors", { msg: "Emergency contact not found." });
      return res.redirect("/settings#contacts");
    }
    contact.deleteOne();
    await req.user.save();
    req.flash("success", { msg: "Emergency contact deleted." });
    return res.redirect("/settings#contacts");
  } catch (err) {
    return next(err);
  }
};
