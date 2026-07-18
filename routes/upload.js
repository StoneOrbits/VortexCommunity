const express = require('express');
const crypto = require('crypto');
const upload = require('../config/user-upload');
const path = require('path');
const fetch = require('node-fetch');
const router = express.Router();
const { PatternSet, Mode, ModePatternSet } = require('../models/pg/index');
const { Op } = require('sequelize');
const { ensureAuthenticated } = require('../middleware/checkAuth');
const { validateUploadSubmit, sanitizeSessionModeData } = require('../middleware/validate');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const sequelize = require('../config/database-pg');
require('dotenv').config();

let prefixes = [];
let nouns = [];

async function loadWords() {
  try {
    const adjectivesData = await fs.readFile(path.join(__dirname, '../config/words-adjectives.json'), 'utf8');
    prefixes = JSON.parse(adjectivesData);
    const nounsData = await fs.readFile(path.join(__dirname, '../config/words-nouns.json'), 'utf8');
    nouns = JSON.parse(nounsData);
  } catch (err) {
    console.error('Error reading word files:', err);
  }
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomName() {
  const useTwoAdjectives = Math.random() < 0.5;
  const prefix1 = getRandomItem(prefixes);
  const prefix2 = useTwoAdjectives ? getRandomItem(prefixes) : "";
  const noun = getRandomItem(nouns);
  return useTwoAdjectives ? `${prefix1} ${prefix2} ${noun}` : `${prefix1} ${noun}`;
}

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

    const existingPatternSet = await PatternSet.findOne({ where: { dataHash } });
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

router.get('/', ensureAuthenticated, async (req, res) => {
  res.render('upload');
});

router.post('/', ensureAuthenticated, upload.array('modeFile'), async (req, res) => {
  const { 'g-recaptcha-response': recaptchaToken } = req.body;
  const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
  const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;
  const basePath = req.app.locals.basePath || '';

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
          case 6: return 'Spark';
          case 3: return 'Handle';
          case 2: return 'Duo';
          case 20: return 'Chromadeck';
          default: return 'Unknown';
        }
      };
      const deviceType = getDeviceTypeName(mode.num_leds);
      if (deviceType === 'Unknown') {
        req.flash('error', 'Must share a known device type');
        return res.redirect(basePath + '/upload');
      }

      const flags = mode.flags;

      const { isDuplicates, duplicateNames } = await calculateDuplicates(mode);

      const modeName = await generateRandomName();

      let patNames = [];
      let patDescriptions = [];
      for (let pat of jsonData.single_pats) {
        patNames.push(await generateRandomName());
        patDescriptions.push('');
      }

      let normalizedJson = jsonData;
      if (!normalizedJson.modes) {
        normalizedJson = { modes: [jsonData] };
      }

      req.session.modeData = sanitizeSessionModeData({
        name: modeName || fileName,
        description: '',
        deviceType,
        flags,
        jsonData: normalizedJson,
        isDuplicates,
        duplicateNames,
        patNames,
        patDescriptions
      });
    }

    res.redirect(basePath + '/upload/submit');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred during processing');
    res.redirect(basePath + '/upload');
  }
});

router.get('/json', ensureAuthenticated, async (req, res) => {
  const base64Data = req.query.data;
  const basePath = req.app.locals.basePath || '';
  if (!base64Data) {
    req.flash('error', 'No data provided');
    return res.redirect(basePath + '/upload');
  }

  const jsonData = JSON.parse(Buffer.from(base64Data, 'base64').toString());

  try {
    const mode = jsonData;
    const getDeviceTypeName = (numLeds) => {
      switch (numLeds) {
        case 10: return 'Gloves';
        case 28: return 'Orbit';
        case 6: return 'Spark';
        case 3: return 'Handle';
        case 2: return 'Duo';
        case 20: return 'Chromadeck';
        default: return 'Unknown';
      }
    };

    const deviceType = getDeviceTypeName(mode.num_leds);
    if (deviceType === 'Unknown') {
      req.flash('error', 'Must share a known device type');
      return res.redirect(basePath + '/upload');
    }

    const flags = mode.flags;

    const { isDuplicates, duplicateNames } = await calculateDuplicates(mode);

    const modeName = await generateRandomName();

    let patNames = [];
    let patDescriptions = [];
    for (let pat of jsonData.single_pats) {
      patNames.push(await generateRandomName());
      patDescriptions.push('');
    }

    req.session.modeData = sanitizeSessionModeData({
      name: jsonData.name || modeName,
      description: jsonData.description || '',
      deviceType,
      flags,
      jsonData: { modes: [jsonData] },
      isDuplicates,
      duplicateNames,
      patNames,
      patDescriptions
    });

    res.redirect(basePath + '/upload/submit');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred during processing');
    res.redirect(basePath + '/upload');
  }
});

