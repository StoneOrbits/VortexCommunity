const express = require('express');
const router = express.Router();
const PatternSet = require('../models/PatternSet');
const Mode = require('../models/Mode');
const { ensureAuthenticated } = require('../middleware/checkAuth');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1, 10);
    const pageSize = parseInt(req.query.pageSize || 40, 10);
    const searchQuery = req.query.search || '';
    const sortQuery = req.query.sort || 'votes'; // Default sorting by votes
    const sortOrder = req.query.order === 'asc' ? 1 : -1; // Default descending order

    const query = searchQuery ? { name: { $regex: new RegExp(searchQuery, 'i') } } : {};

    const totalCount = await Mode.countDocuments(query);
    const modes = await Mode.find(query)
      .sort({ [sortQuery]: sortOrder })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('patternSets') // Assuming 'patternSets' is a reference field in the Mode schema
      .exec();

    const orderedPatternSetsArray = await Promise.all(modes.map(async (mode) => {
      const patternSets = await PatternSet.find({ _id: { $in: mode.patternSets } }).exec();
      const patternSetMap = {};
      patternSets.forEach(ps => {
        patternSetMap[ps._id] = ps;
      });
      const orderedPatternSets = mode.ledPatternOrder.map(orderIndex => {
        if (orderIndex >= 0 && orderIndex < mode.patternSets.length) {
          return patternSetMap[mode.patternSets[orderIndex]._id];
        } else {
          // return the first one if for some reason the map has a bad index
          return patternSetMap[mode.patternSets[0]._id];
        }
      });

      return orderedPatternSets;
    }));

    res.render('modes', {
      modes: modes,
      orderedPatternSetsArray: orderedPatternSetsArray,
      user: req.user,
      currentPage: page,
      pageSize: pageSize,
      pageCount: Math.ceil(totalCount / pageSize),
      totalCount: totalCount,
      search: searchQuery,
      sort: sortQuery,
      order: req.query.order || 'desc'
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

    let query = {};
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
