const express = require('express');
const passport = require('passport');
const router = express.Router();
const fetch = require('node-fetch'); // Ensure node-fetch is installed
require('dotenv').config();

router.get('/', (req, res) => {
  res.render('login', {
    messages: {
      error: req.flash('error'),
      success: req.flash('success')
    },
    user: req.user
  });
});

// Middleware to perform reCAPTCHA verification
const verifyRecaptcha = async (req, res, next) => {
  const token = req.body['g-recaptcha-response'];
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

  try {
    const response = await fetch(verifyUrl, { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      return next(); // reCAPTCHA verification successful, proceed to Passport authentication
    } else {
      // reCAPTCHA verification failed
      req.flash('error', 'Captcha verification failed. Please try again.');
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    req.flash('error', 'Error during captcha verification. Please try again.');
    return res.redirect('/login');
  }
};

// Update POST route to use reCAPTCHA verification middleware before passport authentication
router.post('/', verifyRecaptcha, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

module.exports = router;
