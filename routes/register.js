const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { exec } = require('child_process');
const router = express.Router();
require('dotenv').config();

// Register Page
router.get('/', (req, res) => {
  res.render('register', { user: req.user }); // Added user object
});

const fetch = require('node-fetch'); // Ensure you have node-fetch installed

router.post('/', async (req, res) => {
  const { username, email, password, 'g-recaptcha-response': recaptchaToken } = req.body;

  // First, verify the reCAPTCHA token
  const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
  const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;

  try {
    const recaptchaResponse = await fetch(recaptchaVerifyUrl, { method: 'POST' });
    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success) {
      req.flash('error', 'Invalid CAPTCHA. Please try again.');
      return res.redirect('/register');
    }

    if (await User.findOne({ username })) {
      req.flash('error', 'Username is taken');
      return res.redirect('/register');
    }

    // null out the email if it was empty, it's not required
    let emailAddress = null;
    if (email.length > 0) {
      if (await User.findOne({ email })) {
        req.flash('error', 'Email is already registered');
        return res.redirect('/register');
      }
      // todo: validate email more?
      emailAddress = email;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const encodedToken = encodeURIComponent(verificationToken);

    const newUser = new User({ username: username, email: emailAddress, password: hashedPassword, verificationToken: verificationToken });
    await newUser.save();

    // if they specified an email address
    if (email) {
      // Disable email sending for now
      //// Prepare the email content
      //const emailContent = `Hi ${username}, welcome to Vortex Community! Please verify your email by clicking the following link: https://vortex.community/verify?token=${encodedToken}`;

      //// Send email using local system command
      //const sendMailCommand = `echo "${emailContent}" | sudo /usr/bin/mail -s "Verify Your Email" ${email} -aFrom:postmaster@vortex.community`;
      //exec(sendMailCommand, (error, stdout, stderr) => {
      //  if (error) {
      //    console.error(`exec error: ${error}`);
      //    return;
      //  }
      //  console.log(`Email sent to ${email}`);
      //});
    }

    req.flash('success', 'User registered successfully, you can now login');
    res.redirect('/login');
  } catch (err) {
    req.flash('error', 'An error occurred during registration');
    console.error("Registration error:", err);
    res.status(500).redirect('/register');
  }
});

router.get('/check-username/:username', async (req, res) => {
  if (req.params.username.length < 3) {
    return res.json({ valid: false, message: 'Username too short' });
  }
  if (!/^[a-zA-Z0-9]+$/.test(req.params.username)) {
    return res.json({ valid: false, message: 'Letters and numbers only' });
  }
  const user = await User.findOne({ username: req.params.username });
  if (user) {
    return res.json({ valid: false, message: 'Username is taken' });
  }
  return res.json({ valid: true, message: 'Username is available' });
});

router.get('/check-email/:email', async (req, res) => {
  const email = req.params.email.toLowerCase(); // Normalize email to lowercase for comparison

  // Check for proper email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ valid: false, message: 'Invalid email format' });
  }

  // Check for disallowed domains
  const blockedDomains = ['hotmail.com', 'outlook.com'];
  const emailDomain = email.split('@')[1]; // Get the domain part of the email
  if (blockedDomains.includes(emailDomain)) {
    return res.json({ valid: false, message: 'Microsoft domains not supported, they use overly agressive email blocklists' });
  }

  if (await User.findOne({ email: email })) {
    return res.json({ valid: false, message: 'Email is already registered' });
  }

  return res.json({ valid: true, message: 'Email is available' });
});

module.exports = router;
