const Trip = require("../models/Trip");
const User = require("../models/User")

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
    try {
      // const trips = await Trip.find({ user: req.user.id });
      res.render("newtrip.ejs");
    } catch (err) {
      console.log(err);
    }
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
      await Trip.create({
        user: req.user.id,
        location: req.body.location,
        details: req.body.details,
        tripType: req.body.tripType,
        returnTime: req.body.returnTime,
        notifyTime: req.body.notifyTime,
        notify: Boolean(req.body.notify),
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
      let trip = await Trip.findById({ _id: req.params.id });
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
      // Find trip by id
      let trip = await Trip.findById({ _id: req.params.id });
      // Delete trip from db
      await Trip.remove({ _id: req.params.id });
      console.log("Deleted Trip");
      res.redirect("/home");
    } catch (err) {
      res.redirect("/home");
    }
  },
};
