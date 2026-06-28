const express = require('express');
const router = express.Router();
const uploadFirmware = require('../config/firmware-upload');
const { Download } = require('../models/pg/index');
require('dotenv').config();

router.post('/upload', uploadFirmware.single('file'), async (req, res) => {
  const { device, version, category, clientApiKey } = req.body;
  const serverApiKey = process.env.VORTEX_COMMUNITY_API_KEY;
  if (!clientApiKey || clientApiKey !== serverApiKey) {
    return res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
  }

  const fileUrl = `https://vortex.community/firmwares/${req.file.filename}`;

  try {
    const newDownload = await Download.create({
      device,
      version,
      category,
      fileUrl,
      fileSize: req.file.size
    });
    res.status(201).json({ message: 'Upload successful', data: newDownload });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing the upload');
  }
});

module.exports = router;
