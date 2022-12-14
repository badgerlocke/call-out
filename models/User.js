const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

//Users need a username, password, and email.
//Optional parameters: Real name, phone number,
//location, bio, profile pic, special/medical needs
const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: false,
  },
  userName: { type: String, unique: true }, 
  realName: { type: String },
  email: { type: String, unique: true },
  password: String,
  phoneNumber: { type: Number },
  profilePic: { type: String, required: false },
  cloudinaryId: { type: String, required: false },
  location: { type: String },
  bio: { type: String },
  age: { type: Number },
  emergencyContacts: { type: Array, default: [] },
  numTrips: { type: Number, default: 0},
});

// Password hash middleware.

UserSchema.pre("save", function save(next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

// Helper method for validating user's password.

UserSchema.methods.comparePassword = function comparePassword(
  candidatePassword,
  cb
) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};

module.exports = mongoose.model("User", UserSchema);
