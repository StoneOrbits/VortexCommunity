const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).populate('modes');

    if (!user) {
      // Handle the case where the user is not found
      return res.status(404).render('404', { message: 'User not found' });
    }

    //if (!req.isAuthenticated()) {
    //  // Render public profile view
    //  return res.render('user-profile', { user });
    //}

    // Render the profile view, passing the user object
    res.render('profile', { user });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'An error occurred while retrieving the user profile' });
  }
});

module.exports = router;

