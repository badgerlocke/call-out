const express = require('express')
const passport = require('passport')
const router = express.Router()

const googleAuthEnabled =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET

if (googleAuthEnabled) {
  // Scope necessary to get user ID and email
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  )

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/login',
      failureFlash: true,
    }),
    (req, res) => {
      res.redirect('/')
    }
  )
}

// @desc    Logout user
// @route   /auth/logout
router.get('/logout', (req, res, next) => {
  req.logout((error)=>{
      if (error) {return next(error)}
      res.redirect('/')
  });  
})

module.exports = router