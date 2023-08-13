var express = require('express');
var router = express.Router();
const Mode = require('../models/Mode');

router.get('/', async function(req, res, next) {
  try {
    // Find the top 5 upvoted modes
    const topModes = await Mode.find().sort({ votes: -1 }).limit(8).exec();
    console.log('User in route:', req.user);
    // Shuffle the array to make it random on each refresh
    topModes.sort(() => Math.random() - 0.5);
    res.render('index', { title: 'Vortex Community', user: req.user, topModes });
  } catch (err) {
    console.error(err);
    next(err); // Pass the error to the next middleware to handle it
  }
});

module.exports = router;

