var express = require('express');
var router = express.Router();
const PatternSet = require('../models/PatternSet');

router.get('/', async function(req, res, next) {
  try {
    // Find the top 5 upvoted pats
    const topPats = await PatternSet.find().sort({ votes: -1 }).limit(10).exec();
    // Shuffle the array to make it random on each refresh
    topPats.sort(() => Math.random() - 0.5);
    res.render('index', { title: 'Vortex Community', topPats });
  } catch (err) {
    console.error(err);
    next(err); // Pass the error to the next middleware to handle it
  }
});

module.exports = router;
