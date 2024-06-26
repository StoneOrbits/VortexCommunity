const express = require('express');
const router = express.Router();
const PatternSet = require('../models/PatternSet');
const Mode = require('../models/Mode');
const { ensureAuthenticated } = require('../middleware/checkAuth');

// show the main pats showcase
router.get('/', async (req, res) => {
  const page = req.query.page || 1;
  const searchQuery = req.query.search;

  let patsForCurrentPage = await PatternSet.find().sort({ votes: -1 }).exec();
  let modesForCurrentPage = await Mode.find().sort({ votes: -1 }).populate('patternSets').exec();

  if (searchQuery) {
    patsForCurrentPage = patsForCurrentPage.filter(pat => pat.name.toLowerCase().includes(searchQuery.toLowerCase()));
    modesForCurrentPage = modesForCurrentPage.filter(mode => mode.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  res.render('pats', {
    pats: patsForCurrentPage,
    modes: modesForCurrentPage,
    user: req.user,
    currentPage: page,
    search: req.query.search
  });
});

router.get('/json', async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1, 10);
    const pageSize = parseInt(req.query.pageSize || 10, 10);
    const searchQuery = req.query.search;

    let query = {};
    if (searchQuery) {
      query.name = { $regex: new RegExp(searchQuery, 'i') };
    }

    const totalCount = await PatternSet.countDocuments(query);
    const patsForCurrentPage = await PatternSet.find(query)
      .sort({ votes: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const pageCount = Math.ceil(totalCount / pageSize);

    res.json({
      data: patsForCurrentPage,
      page: page,
      pageSize: pageSize,
      pages: pageCount,
      totalCount: totalCount
    });
  } catch (error) {
    console.error("Error fetching pats:", error);
    res.status(500).send("An error occurred while fetching the pats.");
  }
});

module.exports = router;
