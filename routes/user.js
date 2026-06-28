const express = require('express');
const router = express.Router();
const { User, PatternSet, Mode, ModePatternSet } = require('../models/pg/index');
const { Op } = require('sequelize');

router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const profileUser = await User.findByPk(userId);

    if (!profileUser) {
      return res.status(404).render('404', { message: 'User not found' });
    }

    const userPats = await PatternSet.findAll({ where: { createdBy: userId } });

    const page = 1;
    const pageSize = 8;

    const searchQuery = req.query.search || '';
    const sortQuery = req.query.sort || 'votes';
    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const where = searchQuery
      ? { createdBy: userId, name: { [Op.iLike]: `%${searchQuery}%` } }
      : { createdBy: userId };

    const userModes = await Mode.findAll({
      where,
      order: [[sortQuery, sortOrder]],
      offset: (page - 1) * pageSize,
      limit: pageSize
    });

    const orderedPatternSetsArray = await Promise.all(userModes.map(async (mode) => {
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

    res.render('profile', { profileUser, userPats, userModes, orderedPatternSetsArray });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'An error occurred while retrieving the user profile' });
  }
});

module.exports = router;
