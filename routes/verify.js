const express = require('express');
const { User } = require('../models/pg/index');
const router = express.Router();

router.get('/', async (req, res) => {
  const basePath = req.app.locals.basePath || '';
  const { token } = req.query;
  if (!token) {
    req.flash('error', 'Missing verification token.');
    return res.redirect(basePath + '/register');
  }

  const user = await User.findOne({ where: { verificationToken: token } });
  if (!user) {
    req.flash('error', 'Invalid or expired verification token.');
    return res.redirect(basePath + '/register');
  }

  user.verified = true;
  user.verificationToken = null;
  await user.save();

  req.flash('success', 'Email verified! You can now log in.');
  res.redirect(basePath + '/login');
});

module.exports = router;
