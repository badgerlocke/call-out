const { rateLimit } = require("express-rate-limit");

const authPostLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    req.flash("errors", {
      msg: "Too many attempts. Please wait 15 minutes and try again.",
    });
    res.redirect(req.path);
  },
});

module.exports = {
  authPostLimit,
};
