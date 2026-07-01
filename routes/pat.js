const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { User, PatternSet, Mode, ModePatternSet, PatternSetUpvote, UserFavoritePattern } = require('../models/pg/index');
const { Op } = require('sequelize');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const tmp = require('tmp-promise');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const spawn = require('child_process').spawn;
const sequelize = require('../config/database-pg');
require('dotenv').config();

router.get('/:patId', async (req, res) => {
  try {
    const pat = await PatternSet.findByPk(req.params.patId, {
      include: [{ model: User, as: 'creator' }]
    });
    if (!pat) {
      return res.status(404).render('not-found');
    }

    const lightshowUrl = process.env.LIGHTSHOWLOL_URL ? process.env.LIGHTSHOWLOL_URL : 'https://lightshow.lol';

    const uploadDate = pat.uploadDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let isUpvoted = false;
    let isFavorited = false;
    if (req.user) {
      const upvote = await PatternSetUpvote.findOne({ where: { patternSetId: pat.id, userId: req.user.id } });
      isUpvoted = !!upvote;
      const favorite = await UserFavoritePattern.findOne({ where: { patternSetId: pat.id, userId: req.user.id } });
      isFavorited = !!favorite;
    }

    res.render('pat', {
      pat: pat,
      uploadDate: uploadDate,
      user: req.user,
      lightshowUrl: lightshowUrl,
      isUpvoted: isUpvoted,
      isFavorited: isFavorited
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/:patId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findByPk(req.params.patId);
    if (!pat) {
      return res.status(404).render('not-found');
    }
    if (pat.createdBy !== req.user.id) {
      return res.status(403).send('Unauthorized');
    }
    res.render('pat-edit', { pat, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:patId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const patId = req.params.patId;
    const pat = await PatternSet.findByPk(patId);
    const basePath = req.app.locals.basePath || '';

    if (!pat) {
      return res.status(404).render('not-found');
    }

    if (req.user.id !== pat.createdBy) {
      return res.status(403).send('Unauthorized');
    }

    pat.name = req.body.patName;
    pat.description = req.body.patDescription;
    await pat.save();
    res.redirect(basePath + `/pat/${patId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:patternId/delete', ensureAuthenticated, async (req, res) => {
  try {
    const patternId = req.params.patternId;
    const basePath = req.app.locals.basePath || '';

    const pattern = await PatternSet.findByPk(patternId);
    if (!pattern) {
      return res.status(404).send('Pattern not found');
    }

    const modesUsingPattern = await Mode.findAll({
      include: [{
        model: PatternSet,
        as: 'patternSets',
        where: { id: patternId },
        required: true
      }]
    });

    if (modesUsingPattern.length > 0) {
      return res.status(400).send('Pattern is referenced by one or more modes and cannot be deleted.');
    }

    await PatternSet.destroy({ where: { id: patternId } });
    res.redirect(basePath + '/pats');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:patId/upvote', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findByPk(req.params.patId);
    const basePath = req.app.locals.basePath || '';
    if (!pat) {
      return res.status(404).render('not-found');
    }

    const existing = await PatternSetUpvote.findOne({
      where: { patternSetId: pat.id, userId: req.user.id }
    });

    if (!existing) {
      await PatternSetUpvote.create({ patternSetId: pat.id, userId: req.user.id });
      await PatternSet.increment('votes', { by: 1, where: { id: pat.id } });
    }

    res.redirect(basePath + '/pat/' + pat.id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:patId/unvote', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findByPk(req.params.patId);
    const basePath = req.app.locals.basePath || '';
    if (!pat) {
      return res.status(404).render('not-found');
    }

    const existing = await PatternSetUpvote.findOne({
      where: { patternSetId: pat.id, userId: req.user.id }
    });

    if (existing) {
      await PatternSetUpvote.destroy({
        where: { patternSetId: pat.id, userId: req.user.id }
      });
      await PatternSet.decrement('votes', { by: 1, where: { id: pat.id } });
    }

    res.redirect(basePath + '/pat/' + pat.id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:patId/favorite', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findByPk(req.params.patId);
    const basePath = req.app.locals.basePath || '';
    if (!pat) {
      return res.status(404).send('PatternSet not found');
    }

    await UserFavoritePattern.findOrCreate({
      where: { userId: req.user.id, patternSetId: pat.id }
    });

    res.redirect(basePath + `/pat/${req.params.patId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:patId/unfavorite', ensureAuthenticated, async (req, res) => {
  try {
    const basePath = req.app.locals.basePath || '';
    await UserFavoritePattern.destroy({
      where: { userId: req.user.id, patternSetId: req.params.patId }
    });

    res.redirect(basePath + `/pat/${req.params.patId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/create', async (req, res) => {
  try {
    await PatternSet.create({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user.id
    });
    const basePath = req.app.locals.basePath || '';
    res.redirect(basePath + '/pats');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/:patId/download', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findByPk(req.params.patId);
    if (!pat) {
      return res.status(404).send('PatternSet not found');
    }

    const tempVtxmodeFile = await tmp.file({ postfix: '.vtxmode' });

    const wrappedPatternSetData = {
      version_major: 1,
      version_minor: 1,
      brightness: 255,
      global_flags: 0,
      num_modes: 1,
      modes: [{ flags: 2, num_leds: 1, single_pats: [pat.data] }],
    };

    const modeDataJson = JSON.stringify(wrappedPatternSetData);
    const command = `/usr/local/bin/vortex --silent --quick --led-count 1 --write-mode ${tempVtxmodeFile.path} --json-in`;
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

          res.download(tempVtxmodeFile.path, `${pat.name.replace(/\s+/g, '_')}.vtxmode`, async (err) => {
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
