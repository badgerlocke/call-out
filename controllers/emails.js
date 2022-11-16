//Contains email wordings
require('dotenv').config({path: './config/.env'})
const Trips = require('../models/Trip')
const Users = require('../models/User')

module.exports = {
    reminderEmail: (user,trip) => {    
        return {
            from: process.env.EMAIL, // sender address
            to: user.email, // list of receivers
            subject: "Reminder to check in", // Subject line
            text: `Please log in to your Call Out account to check in after your trip! We will notify your contacts if you haven't checked in by ${trip.time}`, // plain text body
            html: "<h1>`Please log in to your Call Out account to check in after your trip! We will notify your contacts if you haven't checked in by ${trip.time}`</h1>", // html body
        }
    },
    lateTripEmail: (user,trip) => {    
        let words = `Please check on ${user.name}. They have not checked in after their trip, which was expected to return at ${trip.time}`
        return {
            from: process.env.EMAIL, // sender address
            to: user.contacts, // list of receivers
            subject: `It's ${new Date}, do you know where you friends are?`, // Subject line
            text: words, // plain text body
            html: `<h1>${words}</h1>`, // html body
        }
    }
}