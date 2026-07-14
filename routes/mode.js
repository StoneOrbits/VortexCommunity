const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { User, PatternSet, Mode, ModePatternSet, ModeUpvote, UserFavoriteMode } = require('../models/pg/index');
const { Op } = require('sequelize');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const tmp = require('tmp-promise');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const spawn = require('child_process').spawn;
require('dotenv').config();

router.param('modeId', (req, res, next, val) => {
  if (!/^\d+$/.test(val) || parseInt(val, 10) > 2147483647) {
    return res.status(404).render('not-found');
  }
  next();
});

const ledCounts = {
  'Gloves': 10,
  'Orbit': 28,
  'Handle': 3,
  'Duo': 2,
  'Chromadeck': 20,
  'Spark': 6
};

async function buildMode(mode) {
  const mpsEntries = await ModePatternSet.findAll({
    where: { modeId: mode.id },
    order: [['sortOrder', 'ASC']]
  });
  const psIds = mpsEntries.map(mps => mps.patternSetId);
  const patternSets = await PatternSet.findAll({ where: { id: psIds } });
  const patternSetMap = {};
  patternSets.forEach(ps => {
    patternSetMap[ps.id] = ps.data;
  });

  const num_leds = ledCounts[mode.deviceType] || 1;
  const single_pats = mpsEntries.map(mps => patternSetMap[mps.patternSetId]);

  return { flags: mode.flags, num_leds, single_pats };
}

async function getOrderedPatternSets(modeId) {
  const mpsEntries = await ModePatternSet.findAll({
    where: { modeId },
    order: [['sortOrder', 'ASC']]
  });
  const psIds = mpsEntries.map(mps => mps.patternSetId);
  const patternSets = await PatternSet.findAll({ where: { id: psIds } });
  const patternSetMap = {};
  patternSets.forEach(ps => {
    patternSetMap[ps.id] = ps;
  });
  return mpsEntries.map(mps => patternSetMap[mps.patternSetId]).filter(Boolean);
}

router.get('/:modeId', async (req, res) => {
  try {
    const mode = await Mode.findByPk(req.params.modeId, {
      include: [{ model: User, as: 'creator' }]
    });
    if (!mode) {
      return res.status(404).render('not-found');
    }

    const vortexMode = await buildMode(mode);
    const lightshowUrl = process.env.LIGHTSHOWLOL_URL ? process.env.LIGHTSHOWLOL_URL : 'https://lightshow.lol';

    const patternSets = await PatternSet.findAll({
      include: [{
        model: Mode,
        as: 'modes',
        where: { id: mode.id },
        required: true
      }]
    });

    const orderedPatternSets = await getOrderedPatternSets(mode.id);

    // Reconstruct ledPatternOrder from the join table (was an embedded array in MongoDB)
    const mpsEntries = await ModePatternSet.findAll({
      where: { modeId: mode.id },
      order: [['sortOrder', 'ASC']]
    });
    const psIdToIndex = {};
    orderedPatternSets.forEach((ps, i) => { if (!(ps.id in psIdToIndex)) psIdToIndex[ps.id] = i; });
    mode.dataValues.ledPatternOrder = mpsEntries.map(mps => psIdToIndex[mps.patternSetId]);

    // Build a tempId map for the view (orderedPatternSets may have duplicates, indexOf fails on different object refs)
    const patternIndexMap = {};
    Object.keys(psIdToIndex).forEach(id => { patternIndexMap[id] = psIdToIndex[id]; });

    let isUpvoted = false;
    let isFavorited = false;
    if (req.user) {
      const upvote = await ModeUpvote.findOne({ where: { modeId: mode.id, userId: req.user.id } });
      isUpvoted = !!upvote;
      const favorite = await UserFavoriteMode.findOne({ where: { modeId: mode.id, userId: req.user.id } });
      isFavorited = !!favorite;
    }

    res.render('mode', {
      vortexMode,
      mode,
      user: req.user,
      lightshowUrl,
      patternSets,
      orderedPatternSets,
      patternIndexMap,
      isUpvoted,
      isFavorited
    });
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(404).render('not-found');
    }
    res.status(500).send('Server Error');
  }
});

router.get('/:modeId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findByPk(req.params.modeId);
    if (!mode) {
      return res.status(404).render('not-found');
    }
    if (mode.createdBy !== req.user.id) {
      return res.status(403).send('Unauthorized');
    }
    res.render('mode-edit', { mode, user: req.user });
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(404).render('not-found');
    }
    res.status(500).send('Server Error');
  }
});

router.post('/:modeId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const modeId = req.params.modeId;
    const mode = await Mode.findByPk(modeId);
    const basePath = req.app.locals.basePath || '';

    if (!mode) {
      return res.status(404).render('not-found');
    }

    if (req.user.id !== mode.createdBy) {
      return res.status(403).send('Unauthorized');
    }

    mode.name = req.body.modeName;
    mode.description = req.body.modeDescription;
    await mode.save();
    res.redirect(basePath + `/mode/${modeId}`);
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(404).render('not-found');
    }
    res.status(500).send('Server Error');
  }
});

