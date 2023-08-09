const express = require('express');
const router = express.Router();
const db = require('../config/database');

// User profile route
router.get('/:username', (req, res) => {
    const username = req.params.username;
    // Fetch user's uploaded modes and favorites from the database
    // Render the user profile page
    res.render('user-profile', { username: username });
});

module.exports = router;
