const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {
    // Match user
    User.findOne({ username: username })
      .then(user => {
        if (!user) {
          return done(null, false, { message: 'That username is not registered' });
        }

        // Check if the email has been verified
        if (!user.emailVerified) {
          return done(null, false, { message: 'Email has not been verified' });
        }

        // Match password
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Password incorrect' });
          }
        });
      })
      .catch(err => console.log(err));
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findById(id)
      .then(user => {
        done(null, user);
      })
      .catch(err => {
        done(err, null);
      });
  });
};

