const multer = require('multer');
const path = require('path');
// Configure storage for firmware uploads
const firmwareStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Specify the destination directory for firmware files
        cb(null, 'public/firmwares/');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});
const uploadFirmware = multer({ storage: firmwareStorage });
module.exports = uploadFirmware;
