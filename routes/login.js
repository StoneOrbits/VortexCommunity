const express = require('express');
const passport = require('passport');
const router = express.Router();
const fetch = require('node-fetch');
require('dotenv').config();

router.get('/', (req, res) => {
  res.render('login', {
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
  console.log('[LOGIN] attempt for username:', req.body.username);
  passport.authenticate('local', (err, user, info) => {
    if (err) { console.error('[LOGIN] auth error:', err); return next(err); }
    if (!user) {
      console.log('[LOGIN] auth failed:', info ? info.message : 'no info');
      req.flash('error', info ? info.message : 'Login failed');
      return res.redirect((req.app.locals.basePath || '') + '/login');
    }
    console.log('[LOGIN] auth ok, user id:', user.id, '- logging in...');
    req.logIn(user, (err) => {
      if (err) { console.error('[LOGIN] logIn error:', err); return next(err); }
      console.log('[LOGIN] session saved, redirecting. session:', req.session.id, 'user:', req.user && req.user.id);
      return res.redirect((req.app.locals.basePath || '') + '/');
    });
  })(req, res, next);
});

module.exports = router;
