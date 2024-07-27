const mongoose = require('mongoose');
var express = require('express');
var router = express.Router();
const Download = require('../models/Download'); // Assuming a similar model for downloads
const { ensureAuthenticated } = require('../middleware/checkAuth');

async function getCategorizedDownloads() {
  const allDownloads = await Download.find().sort({ category: 1, name: 1 }).exec();
  let categorizedDownloads = allDownloads.reduce((acc, download) => {
    if (!acc[download.category]) {
      acc[download.category] = [];
    }
    acc[download.category].push(download);
    return acc;
  }, {});
  return categorizedDownloads;
}

//// Route to render the admin-downloads page
//router.get('/admin', ensureAuthenticated, async function(req, res) {
//  try {
//    // Fetch the latest or most popular downloads
//    res.render('admin-downloads', { title: 'Vortex Downloads', downloads: await getCategorizedDownloads(), req: req });
//  } catch (err) {
//    console.error(err);
//    next(err); // Error handling
//  }
//});

router.get('/', async function(req, res, next) {
  try {
    const devices = ['gloves', 'orbit', 'handle', 'chromadeck', 'duo', 'desktop']; // Example devices
    const categories = ['firmware', 'editor', 'emulator']; // Example categories
    let latestDownloads = {};

    for (const device of devices) {
      latestDownloads[device] = {};
      for (const category of categories) {
        const latestDownload = await Download.findOne({ device, category })
          .sort({ releaseDate: -1 })
          .exec();

        if (latestDownload) {
          latestDownloads[device][category] = latestDownload;
        }
      }
    }

    // Render the downloads view, passing the latest downloads info
    res.render('downloads', {
      title: 'Vortex Downloads',
      latestDownloads: latestDownloads,
      req: req
    });
  } catch (err) {
    console.error(err);
    next(err); // Error handling
  }
});

router.post('/new', async function(req, res, next) {
  try {
    // Create a new download document
    const newDownload = new Download({
      _id: new mongoose.Types.ObjectId(),
      name: req.body.name,
      description: req.body.description,
      version: req.body.version,
      category: req.body.category,
      fileUrl: req.body.fileUrl,
      fileSize: req.body.fileSize ? parseInt(req.body.fileSize) : undefined,
      compatibility: req.body.compatibility,
      // downloadCount is automatically set to its default
      // releaseDate and updatedDate are automatically set to the current date
    });

    // Save the new download to the database
    await newDownload.save();

    // Redirect back to the downloads page or to an admin page
    res.redirect('/downloads');
  } catch (err) {
    console.error(err);
    next(err); // Proper error handling
  }
});

module.exports = router;
