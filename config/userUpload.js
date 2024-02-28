const multer = require('multer');
// Configure storage
const userStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/modes');
  },
  filename: function (req, file, cb) {
    cb(null, `${req.modeId}.vtxmode`);
  }
});
const upload = multer({ storage: userStorage });
module.exports = upload;
