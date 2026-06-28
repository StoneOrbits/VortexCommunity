var express = require('express');
var router = express.Router();
const { PatternSet } = require('../models/pg/index');

router.get('/', async function(req, res, next) {
  try {
    const topPats = await PatternSet.findAll({
      order: [['votes', 'DESC']],
      limit: 10
    });
    topPats.sort(() => Math.random() - 0.5);
    res.render('index', { title: 'Vortex Community', topPats });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
