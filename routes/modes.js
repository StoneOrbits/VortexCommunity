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
router.post('/mode/:id/upvote', (req, res) => {
    const modeId = req.params.id;
    // Handle upvoting logic here
    // Redirect back to the mode details page
    res.redirect('/mode/' + modeId);
});
router.post('/mode/:id/favorite', (req, res) => {
    const modeId = req.params.id;
    // Handle adding to favorites logic here
    // Redirect back to the mode details page
    res.redirect('/mode/' + modeId);
});
router.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    // Handle search logic here
    // Render search results page
    res.render('search-results', { searchTerm: searchTerm });
});
router.post('/mode/:id/delete', isAuthenticated, (req, res) => {
    const modeId = req.params.id;
    // Handle mode deletion logic here
    // Redirect back to the profile page
    res.redirect('/profile');
});
router.get('/mode/:id/edit', isAuthenticated, (req, res) => {
    const modeId = req.params.id;
    // Fetch mode details
    // Render mode editing page
    res.render('edit-mode', { mode: modeDetails });
});
router.get('/showcase', (req, res) => {
    const page = req.query.page || 1;
    // Fetch modes for the current page
    // Render the showcase page with pagination
    res.render('showcase', { modes: modesForCurrentPage, currentPage: page });
});
router.get('/mode/:id', (req, res) => {
    const modeId = req.params.id;
    // Fetch mode details
    // Render mode details page
    res.render('mode-details', { mode: modeDetails });
});
router.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    // Search for modes by name or description
    // Render the search results
    res.render('search-results', { modes: searchResults });
});
router.get('/upload', (req, res) => {
    res.render('upload');
});

router.post('/upload', (req, res) => {
    // Handle mode upload logic here
    res.redirect('/profile');
});
router.post('/mode/:id/favorite', (req, res) => {
    const modeId = req.params.id;
    // Handle adding mode to favorites logic here
    res.redirect('/profile');
});
router.post('/mode/:id/upvote', (req, res) => {
    const modeId = req.params.id;
    // Handle upvoting mode logic here
    res.redirect('/mode/' + modeId);
});
router.get('/mode/:id', (req, res) => {
    const modeId = req.params.id;
    // Fetch mode details from the database
    // Render mode details page
    res.render('modeDetails', { mode: modeData });
});
router.get('/search', (req, res) => {
    const query = req.query.q;
    // Handle search logic here
    // Render search results page
    res.render('searchResults', { modes: searchResults });
});
router.post('/mode/:id/upvote', (req, res) => {
    const modeId = req.params.id;
    // Handle upvoting logic here
    res.redirect('/mode/' + modeId);
});
router.post('/mode/:id/favorite', (req, res) => {
    const modeId = req.params.id;
    // Handle favoriting logic here
    res.redirect('/mode/' + modeId);
});
router.post('/upload', (req, res) => {
    // Handle mode upload logic here
    res.redirect('/');  // Redirect to homepage after successful upload
});
router.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    // Fetch modes from the database that match the search term
    // Render search results page
    res.render('searchResults', { modes: searchResults });
});
router.get('/modes/page/:pageNumber', (req, res) => {
    const pageNumber = req.params.pageNumber;
    // Fetch a specific page of modes from the database
    // Render modes page with pagination
    res.render('modesPage', { modes: paginatedModes });
});
router.get('/mode/:id', (req, res) => {
    const modeId = req.params.id;
    // Fetch mode details from the database
    res.render('modeDetails', { mode: modeData });
});
router.post('/mode/:id/upvote', (req, res) => {
    const modeId = req.params.id;
    // Handle upvoting logic here
    res.redirect('/mode/' + modeId);
});
router.post('/mode/:id/favorite', (req, res) => {
    const modeId = req.params.id;
    // Handle favorite marking logic here
    res.redirect('/mode/' + modeId);
});
router.post('/upload', (req, res) => {
    // Validate the uploaded mode here
    // If valid, save to the database
    // Else, return an error
    res.redirect('/');
});
