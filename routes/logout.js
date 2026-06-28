const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect((req.app.locals.basePath || '') + '/');
  });
});

module.exports = router;
