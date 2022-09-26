const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  location: {
    type: String,
    required: true,
  },
  details: {
    type: String
  },
  tripType: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  returnTime: {
    type: Date,
    required: true,
  },
  notifyTime: {
    type: Date
  },
  notify: {
    type: Boolean,
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  // participants: {
  //   type: Array,
  //   default: []
  // },
});

module.exports = mongoose.model("Trip", TripSchema);

//In case you want to add them back in later:
  // image: {
  //   type: String,
  //   required: true,
  // },
  // cloudinaryId: {
  //   type: String,
  //   required: true,
  // },