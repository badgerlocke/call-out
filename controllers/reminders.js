//Controlls automated reminders. Sends SMS message once per day to users with due items and reminders enabled.
const Trip = require('../models/Trip')
const Users = require('../models/User')
const cron = require('node-cron')
const { sendSMS } = require('./sms');

//Runs once per day at DAILY_REMINDER_TIME (UTC)
//For help changing cronStr: https://cron.help/#0_0_*_*_*
function sendDailyReminders() {
    let reminderTime = process.env.DAILY_REMINDER_TIME || 0
    let cronStr = `0 ${reminderTime} * * *`
    //cronStr = `* * * * *`  //FOR TESTING: Uncomment and this will try to send a text every minute.
    // console.log('Cron scheduled')
    cron.schedule(cronStr, () => {
        console.log('Reminders.....GO!')
        getReminders()
      });
}


    const isAfterToday = (date) => {
        const today = new Date();
      

      
        return date > today;
      }




sendDailyReminders()

//Get list of users who have reminders enabled
findUsersWithReminders = async () => {
    try {
        const userList = await Users.find()
        return userList
    } catch(err) {
        console.log(err)
        return []
    }
}

//Get list of tasks due today (or in the past) for a specified user
findTasksDue = async (user) => {
    let today = new Date //NOTE: Times are UTC
    const trips = await Trip.find({userId: user,
        // dueDate: {$lte: today}
        checkedIn: false
    })
    return trips
}

//Find tasks due today for all users with reminders enabled, then send them a reminder message
getReminders = async () => {
    try {
        const userList = await findUsersWithReminders()
        // let tasks = []
        for (let user in userList) {
            // tasks[user] = await findTasksDue(usersToRemind[user]._id)
            let tasks = await findTasksDue(userList[user]._id)
            if (tasks.length > 0) {
                sendReminders(userList[user].userName,userList[user].phone,tasks)
            }  
        }
        // return tasks
    } catch (error) {
        console.log(error)
    }
}

//Send SMS reminder 
sendReminders = async (name,number,tasks) => {
    try {
        let message = `${name}, you have ${tasks.length} tasks to get done today.`
        console.log(message)
        sendSMS(number,message)
    } catch (error) {
        console.log(error)
    }
}
