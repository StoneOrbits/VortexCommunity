const mongoose = require('mongoose');
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Mode = require('../models/Mode');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const { exec } = require('child_process');
const { createCanvas } = require('canvas');
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

const processModeFile = (filePath, modeId) => {
  return new Promise((resolve, reject) => {
    // Run your command-line tool on the temporary file
    exec(`/bin/bash -c "/usr/local/bin/vortex --hex --no-timestep --mode ${filePath} <<< w3000q"`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      // Parse the output of your tool
      const lines = stdout.split('\n');
      const led1_colors = [];
      const led2_colors = [];

      lines.forEach(line => {
        if (line.length === 12) {
          const color1 = line.substr(0, 6);
          const color2 = line.substr(6, 6);
          led1_colors.push(color1);
          led2_colors.push(color2);
        }
      });

      const createImage = (colors, filename) => {
        const canvas = createCanvas(3000, 1);
        const ctx = canvas.getContext('2d');

        colors.forEach((color, index) => {
          ctx.fillStyle = `#${color}`;
          ctx.fillRect(index, 0, 1, 1);
        });

        const imagePath = `public/images/ledstrips/${filename}`;
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);

        return imagePath;
      };

      // Usage
      const led1_image_path = createImage(led1_colors, `${modeId}_led1.png`);
      const led2_image_path = createImage(led2_colors, `${modeId}_led2.png`);

      resolve({
        led1_image_path,
        led2_image_path
      });
    });
  });
};

router.get('/', (req, res) => {
  res.render('upload');
});

router.post('/', ensureAuthenticated, (req, res, next) => {
  // Generate a new _id
  req.modeId = new mongoose.Types.ObjectId();
  next();
}, upload.single('modeFile'), async (req, res) => {
  try {
    // Process the uploaded file using the generated ID
    const parsedModeData = await processModeFile(req.file.path, req.modeId.toString());
    // Create a new Mode document with the name, description, image paths, and createdBy fields
    const newMode = new Mode({
      _id: req.modeId,
      name: req.body.modeName,
      description: req.body.modeDescription,
      led1_image_path: parsedModeData.led1_image_path,
      led2_image_path: parsedModeData.led2_image_path,
      createdBy: req.user._id
    });
    // Save the Mode document
    await newMode.save();
    // Redirect to the modes page
    res.redirect('/modes');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing the file');
  }
});

module.exports = router;

