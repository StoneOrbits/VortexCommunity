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
    const userModes = await Mode.findAll({ where: { createdBy: userId } });

    const modeCount = userModes.length;
    const patCount = userPats.length;

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

    res.render('profile', { profileUser, userPats, userModes, modeCount, patCount, orderedPatternSetsArray });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'An error occurred while retrieving the user profile' });
  }
});

module.exports = router;
