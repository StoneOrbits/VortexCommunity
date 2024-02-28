const mongoose = require('mongoose');

const DownloadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    version: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true  // Categories like 'Firmware', 'Editor', 'CLI tool', etc.
    },
    fileUrl: {
        type: String,
        required: true  // URL to the downloadable file
    },
    fileSize: {
        type: Number,
        required: false // Size of the file, optional
    },
    compatibility: {
        type: String,
        required: false // Compatibility information (e.g., Operating System, Device type)
    },
    downloadCount: {
        type: Number,
        default: 0 // Track how many times the file has been downloaded
    },
    releaseDate: {
        type: Date,
        default: Date.now // Date when this version was released
    },
    updatedDate: {
        type: Date,
        default: Date.now // Date when this entry was last updated (for new versions)
    },
    // Add any additional fields that might be relevant for your downloads
});

module.exports = mongoose.model('Download', DownloadSchema);
