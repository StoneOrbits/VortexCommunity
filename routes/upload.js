const express = require('express');
const crypto = require('crypto');
const upload = require('../config/user-upload');
const path = require('path');
const fetch = require('node-fetch');
const router = express.Router();
const mongoose = require('mongoose');
const PatternSet = require('../models/PatternSet');
const Mode = require('../models/Mode');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

router.get('/', ensureAuthenticated, async (req, res) => {
  res.render('upload');
});

function computeHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

router.post('/', ensureAuthenticated, upload.array('modeFile'), async (req, res) => {
    const { 'g-recaptcha-response': recaptchaToken } = req.body;
    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;

    try {
        const recaptchaResponse = await fetch(recaptchaVerifyUrl, { method: 'POST' });
        const recaptchaData = await recaptchaResponse.json();

        if (!recaptchaData.success) {
            return res.status(400).send("reCAPTCHA validation failed.");
        }

        for (const file of req.files) {
          const filePath = file.path;
          const fileName = path.basename(file.originalname, path.extname(file.originalname));
          const output = execSync(`/bin/bash -c "/usr/local/bin/vortex --silent --quick --load-save ${filePath} --json-out"`);
          const jsonData = JSON.parse(output.toString());

          if (!jsonData.modes || jsonData.modes.length <= 0) {
            throw new Error("Invalid JSON data");
          }

          const mode = jsonData.modes[0];
          const getDeviceTypeName = (numLeds) => {
            switch (numLeds) {
              case 10: return 'Gloves';
              case 28: return 'Orbit';
              case 3: return 'Handle';
              case 2: return 'Duo';
              case 20: return 'Chromadeck';
              default: return 'Unknown';
            }
          };
          const deviceType = getDeviceTypeName(mode.num_leds);
          const flags = mode.flags;

          let internalSet = new Set();
          mode.single_pats = await Promise.all(mode.single_pats.map(async (pat) => {
            const sortedPatData = sortObjectKeys(pat);
            const serializedPatData = JSON.stringify(sortedPatData);
            const dataHash = computeHash(serializedPatData);

            if (internalSet.has(dataHash)) {
              pat.isDuplicate = true;
            } else {
              internalSet.add(dataHash);
              const existingPatternSet = await PatternSet.findOne({ dataHash }).exec();
              pat.isDuplicate = !!existingPatternSet;
            }

            return pat;
          }));

          req.session.modeData = {
            name: fileName,
            description: '',
            deviceType,
            flags,
            jsonData
          };
        }

        res.redirect('/upload/submit');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred during processing');
        res.redirect('/upload');
    }
});

function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj; // Return the value if it's not an object
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys); // Recursively sort array elements that are objects
  }

  // Recursively create a sorted object
  const sortedObj = {};
  Object.keys(obj).sort().forEach(key => {
    sortedObj[key] = sortObjectKeys(obj[key]); // Recursively apply sorting to nested objects
  });
  return sortedObj;
}

router.get('/submit', ensureAuthenticated, (req, res) => {
  const modeData = req.session.modeData || {};

  res.render('upload-submit', { modeData });
});

router.post('/submit', ensureAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body; // Use the data from the form submission
        const { deviceType, flags, jsonData } = req.session.modeData;

        // Find or create PatternSets
        const patternSetPromises = jsonData.modes[0].single_pats.map(async pat => {
            const sortedPatData = sortObjectKeys(pat);
            const dataHash = computeHash(JSON.stringify(sortedPatData));
            let existingPatternSet = await PatternSet.findOne({ dataHash }).exec();

            if (!existingPatternSet) {
                // If the pattern doesn't exist, create a new one
                existingPatternSet = new PatternSet({
                    _id: new mongoose.Types.ObjectId(),
                    name: pat.name || 'Unnamed PatternSet',
                    description: pat.description || 'No description provided.',
                    data: sortedPatData,
                    dataHash: dataHash,
                    createdBy: req.user._id,
                });
                await existingPatternSet.save();
            }

            return existingPatternSet._id;
        });

        const patternSets = await Promise.all(patternSetPromises);

        // Create the new Mode
        const mode = new Mode({
            name,
            description,
            deviceType,
            patternSets: patternSets,
            createdBy: req.user._id,
            flags: parseInt(flags, 10),
            dataHash: computeHash(JSON.stringify(patternSets) + ":" + flags + ":" + deviceType)
        });

        await mode.save();

        req.flash('success', 'Mode and PatternSets successfully submitted!');
        delete req.session.modeData;
        res.redirect('/modes');
    } catch (error) {
        console.error('Error saving modes and patterns:', error);
        req.flash('error', 'An error occurred while submitting your mode.');
        res.redirect('/upload/submit');
    }
});

module.exports = router;
