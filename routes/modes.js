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

    const where = searchQuery
      ? { name: { [Op.iLike]: `%${searchQuery}%` } }
      : {};

    const { count: totalCount, rows: modes } = await Mode.findAndCountAll({
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

    const cleaned = [];

    for (const mode of modes) {
      const modeJson = mode.toJSON();

      const patternSets = (modeJson.patternSets || []).sort((a, b) => {
        return (a.ModePatternSet?.sortOrder ?? 0) - (b.ModePatternSet?.sortOrder ?? 0);
      });

      // IMPORTANT: remove join metadata completely
      const cleanPatternSets = patternSets.map(ps => {
        const { ModePatternSet, ...rest } = ps;
        return rest;
      });

      const idToIndex = new Map();
      cleanPatternSets.forEach((ps, idx) => {
        idToIndex.set(ps.id, idx);
      });

      const mpsEntries = await ModePatternSet.findAll({
        where: { modeId: mode.id },
        order: [['sortOrder', 'ASC']]
      });

      const ledPatternOrder = mpsEntries
        .map(mps => idToIndex.get(mps.patternSetId))
        .filter(v => v !== undefined);

      cleaned.push({
        id: modeJson.id,
        name: modeJson.name,
        description: modeJson.description,
        deviceType: modeJson.deviceType,
        flags: modeJson.flags,
        dataHash: modeJson.dataHash,
        votes: modeJson.votes,
        uploadDate: modeJson.uploadDate,
        createdAt: modeJson.createdAt,
        updatedAt: modeJson.updatedAt,
        createdBy: modeJson.createdBy,
        patternSets: cleanPatternSets,
        creator: modeJson.creator,
        ledPatternOrder
      });
    }

    res.json({
      data: cleaned,
      page,
      pageSize,
      pages: Math.ceil(totalCount / pageSize),
      totalCount
    });

  } catch (error) {
    console.error("Error fetching modes:", error);
    res.status(500).send("An error occurred while fetching the modes.");
  }
});

module.exports = router;
