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
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;

  try {
    const recaptchaResponse = await fetch(recaptchaVerifyUrl, { method: 'POST' });
    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success) {
      req.flash('error', 'Invalid CAPTCHA. Please try again.');
      return res.redirect('/register');
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      req.flash('error', 'Email or username is already taken');
      return res.redirect('/register');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const encodedToken = encodeURIComponent(verificationToken);

    const newUser = new User({ username, email, password: hashedPassword, verificationToken: verificationToken });
    await newUser.save();

    // Prepare the email content
    const emailContent = `Hi ${username}, welcome to Vortex Community! Please verify your email by clicking the following link: https://vortex.community/verify?token=${encodedToken}`;

    // Send email using local system command
    const sendMailCommand = `echo "${emailContent}" | sudo /usr/bin/mail -s "Verify Your Email" ${email} -aFrom:postmaster@vortex.community`;
    exec(sendMailCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`Email sent to ${email}`);
    });

    req.flash('success', 'User registered successfully. You can now log in.');
    res.redirect('/login');
  } catch (err) {
    req.flash('error', 'An error occurred during registration');
    console.error("Registration error:", err);
    res.status(500).redirect('/register');
  }
});

module.exports = router;
