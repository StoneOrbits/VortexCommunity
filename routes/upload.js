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

      // calculate duplicates
      let isDuplicates = [];
      let internalSet = new Set();
      for (const pat of mode.single_pats) {
        const sortedPatData = sortObjectKeys(pat);
        const serializedPatData = JSON.stringify(sortedPatData);
        const dataHash = computeHash(serializedPatData);

        const existingPatternSet = await PatternSet.findOne({ dataHash }).exec();
        if (internalSet.has(dataHash) || existingPatternSet) {
          isDuplicates.push(true);
        } else {
          internalSet.add(dataHash);
          isDuplicates.push(false);
        }
      }

      req.session.modeData = {
        name: fileName,
        description: '',
        deviceType,
        flags,
        jsonData,
        isDuplicates
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

router.get('/json', ensureAuthenticated, async (req, res) => {
  const base64Data = req.query.data;
  if (!base64Data) {
    req.flash('error', 'No data provided');
    return res.redirect('/upload');
  }

  const jsonData = JSON.parse(Buffer.from(base64Data, 'base64').toString());

  try {
    const mode = jsonData;
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

    // calculate duplicates
    let isDuplicates = [];
    let internalSet = new Set();
    for (const pat of mode.single_pats) {
      const sortedPatData = sortObjectKeys(pat);
      const serializedPatData = JSON.stringify(sortedPatData);
      const dataHash = computeHash(serializedPatData);

      const existingPatternSet = await PatternSet.findOne({ dataHash }).exec();
      if (internalSet.has(dataHash) || existingPatternSet) {
        isDuplicates.push(true);
      } else {
        internalSet.add(dataHash);
        isDuplicates.push(false);
      }
    }

    req.session.modeData = {
      name: jsonData.name || 'Unnamed Mode',
      description: jsonData.description || '',
      deviceType,
      flags,
      jsonData: { modes: [ jsonData ] },
      isDuplicates
    };

    res.redirect('/upload/submit');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred during processing');
    res.redirect('/upload');
  }
});

router.get('/submit', ensureAuthenticated, (req, res) => {
  const modeData = req.session.modeData || {};

  res.render('upload-submit', { modeData });
});

router.post('/submit', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description } = req.body;
    const { deviceType, flags, jsonData } = req.session.modeData;

    // re-calculate duplicates just in case
    let isDuplicates = [];
    let internalSet = new Set();
    for (const pat of jsonData.modes[0].single_pats) {
      const sortedPatData = sortObjectKeys(pat);
      const serializedPatData = JSON.stringify(sortedPatData);
      const dataHash = computeHash(serializedPatData);

      const existingPatternSet = await PatternSet.findOne({ dataHash }).exec();
      if (internalSet.has(dataHash) || existingPatternSet) {
        isDuplicates.push(true);
      } else {
        internalSet.add(dataHash);
        isDuplicates.push(false);
      }
    }
    const patternSetIds = new Map(); // Map to track pattern hash to patternSetId

    // Loop through patterns and deduplicate
    for (let i = 0; i < jsonData.modes[0].single_pats.length; i++) {
      const pat = jsonData.modes[0].single_pats[i];
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));

      if (!isDuplicates[i]) {
        // Check for existing pattern in the database
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
          console.log(`Pattern created with dataHash: ${dataHash}`);
        } else {
          console.log(`Pattern already exists with dataHash: ${dataHash}`);
        }

        // Add patternSetId to the map
        patternSetIds.set(dataHash, existingPatternSet._id);
      } else {
        // Find the existing pattern in the database to get the ID
        let existingPatternSet = await PatternSet.findOne({ dataHash }).exec();
        if (existingPatternSet) {
          patternSetIds.set(dataHash, existingPatternSet._id);
        }
      }
    }

    // Create a deduplicated list of patternSetIds for the Mode
    const deduplicatedPatternSets = Array.from(new Set(jsonData.modes[0].single_pats.map(pat => {
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));
      return patternSetIds.get(dataHash);
    })));

    // Create the ledPatternOrder array
    const ledPatternOrder = jsonData.modes[0].single_pats.map(pat => {
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));
      return deduplicatedPatternSets.indexOf(patternSetIds.get(dataHash));
    });

    // Create the new Mode
    const mode = new Mode({
      name,
      description,
      deviceType,
      patternSets: deduplicatedPatternSets,
      ledPatternOrder,
      createdBy: req.user._id,
      flags: parseInt(flags, 10),
      dataHash: computeHash(JSON.stringify(deduplicatedPatternSets) + ":" + JSON.stringify(ledPatternOrder) + ":" + flags + ":" + deviceType)
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
