# About

Call Out is a web application to improve the safety of outdoor enthusiasts. The term "call out" comes from the caving community, where cavers contact others once they've returned to the surface. Caves are unpredictable and dangerous, and a group that is underground significantly longer than they planned may need to be rescued. This app is aimed at automating the process by messaging your emergency contacts if you don't check in by a certain time. It can be used for any activity: backpacking, hiking, caving, travelling, etc.

Try it out here:
[Demo](https://muddy-pear-pea-coat.cyclic.cloud/)

# Install

`npm install`

---

# Things to add

- Create a `.env` file in config folder and add the following as `key = value`
  - PORT = 3000 (can be any port)
  - DB_STRING = `your database URI`
  - SESSION_SECRET = `a long random string`
  - GOOGLE_CLIENT_ID = `your google cloud oauth2 client id`
  - GOOGLE_CLIENT_SECRET = `your google cloud oauth2 client secret`

- (Optional) For account-holder email alerts, add:
  - EMAIL = `your Gmail address`
  - EMAIL_PW = `your Gmail app password`
  - USER_ALERTS_ENABLED = `true` (defaults to true when both email values exist)
  - CONTACT_ALERTS_ENABLED = `false` (contact alerts are dry-run only by default)

- (Optional) For SMS capability, add auth codes for Twilio
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN
  - TWILIO_PHONE_NUMBER

---

# Run

`npm start`

To rebuild CSS after changing Tailwind or DaisyUI:

`npm run build:css`

# Future improvements

- Show active and completed trips separately
- Set up chron and re-enable email/SMS messages
- Add checkin link in reminder email
- Create profile page where user can update their details, contacts, etc
- Add geotags, maps
- If user has no trips, display a prompt on home page
- New users: add an example trip?
