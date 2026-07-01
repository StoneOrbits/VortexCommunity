const express = require('express');
const router = express.Router();
const { PatternSet, Mode, ModePatternSet, User } = require('../models/pg/index');
const { Op } = require('sequelize');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1, 10);
    const pageSize = parseInt(req.query.pageSize || 999, 10);
    const searchQuery = req.query.search || '';
    const sortQuery = req.query.sort || 'votes';
    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const where = {};
    if (searchQuery) {
      where.name = { [Op.iLike]: `%${searchQuery}%` };
    }

    const { count: totalCount, rows: modes } = await Mode.findAndCountAll({
      where,
      order: [[sortQuery, sortOrder]],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username'] }
      ]
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
          as: 'patternSets'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ]
    });

    const result = [];

    for (const mode of modes) {
      const m = mode.toJSON();

      const mpsEntries = await ModePatternSet.findAll({
        where: { modeId: mode.id },
        order: [['sortOrder', 'ASC']]
      });

      const patternSetsRaw = m.patternSets || [];

      const psMap = new Map();
      for (const ps of patternSetsRaw) {
        psMap.set(ps.id, ps);
      }

      const orderedPatternSets = [];
      const idToIndex = new Map();

      for (const mps of mpsEntries) {
        const ps = psMap.get(mps.patternSetId);
        if (!ps) continue;

        const index = orderedPatternSets.length;
        orderedPatternSets.push(ps);
        idToIndex.set(ps.id, index);
      }

      const ledPatternOrder = mpsEntries
        .map(mps => idToIndex.get(mps.patternSetId))
        .filter(v => v !== undefined);

      result.push({
        _id: m.id,
        name: m.name,
        description: m.description || "",
        deviceType: m.deviceType,
        patternSets: orderedPatternSets.map(ps => ({
          _id: ps.id,
          name: ps.name,
          description: ps.description,
          data: ps.data,
          dataHash: ps.dataHash,
          votes: ps.votes,
          upvotedBy: ps.upvotedBy || [],
          createdBy: ps.createdBy,
          uploadDate: ps.uploadDate,
          __v: ps.__v || 0
        })),
        ledPatternOrder,
        flags: m.flags,
        dataHash: m.dataHash,
        votes: m.votes,
        upvotedBy: m.upvotedBy || [],
        createdBy: m.createdBy,
        uploadDate: m.uploadDate,
        __v: m.__v || 0
      });
    }

    res.json({
      data: result,
      page,
      pageSize,
      pages: Math.ceil(totalCount / pageSize),
      totalCount
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});

module.exports = router;
