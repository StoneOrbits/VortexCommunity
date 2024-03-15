const multer = require('multer');
const path = require('path');

// Configure storage options
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/modes/'); // Ensure this directory exists
    },
    filename: function(req, file, cb) {
        // You can use the original file name, or append Date.now() for uniqueness
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload variable
const upload = multer({ storage: storage });

module.exports = upload;

