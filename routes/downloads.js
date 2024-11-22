const mongoose = require('mongoose');
var express = require('express');
var router = express.Router();
const Download = require('../models/Download'); // Assuming a similar model for downloads
const { ensureAuthenticated } = require('../middleware/checkAuth');

const devices = ['gloves', 'orbit', 'handle', 'duo', 'chromadeck', 'spark', 'desktop'];
const categories = ['firmware', 'editor', 'emulator', 'library'];

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

router.get('/json', async function(req, res, next) {
  try {
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
    res.json(latestDownloads);
  } catch (err) {
    console.error(err);
    next(err); // Error handling
  }
});

router.get('/json/:device', async function (req, res, next) {
  try {
    const device = req.params.device;

    if (!devices.includes(device)) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const latestDownloads = {};
    for (const category of categories) {
      const latestDownload = await Download.findOne({ device, category })
        .sort({ releaseDate: -1 })
        .exec();

      if (latestDownload) {
        latestDownloads[category] = {
          version: latestDownload.version,
          fileUrl: latestDownload.fileUrl,
          fileSize: latestDownload.fileSize,
          releaseDate: latestDownload.releaseDate,
          downloadCount: latestDownload.downloadCount,
        };
      }
    }

    // If badge=true, return Shields.io-compatible JSON
    if (req.query.badge === 'true') {
      // lookup the version of the device
      const firmwareVersion = categories
        .map(category => latestDownloads[category]?.version)
        .find(version => version) || 'unknown';
      // capitalize first letter of device
      const deviceLabel = device.charAt(0).toUpperCase() + device.slice(1);
      // build a github badge.io badge compatible json object to return
      return res.json({
        schemaVersion: 1,
        label: `Latest ${deviceLabel} Version`,
        message: firmwareVersion,
        color: 'blue',
      });
    }

    // Otherwise, return the full device JSON
    res.json(latestDownloads);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
