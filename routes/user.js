const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PatternSet = require('../models/PatternSet');
const Mode = require('../models/Mode');

router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const profileUser = await User.findById(userId);

    if (!profileUser) {
      // Handle the case where the user is not found
      return res.status(404).render('404', { message: 'User not found' });
    }

    // lookup pats for this user since populate seems broken
    userPats = await PatternSet.find({ createdBy: userId });
    userModes = await Mode.find({ createdBy: userId });

    // Render the profile view, passing the user object
    res.render('profile', { profileUser, userPats, userModes });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'An error occurred while retrieving the user profile' });
  }
});

module.exports = router;

