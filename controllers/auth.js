const passport = require("passport");
const validator = require("validator");
const User = require("../models/User");
const { uniqueUserName } = require("../utils/username");

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
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", { msg: "Success! You are logged in." });
      res.redirect(req.session.returnTo || "/");
    });
  })(req, res, next);
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
  const realName =
    typeof req.body.realName === "string" ? req.body.realName.trim() : "";
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
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", { msg: "Your account has been created." });
      res.redirect("/");
    });
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
