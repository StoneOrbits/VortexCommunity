const mongoose = require('mongoose');
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Mode = require('../models/Mode');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const { execSync } = require('child_process');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/modes');
  },
  filename: function (req, file, cb) {
    cb(null, `${req.modeId}.vtxmode`);
  }
});

const upload = multer({ storage: storage });

const processSaveFile = (filePath, modeId, singlePat) => {
  return new Promise((resolve, reject) => {
    // Save the provided single pattern data to a file
    const jsonFilePath = `public/modes/${modeId}.json`;
    fs.writeFileSync(jsonFilePath, JSON.stringify(singlePat, null, 2));
    resolve(singlePat);
  });
};

router.get('/', (req, res) => {
  res.render('upload');
});

router.post('/', ensureAuthenticated, upload.single('modeFile'), async (req, res) => {
  // Generate a new _id
  req.modeId = new mongoose.Types.ObjectId();
  try {
    // Process the uploaded file
    const filePath = req.file.path;
    const output = execSync(`/bin/bash -c "/usr/local/bin/vortex --silent --quick --load-save ${filePath} --json-out"`);

    let jsonData = JSON.parse(output.toString());
    if (!jsonData.modes || jsonData.modes.length <= 0) {
      throw new Error("invalid json data");
    }

    const processedModeData = new Set(); // Set to track serialized mode data

    for (const singlePat of jsonData.modes[0].single_pats) {
      const modeId = new mongoose.Types.ObjectId(); // Generate a new _id for each mode
      const modeData = await processSaveFile(filePath, modeId.toString(), singlePat);

      // Serialize modeData for comparison
      const serializedModeData = JSON.stringify(modeData);

      // Check for duplicates
      if (processedModeData.has(serializedModeData)) {
        continue; // Skip this iteration if duplicate is found
      }

      // Add the serialized mode data to the set
      processedModeData.add(serializedModeData);

      const newMode = new Mode({
        _id: modeId,
        name: req.body.modeName,
        description: req.body.modeDescription,
        modeData: modeData,
        createdBy: req.user._id // Assign the user's _id to createdBy
      });

      await newMode.save();
    }

    res.redirect('/modes');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing the file');
  }
});

module.exports = router;
