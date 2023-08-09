const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('modes/index');
});

router.get('/upload', (req, res) => {
    res.render('modes/upload');
});

router.get('/:id', (req, res) => {
    res.render('modes/show');
});

module.exports = router;
