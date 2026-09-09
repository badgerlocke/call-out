const express = require("express");
const app = express();
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const methodOverride = require("method-override");
const flash = require("express-flash");
const logger = require("morgan");
const connectDB = require("./config/database");
const { securityHeaders } = require("./middleware/security-headers");

// Use .env file in config folder before loading modules that read feature flags.
require("dotenv").config({ path: "./config/.env" });

const isProduction = process.env.NODE_ENV === "production";
app.set("trust proxy", 1);

const mainRoutes = require("./routes/main");
const tripRoutes = require("./routes/trips");
const { startAlertWorker } = require("./controllers/reminders");

if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET is required in config/.env");
  process.exit(1);
}

// Passport config
require("./config/passport")(passport);

//Connect to database, then set up everything else
//Necessary for serverless deployment; otherwise 'then' statement can removed
connectDB().then(() => {
  startAlertWorker();

  //Using EJS for views
  app.set("view engine", "ejs");
  app.disable("x-powered-by");

  app.use(securityHeaders);

  //Static Folder
  app.use(express.static("public"));

  //Body Parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  //Logging
  app.use(
    logger("dev", {
      skip: (req) => req.originalUrl.startsWith("/reset-password/"),
    })
  );

  //Use forms for put / delete
  app.use(methodOverride("_method"));

  // Setup Sessions - stored in MongoDB
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
      }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
      },
    })
  );

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  //Use flash messages for errors, info, ect...
  app.use(flash());

  //Setup Routes For Which The Server Is Listening
  app.use("/", mainRoutes);
  app.use("/auth", require("./routes/auth"));
  app.use("/settings", require("./routes/settings"));
  app.use("/friends", require("./routes/friends"));
  app.use("/trips", tripRoutes);

  //Server Running
  app.listen(process.env.PORT, () => {
    console.log("Server is running, you better catch it!");
  });
});
