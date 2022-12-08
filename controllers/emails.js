//Contains email wordings
require('dotenv').config({path: './config/.env'})
const Trips = require('../models/Trip')
const Users = require('../models/User')

async function findUser(trip) {
    try {
        let user = await Users.findById({_id: trip.user})
        return user
    } catch (error) {
        console.error(error)
        return 'error'
    }
}

module.exports = {
    reminderEmail: async (trip) => {    
        let user = await findUser(trip);
        return {
            from: 'Call Out App', // sender address
            to: user.email, // list of receivers
            subject: "Reminder to check in", // Subject line
            text: `Please log in to your Call Out account to check in after your trip! We will notify your contacts if you haven't checked in by ${trip.notifyTime}`, // plain text body
            html: `<h1>Please log in to your Call Out account to check in after your trip! We will notify your contacts if you haven't checked in by ${trip.notifyTime}</h1>`, // html body
        }
    },
    lateTripEmail: async (trip) => {    
        let user = await findUser(trip);
        let words = `Please check on ${user.userName}. They have not checked in after their trip, which was expected to return at ${trip.notifyTime}`
        return {
            from: 'Call Out App', // sender address 
            to: `${user.email}, ${user.contacts}`, // list of receivers
            subject: `It's ${new Date}, do you know where you friends are?`, // Subject line
            text: words, // plain text body
            html: `<h1>${words}</h1>`, // html body
        }
    }
}

