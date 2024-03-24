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

router.get('/json', async (req, res) => {
  try {
    // Extracting page and pageSize from query parameters
    // Defaulting to 1 for page and allowing pageSize to be specified by the client
    const page = parseInt(req.query.page || 1, 10);
    const pageSize = parseInt(req.query.pageSize || 10, 10); // Default size is 10
    const searchQuery = req.query.search;

    // Build the query object
    let query = {};
    if (searchQuery) {
      query.name = { $regex: new RegExp(searchQuery, 'i') }; // Case-insensitive search
    }

    // Find the total count for pagination metadata (total pages, etc.)
    const totalCount = await Mode.countDocuments(query);

    // Use MongoDB's skip and limit for efficient pagination, along with sorting
    const modesForCurrentPage = await Mode.find(query)
      .sort({ votes: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const pageCount = Math.ceil(totalCount / pageSize); // Calculate total pages based on dynamic pageSize

    // Return the modes as JSON
    res.json({
      data: modesForCurrentPage,
      page: page,
      pageSize: pageSize, // Include pageSize in the response for clarity
      pages: pageCount,
      totalCount: totalCount
    });
  } catch (error) {
    console.error("Error fetching modes:", error);
    res.status(500).send("An error occurred while fetching the modes.");
  }
});

module.exports = router;
