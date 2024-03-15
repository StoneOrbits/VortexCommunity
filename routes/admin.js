const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Middleware to check if the user is logged in and is the admin
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.username === 'admin') {
    return next();
  } else {
    req.flash('error', 'You must be logged in as admin to view this page.');
    res.redirect('/login');
  }
}

// Admin control panel page
router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.render('admin', { users: users }); // Pass all users to the admin view
  } catch (err) {
    console.error("Admin page error:", err);
    req.flash('error', 'An error occurred fetching user list.');
    res.redirect('/control');
  }
});

// Route to update a user's username
router.post('/update-username', isAdmin, async (req, res) => {
  const { userId, newUsername } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { username: newUsername });
    req.flash('success', 'Username updated successfully.');
  } catch (err) {
    console.error("Update username error:", err);
    req.flash('error', 'An error occurred updating the username.');
  }
  res.redirect('/control');
});

// Route to delete a user
router.post('/delete-user', isAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    await User.findByIdAndDelete(userId);
    req.flash('success', 'User deleted successfully.');
  } catch (err) {
    console.error("Delete user error:", err);
    req.flash('error', 'An error occurred deleting the user.');
  }
  res.redirect('/control');
});

module.exports = router;
