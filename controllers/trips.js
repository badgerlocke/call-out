const Trip = require("../models/Trip");
const User = require("../models/User")

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
  getProfile: async (req, res) => {
    try {
      const trips = await Trip.find({ user: req.user.id });
      const isAfterToday = (date) => {
        const today = new Date();
        return date > today;
      }
      // for (let i=0; i< trips.length; i++) {
      //   console.log(`Is ${trips[i].returnTime} after today? ${isAfterToday(trips[i].returnTime)}`)
      // }
      res.render("profile.ejs", { trips: trips, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },
  getFeed: async (req, res) => {
    try {
      const trips = await Trip.find().sort({ createdAt: "desc" }).lean();
      res.render("feed.ejs", { trips: trips, user: req.user });
    } catch (err) {
      console.log(err);
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
    res.redirect("/home?newTrip=1");
  },
  getTemplate: async (req, res) => {
    try {
      const trips = await Trip.find().sort({ createdAt: "desc" }).lean();
      res.render("template.ejs", { trips: trips });
    } catch (err) {
      console.log(err);
    }
  },
  getTrip: async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.id);
      res.render("trip.ejs", { trip: trip, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },
  createTrip: async (req, res) => {
    console.log(req.body)
    try {
      const returnTime = resolveReturnTime(req.body);
      if (!returnTime) {
        console.log("Trip needs a return date and time");
        return res.redirect("/home?newTrip=1");
      }
      await Trip.create({
        user: req.user.id,
        location: req.body.location,
        details: req.body.details,
        tripType: req.body.tripType,
        returnTime: returnTime,
        notifyTime: resolveNotifyTime(returnTime, req.body),
        notify: wantsNotify(req.body),
      });
      console.log("Trip has been added!");
      res.redirect("/home");
    } catch (err) {
      console.log(err);
      res.redirect("/home")
    }
  },
  checkIn: async (req, res) => {
    try {
      let trip = await Trip.findById(req.params.id);
      if (trip.checkedIn) {
        //If user has already checked in, yell at them. This check becomes unnecessary if checkin button is only displayed for active trips.
        console.log("You're already checked in.")
        res.redirect(`/home`);
      } else {
        //Otherwise, check in
        await Trip.findOneAndUpdate(
          { _id: req.params.id },
          {
            checkedIn: true
          }
        );
        console.log("Checked in");
        res.redirect(`/home`);
      }
    } catch (err) {
      console.log(err);
    }
  },
  deleteTrip: async (req, res) => {
    try {
      await Trip.deleteOne({ _id: req.params.id });
      console.log("Deleted Trip");
      res.redirect("/home");
    } catch (err) {
      res.redirect("/home");
    }
  },
};
