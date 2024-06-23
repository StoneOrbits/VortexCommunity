const mongoose = require('mongoose');
const express = require('express');
const crypto = require('crypto');
const upload = require('../config/userUpload');
const path = require('path');
const fetch = require('node-fetch');
const router = express.Router();
const PatternSet = require('../models/PatternSet');
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
      processedPatterns = processedPatterns.concat(await preparePatternSetsForSession(jsonData, set, fileName)); // Correctly accumulate patterns
    }

    req.session.tempPats = processedPatterns;
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

async function preparePatternSetsForSession(jsonData, processedSet, fileName) {
  const processedPatternsPromises = jsonData.modes[0].single_pats.map(async (data, index) => {
    // Process each pattern data asynchronously
    const processedData = await processPatternData(data, processedSet, fileName);
    return processedData ? { id: index, ...processedData } : null;
  });

  // Await all promises to resolve
  const processedPatterns = await Promise.all(processedPatternsPromises);

  // Filter out any null results after async processing
  return processedPatterns.filter(result => result !== null);
}

// Assuming processedSet is a Set of dataHashes for quick in-memory duplicate checks
async function processPatternData(data, processedSet, fileName) {
    if (data.colorset.length === 0 || data.pattern_id === -1 || data.pattern_id === 255) {
        return null; // Skip invalid pats
    }

    const sortedPatData = sortObjectKeys(data);
    const serializedPatData = JSON.stringify(sortedPatData);
    const dataHash = computeHash(serializedPatData);

    // Check for in-memory duplicates within the same upload batch
    if (processedSet.has(dataHash)) {
        return null; // It's a duplicate within the upload, skip it
    }

    // Add the hash to the processed set to mark it as seen
    processedSet.add(dataHash);

    // Check for existing pat in the database with the same pattern data hash
    const existingPatternSet = await PatternSet.findOne({ dataHash }).exec();

    // Return the pattern data with an additional isDuplicate flag
    return {
        data: sortedPatData,
        dataHash: dataHash,
        isDuplicate: !!existingPatternSet,
        fileName: fileName,
    };
}

router.get('/submit', ensureAuthenticated, (req, res) => {
  // Retrieve the temporary pats stored in the session
  let tempPats = [];
  if (req.session.tempPats) {
    tempPats = req.session.tempPats;
  }

  // Render the pat selection page, passing the temporary pats for display
  res.render('uploadSubmit', { pats: tempPats });
});

router.post('/submit', ensureAuthenticated, async (req, res) => {
  // Destructure the submitted data; ensuring arrays for single or no selection scenarios
  let { selectedPatternSets, patIds, patNames, patDescriptions } = req.body;
  patIds = Array.isArray(patIds) ? patIds : [patIds];
  patNames = Array.isArray(patNames) ? patNames : [patNames];
  patDescriptions = Array.isArray(patDescriptions) ? patDescriptions : [patDescriptions];

  const tempPats = req.session.tempPats || [];
  let patsToSave = [];

  // Map patIds to their names and descriptions
  let nameDescriptionMap = patIds.reduce((acc, patId, idx) => {
    acc[patId] = { name: patNames[idx], description: patDescriptions[idx] };
    return acc;
  }, {});

  // Iterate over selectedPatternSets, ensuring it's treated as an array
  (Array.isArray(selectedPatternSets) ? selectedPatternSets : [selectedPatternSets]).forEach(selectedIdx => {
    const index = parseInt(selectedIdx, 10);
    // Ensure we have a corresponding entry in nameDescriptionMap
    if (tempPats[index] && !tempPats[index].isDuplicate && nameDescriptionMap[selectedIdx]) {
      const { name, description } = nameDescriptionMap[selectedIdx];

      const data = tempPats[index].data;
      const dataHash = computeHash(JSON.stringify(sortObjectKeys(data)));

      patsToSave.push(new PatternSet({
        _id: new mongoose.Types.ObjectId(),
        name: name || 'Unnamed PatternSet',
        description: description || 'No description provided.',
        data: data,
        dataHash: dataHash,
        createdBy: req.user._id,
      }));
    }
  });

  // Save each pat to the database
  try {
    await Promise.all(patsToSave.map(pat => pat.save()));
    req.flash('success', 'PatternSets successfully submitted!');
    delete req.session.tempPats; // Clean up the session
    res.redirect('/pats');
  } catch (error) {
    console.error('Error saving pats:', error);
    req.flash('error', 'An error occurred while submitting your pats.');
    res.redirect('/upload/submit');
  }
});

module.exports = router;
