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
    // TODO: Add password hashing and save user to database
    res.redirect('/users/login');
});
    res.render('register');
});

router.get('/profile', (req, res) => {
    res.render('profile');
});

module.exports = router;
