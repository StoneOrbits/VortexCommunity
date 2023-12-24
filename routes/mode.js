const express = require('express');
const router = express.Router();
const Mode = require('../models/Mode');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const fs = require('fs');
const path = require('path');

// Mode details
router.get('/:modeId', async (req, res) => {
  try {
    const mode = await Mode.findOne({ _id: req.params.modeId }).populate('createdBy');
    if (!mode) {
      return res.status(404).render('not-found');
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const uploadDate = new Date(mode.uploadDate).toLocaleDateString('en-US', options);
    res.render('mode', { mode: mode, uploadDate: uploadDate, user: req.user });
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
    const modePath = path.join(__dirname, '../public/modes/', mode._id + '.vtxmode');
    const modeJsonPath = path.join(__dirname, '../public/modes/', mode._id + '.json');
    if (fs.existsSync(modePath)) {
      fs.unlinkSync(modePath);
    }
    if (fs.existsSync(modeJsonPath)) {
      fs.unlinkSync(modeJsonPath);
    }
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
router.get('/:modeId/download', async (req, res) => {
  const modeId = req.params.modeId;

  try {
    // Fetch the mode from the database
    const mode = await Mode.findOne({ _id: modeId });
    if (!mode) {
      return res.status(404).send('Mode not found');
    }

    const filePath = path.join(__dirname, '../public/modes', `${modeId}.vtxmode`);

    // Check if the file exists
    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error(err);
        return res.status(404).send('File not found');
      }

      // Set the content disposition header to specify the filename
      res.setHeader('Content-Disposition', `attachment; filename=${mode.name}.vtxmode`);

      // Pipe the file to the response
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

