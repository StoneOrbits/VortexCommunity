const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { User } = require('../models/pg/index');

module.exports = function(passport) {
  passport.use(new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        console.log('[PASSPORT] user not found:', username);
        return done(null, false, { message: 'That username is not registered' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          console.log('[PASSPORT] password ok for user:', user.id);
          return done(null, user);
        } else {
          console.log('[PASSPORT] password mismatch for user:', user.id);
          return done(null, false, { message: 'Password incorrect' });
        }
      });
    } catch (err) {
      console.error('[PASSPORT] lookup error:', err);
      return done(err);
    }
  }));

  passport.serializeUser((user, done) => {
    console.log('[PASSPORT] serialize user id:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      console.log('[PASSPORT] deserialize id:', id, '-> found:', !!user);
      done(null, user);
    } catch (err) {
      console.error('[PASSPORT] deserialize error:', err);
      done(err, null);
    }
  });
};
