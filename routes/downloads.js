var express = require('express');
var router = express.Router();
const { Download } = require('../models/pg/index');
const { Op } = require('sequelize');

const devices = ['gloves', 'orbit', 'handle', 'duo', 'chromadeck', 'spark', 'desktop'];
const categories = ['firmware', 'editor', 'emulator', 'library'];

router.get('/', async function(req, res, next) {
  try {
    let latestDownloads = {};

    for (const device of devices) {
      latestDownloads[device] = {};
      for (const category of categories) {
        const latestDownload = await Download.findOne({
          where: { device, category },
          order: [['releaseDate', 'DESC']]
        });

        if (latestDownload) {
          latestDownloads[device][category] = latestDownload;
        }
      }
    }

    res.render('downloads', {
      title: 'Vortex Downloads',
      latestDownloads: latestDownloads,
      categories: categories,
      devices: devices,
      req: req
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post('/new', async function(req, res, next) {
  try {
    await Download.create({
      name: req.body.name,
      description: req.body.description,
      version: req.body.version,
      category: req.body.category,
      fileUrl: req.body.fileUrl,
      fileSize: req.body.fileSize ? parseInt(req.body.fileSize) : undefined,
      compatibility: req.body.compatibility,
    });
    res.redirect('/downloads');
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get('/json', async function(req, res, next) {
  try {
    let latestDownloads = {};

    for (const device of devices) {
      latestDownloads[device] = {};
      for (const category of categories) {
        const latestDownload = await Download.findOne({
          where: { device, category },
          order: [['releaseDate', 'DESC']]
        });

        if (latestDownload) {
          latestDownloads[device][category] = latestDownload;
        }
      }
    }

    res.json(latestDownloads);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get('/json/:device/:category?', async function (req, res, next) {
  try {
    const device = req.params.device;
    const category = req.params.category;

    if (!devices.includes(device)) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (category && !categories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const latestDownloads = {};

    const categoriesToProcess = category ? [category] : categories;

    for (const cat of categoriesToProcess) {
      const latestDownload = await Download.findOne({
        where: { device, category: cat },
        order: [['releaseDate', 'DESC']]
      });

      if (!latestDownload) {
        continue;
      }

      latestDownloads[cat] = {
        version: latestDownload.version,
        fileUrl: latestDownload.fileUrl,
        fileSize: latestDownload.fileSize,
        releaseDate: latestDownload.releaseDate,
        downloadCount: latestDownload.downloadCount,
      };
    }

    if (req.query.badge === 'true') {
      const latestVersion = category
        ? latestDownloads[category]?.version || 'unknown'
        : categories
            .map(cat => latestDownloads[cat]?.version)
            .find(version => version) || 'unknown';
      const deviceLabel = device.charAt(0).toUpperCase() + device.slice(1);
      return res.json({
        schemaVersion: 1,
        label: `Latest ${deviceLabel} Version`,
        message: latestVersion,
        color: 'blue',
      });
    }

    res.json(latestDownloads);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