router.post('/:modeId/delete', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findByPk(req.params.modeId);
    const basePath = req.app.locals.basePath || '';
    if (!mode) {
      return res.status(404).send('Mode not found');
    }
    if (mode.createdBy !== req.user.id) {
      return res.status(403).send('Unauthorized');
    }

    await Mode.destroy({ where: { id: req.params.modeId } });
    res.redirect(basePath + '/modes');
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(404).render('not-found');
    }
    res.status(500).send('Server Error');
  }
});

router.post('/:modeId/upvote', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findByPk(req.params.modeId);
    const basePath = req.app.locals.basePath || '';
    if (!mode) {
      return res.status(404).render('not-found');
    }

    const existing = await ModeUpvote.findOne({
      where: { modeId: mode.id, userId: req.user.id }
    });

    if (!existing) {
      await ModeUpvote.create({ modeId: mode.id, userId: req.user.id });
      await Mode.increment('votes', { by: 1, where: { id: mode.id } });
    }

    res.redirect(basePath + '/mode/' + mode.id);
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(404).render('not-found');
    }
    res.status(500).send('Server Error');
  }
});

router.post('/:modeId/unvote', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findByPk(req.params.modeId);
    const basePath = req.app.locals.basePath || '';
    if (!mode) {
      return res.status(404).render('not-found');
    }

    const existing = await ModeUpvote.findOne({
      where: { modeId: mode.id, userId: req.user.id }
    });

    if (existing) {
      await ModeUpvote.destroy({
        where: { modeId: mode.id, userId: req.user.id }
      });
      await Mode.decrement('votes', { by: 1, where: { id: mode.id } });
    }

    res.redirect(basePath + '/mode/' + mode.id);
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(404).render('not-found');
    }
    res.status(500).send('Server Error');
  }
});

router.post('/:modeId/favorite', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findByPk(req.params.modeId);
    const basePath = req.app.locals.basePath || '';
    if (!mode) {
      return res.status(404).send('Mode not found');
    }

    await UserFavoriteMode.findOrCreate({
      where: { userId: req.user.id, modeId: mode.id }
    });

    res.redirect(basePath + `/mode/${req.params.modeId}`);
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(404).render('not-found');
    }
    res.status(500).send('Server Error');
  }
});

router.post('/:modeId/unfavorite', ensureAuthenticated, async (req, res) => {
  try {
    const basePath = req.app.locals.basePath || '';
    await UserFavoriteMode.destroy({
      where: { userId: req.user.id, modeId: req.params.modeId }
    });

    res.redirect(basePath + `/mode/${req.params.modeId}`);
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(404).render('not-found');
    }
    res.status(500).send('Server Error');
  }
});

router.post('/create', async (req, res) => {
  try {
    await Mode.create({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user.id
    });
    const basePath = req.app.locals.basePath || '';
    res.redirect(basePath + '/modes');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/:modeId/download', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findByPk(req.params.modeId);
    if (!mode) {
      return res.status(404).send('Mode not found');
    }

    const tempVtxmodeFile = await tmp.file({ postfix: '.vtxmode' });

    const wrappedModeData = {
      version_major: 1,
      version_minor: 1,
      brightness: 255,
      global_flags: 0,
      num_modes: 1,
      modes: [ await buildMode(mode) ],
    };

    const numLeds = ledCounts[mode.deviceType] || 1;
    const modeDataJson = JSON.stringify(wrappedModeData);
    const command = `/usr/local/bin/vortex --silent --quick --led-count ${numLeds} --write-mode ${tempVtxmodeFile.path} --json-in`;
    const vortex = spawn(command, [], { shell: true, stdio: ['pipe', 'ignore', 'pipe'] });

    vortex.stderr.on('data', (data) => {
      console.error('Vortex STDERR:', data.toString());
    });

    vortex.on('error', (error) => {
      console.error('Spawn error:', error);
      return res.status(500).send('Conversion error');
    });

    vortex.on('close', async (code) => {
      if (code === 0) {
        try {
          const fileBuffer = await fs.readFile(tempVtxmodeFile.path);
          if (fileBuffer.length === 0) {
            console.error('Generated file is empty');
            return res.status(500).send('Conversion failed: Empty file');
          }

          res.download(tempVtxmodeFile.path, `${mode.name.replace(/\s+/g, '_')}.vtxmode`, async (err) => {
            if (err) {
              console.error('Error sending file:', err);
            }
            await tempVtxmodeFile.cleanup();
          });
        } catch (readError) {
          console.error('Error reading generated file:', readError);
          await tempVtxmodeFile.cleanup();
          return res.status(500).send('Error reading generated file');
        }
      } else {
        console.error('Vortex process exited with code:', code);
        await tempVtxmodeFile.cleanup();
        return res.status(500).send('Conversion failed');
      }
    });

    vortex.stdin.write(modeDataJson);
    vortex.stdin.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
