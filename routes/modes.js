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
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post('/upload', upload.single('modeFile'), (req, res) => {
    // Save the uploaded mode file to the database
    // Generate a preview for the mode
    res.redirect('/modes');
});
router.post('/:modeId/vote', (req, res) => {
    const modeId = req.params.modeId;
    // Increment the vote count for the mode in the database
    // Redirect back to the mode page
    res.redirect('/modes/' + modeId);
});
router.post('/:modeId/favorite', (req, res) => {
    const modeId = req.params.modeId;
    // Add the mode to the user's favorites in the database
    // Redirect back to the mode page
    res.redirect('/modes/' + modeId);
});
router.get('/search', (req, res) => {
    const query = req.query.q;
    // Search for modes in the database based on the query
    // Render the search results page
    res.render('search-results', { query: query });
});
