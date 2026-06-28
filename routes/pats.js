const express = require('express');
const router = express.Router();
const { PatternSet, PatternSetUpvote } = require('../models/pg/index');
const { Op } = require('sequelize');

router.get('/', async (req, res) => {
  const page = req.query.page || 1;
  const searchQuery = req.query.search;

  let patsForCurrentPage = await PatternSet.findAll({
    order: [['votes', 'DESC']]
  });

  if (searchQuery) {
    patsForCurrentPage = patsForCurrentPage.filter(pat =>
      pat.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  res.render('pats', {
    pats: patsForCurrentPage,
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

    let where = {};
    if (searchQuery) {
      where.name = { [Op.iLike]: `%${searchQuery}%` };
    }

    const { count: totalCount, rows: patsForCurrentPage } = await PatternSet.findAndCountAll({
      where,
      order: [['votes', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize
    });

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
