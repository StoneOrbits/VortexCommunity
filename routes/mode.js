const express = require('express');
const router = express.Router();
const fs = require('fs').promises; // Using the promise-based version of fs
const path = require('path');
const Mode = require('../models/Mode');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const tmp = require('tmp-promise'); // Using tmp-promise for handling temporary files with promises
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

router.get('/:modeId', async (req, res) => {
  try {
    const mode = await Mode.findOne({ _id: req.params.modeId }).populate('createdBy');
    if (!mode) {
      return res.status(404).render('not-found');
    }

    // Base64 encode the modeData for use in a URL or other purposes
    const base64EncodedData = Buffer.from(JSON.stringify(mode.modeData)).toString('base64');
    const lightshowUrl = `https://lightshow.lol/loadMode?data=${base64EncodedData}`;

    // Format the upload date
    const uploadDate = mode.uploadDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    res.render('mode', {
      mode: mode,
      uploadDate: uploadDate,
      user: req.user,
      lightshowUrl: lightshowUrl  // Passing the generated URL to the template
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Edit mode details
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

// Update mode details
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
    // Add more updates here as needed

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

// Upvote mode
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

// Unvote mode
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
    if (!user.favorites.includes(req.params.modeId)) {
      user.favorites.push(req.params.modeId);
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
    const index = user.favorites.indexOf(req.params.modeId);
    if (index > -1) {
      user.favorites.splice(index, 1);
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

    // wrapp the mode data in a vortex savefile so the CLI can parse it
    // TODO: honestly the CLI should just accept the modedata json, I'll do it later
    const wrappedModeData = {
      version_major: 1, version_minor: 1, brightness: 255, global_flags: 0, num_modes: 1,
      modes: [{ flags: 2, num_leds: 1, single_pats: [ mode.modeData ] }],
    };
    const modeDataJson = JSON.stringify(wrappedModeData);
    const command = `/usr/local/bin/vortex --silent --quick --led-count 1 --write-mode ${tempVtxmodeFile.path} --json-in`;

    // Using child_process.spawn to stream the JSON directly into the vortex tool
    const vortex = require('child_process').spawn(command, [], { shell: true, stdio: ['pipe', 'ignore', 'pipe'] });

    vortex.stderr.on('data', (data) => {
      console.error('Vortex STDERR:', data.toString());
    });

    vortex.on('error', (error) => {
      console.error('Spawn error:', error);
      return res.status(500).send('Conversion error');
    });

    vortex.on('close', (code) => {
      if (code === 0) {
        // If the command executed successfully, send the .vtxmode file as a download
        res.download(tempVtxmodeFile.path, `${mode.name.replace(/\s+/g, '_')}.vtxmode`, async (err) => {
          if (err) {
            console.error('Error sending file:', err);
          }
          // Cleanup temporary file after sending it or in case of error
          await tempVtxmodeFile.cleanup();
        });
      } else {
        console.error('Vortex process exited with code:', code);
        tempVtxmodeFile.cleanup(); // Ensure cleanup in case of failure
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

