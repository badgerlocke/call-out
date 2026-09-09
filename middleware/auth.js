function isActiveUser(user) {
  return Boolean(user && !user.bannedAt);
}

function isAdminUser(user) {
  return isActiveUser(user) && user.role === "admin";
}

function ensureAuth(req, res, next) {
  if (req.isAuthenticated() && isActiveUser(req.user)) {
    return next();
  }
  return res.redirect("/login");
}

function ensureAdmin(req, res, next) {
  if (!req.isAuthenticated() || !isActiveUser(req.user)) {
    return res.redirect("/login");
  }
  if (!isAdminUser(req.user)) {
    if (req.flash) {
      req.flash("errors", { msg: "Administrator access is required." });
    }
    return res.redirect("/");
  }
  return next();
}

module.exports = {
  ensureAuth,
  ensureAdmin,
  isActiveUser,
  isAdminUser,
  ensureGuest: function (req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    } else {
      res.redirect("/");
    }
  },
};
