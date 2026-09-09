const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const EmergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

//Users need a username, password, and email.
//Optional parameters: Real name, phone number,
//location, bio, profile pic, special/medical needs
const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  userName: { type: String }, 
  realName: { type: String },
  email: { type: String, unique: true },
  password: String,
  resetPasswordToken: { type: String, select: false, index: true },
  resetPasswordExpires: { type: Date, select: false },
  phoneNumber: { type: Number },
  profilePic: { type: String, required: false },
  cloudinaryId: { type: String, required: false },
  location: { type: String },
  bio: { type: String },
  age: { type: Number },
  theme: {
    type: String,
    enum: ["light", "forest"],
  },
  emergencyContacts: {
    type: [EmergencyContactSchema],
    default: [],
  },
  numTrips: { type: Number, default: 0},
});

UserSchema.index(
  { userName: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

UserSchema.pre("validate", function dropInvalidContacts(next) {
  if (!Array.isArray(this.emergencyContacts)) {
    this.emergencyContacts = [];
    return next();
  }
  this.emergencyContacts = this.emergencyContacts.filter((contact) => {
    const name = contact && contact.name;
    return typeof name === "string" && name.trim();
  });
  next();
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

const User = mongoose.model("User", UserSchema);

async function syncUserIndexes() {
  try {
    await User.syncIndexes();
  } catch (err) {
    console.error("Failed to sync User indexes:", err.message);
  }
}

if (mongoose.connection.readyState === 1) {
  syncUserIndexes();
} else {
  mongoose.connection.once("connected", syncUserIndexes);
}

module.exports = User;
