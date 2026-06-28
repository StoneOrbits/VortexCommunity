const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models/pg/index');
const router = express.Router();
require('dotenv').config();

router.get('/', (req, res) => {
  res.render('register', { user: req.user });
});

const fetch = require('node-fetch');

router.post('/', async (req, res) => {
  const { username, email, password, 'g-recaptcha-response': recaptchaToken } = req.body;
  const basePath = req.app.locals.basePath || '';

  try {
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;
      const recaptchaResponse = await fetch(recaptchaVerifyUrl, { method: 'POST' });
      const recaptchaData = await recaptchaResponse.json();
      if (!recaptchaData.success) {
        req.flash('error', 'Invalid CAPTCHA. Please try again.');
        return res.redirect(basePath + '/register');
      }
    }

    if (await User.findOne({ where: { username } })) {
      req.flash('error', 'Username is taken');
      return res.redirect(basePath + '/register');
    }

    let emailAddress = null;
    if (email.length > 0) {
      if (await User.findOne({ where: { email } })) {
        req.flash('error', 'Email is already registered');
        return res.redirect(basePath + '/register');
      }
      emailAddress = email;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(20).toString('hex');

    await User.create({ username, email: emailAddress, password: hashedPassword, verificationToken });

    req.flash('success', 'User registered successfully, you can now login');
    res.redirect(basePath + '/login');
  } catch (err) {
    req.flash('error', 'An error occurred during registration');
    console.error("Registration error:", err);
    res.status(500).redirect(basePath + '/register');
  }
});

router.get('/check-username/:username', async (req, res) => {
  if (req.params.username.length < 3) {
    return res.json({ valid: false, message: 'Username too short' });
  }
  if (!/^[a-zA-Z0-9]+$/.test(req.params.username)) {
    return res.json({ valid: false, message: 'Letters and numbers only' });
  }
  const user = await User.findOne({ where: { username: req.params.username } });
  if (user) {
    return res.json({ valid: false, message: 'Username is taken' });
  }
  return res.json({ valid: true, message: 'Username is available' });
});

router.get('/check-email/:email', async (req, res) => {
  const email = req.params.email.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ valid: false, message: 'Invalid email format' });
  }

  const blockedDomains = ['hotmail.com', 'outlook.com'];
  const emailDomain = email.split('@')[1];
  if (blockedDomains.includes(emailDomain)) {
    return res.json({ valid: false, message: 'Microsoft domains not supported, they use overly agressive email blocklists' });
  }

  if (await User.findOne({ where: { email } })) {
    return res.json({ valid: false, message: 'Email is already registered' });
  }

  return res.json({ valid: true, message: 'Email is available' });
});

module.exports = router;
