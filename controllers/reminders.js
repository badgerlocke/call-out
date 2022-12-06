//Monitors for late trips. Sends email and text alerts.
const Trips = require('../models/Trip')
const Users = require('../models/User')
const template = require('../controllers/emails')
const cron = require('node-cron')
const { sendSMS } = require('./sms');
const process = require('process');
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PW
  }
});

cronStart();


//Runs once per hour and checks for late users.
//For help changing cronStr: https://cron.help/#0_0_*_*_*
function cronStart() {
    let cronStr = `0 * * * *`
    //cronStr = `* * * * *`  //FOR TESTING: Uncomment and this will try to send a text every minute.
    console.log('Cron scheduled')
    cron.schedule(cronStr, () => {
        console.log('Reminders.....GO!')
        checkForLate()
      });
}


async function checkForLate() {
  //Get trips due back. 
  //Loop through
  //Send an email to each
  let remindTrips = await findTripsDue()
  for (const trip of remindTrips) {
    let msg = await template.reminderEmail(trip)
    await transporter.sendMail(msg)
  }

  let lateTrips = await findLate()
  for (const trip of lateTrips) {
    console.log(`Trip late: ${trip.location}`)
    let msg = await template.reminderEmail(trip)
    console.log(msg)
    await transporter.sendMail(msg)
  }

}

//Find trips that haven't checked in
async function findLate() {
  try {
    const lateTrips = await Trips.find({
      checkedIn: false,
      notifyTime: {
        $lt: new Date()}
      })
    // console.log(lateTrips)
    return lateTrips
  } catch(err) {
    console.log(err)
    return []
  }
}

//Find trips that are past their expected return time, but before their call out time.
async function findTripsDue() {
  try {
    const returningSoon = await Trips.find({
      checkedIn: false,
      returnTime: {
        $lte: new Date()},
      notifyTime: {
        $gte: new Date()}
      })
    console.log(returningSoon)
    return returningSoon
  } catch(err) {
    console.log(err)
    return []
  }
}
