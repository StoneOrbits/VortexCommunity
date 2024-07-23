const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PatternSet = require('../models/PatternSet');
const Mode = require('../models/Mode');

router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const profileUser = await User.findById(userId);

    if (!profileUser) {
      // Handle the case where the user is not found
      return res.status(404).render('404', { message: 'User not found' });
    }

    // lookup pats for this user since populate seems broken
    const userPats = await PatternSet.find({ createdBy: userId });

    const page = 1;
    const pageSize = 8;
    
    const searchQuery = req.query.search || '';
    const sortQuery = req.query.sort || 'votes'; // Default sorting by votes
    const sortOrder = req.query.order === 'asc' ? 1 : -1; // Default descending order

    const query = searchQuery ? { createdBy: user._id, name: { $regex: new RegExp(searchQuery, 'i') } } : {};


    const userModes = await Mode.find(query)
      .sort({ [sortQuery]: sortOrder })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('patternSets') // Assuming 'patternSets' is a reference field in the Mode schema
      .exec();

    const orderedPatternSetsArray = await Promise.all(userModes.map(async (mode) => {
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

    // Render the profile view, passing the user object
    res.render('profile', { profileUser, userPats, userModes, orderedPatternSetsArray });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'An error occurred while retrieving the user profile' });
  }
});

module.exports = router;