router.get('/submit', ensureAuthenticated, async (req, res) => {
  const modeData = req.session.modeData || {};
  const basePath = req.app.locals.basePath || '';
  if (!modeData.jsonData || !modeData.isDuplicates) {
    req.flash('error', 'No mode data found. Please upload a mode first.');
    return res.redirect(basePath + '/upload');
  }

  try {
    const { flags, jsonData, deviceType } = modeData;
    const pats = jsonData.modes[0].single_pats;
    const patternSetIds = new Map();
    let allExist = true;

    for (const pat of pats) {
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));
      const ps = await PatternSet.findOne({ where: { dataHash } });
      if (!ps) { allExist = false; break; }
      patternSetIds.set(dataHash, ps.id);
    }

    if (allExist) {
      const deduplicatedPatternSets = [...new Set(pats.map(pat => {
        const dataHash = computeHash(JSON.stringify(sortObjectKeys(pat)));
        return patternSetIds.get(dataHash);
      }))];

      const updatedLedPatternOrder = pats.map(pat => {
        const dataHash = computeHash(JSON.stringify(sortObjectKeys(pat)));
        return deduplicatedPatternSets.indexOf(patternSetIds.get(dataHash));
      });

      const modeHash = computeHash(JSON.stringify(deduplicatedPatternSets) + ":" + JSON.stringify(updatedLedPatternOrder) + ":" + flags + ":" + deviceType);
      const existingMode = await Mode.findOne({ where: { dataHash: modeHash } });
      if (existingMode) {
        req.flash('error', 'This exact mode already exists on the website.');
        delete req.session.modeData;
        return res.redirect(basePath + '/upload');
      }
    }
  } catch (e) {
    console.error('Error checking for existing mode:', e);
  }

  res.render('upload-submit', { modeData });
});

router.post('/submit', ensureAuthenticated, validateUploadSubmit, async (req, res) => {
  const createdPatternSets = [];
  const basePath = req.app.locals.basePath || '';
  try {
    const { name, description, patternNames, patternDescriptions } = req.body;
    const { deviceType, flags, jsonData, isDuplicates } = req.session.modeData;

    const patternSetIds = new Map();

    for (let i = 0; i < jsonData.modes[0].single_pats.length; i++) {
      const pat = jsonData.modes[0].single_pats[i];
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));

      let existingPatternSet = await PatternSet.findOne({ where: { dataHash } });
      if (!existingPatternSet) {
        existingPatternSet = await PatternSet.create({
          name: patternNames[i] || pat.name || 'Unnamed PatternSet',
          description: patternDescriptions[i] || pat.description || 'No description provided.',
          data: sortedPatData,
          dataHash: dataHash,
          createdBy: req.user.id,
        });
        createdPatternSets.push(existingPatternSet.id);
      }

      if (existingPatternSet) {
        patternSetIds.set(dataHash, existingPatternSet.id);
      } else {
        console.error(`Error! PatternSet not found or created for dataHash: ${dataHash}`);
        throw new Error(`PatternSet not found or created for dataHash: ${dataHash}`);
      }
    }

    const deduplicatedPatternSets = Array.from(new Set(jsonData.modes[0].single_pats.map(pat => {
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));
      return patternSetIds.get(dataHash);
    })));

    if (deduplicatedPatternSets.includes(undefined)) {
      throw new Error("Error! Undefined pattern set found in deduplicatedPatternSets.");
    }

    const updatedLedPatternOrder = jsonData.modes[0].single_pats.map(pat => {
      const sortedPatData = sortObjectKeys(pat);
      const dataHash = computeHash(JSON.stringify(sortedPatData));
      return deduplicatedPatternSets.indexOf(patternSetIds.get(dataHash));
    });

    const modeHash = computeHash(JSON.stringify(deduplicatedPatternSets) + ":" + JSON.stringify(updatedLedPatternOrder) + ":" + flags + ":" + deviceType);
    const existingMode = await Mode.findOne({ where: { dataHash: modeHash } });
    if (existingMode) {
      throw new Error('This mode already exists');
    }

    const mode = await Mode.create({
      name,
      description,
      deviceType,
      createdBy: req.user.id,
      flags: parseInt(flags, 10),
      dataHash: modeHash
    });

    for (let i = 0; i < updatedLedPatternOrder.length; i++) {
      const patIdx = updatedLedPatternOrder[i];
      await ModePatternSet.create({
        modeId: mode.id,
        sortOrder: i,
        patternSetId: deduplicatedPatternSets[patIdx]
      });
    }

    req.flash('success', 'Mode and PatternSets successfully submitted!');
    delete req.session.modeData;
    res.redirect(basePath + '/mode/' + mode.id);
  } catch (error) {
    console.error('Error saving modes and patterns:', error);

    let mode;
    if (createdPatternSets.length > 0) {
      await PatternSet.destroy({ where: { id: createdPatternSets } });
    }

    req.flash('error', error.message === 'This mode already exists' ? 'This mode already exists on the website.' : 'An error occurred while submitting your mode.');
    res.redirect(basePath + '/upload');
  }
});

module.exports = router;

loadWords();
