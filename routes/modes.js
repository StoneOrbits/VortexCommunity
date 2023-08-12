const express = require('express');
const router = express.Router();
const Mode = require('../models/Mode');

// show the main modes showcase
router.get('/', async (req, res) => {
    const page = req.query.page || 1;
    const searchQuery = req.query.search;
    var modesForCurrentPage = await Mode.find().sort({ votes: -1 }).limit(5).exec();
    //var modesForCurrentPage = [ 
    //  { id: 1, name: "Mode 1" },
    //];
    // If search query is present, filter the modes based on the search criteria
    if (searchQuery) {
        modesForCurrentPage = modesForCurrentPage.filter(mode => {
            return mode.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }
    // Fetch modes for the current page
    res.render('modes', { modes: modesForCurrentPage, user: req.user, currentPage: page, search: req.query.search });
});

// Mode details
router.get('/:modeId', async (req, res) => {
    try {
        //const mode = await Mode.findOne({ id: parseInt(req.params.modeId, 10) });
        var mode = { id: 1, name: "test", uploadDate: "today", votes:69, creator: { username: "dude" }};
        if (!mode) {
            return res.status(404).render('not-found');
        }
        res.render('mode', { mode: mode });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Upvote mode
router.post('/:modeId/vote', async (req, res) => {
    try {
        const mode = await Mode.findOne({ id: parseInt(req.params.modeId, 10) });
        if (!mode) {
            return res.status(404).render('not-found');
        }
        res.render('modes/show', { mode });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Favorite mode
router.post('/:modeId/favorite', (req, res) => {
    const modeId = req.params.modeId;
    // Add the mode to the user's favorites in the database
    res.redirect('/modes/' + modeId);
});

router.post('/create', async (req, res) => {
    try {
        // ... (other code for handling file uploads, etc.)

        const newMode = new Mode({
            name: req.body.name,
            description: req.body.description,
            file: req.file.buffer, // Assuming you're using multer or similar for file uploads
            thumbnail: req.thumbnail.buffer, // Similarly, handle thumbnail upload
            createdBy: req.user._id // Assuming you have user info in req.user
        });

        await newMode.save();
        res.redirect('/modes');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

