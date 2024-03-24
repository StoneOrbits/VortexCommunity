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

// show the main modes showcase
router.get('/json', async (req, res) => {
  // Extracting page and pageSize from query parameters
  // Defaulting to 1 for page and allowing pageSize to be specified by the client
  const page = parseInt(req.query.page || 1, 10);
  const pageSize = parseInt(req.query.pageSize || 10, 10); // Default size is 10
  const searchQuery = req.query.search;

  var modesForCurrentPage = await Mode.find().sort({ votes: -1 }).exec();
  // If search query is present, filter the modes based on the search criteria
  if (searchQuery) {
    modesForCurrentPage = modesForCurrentPage.filter(mode => {
      return mode.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }

  // Now using pageSize from the query parameter
  const totalCount = modesForCurrentPage.length;
  const pageCount = Math.ceil(totalCount / pageSize); // Calculate total pages based on dynamic pageSize
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const modesOnPage = modesForCurrentPage.slice(startIndex, endIndex);

  // Return the modes as JSON
  res.json({
    data: modesOnPage,
    page: page,
    pageSize: pageSize, // Include pageSize in the response for clarity
    pages: pageCount,
    totalCount: totalCount
  });
});

module.exports = router;

