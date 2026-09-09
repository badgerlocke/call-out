const mongoose = require("mongoose");
const passport = require("passport");
const nodemailer = require("nodemailer");
const validator = require("validator");
const User = require("../models/User");
const { uniqueUserName } = require("../utils/username");
const {
  canIssuePasswordReset,
  createResetToken,
  hashResetToken,
  isResetToken,
  passwordResetConfigured,
  resetUrl,
} = require("../utils/password-reset");
const { destroyUserSessions } = require("../utils/sessions");
const { escapeHtml, plainText } = require("../utils/html");
const { addDefaultFriend } = require("../utils/default-friend");

function sessionsCollection() {
  return mongoose.connection.collection("sessions");
}

function logInFreshSession(req, user, successMessage, res, next) {
  const returnTo = req.session.returnTo;
  req.session.regenerate((err) => {
    if (err) {
      return next(err);
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", { msg: successMessage });
      res.redirect(returnTo || "/");
    });
  });
}

function resetTransporter() {
  if (!process.env.EMAIL || !process.env.EMAIL_PW) {
    throw new Error("EMAIL and EMAIL_PW are required to send password resets.");
  }
  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PW,
    },
  });
}

function resetEmail(user, url) {
  const displayName = user.realName || user.userName || "there";
  const safeDisplayName = escapeHtml(displayName);
  const safeUrl = escapeHtml(url);
  return {
    from: process.env.EMAIL
      ? `"Call Out App" <${process.env.EMAIL}>`
      : "Call Out App",
    to: user.email,
    subject: "Reset your Call Out password",
    text: `Hi ${displayName},\n\nUse this link to reset your Call Out password within one hour:\n${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hi ${safeDisplayName},</p><p>Use the link below to reset your Call Out password within one hour.</p><p><a href="${safeUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  };
}

exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("login", {
    title: "Login",
    googleAuthEnabled: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
  });
};

exports.postLogin = (req, res, next) => {
  const validationErrors = [];
  const email = typeof req.body.email === "string" ? req.body.email : "";
  const password =
    typeof req.body.password === "string" ? req.body.password : "";

  if (!validator.isEmail(email))
    validationErrors.push({ msg: "Please enter a valid email address." });
  if (validator.isEmpty(password))
    validationErrors.push({ msg: "Password cannot be blank." });

  if (validationErrors.length) {
    req.flash("errors", validationErrors);
    return res.redirect("/login");
  }
  req.body.email = validator.normalizeEmail(email, {
    gmail_remove_dots: false,
  });
  req.body.password = password;

  passport.authenticate("local", (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash("errors", {
        msg: "The email or password you entered is incorrect.",
      });
      return res.redirect("/login");
    }
    logInFreshSession(req, user, "Success! You are logged in.", res, next);
  })(req, res, next);
};

exports.getForgotPassword = (req, res) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("forgot-password", { title: "Forgot Password" });
};

exports.postForgotPassword = async (req, res, next) => {
  const email = typeof req.body.email === "string" ? req.body.email : "";
  const genericMessage =
    "If an account exists for that email, a password reset link has been sent.";

  try {
    if (!passwordResetConfigured()) {
      req.flash("errors", {
        msg: "Password reset is unavailable right now. Please try again later.",
      });
      return res.redirect("/forgot-password");
    }

    if (validator.isEmail(email)) {
      const normalizedEmail = validator.normalizeEmail(email, {
        gmail_remove_dots: false,
      });
      const user = await User.findOne({ email: normalizedEmail });

      if (canIssuePasswordReset(user)) {
        const reset = createResetToken();
        user.resetPasswordToken = reset.tokenHash;
        user.resetPasswordExpires = reset.expiresAt;
        await user.save();

        try {
          await resetTransporter().sendMail(
            resetEmail(user, resetUrl(req, reset.token))
          );
        } catch (error) {
          await User.updateOne(
            { _id: user.id, resetPasswordToken: reset.tokenHash },
            { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
          );
          console.error("Password reset email failed:", error.message);
          req.flash("errors", {
            msg: "We could not send a reset email. Please try again later.",
          });
          return res.redirect("/forgot-password");
        }
      }
    }

    req.flash("info", { msg: genericMessage });
    return res.redirect("/forgot-password");
  } catch (error) {
    return next(error);
  }
};

exports.getResetPassword = async (req, res, next) => {
  try {
    if (!isResetToken(req.params.token)) {
      req.flash("errors", {
        msg: "That password reset link is invalid or has expired.",
      });
      return res.redirect("/forgot-password");
    }

    const tokenHash = hashResetToken(req.params.token);
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!canIssuePasswordReset(user)) {
      req.flash("errors", {
        msg: "That password reset link is invalid or has expired.",
      });
      return res.redirect("/forgot-password");
    }

    return res.render("reset-password", {
      title: "Reset Password",
      token: req.params.token,
    });
  } catch (error) {
    return next(error);
  }
};

exports.postResetPassword = async (req, res, next) => {
  const password =
    typeof req.body.password === "string" ? req.body.password : "";
  const confirmPassword =
    typeof req.body.confirmPassword === "string"
      ? req.body.confirmPassword
      : "";

  if (!isResetToken(req.params.token)) {
    req.flash("errors", {
      msg: "That password reset link is invalid or has expired.",
    });
    return res.redirect("/forgot-password");
  }
  if (!validator.isLength(password, { min: 8 })) {
    req.flash("errors", {
      msg: "Password must be at least 8 characters long.",
    });
    return res.redirect(`/reset-password/${req.params.token}`);
  }
  if (password !== confirmPassword) {
    req.flash("errors", { msg: "Passwords do not match." });
    return res.redirect(`/reset-password/${req.params.token}`);
  }

  try {
    const tokenHash = hashResetToken(req.params.token);
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!canIssuePasswordReset(user)) {
      req.flash("errors", {
        msg: "That password reset link is invalid or has expired.",
      });
      return res.redirect("/forgot-password");
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    try {
      await destroyUserSessions(user.id, {}, sessionsCollection());
    } catch (error) {
      console.error("Failed to invalidate sessions after password reset:", error.message);
    }

    req.flash("success", {
      msg: "Your password has been reset. You can now log in.",
    });
    return res.redirect("/login");
  } catch (error) {
    return next(error);
  }
};

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err)
        console.log("Error : Failed to destroy the session during logout.", err);
      req.user = null;
      res.redirect("/");
    });
  });
};

exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("signup", {
    title: "Create Account",
  });
};

exports.postSignup = async (req, res, next) => {
  const validationErrors = [];
  const realName = plainText(req.body.realName, 100);
  const email = typeof req.body.email === "string" ? req.body.email : "";
  const password =
    typeof req.body.password === "string" ? req.body.password : "";
  const confirmPassword =
    typeof req.body.confirmPassword === "string"
      ? req.body.confirmPassword
      : "";

  if (!realName)
    validationErrors.push({ msg: "Please enter your name." });
  if (!validator.isEmail(email))
    validationErrors.push({ msg: "Please enter a valid email address." });
  if (!validator.isLength(password, { min: 8 }))
    validationErrors.push({
      msg: "Password must be at least 8 characters long",
    });
  if (password !== confirmPassword)
    validationErrors.push({ msg: "Passwords do not match" });

  if (validationErrors.length) {
    req.flash("errors", validationErrors);
    return res.redirect("/signup");
  }
  const normalizedEmail = validator.normalizeEmail(email, {
    gmail_remove_dots: false,
  });

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      req.flash("errors", {
        msg: "An account with that email address already exists.",
      });
      return res.redirect("/signup");
    }

    const user = new User({
      realName,
      userName: await uniqueUserName(realName),
      email: normalizedEmail,
      password,
    });
    await user.save();
    try {
      await addDefaultFriend(user.id);
    } catch (error) {
      console.error("Failed to add the default friend:", error.message);
    }
    logInFreshSession(req, user, "Your account has been created.", res, next);
  } catch (err) {
    if (err.code === 11000) {
      req.flash("errors", {
        msg: "An account with that email address already exists.",
      });
      return res.redirect("/signup");
    }
    return next(err);
  }
};
