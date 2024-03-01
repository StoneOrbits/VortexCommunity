const mongoose = require('mongoose');

const DownloadSchema = new mongoose.Schema({
    device: { // device like 'gloves', 'orbit', etc
        type: String,
        required: true
    },
    version: { // version like 1.0
        type: String,
        required: true
    },
    category: { // category of file like 'firmware', 'editor', 'emulator'
        type: String,
        required: true
    },
    fileUrl: { // url to file
        type: String,
        required: true
    },
    fileSize: { // file size
        type: Number,
        required: true
    },
    downloadCount: { // track downloads
        type: Number,
        default: 0
    },
    releaseDate: { // track release date
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Download', DownloadSchema);
