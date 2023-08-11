const express = require('express');
const router = express.Router();

router.get('/:username', (req, res) => {
  // Retrieve the user object, including the modes property
  const user = {
    username: 'exampleUser',
    //profilePicture: 'images/default-profile.png',
    blurb: 'This is a blurb about the user.',
    modes: [
      { name: 'Mode 1', description: 'Description of Mode 1' },
      { name: 'Mode 2', description: 'Description of Mode 2' },
      // ... other modes ...
    ]
  };

  if (!req.isAuthenticated()) {
    const username = req.params.username;
    // TODO: Fetch user details, uploaded modes, and favorites from the database
    return res.render('user-profile', { username: username });
  }

  // Render the profile view, passing the user object
  res.render('profile', { user });
});

module.exports = router;

