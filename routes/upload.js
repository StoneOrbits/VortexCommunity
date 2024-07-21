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

async function calculateDuplicates(mode) {
  let isDuplicates = [];
  let duplicateNames = [];
  let internalSet = new Set();

  for (const pat of mode.single_pats) {
    const sortedPatData = sortObjectKeys(pat);
    const serializedPatData = JSON.stringify(sortedPatData);
    const dataHash = computeHash(serializedPatData);

    const existingPatternSet = await PatternSet.findOne({ dataHash }).exec();
    let duplicateFlags = (internalSet.has(dataHash) ? 1 : 0) + (existingPatternSet ? 2 : 0);

    if ((duplicateFlags & 1) == 0) {
      internalSet.add(dataHash);
    }

    if (existingPatternSet) {
      duplicateNames.push(existingPatternSet.name);
    } else {
      duplicateNames.push(null);
    }

    isDuplicates.push(duplicateFlags);
  }

  return { isDuplicates, duplicateNames };
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

      const { isDuplicates, duplicateNames } = await calculateDuplicates(mode);

      req.session.modeData = {
        name: fileName,
        description: '',
        deviceType,
        flags,
        jsonData,
        isDuplicates,
        duplicateNames
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
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sortedObj = {};
  Object.keys(obj).sort().forEach(key => {
    sortedObj[key] = sortObjectKeys(obj[key]);
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

    const { isDuplicates, duplicateNames } = await calculateDuplicates(mode);

    req.session.modeData = {
      name: jsonData.name || 'Unnamed Mode',
      description: jsonData.description || '',
      deviceType,
      flags,
      jsonData: { modes: [jsonData] },
      isDuplicates,
      duplicateNames
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
    const { name, description, patternNames, patternDescriptions } = req.body;
    const { deviceType, flags, jsonData, isDuplicates } = req.session.modeData;

    const patternSetIds = new Map();

    for (let i = 0; i < jsonData.modes[0].single_pats.length; i++) {
      const pat = jsonData.modes[0].single_pats[i];
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));

      if (!isDuplicates[i]) {
        let existingPatternSet = await PatternSet.findOne({ dataHash }).exec();
        if (!existingPatternSet) {
          existingPatternSet = new PatternSet({
            _id: new mongoose.Types.ObjectId(),
            name: patternNames[i] || pat.name || 'Unnamed PatternSet',
            description: patternDescriptions[i] || pat.description || 'No description provided.',
            data: sortedPatData,
            dataHash: dataHash,
            createdBy: req.user._id,
          });
          await existingPatternSet.save();
        }

        patternSetIds.set(dataHash, existingPatternSet._id);
      } else {
        let existingPatternSet = await PatternSet.findOne({ dataHash }).exec();
        if (existingPatternSet) {
          patternSetIds.set(dataHash, existingPatternSet._id);
        }
      }
    }

    const deduplicatedPatternSets = Array.from(new Set(jsonData.modes[0].single_pats.map(pat => {
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));
      return patternSetIds.get(dataHash);
    })));

    const ledPatternOrder = jsonData.modes[0].single_pats.map(pat => {
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));
      return deduplicatedPatternSets.indexOf(patternSetIds.get(dataHash));
    });

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

