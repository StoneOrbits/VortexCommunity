const express = require('express');
const router = express.Router();
const Mode = require('../models/Mode');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const fs = require('fs');
const path = require('path');

// show the main modes showcase
router.get('/', async (req, res) => {
    const page = req.query.page || 1;
    const searchQuery = req.query.search;
    var modesForCurrentPage = await Mode.find().sort({ votes: -1 }).exec();
    // If search query is present, filter the modes based on the search criteria
    if (searchQuery) {
        modesForCurrentPage = modesForCurrentPage.filter(mode => {
            return mode.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }
    // Fetch modes for the current page
    res.render('modes', { modes: modesForCurrentPage, user: req.user, currentPage: page, search: req.query.search });
});

// Mode details
router.get('/:modeId', async (req, res) => {
    try {
        const mode = await Mode.findOne({ _id: req.params.modeId }).populate('createdBy');
        if (!mode) {
            return res.status(404).render('not-found');
        }
        res.render('mode', { mode: mode, user: req.user });
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

        // Check if the mode exists
        if (!mode) {
            return res.status(404).render('not-found');
        }

        // Check if the current user is the creator of the mode
        if (req.user._id.toString() !== mode.createdBy.toString()) {
            return res.status(403).send('Unauthorized');
        }

        // Update the mode details
        mode.name = req.body.modeName;
        mode.description = req.body.modeDescription;
        // Add more updates here as needed

        // Save the updated mode
        await mode.save();

        // Redirect to the mode page
        res.redirect(`/modes/${modeId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Delete mode
router.post('/:modeId/delete', async (req, res) => {
    try {
        const mode = await Mode.findOne({ _id: req.params.modeId });
        if (!mode) {
            return res.status(404).send('Mode not found');
        }
        // Delete the LED strip files if they exist
        const led1Path = path.join(__dirname, '../public/images/ledstrips/', mode._id + '_led1.png');
        const led2Path = path.join(__dirname, '../public/images/ledstrips/', mode._id + '_led2.png');
        const modePath = path.join(__dirname, '../public/modes/', mode._id + '.vtxmode');
        if (fs.existsSync(led1Path)) {
            fs.unlinkSync(led1Path);
        }
        if (fs.existsSync(led2Path)) {
            fs.unlinkSync(led2Path);
        }
        if (fs.existsSync(modePath)) {
            fs.unlinkSync(modePath);
        }
        // Delete the mode from the database
        await Mode.deleteOne({ _id: req.params.modeId });
        res.redirect('/modes');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Upvote mode
router.post('/:modeId/upvote', async (req, res) => {
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
        res.redirect('/modes/' + mode._id);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

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

        res.redirect(`/modes/${req.params.modeId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/:modeId/unfavorite', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const index = user.favorites.indexOf(req.params.modeId);
        if (index > -1) {
            user.favorites.splice(index, 1);
            await user.save();
        }

        res.redirect(`/modes/${req.params.modeId}`);
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

