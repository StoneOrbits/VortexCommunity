var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/users/login'
}));
    res.render('login');
});

router.get('/register', (req, res) => {
router.post('/register', (req, res) => {
    const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    });
const bcrypt = require('bcryptjs');
bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newUser.password, salt, (err, hash) => {
        if (err) throw err;
        newUser.password = hash;
        newUser.save()
            .then(user => {
                res.redirect('/users/login');
            })
            .catch(err => console.log(err));
    });
});
    // TODO: Add password hashing and save user to database
    res.redirect('/users/login');
});
    res.render('register');
});

router.get('/profile', (req, res) => {
    res.render('profile');
});

module.exports = router;
router.get('/profile/:username', (req, res) => {
    const username = req.params.username;
    // Fetch user details, uploaded modes, and favorites from the database
    // Render the user profile page
    res.render('user-profile', { username: username });
});
router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', (req, res) => {
    // Handle user registration
    // Redirect to login page
    res.redirect('/login');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', (req, res) => {
    // Handle user login
    // Redirect to user profile page
    res.redirect('/profile/' + req.body.username);
});
router.get('/profile', isAuthenticated, (req, res) => {
    // Fetch user's uploaded modes and favorites
    // Render the profile page
    res.render('profile', { user: req.user });
});
router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', (req, res) => {
    // Handle user registration logic here
    res.redirect('/login');
});
router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', (req, res) => {
    // Handle user login logic here
    res.redirect('/profile');
});
router.get('/logout', (req, res) => {
    // Handle user logout logic here
    res.redirect('/');
});
router.get('/profile', (req, res) => {
    // Fetch user's uploaded modes and favorites
    // Render user profile page
    res.render('profile', { user: userData });
});
