const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { token } = req.query;
    // TODO: Fix email verification?
    //console.log("Checking token: " + token);
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      req.flash('error', 'Token is invalid or has expired');
      return res.redirect('/register');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    req.flash('success', 'Email verified successfully. You can now log in.');
    res.redirect('/login');
  } catch (err) {
    console.error("Verification error:", err);
    req.flash('error', 'An error occurred during email verification');
    res.redirect('/register');
  }
});

module.exports = router;
