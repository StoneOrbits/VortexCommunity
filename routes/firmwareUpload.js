const express = require('express');
const router = express.Router();
const uploadFirmware = require('../config/firmwareUpload'); // Adjust the path as necessary
const Download = require('../models/Download'); // Adjust the path as necessary

router.post('/upload', uploadFirmware.single('firmwareFile'), async (req, res) => {
    // Check for the uploaded file
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Extract additional information from the request, if any
    const { name, description, version, category, compatibility } = req.body;

    try {
        // Create a new database entry for the upload
        const newDownload = new Download({
            name: name || 'Unnamed Firmware',
            description: description || 'No description provided.',
            version,
            category: category || 'Firmware',
            fileUrl: req.file.path, // You might want to adjust this based on how you serve files
            fileSize: req.file.size,
            compatibility,
        });

        await newDownload.save();

        res.status(201).json({ message: 'Firmware uploaded successfully', download: newDownload });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing the firmware upload.');
    }
});

module.exports = router;
