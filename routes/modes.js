const express = require('express');
const router = express.Router();
const Mode = require('../models/Mode');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const fs = require('fs');
const path = require('path');

// show the main modes showcase
router.get('/', async (req, res) => {
    const page = req.query.page || 1;
    const searchQuery = req.query.search;
    var modesForCurrentPage = await Mode.find().sort({ votes: -1 }).exec();
    // If search query is present, filter the modes based on the search criteria
    if (searchQuery) {
        modesForCurrentPage = modesForCurrentPage.filter(mode => {
            return mode.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }
    // Fetch modes for the current page
    res.render('modes', { modes: modesForCurrentPage, user: req.user, currentPage: page, search: req.query.search });
});

module.exports = router;

