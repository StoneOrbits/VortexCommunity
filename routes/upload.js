const mongoose = require('mongoose');
const express = require('express');
const crypto = require('crypto');
const upload = require('../config/userUpload');
const path = require('path');
const fetch = require('node-fetch');
const router = express.Router();
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

    let set = new Set();
    let processedPatterns = []; // Initialize as an array
    for (const file of req.files) {
      const filePath = file.path;
      const fileName = path.basename(file.originalname, path.extname(file.originalname));
      const output = execSync(`/bin/bash -c "/usr/local/bin/vortex --silent --quick --load-save ${filePath} --json-out"`);
      const jsonData = JSON.parse(output.toString());

      if (!jsonData.modes || jsonData.modes.length <= 0) {
        throw new Error("Invalid JSON data");
      }

      // Use the spread operator to concatenate arrays
      processedPatterns = processedPatterns.concat(await prepareModesForSession(jsonData, set, fileName)); // Correctly accumulate patterns
    }

    req.session.temporaryModes = processedPatterns;
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

async function prepareModesForSession(jsonData, processedSet, fileName) {
  const processedPatternsPromises = jsonData.modes[0].single_pats.map(async (patData, index) => {
    // Process each pattern data asynchronously
    const processedData = await processPatternData(patData, processedSet, fileName);
    return processedData ? { id: index, ...processedData } : null;
  });

  // Await all promises to resolve
  const processedPatterns = await Promise.all(processedPatternsPromises);

  // Filter out any null results after async processing
  return processedPatterns.filter(result => result !== null);
}

// Assuming processedSet is a Set of modeDataHashes for quick in-memory duplicate checks
async function processPatternData(patData, processedSet, fileName) {
    if (patData.colorset.length === 0 || patData.pattern_id === -1 || patData.pattern_id === 255) {
        return null; // Skip invalid modes
    }

    const sortedPatData = sortObjectKeys(patData);
    const serializedPatData = JSON.stringify(sortedPatData);
    const modeDataHash = computeHash(serializedPatData);

    // Check for in-memory duplicates within the same upload batch
    if (processedSet.has(modeDataHash)) {
        return null; // It's a duplicate within the upload, skip it
    }

    // Add the hash to the processed set to mark it as seen
    processedSet.add(modeDataHash);

    // Check for existing mode in the database with the same pattern data hash
    const existingMode = await Mode.findOne({ modeDataHash }).exec();

    // Return the pattern data with an additional isDuplicate flag
    return {
        modeData: sortedPatData,
        modeDataHash: modeDataHash,
        isDuplicate: !!existingMode,
        fileName: fileName,
    };
}

router.get('/submit', ensureAuthenticated, (req, res) => {
  // Retrieve the temporary modes stored in the session
  let temporaryModes = [];
  if (req.session.temporaryModes) {
    temporaryModes = req.session.temporaryModes;
  }

  // Render the mode selection page, passing the temporary modes for display
  res.render('uploadSubmit', { modes: temporaryModes });
});

router.post('/submit', ensureAuthenticated, async (req, res) => {
  // Destructure the submitted data; ensuring arrays for single or no selection scenarios
  let { selectedModes, modeIds, modeNames, modeDescriptions } = req.body;
  modeIds = Array.isArray(modeIds) ? modeIds : [modeIds];
  modeNames = Array.isArray(modeNames) ? modeNames : [modeNames];
  modeDescriptions = Array.isArray(modeDescriptions) ? modeDescriptions : [modeDescriptions];

  const temporaryModes = req.session.temporaryModes || [];
  let modesToSave = [];

  // Map modeIds to their names and descriptions
  let nameDescriptionMap = modeIds.reduce((acc, modeId, idx) => {
    acc[modeId] = { name: modeNames[idx], description: modeDescriptions[idx] };
    return acc;
  }, {});

  // Iterate over selectedModes, ensuring it's treated as an array
  (Array.isArray(selectedModes) ? selectedModes : [selectedModes]).forEach(selectedIdx => {
    const index = parseInt(selectedIdx, 10);
    // Ensure we have a corresponding entry in nameDescriptionMap
    if (temporaryModes[index] && !temporaryModes[index].isDuplicate && nameDescriptionMap[selectedIdx]) {
      const { name, description } = nameDescriptionMap[selectedIdx];

      const modeData = temporaryModes[index].modeData;
      const modeDataHash = computeHash(JSON.stringify(sortObjectKeys(modeData)));

      modesToSave.push(new Mode({
        _id: new mongoose.Types.ObjectId(),
        name: name || 'Unnamed Mode',
        description: description || 'No description provided.',
        modeData: modeData,
        modeDataHash: modeDataHash,
        createdBy: req.user._id,
      }));
    }
  });


  // Save each mode to the database
  try {
    await Promise.all(modesToSave.map(mode => mode.save()));
    req.flash('success', 'Modes successfully submitted!');
    delete req.session.temporaryModes; // Clean up the session
    res.redirect('/modes');
  } catch (error) {
    console.error('Error saving modes:', error);
    req.flash('error', 'An error occurred while submitting your modes.');
    res.redirect('/upload/submit');
  }
});

module.exports = router;
