//Monitors for late trips. Sends email and text alerts.
const Trips = require('../models/Trip')
const Users = require('../models/User')
const cron = require('node-cron')
const { sendSMS } = require('./sms');
const process = require('process');
const nodemailer = require("nodemailer");

//Runs once per minute and checks for late users.
//For help changing cronStr: https://cron.help/#0_0_*_*_*
// function sendDailyReminders() {
//     let reminderTime = process.env.DAILY_REMINDER_TIME || 0
//     let cronStr = `0 ${reminderTime} * * *`
//     //cronStr = `* * * * *`  //FOR TESTING: Uncomment and this will try to send a text every minute.
//     // console.log('Cron scheduled')
//     cron.schedule(cronStr, () => {
//         console.log('Reminders.....GO!')
//         getReminders()
      // });
// }

//TODO: Change to "Check time" or something similar. Maybe store time when server starts, and check every n minutes after?
// const isAfterToday = (date) => {
//     const today = new Date(); 
//     return date > today;
// }

//TODO: Split function into smaller bits. One for sending mail only, one to determine email contents/targets
async function sendEmail(user) {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PW
      }
  });
  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: process.env.EMAIL, // sender address
    to: myEmail, // list of receivers
    subject: "Reminder to check in", // Subject line
    text: `Please log in to your Call Out account to check in after your trip! We will notify your contacts if you haven't checked in by {}`, // plain text body
    html: "<b>Hello world?</b>", // html body
  });
  console.log("Message sent: %s", info.messageId);
}

// DISABLED so it stops spamming me!
// main().catch(console.error);



async function main() {
  //Get trips due back. 
  //Loop through
  //Send an email to each
  let remindTrips = findTripsDue()
  for (let trip in remindTrips) {

  }

  let lateTrips = await findLate()

  for (let trip in lateTrips) {

  }
}
main()

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

async function sendCheckinReminder() {
  //${user.name}, don't forget to check in when you return from your ${trip.type} trip! Your expected return time was ${trip.returnTime}. 
  //Eventually, add "Click here to check in" link to the email
  
}

async function sendReminder() {
  //Send user a reminder to check in
}

async function sendSOS() {
  //Alert user's contacts if it is past their callout time

}

async function sendEmail(addresses,text) {

}