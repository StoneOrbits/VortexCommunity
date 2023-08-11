var express = require('express');
var router = express.Router();
const Mode = require('../models/Mode');

router.get('/', async function(req, res, next) {
  try {
    // Find the top 5 upvoted modes
    //const topModes = await Mode.find().sort({ votes: -1 }).limit(5).exec();
    console.log('User in route:', req.user);

    const topModes = [
      { id: 1, name: 'Mode 1' },
      { id: 2, name: 'Mode 2' },
      { id: 3, name: 'Mode 3' },
      { id: 4, name: 'Mode 4' },
      { id: 5, name: 'Mode 5' },
      { id: 6, name: 'Mode 6' },
      { id: 7, name: 'Mode 7' },
      { id: 8, name: 'Mode 8' },
      // ... add more mock modes as needed
    ];


    // Shuffle the array to make it random on each refresh
    topModes.sort(() => Math.random() - 0.5);
    res.render('index', { title: 'Vortex Community', user: req.user, topModes });
  } catch (err) {
    console.error(err);
    next(err); // Pass the error to the next middleware to handle it
  }
});

module.exports = router;

