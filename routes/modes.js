const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('modes/index');
});

router.get('/upload', (req, res) => {
router.post('/upload', ensureAuthenticated, (req, res) => {
    // TODO: Handle mode upload logic here
    res.redirect('/modes');
});
    res.render('modes/upload');
});

router.get('/:id', (req, res) => {
    res.render('modes/show');
});

module.exports = router;
const { ensureAuthenticated } = require('../middleware/checkAuth');
