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
      categories: categories,
      devices: devices,
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

router.get('/json/:device/:category?', async function (req, res, next) {
  try {
    const device = req.params.device;
    const category = req.params.category;

    if (!devices.includes(device)) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // If a specific category is provided, validate it
    if (category && !categories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const latestDownloads = {};
    
    // either try all categories or use the one provided in the url
    const categoriesToProcess = category ? [category] : categories;
    // then iterate all those categories and try to get the latest download
    for (const cat of categoriesToProcess) {
      // find the latest download for this device and category
      const latestDownload = await Download.findOne({ device, category: cat })
        .sort({ releaseDate: -1 })
        .exec();
      // if not found then move on
      if (!latestDownload) {
        continue;
      }
      // otherwise fill out the latestDownloads object with the relevant information
      latestDownloads[cat] = {
        version: latestDownload.version,
        fileUrl: latestDownload.fileUrl,
        fileSize: latestDownload.fileSize,
        releaseDate: latestDownload.releaseDate,
        downloadCount: latestDownload.downloadCount,
      };
    }

    // If badge=true, return Shields.io-compatible JSON
    if (req.query.badge === 'true') {
      // get the latest version for this device and category
      const latestVersion = category
        ? latestDownloads[category]?.version || 'unknown'
        : categories
            .map(cat => latestDownloads[cat]?.version)
            .find(version => version) || 'unknown';
      // Capitalize the first letter of the device for the label
      const deviceLabel = device.charAt(0).toUpperCase() + device.slice(1);
      // Build the badge.io json for the github version badge
      return res.json({
        schemaVersion: 1,
        label: `Latest ${deviceLabel} Version`,
        message: latestVersion,
        color: 'blue',
      });
    }

    // Otherwise, return the full device or category JSON
    res.json(latestDownloads);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
