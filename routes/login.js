const express = require('express');
const passport = require('passport');
const router = express.Router();
const fetch = require('node-fetch');
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

const verifyRecaptcha = async (req, res, next) => {
  if (!process.env.RECAPTCHA_SECRET_KEY) return next();
  const token = req.body['g-recaptcha-response'];
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`;

  try {
    const response = await fetch(verifyUrl, { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      return next();
    } else {
      req.flash('error', 'Captcha verification failed. Please try again.');
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    req.flash('error', 'Error during captcha verification. Please try again.');
    return res.redirect('/login');
  }
};

router.post('/', verifyRecaptcha, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

module.exports = router;
