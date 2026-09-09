const mongoose = require("mongoose");
const User = require("../models/User");
const Trip = require("../models/Trip");
const { deleteAccountData } = require("../utils/account-deletion");
const { destroyUserSessions } = require("../utils/sessions");
const { plainText } = require("../utils/html");
const { escapeRegex } = require("../utils/username");

const RESULT_LIMIT = 100;

function sessionsCollection() {
  return mongoose.connection.collection("sessions");
}

function redirectWith(req, res, type, message) {
  req.flash(type, { msg: message });
  return res.redirect("/admin");
}

async function wouldRemoveLastAdmin(user, UserModel = User) {
  if (!user || user.role !== "admin" || user.bannedAt) return false;
  return (
    (await UserModel.countDocuments({ role: "admin", bannedAt: null })) <= 1
  );
}

exports.getDashboard = async (req, res, next) => {
  try {
    const query = plainText(req.query.q, 100);
    const regex = query ? new RegExp(escapeRegex(query), "i") : null;
    const userFilter = regex
      ? { $or: [{ userName: regex }, { realName: regex }, { email: regex }] }
      : {};
    const tripFilter = regex
      ? { $or: [{ location: regex }, { details: regex }, { tripType: regex }] }
      : {};

    const [users, trips, userCount, tripCount] = await Promise.all([
      User.find(userFilter)
        .sort({ role: -1, userName: 1 })
        .limit(RESULT_LIMIT)
        .lean(),
      Trip.find(tripFilter)
        .sort({ createdAt: -1 })
        .limit(RESULT_LIMIT)
        .populate("user", "userName realName email")
        .lean(),
      User.countDocuments(),
      Trip.countDocuments(),
    ]);

    return res.render("admin/index", {
      title: "Admin",
      user: req.user,
      query,
      users,
      trips,
      userCount,
      tripCount,
      resultLimit: RESULT_LIMIT,
    });
  } catch (error) {
    return next(error);
  }
};

exports.banUser = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return redirectWith(req, res, "errors", "Account not found.");
    }
    if (String(req.params.id) === String(req.user.id)) {
      return redirectWith(req, res, "errors", "You cannot ban your own account.");
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return redirectWith(req, res, "errors", "Account not found.");
    }
    if (await wouldRemoveLastAdmin(target)) {
      return redirectWith(req, res, "errors", "The last active admin cannot be banned.");
    }

    target.bannedAt = new Date();
    target.banReason = plainText(req.body.reason, 500);
    target.resetPasswordToken = undefined;
    target.resetPasswordExpires = undefined;
    await target.save();
    await destroyUserSessions(target.id, {}, sessionsCollection());
    return redirectWith(req, res, "success", `Banned @${target.userName}.`);
  } catch (error) {
    return next(error);
  }
};

exports.unbanUser = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return redirectWith(req, res, "errors", "Account not found.");
    }
    const target = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { bannedAt: null, banReason: "" } },
      { new: true }
    );
    if (!target) {
      return redirectWith(req, res, "errors", "Account not found.");
    }
    return redirectWith(req, res, "success", `Unbanned @${target.userName}.`);
  } catch (error) {
    return next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return redirectWith(req, res, "errors", "Account not found.");
    }
    if (String(req.params.id) === String(req.user.id)) {
      return redirectWith(req, res, "errors", "You cannot delete your own account.");
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return redirectWith(req, res, "errors", "Account not found.");
    }
    if (await wouldRemoveLastAdmin(target)) {
      return redirectWith(req, res, "errors", "The last active admin cannot be deleted.");
    }

    await deleteAccountData(target.id);
    return redirectWith(req, res, "success", `Deleted @${target.userName}.`);
  } catch (error) {
    return next(error);
  }
};

exports.deleteTrip = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return redirectWith(req, res, "errors", "Trip not found.");
    }
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) {
      return redirectWith(req, res, "errors", "Trip not found.");
    }
    return redirectWith(req, res, "success", "Trip deleted.");
  } catch (error) {
    return next(error);
  }
};

exports.wouldRemoveLastAdmin = wouldRemoveLastAdmin;
