const express = require('express');
const router = express.Router();
const uploadFirmware = require('../config/firmwareUpload'); // Adjust the path as necessary
const Download = require('../models/Download'); // Adjust the path as necessary

router.post('/upload', uploadFirmware.single('file'), async (req, res) => {
  const { device, version, category } = req.body; // Extract additional fields from the request

  const fileUrl = `${req.protocol}://${req.get('host')}/firmwares/${req.file.filename}`;

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
