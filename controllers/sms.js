//Module sends SMS messages using Twilio
require('dotenv').config({path: './config/.env'})
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

module.exports = {
    sendSMS: (num,msg) => {    
        client.messages
        .create({
            body:` ${msg}`,
            from: `${process.env.TWILIO_PHONE_NUMBER}`,
            to: `${num}`
        })
        .then(message => console.log(message.sid));
    }
}