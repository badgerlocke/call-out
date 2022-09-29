const cloudinary = require("../middleware/cloudinary");
const Trip = require("../models/Trip");
const Comment = require("../models/Comment");
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
      for (let i=0; i< trips.length; i++) {
        console.log(`Is ${trips[i].returnTime} after today? ${isAfterToday(trips[i].returnTime)}`)
      }
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
      const comments = await Comment.find({trip: req.params.id}).sort({ createdAt: "desc" }).populate('user').lean();
      res.render("trip.ejs", { trip: trip, user: req.user, comments: comments });
    } catch (err) {
      console.log(err);
    }
  },
  addPic: async (req, res) => {
      // TODO - add pics to trip or user profile
      // Upload image to cloudinary
      // const result = await cloudinary.uploader.upload(req.file.path);
              // image: result.secure_url,
        // cloudinaryId: result.public_id,
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
  likeTrip: async (req, res) => {
    try {
      let trip = await Trip.findById({ _id: req.params.id });
      if (trip.likedBy.includes(req.user.id)) {
        //If user has already liked the trip, remove their like
        console.log('User already liked this')
        await Trip.findOneAndUpdate(
          { _id: req.params.id },
          {
            $inc: { likes: -1 },
            $pull: { likedBy: req.user.id}
          }
        );
        //Update triper's like count
        await User.findOneAndUpdate(
          { _id: trip.user },
          {
            $inc: { likes: -1 },
          }
        );
        console.log("Likes -1");
        res.redirect(`/trip/${req.params.id}`);
      } else {
        //Otherwise, add a like
        await Trip.findOneAndUpdate(
          { _id: req.params.id },
          {
            $inc: { likes: 1 },
            $addToSet: { likedBy: req.user.id}
          }
        );
        //Update triper's like count
        await User.findOneAndUpdate(
         { _id: trip.user },
            {
              $inc: { likes: 1 },
            }
        );
        console.log("Likes +1");
        res.redirect(`/trip/${req.params.id}`);
      }
    } catch (err) {
      console.log(err);
    }
  },
  checkIn: async (req, res) => {

  },
  deleteTrip: async (req, res) => {
    try {
      // Find trip by id
      let trip = await Trip.findById({ _id: req.params.id });
      // Delete image from cloudinary
      await cloudinary.uploader.destroy(trip.cloudinaryId);
      // Delete trip from db
      await Trip.remove({ _id: req.params.id });
      console.log("Deleted Trip");
      res.redirect("/home");
    } catch (err) {
      res.redirect("/home");
    }
  },
};
