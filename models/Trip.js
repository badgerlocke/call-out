const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
  participants: {
    type: Array,
    default: []
  },
  description: {
    type: String,
    required: true,
  },
  emergencyContacts: {
    type: Array,
    default: []
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  dueBack: {
    type: Date,
    required: true,
  }
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