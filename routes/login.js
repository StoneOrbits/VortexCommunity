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
    user: req.user,
    captchaSiteKey: process.env.RECAPTCHA_SITE_KEY || ''
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
      return res.redirect((req.app.locals.basePath || '') + '/login');
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    req.flash('error', 'Error during captcha verification. Please try again.');
    return res.redirect((req.app.locals.basePath || '') + '/login');
  }
};

router.post('/', verifyRecaptcha, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info ? info.message : 'Login failed');
      return res.redirect((req.app.locals.basePath || '') + '/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect((req.app.locals.basePath || '') + '/');
    });
  })(req, res, next);
});

module.exports = router;
