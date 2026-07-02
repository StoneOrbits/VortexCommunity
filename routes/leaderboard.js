const express = require('express');
const router = express.Router();
const { User } = require('../models/pg/index');

router.get('/', async (req, res) => {
  try {
    const type = req.query.type === 'closed' ? 'closed_sr' : 'open_sr';

    const users = await User.findAll({
      order: [[type, 'DESC']],
      attributes: ['id', 'username', 'profilePic', 'open_sr', 'closed_sr']
    });

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      username: u.username,
      profilePic: u.profilePic,
      sr: u[type],
      open_sr: u.open_sr,
      closed_sr: u.closed_sr
    }));

    res.render('leaderboard', {
      ranked,
      currentType: req.query.type === 'closed' ? 'closed' : 'open',
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
