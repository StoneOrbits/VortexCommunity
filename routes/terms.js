var express = require('express');
var router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    res.render('terms');
  } catch (err) {
    console.error(err);
    next(err); // Pass the error to the next middleware to handle it
  }
});

module.exports = router;
