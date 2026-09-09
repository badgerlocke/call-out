const LocalStrategy = require("passport-local").Strategy;

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const { uniqueUserName } = require("../utils/username");
const { plainText } = require("../utils/html");
const { addDefaultFriend } = require("../utils/default-friend");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = function (passport) {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email =
              profile.emails && profile.emails[0] && profile.emails[0].value;
            if (!email) {
              return done(
                new Error("Google profile is missing an email address.")
              );
            }

            let user = await User.findOne({ googleId: profile.id });
            if (user) {
              if (user.bannedAt) {
                return done(null, false, { message: "This account is banned." });
              }
              return done(null, user);
            }

            user = await User.findOne({
              email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
            });
            if (user) {
              if (user.bannedAt) {
                return done(null, false, { message: "This account is banned." });
              }
              user.googleId = profile.id;
              await user.save();
              return done(null, user);
            }

            user = await User.create({
              googleId: profile.id,
              userName: await uniqueUserName(
                profile.displayName || email.split("@")[0]
              ),
              realName: plainText(profile.displayName, 100),
              email: email.toLowerCase(),
            });
            try {
              await addDefaultFriend(user.id);
            } catch (friendError) {
              console.error("Failed to add the default friend:", friendError.message);
            }
            return done(null, user);
          } catch (err) {
            if (err.code === 11000) {
              try {
                const existing =
                  (await User.findOne({ googleId: profile.id })) ||
                  (await User.findOne({
                    email: {
                      $regex: new RegExp(
                        `^${escapeRegex(profile.emails[0].value)}$`,
                        "i"
                      ),
                    },
                  }));
                if (existing) {
                  if (existing.bannedAt) {
                    return done(null, false, {
                      message: "This account is banned.",
                    });
                  }
                  if (!existing.googleId) {
                    existing.googleId = profile.id;
                    await existing.save();
                  }
                  return done(null, existing);
                }
              } catch (lookupErr) {
                return done(lookupErr);
              }
            }
            console.error(err);
            return done(err);
          }
        }
      )
    );
  }

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          return done(null, false);
        }
        if (user.bannedAt) {
          return done(null, false);
        }
        if (!user.password) {
          return done(null, false);
        }
        user.comparePassword(password, (err, isMatch) => {
          if (err) {
            return done(err);
          }
          if (isMatch) {
            return done(null, user);
          }
          return done(null, false);
        });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user && !user.bannedAt ? user : false);
    } catch (err) {
      done(err);
    }
  });
};
