const express = require('express');
const router = express.Router();
const PatternSet = require('../models/PatternSet');
const Mode = require('../models/Mode');
const { ensureAuthenticated } = require('../middleware/checkAuth');

router.get('/', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const searchQuery = req.query.search;

    let modesForCurrentPage = await Mode.find().sort({ votes: -1 }).exec();

    if (searchQuery) {
      modesForCurrentPage = modesForCurrentPage.filter(mode => mode.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    res.render('modes', {
      modes: modesForCurrentPage,
      user: req.user,
      currentPage: page,
      search: req.query.search
    });
  } catch (error) {
    console.error('Error fetching modes:', error);
    req.flash('error', 'An error occurred while fetching modes.');
    res.redirect('/');
  }
});

router.get('/json', async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1, 10);
    const pageSize = parseInt(req.query.pageSize || 10, 10);
    const searchQuery = req.query.search;

    let query = { createdBy: req.user._id };
    if (searchQuery) {
      query.name = { $regex: new RegExp(searchQuery, 'i') };
    }

    const totalCount = await Mode.countDocuments(query);
    const modesForCurrentPage = await Mode.find(query)
      .sort({ votes: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const pageCount = Math.ceil(totalCount / pageSize);

    res.json({
      data: modesForCurrentPage,
      page: page,
      pageSize: pageSize,
      pages: pageCount,
      totalCount: totalCount
    });
  } catch (error) {
    console.error("Error fetching modes:", error);
    res.status(500).send("An error occurred while fetching the modes.");
  }
});

module.exports = router;
