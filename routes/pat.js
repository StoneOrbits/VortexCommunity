const express = require('express');
const router = express.Router();
const fs = require('fs').promises; // Using the promise-based version of fs
const path = require('path');
const User = require('../models/User');
const PatternSet = require('../models/PatternSet');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const tmp = require('tmp-promise'); // Using tmp-promise for handling temporary files with promises
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

router.get('/:patId', async (req, res) => {
  try {
    const pat = await PatternSet.findOne({ _id: req.params.patId }).populate('createdBy');
    if (!pat) {
      return res.status(404).render('not-found');
    }

    // Base64 encode the data for use in a URL or other purposes
    const base64EncodedData = Buffer.from(JSON.stringify(pat.data)).toString('base64');
    const lightshowUrl = `https://lightshow.lol/importMode?data=${base64EncodedData}`;

    // Format the upload date
    const uploadDate = pat.uploadDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    res.render('pat', {
      pat: pat,
      uploadDate: uploadDate,
      user: req.user,
      lightshowUrl: lightshowUrl  // Passing the generated URL to the template
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Edit pat details
router.get('/:patId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findById(req.params.patId);
    if (!pat) {
      return res.status(404).render('not-found');
    }
    if (pat.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }
    res.render('patset-edit', { pat: pat, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Update pat details
router.post('/:patId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const patId = req.params.patId;
    const pat = await PatternSet.findById(patId);

    if (!pat) {
      return res.status(404).render('not-found');
    }

    if (req.user._id.toString() !== pat.createdBy.toString()) {
      return res.status(403).send('Unauthorized');
    }

    pat.name = req.body.patName;
    pat.description = req.body.patDescription;
    // Add more updates here as needed

    await pat.save();
    res.redirect(`/pat/${patId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete pat
router.post('/:patId/delete', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findById(req.params.patId);
    if (!pat) {
      return res.status(404).send('PatternSet not found');
    }
    if (pat.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    // Directly delete the pat from the database
    await PatternSet.deleteOne({ _id: req.params.patId });
    res.redirect('/pats');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Upvote patset
router.post('/:patId/upvote', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findById(req.params.patId);
    if (!pat) {
      return res.status(404).render('not-found');
    }
    // Check if the user has already upvoted this pat
    if (!pat.upvotedBy.includes(req.user._id)) {
      // Add the user's ID to the upvotedBy array
      pat.upvotedBy.push(req.user._id);
      // Increment the upvote count
      pat.votes += 1;
      // Save the pat
      await pat.save();
    }
    // Redirect or render as needed
    res.redirect('/pat/' + pat._id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Unvote patset
router.post('/:patId/unvote', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findById(req.params.patId);
    if (!pat) {
      return res.status(404).render('not-found');
    }
    // Check if the user has already upvoted this pat
    if (pat.upvotedBy.includes(req.user._id)) {
      // Add the user's ID to the upvotedBy array
      pat.upvotedBy.remove(req.user._id);
      // Increment the upvote count
      pat.votes -= 1;
      // Save the pat
      await pat.save();
    }
    // Redirect or render as needed
    res.redirect('/pat/' + pat._id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Favorite pat
router.post('/:patId/favorite', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findById(req.params.patId);
    if (!pat) {
      return res.status(404).send('PatternSet not found');
    }

    const user = await User.findById(req.user._id);
    if (!user.favorites.includes(req.params.patId)) {
      user.favorites.push(req.params.patId);
      await user.save();
    }

    res.redirect(`/pat/${req.params.patId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Unfavorite pat
router.post('/:patId/unfavorite', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const index = user.favorites.indexOf(req.params.patId);
    if (index > -1) {
      user.favorites.splice(index, 1);
      await user.save();
    }

    res.redirect(`/pat/${req.params.patId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/create', async (req, res) => {
  try {
    const newPatternSet = new PatternSet({
      name: req.body.name,
      description: req.body.description,
      file: req.file.buffer, // Assuming you're using multer or similar for file uploads
      thumbnail: req.thumbnail.buffer, // Similarly, handle thumbnail upload
      createdBy: req.user._id // Assuming you have user info in req.user
    });
    await newPatternSet.save();
    res.redirect('/pats');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Download pat
// TODO: download patset as separate .vtxpat file?
router.get('/:patId/download', ensureAuthenticated, async (req, res) => {
  try {
    const pat = await PatternSet.findOne({ _id: req.params.patId });
    if (!pat) {
      return res.status(404).send('PatternSet not found');
    }

    // Create a temporary file for the output .vtxmode
    const tempVtxmodeFile = await tmp.file({ postfix: '.vtxmode' });

    // wrapp the mode data in a vortex savefile so the CLI can parse it
    // TODO: honestly the CLI should just accept the modedata json, I'll do it later
    const wrappedPatternSetData = {
      version_major: 1, version_minor: 1, brightness: 255, global_flags: 0, num_modes: 1,
      modes: [{ flags: 2, num_leds: 1, single_pats: [ pat.data ] }],
    };
    const modeDataJson = JSON.stringify(wrappedPatternSetData);
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
        res.download(tempVtxmodeFile.path, `${pat.name.replace(/\s+/g, '_')}.vtxmode`, async (err) => {
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

