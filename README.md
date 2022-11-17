# About

Call Out is a web application to improve the safety of outdoor enthusiasts. The term "call out" comes from the caving community, where cavers contact others once they've returned to the surface. The call out time is at least several hours, if not more, after their expected return time. Caves are unpredictable and dangerous. A group that misses their call out time is likely to need to be rescued. This app is aimed at automating the process by messaging your emergency contacts if you don't checkin by your call out time. It can be used for any activity: backpacking, hiking, caving, travelling, etc.

Try it out here:
https://call-out-production.up.railway.app/

# Install

`npm install`

---

# Things to add

- Create a `.env` file in config folder and add the following as `key = value`
  - PORT = 2121 (can be any port example: 3000)
  - DB_STRING = `your database URI`
  - CLOUD_NAME = `your cloudinary cloud name`
  - API_KEY = `your cloudinary api key`
  - API_SECRET = `your cloudinary api secret`

---

# Run

`npm start`

# Future improvements

- Show active and completed trips separately
- Change the ugly time inputs on 'new trip' page
- Set up chron and re-enable email/SMS messages
- Add checkin link in reminder email
- Create profile page where user can update their details, contacts, etc
- Add geotags, maps

