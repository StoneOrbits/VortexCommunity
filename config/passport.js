const passport = require('passport'); const LocalStrategy = require('passport-local').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new LocalStrategy(
        function(username, password, done) {
            User.findOne({ username: username }, function(err, user) {
                if (err) return done(err);
                if (!user) return done(null, false, { message: 'Incorrect username.' });
bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err) throw err;
    if (isMatch) {
        return done(null, user);
    } else {
        return done(null, false, { message: 'Password incorrect' });
    }
});
                // TODO: Add password verification logic here
                return done(null, user);
            });
        }
    ));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
};
