const express = require('express');
const router = express.Router();
const { PatternSet, Mode, ModePatternSet, User } = require('../models/pg/index');
const { Op } = require('sequelize');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1, 10);
    const pageSize = parseInt(req.query.pageSize || 40, 10);
    const searchQuery = req.query.search || '';
    const sortQuery = req.query.sort || 'votes';
    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const where = searchQuery ? { name: { [Op.iLike]: `%${searchQuery}%` } } : {};

    const { count: totalCount, rows: modes } = await Mode.findAndCountAll({
      where,
      order: [[sortQuery, sortOrder]],
      offset: (page - 1) * pageSize,
      limit: pageSize
    });

    const orderedPatternSetsArray = await Promise.all(modes.map(async (mode) => {
      const mpsEntries = await ModePatternSet.findAll({
        where: { modeId: mode.id },
        order: [['sortOrder', 'ASC']]
      });
      const psIds = mpsEntries.map(mps => mps.patternSetId);
      const patternSets = await PatternSet.findAll({ where: { id: psIds } });
      const patternSetMap = {};
      patternSets.forEach(ps => {
        patternSetMap[ps.id] = ps;
      });
      return mpsEntries.map(mps => patternSetMap[mps.patternSetId]).filter(Boolean);
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

    let where = {};
    if (searchQuery) {
      where.name = { [Op.iLike]: `%${searchQuery}%` };
    }

    const { count: totalCount, rows: modesForCurrentPage } = await Mode.findAndCountAll({
      where,
      order: [['votes', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      include: [
        {
          model: PatternSet,
          as: 'patternSets',
          through: { attributes: ['sortOrder'] }
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ]
    });

    for (const mode of modesForCurrentPage) {
      const patternSetsRaw = mode.patternSets || [];

      if (patternSetsRaw.length === 0) {
        mode.patternSets = [];
        mode.ledPatternOrder = [];
        continue;
      }

      // 1. FORCE deterministic ordering using join table
      const orderedPatternSets = [...patternSetsRaw].sort((a, b) => {
        const aOrder = a.ModePatternSet?.sortOrder ?? 0;
        const bOrder = b.ModePatternSet?.sortOrder ?? 0;
        return aOrder - bOrder;
      });

      // 2. Rebuild patternSets in correct order
      mode.patternSets = orderedPatternSets;

      // 3. Build index map based on THIS ORDER (critical fix)
      const patternSetIdToIndex = {};
      orderedPatternSets.forEach((ps, idx) => {
        patternSetIdToIndex[ps.id] = idx;
      });

      // 4. Pull ModePatternSet rows (authoritative LED sequence)
      const mpsEntries = await ModePatternSet.findAll({
        where: { modeId: mode.id },
        order: [['sortOrder', 'ASC']]
      });

      // 5. Build ledPatternOrder as INDEXES into orderedPatternSets
      mode.ledPatternOrder = mpsEntries
        .map(mps => patternSetIdToIndex[mps.patternSetId])
        .filter(idx => idx !== undefined && idx !== null);
    }

    const pageCount = Math.ceil(totalCount / pageSize);

    res.json({
      data: modesForCurrentPage,
      page,
      pageSize,
      pages: pageCount,
      totalCount
    });

  } catch (error) {
    console.error("Error fetching modes:", error);
    res.status(500).send("An error occurred while fetching the modes.");
  }
});

module.exports = router;
