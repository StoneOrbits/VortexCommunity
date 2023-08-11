const express = require('express');
const multer = require('multer');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/', (req, res) => {
  res.render('upload');
});

router.post('/', ensureAuthenticated, upload.single('modeFile'), (req, res) => {
  // TODO: Handle mode upload logic here
  res.redirect('/modes');
});

module.exports = router;

