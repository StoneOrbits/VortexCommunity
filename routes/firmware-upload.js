const express = require('express');
const router = express.Router();
const uploadFirmware = require('../config/firmware-upload'); // Adjust the path as necessary
const Download = require('../models/Download'); // Adjust the path as necessary
require('dotenv').config();

router.post('/upload', uploadFirmware.single('file'), async (req, res) => {
  const { device, version, category, clientApiKey } = req.body; // Extract additional fields from the request
  const serverApiKey = process.env.VORTEX_COMMUNITY_API_KEY;
  if (!clientApiKey || clientApiKey !== serverApiKey) {
    return res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
  }

  const fileUrl = `https://vortex.community/firmwares/${req.file.filename}`;

  try {
    // Construct the file URL based on your server's file-serving logic
    const newDownload = new Download({
      device,
      version,
      category,
      fileUrl,
      fileSize: req.file.size
    });

    await newDownload.save();
    res.status(201).json({ message: 'Upload successful', data: newDownload });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing the upload');
  }
});

module.exports = router;
