var express = require('express');
var router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    res.render('terms');
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
