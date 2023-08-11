const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// Register Page
router.get('/', (req, res) => {
    res.render('register', { user: req.user }); // Added user object
});

// Handle Registration
router.post('/', async (req, res) => {
    try {
        console.log("Registration started");

        const { username, email, password } = req.body;

        // TODO: Add validation for the registration form

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            console.log("User already exists");
            req.flash('error', 'Email or username is already taken');
            return res.redirect('/register');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        console.log("User registered successfully");
        req.flash('success', 'User registered successfully. You can now log in.');
        res.redirect('/login');
    } catch (err) {
        req.flash('error', 'An error occurred during registration');
        console.error("Registration error:", err);
        res.status(500).redirect('/register'); // Redirecting to the registration page with an error status
    }
});

module.exports = router;

