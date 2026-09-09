const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const { plainText } = require("../utils/html");
const {
  FEED_LIMIT,
  acceptedFriendIds,
  areFriends,
  canViewTrip,
  friendsFeedQuery,
  resolveTripVisibility,
} = require("../utils/friends");

const TRIP_TYPES = new Set([
  "Hiking",
  "Camping",
  "Backpacking",
  "Climbing",
  "Caving",
  "Other",
]);

const UNIT_MS = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

//The form posts an exact instant in returnTime. The date/time pair is the
//fallback for browsers that never ran the page script, and is parsed in the
//server's time zone.
function resolveReturnTime(body) {
  if (body.returnTime) {
    const fromBrowser = new Date(body.returnTime);
    if (!isNaN(fromBrowser)) return fromBrowser;
  }
  if (!body.returnDate) return null;
  const combined = new Date(`${body.returnDate}T${body.returnTimeOfDay || "23:59"}`);
  return isNaN(combined) ? null : combined;
}

function wantsNotify(body) {
  return body.notify === "true" || body.notify === "on";
}

function resolveNotifyTime(returnTime, body) {
  if (!wantsNotify(body)) return null;
  const amount = Number(body.notifyOffsetValue);
  const unit = UNIT_MS[body.notifyOffsetUnit] || UNIT_MS.hours;
  if (!returnTime || !Number.isFinite(amount) || amount <= 0) return null;
  return new Date(returnTime.getTime() + amount * unit);
}

module.exports = {
  getHome: async (req, res) => {
    try {
      const trips = await Trip.find({ user: req.user.id });
      const isAfterToday = (date) => {
        const today = new Date();
        return date > today;
      }
      for (let i=0; i< trips.length; i++) {
        console.log(`Is ${trips[i].returnTime} after today? ${isAfterToday(trips[i].returnTime)}`)
      }
      res.render("home.ejs", { trips: trips, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },
  getFeed: async (req, res, next) => {
    try {
      const friendIds = await acceptedFriendIds(req.user.id);
      const trips = friendIds.length
        ? await Trip.find(friendsFeedQuery(friendIds))
            .sort({ createdAt: "desc" })
            .limit(FEED_LIMIT)
            .populate("user", "userName realName")
            .lean()
        : [];
      res.render("feed.ejs", {
        trips,
        user: req.user,
        friendCount: friendIds.length,
      });
    } catch (err) {
      return next(err);
    }
  },
  getMyTrips: async (req, res) => {
    try {
      const trips = await Trip.find({ user: req.user.id });
      const isAfterToday = (date) => {
        const today = new Date();
        return date > today;
      }
      for (let i=0; i< trips.length; i++) {
        console.log(`Is ${trips[i].returnTime} after today? ${isAfterToday(trips[i].returnTime)}`)
      }

      res.render("mytrips.ejs", { trips: trips, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },
  getNewTrip: async (req, res) => {
    res.redirect("/?newTrip=1");
  },
  getTrip: async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        req.flash("errors", { msg: "Trip not found." });
        return res.redirect("/");
      }
      const trip = await Trip.findById(req.params.id);
      if (!trip) {
        req.flash("errors", { msg: "Trip not found." });
        return res.redirect("/");
      }
      const isFriend = await areFriends(req.user.id, trip.user);
      if (!canViewTrip(req.user.id, trip, isFriend)) {
        req.flash("errors", { msg: "Trip not found." });
        return res.redirect("/");
      }
      res.render("trip.ejs", { trip: trip, user: req.user });
    } catch (err) {
      return next(err);
    }
  },
  createTrip: async (req, res) => {
    console.log(req.body)
    try {
      const returnTime = resolveReturnTime(req.body);
      if (!returnTime) {
        console.log("Trip needs a return date and time");
        return res.redirect("/?newTrip=1");
      }
      const location = plainText(req.body.location, 200);
      if (!location) {
        return res.redirect("/?newTrip=1");
      }
      const tripType = TRIP_TYPES.has(req.body.tripType)
        ? req.body.tripType
        : "";
      await Trip.create({
        user: req.user.id,
        location,
        details: plainText(req.body.details, 2000),
        tripType,
        returnTime: returnTime,
        notifyTime: resolveNotifyTime(returnTime, req.body),
        notify: wantsNotify(req.body),
        visibility: resolveTripVisibility(
          req.body.visibility,
          req.user.tripVisibilityDefault
        ),
      });
      console.log("Trip has been added!");
      res.redirect("/");
    } catch (err) {
      console.log(err);
      res.redirect("/")
    }
  },
  checkIn: async (req, res) => {
    try {
      const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
      if (!trip) {
        return res.redirect("/");
      }
      if (trip.checkedIn) {
        //If user has already checked in, yell at them. This check becomes unnecessary if checkin button is only displayed for active trips.
        console.log("You're already checked in.")
        res.redirect(`/`);
      } else {
        //Otherwise, check in
        await Trip.findOneAndUpdate(
          { _id: req.params.id, user: req.user.id },
          {
            checkedIn: true
          }
        );
        console.log("Checked in");
        res.redirect(`/`);
      }
    } catch (err) {
      console.log(err);
    }
  },
  deleteTrip: async (req, res) => {
    try {
      await Trip.deleteOne({ _id: req.params.id, user: req.user.id });
      console.log("Deleted Trip");
      res.redirect("/");
    } catch (err) {
      res.redirect("/");
    }
  },
  updateVisibility: async (req, res) => {
    try {
      if (req.body.visibility !== "private" && req.body.visibility !== "friends") {
        return res.redirect("/");
      }
      await Trip.updateOne(
        { _id: req.params.id, user: req.user.id },
        { $set: { visibility: req.body.visibility } }
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      res.redirect("/");
    }
  },
};
