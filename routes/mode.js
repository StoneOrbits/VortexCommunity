const express = require('express');
const router = express.Router();
const fs = require('fs').promises; // Using the promise-based version of fs
const path = require('path');
const User = require('../models/User');
const PatternSet = require('../models/PatternSet');
const Mode = require('../models/Mode');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const tmp = require('tmp-promise'); // Using tmp-promise for handling temporary files with promises
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const spawn = require('child_process').spawn;

async function buildMode(mode) {
  const patternSets = await PatternSet.find({ _id: { $in: mode.patternSets } }).exec();
  const ledPatternOrder = mode.ledPatternOrder;

  const patternSetMap = {};
  patternSets.forEach(ps => {
    patternSetMap[ps._id] = ps.data;
  });

  const num_leds = mode.deviceType === 'Gloves' ? 10 :
    mode.deviceType === 'Orbit' ? 28 :
    mode.deviceType === 'Handle' ? 3 :
    mode.deviceType === 'Duo' ? 2 :
    mode.deviceType === 'Chromadeck' ? 20 : 0;

  const single_pats = ledPatternOrder.map(orderIndex => patternSetMap[mode.patternSets[orderIndex]]);

  const vortexMode = {
    flags: mode.flags,
    num_leds: num_leds,
    single_pats: single_pats
  };
  return vortexMode;
}

router.get('/:modeId', async (req, res) => {
  try {
    const mode = await Mode.findOne({ _id: req.params.modeId })
      .populate('createdBy');
    if (!mode) {
      return res.status(404).render('not-found');
    }

    const vortexMode = await buildMode(mode);
    const base64Json = Buffer.from(JSON.stringify(vortexMode)).toString('base64');
    const lightshowUrl = `http://127.0.0.1:8000/?data=${base64Json}`;

    const patternSets = await PatternSet.find({ _id: { $in: mode.patternSets } }).exec();
    const patternSetMap = {};
    patternSets.forEach(ps => {
      patternSetMap[ps._id] = ps;
    });
    const ledPatternOrder = mode.ledPatternOrder;
    const orderedPatternSets = ledPatternOrder.map(orderIndex => patternSetMap[mode.patternSets[orderIndex]._id]);

    res.render('mode', {
      vortexMode: vortexMode,
      mode: mode,
      user: req.user,
      lightshowUrl: lightshowUrl,
      patternSets: patternSets,
      orderedPatternSets: orderedPatternSets
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/:modeId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findById(req.params.modeId);
    if (!mode) {
      return res.status(404).render('not-found');
    }
    if (mode.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }
    res.render('mode-edit', { mode: mode, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/:modeId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const modeId = req.params.modeId;
    const mode = await Mode.findById(modeId);

    if (!mode) {
      return res.status(404).render('not-found');
    }

    if (req.user._id.toString() !== mode.createdBy.toString()) {
      return res.status(403).send('Unauthorized');
    }

    mode.name = req.body.modeName;
    mode.description = req.body.modeDescription;

    await mode.save();
    res.redirect(`/mode/${modeId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete mode
router.post('/:modeId/delete', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findById(req.params.modeId);
    if (!mode) {
      return res.status(404).send('Mode not found');
    }
    if (mode.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    // Directly delete the mode from the database
    await Mode.deleteOne({ _id: req.params.modeId });
    res.redirect('/modes');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Upvote modeset
router.post('/:modeId/upvote', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findById(req.params.modeId);
    if (!mode) {
      return res.status(404).render('not-found');
    }
    // Check if the user has already upvoted this mode
    if (!mode.upvotedBy.includes(req.user._id)) {
      // Add the user's ID to the upvotedBy array
      mode.upvotedBy.push(req.user._id);
      // Increment the upvote count
      mode.votes += 1;
      // Save the mode
      await mode.save();
    }
    // Redirect or render as needed
    res.redirect('/mode/' + mode._id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Unvote modeset
router.post('/:modeId/unvote', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findById(req.params.modeId);
    if (!mode) {
      return res.status(404).render('not-found');
    }
    // Check if the user has already upvoted this mode
    if (mode.upvotedBy.includes(req.user._id)) {
      // Add the user's ID to the upvotedBy array
      mode.upvotedBy.remove(req.user._id);
      // Increment the upvote count
      mode.votes -= 1;
      // Save the mode
      await mode.save();
    }
    // Redirect or render as needed
    res.redirect('/mode/' + mode._id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Favorite mode
router.post('/:modeId/favorite', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findById(req.params.modeId);
    if (!mode) {
      return res.status(404).send('Mode not found');
    }

    const user = await User.findById(req.user._id);
    if (!user.favModes.includes(req.params.modeId)) {
      user.favModes.push(req.params.modeId);
      await user.save();
    }

    res.redirect(`/mode/${req.params.modeId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Unfavorite mode
router.post('/:modeId/unfavorite', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const index = user.favModes.indexOf(req.params.modeId);
    if (index > -1) {
      user.favModes.splice(index, 1);
      await user.save();
    }

    res.redirect(`/mode/${req.params.modeId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/create', async (req, res) => {
  try {
    const newMode = new Mode({
      name: req.body.name,
      description: req.body.description,
      file: req.file.buffer, // Assuming you're using multer or similar for file uploads
      thumbnail: req.thumbnail.buffer, // Similarly, handle thumbnail upload
      createdBy: req.user._id // Assuming you have user info in req.user
    });
    await newMode.save();
    res.redirect('/modes');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Download mode
router.get('/:modeId/download', ensureAuthenticated, async (req, res) => {
  try {
    const mode = await Mode.findOne({ _id: req.params.modeId });
    if (!mode) {
      return res.status(404).send('Mode not found');
    }

    // Create a temporary file for the output .vtxmode
    const tempVtxmodeFile = await tmp.file({ postfix: '.vtxmode' });

    // Wrap the mode data in a vortex savefile
    const wrappedModeData = {
      version_major: 1,
      version_minor: 1,
      brightness: 255,
      global_flags: 0,
      num_modes: 1,
      modes: [ await buildMode(mode) ],
    };

    const modeDataJson = JSON.stringify(wrappedModeData);
    console.log(modeDataJson);
    const command = `/usr/local/bin/vortex --silent --quick --led-count ${mode.num_leds} --write-mode ${tempVtxmodeFile.path} --json-in`;
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

          // If the command executed successfully, send the .vtxmode file as a download
          res.download(tempVtxmodeFile.path, `${mode.name.replace(/\s+/g, '_')}.vtxmode`, async (err) => {
            if (err) {
              console.error('Error sending file:', err);
            }
            // Cleanup temporary file after sending it or in case of error
            await tempVtxmodeFile.cleanup();
          });
        } catch (readError) {
          console.error('Error reading generated file:', readError);
          await tempVtxmodeFile.cleanup();
          return res.status(500).send('Error reading generated file');
        }
      } else {
        console.error('Vortex process exited with code:', code);
        await tempVtxmodeFile.cleanup(); // Ensure cleanup in case of failure
        return res.status(500).send('Conversion failed');
      }
    });

    // Write the JSON data to the vortex command's stdin and close it to start the process
    vortex.stdin.write(modeDataJson);
    vortex.stdin.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


module.exports = router;

