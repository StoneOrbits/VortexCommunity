const multer = require('multer');
const path = require('path');
// Configure storage for firmware uploads
const firmwareStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Specify the destination directory for firmware files
        cb(null, 'public/firmwares/');
    },
    filename: function(req, file, cb) {
        // Use file original name in the filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});
const uploadFirmware = multer({ storage: firmwareStorage });
module.exports = uploadFirmware;
