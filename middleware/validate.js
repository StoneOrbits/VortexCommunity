const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '');
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return stripHtml(str)
    .replace(/[<>"'`&]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateName(raw) {
  const cleaned = sanitize(raw);
  if (!cleaned || cleaned.length === 0) {
    return { valid: false, value: '', error: 'Name is required.' };
  }
  if (cleaned.length > NAME_MAX_LENGTH) {
    return { valid: false, value: cleaned.slice(0, NAME_MAX_LENGTH), error: `Name must be ${NAME_MAX_LENGTH} characters or less.` };
  }
  return { valid: true, value: cleaned, error: null };
}

function validateDescription(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: true, value: '', error: null };
  }
  const cleaned = sanitize(raw);
  if (cleaned.length > DESCRIPTION_MAX_LENGTH) {
    return { valid: false, value: cleaned.slice(0, DESCRIPTION_MAX_LENGTH), error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less.` };
  }
  return { valid: true, value: cleaned, error: null };
}

function validateModeInput(req, res, next) {
  const nameResult = validateName(req.body.name || req.body.modeName);
  const descResult = validateDescription(req.body.description || req.body.modeDescription);

  if (!nameResult.valid || !descResult.valid) {
    const basePath = req.app.locals.basePath || '';
    req.flash('error', nameResult.error || descResult.error);
    if (req.params.modeId) {
      return res.redirect(basePath + '/mode/' + req.params.modeId + '/edit');
    }
    return res.redirect(basePath + '/modes');
  }

  if (req.body.name) req.body.name = nameResult.value;
  if (req.body.modeName) req.body.modeName = nameResult.value;
  if (req.body.description) req.body.description = descResult.value;
  if (req.body.modeDescription) req.body.modeDescription = descResult.value;

  next();
}

function validatePatInput(req, res, next) {
  const nameResult = validateName(req.body.name || req.body.patName);
  const descResult = validateDescription(req.body.description || req.body.patDescription);

  if (!nameResult.valid || !descResult.valid) {
    const basePath = req.app.locals.basePath || '';
    req.flash('error', nameResult.error || descResult.error);
    if (req.params.patId) {
      return res.redirect(basePath + '/pat/' + req.params.patId + '/edit');
    }
    return res.redirect(basePath + '/pats');
  }

  if (req.body.name) req.body.name = nameResult.value;
  if (req.body.patName) req.body.patName = nameResult.value;
  if (req.body.description) req.body.description = descResult.value;
  if (req.body.patDescription) req.body.patDescription = descResult.value;

  next();
}

function validateUploadSubmit(req, res, next) {
  const basePath = req.app.locals.basePath || '';
  const nameResult = validateName(req.body.name);
  if (!nameResult.valid) {
    req.flash('error', nameResult.error);
    return res.redirect(basePath + '/upload/submit');
  }
  req.body.name = nameResult.value;

  const descResult = validateDescription(req.body.description);
  if (!descResult.valid) {
    req.flash('error', descResult.error);
    return res.redirect(basePath + '/upload/submit');
  }
  req.body.description = descResult.value;

  if (req.body.patternNames && Array.isArray(req.body.patternNames)) {
    for (let i = 0; i < req.body.patternNames.length; i++) {
      const patNameResult = validateName(req.body.patternNames[i]);
      if (!patNameResult.valid) {
        req.flash('error', `Pattern name: ${patNameResult.error}`);
        return res.redirect(basePath + '/upload/submit');
      }
      req.body.patternNames[i] = patNameResult.value;
    }
  }

  if (req.body.patternDescriptions && Array.isArray(req.body.patternDescriptions)) {
    for (let i = 0; i < req.body.patternDescriptions.length; i++) {
      const patDescResult = validateDescription(req.body.patternDescriptions[i]);
      if (!patDescResult.valid) {
        req.flash('error', `Pattern description: ${patDescResult.error}`);
        return res.redirect(basePath + '/upload/submit');
      }
      req.body.patternDescriptions[i] = patDescResult.value;
    }
  }

  next();
}

function sanitizeSessionModeData(modeData) {
  if (!modeData) return modeData;
  if (modeData.name) {
    modeData.name = sanitize(modeData.name) || modeData.name;
  }
  if (modeData.description) {
    modeData.description = sanitize(modeData.description) || modeData.description;
  }
  if (modeData.patNames && Array.isArray(modeData.patNames)) {
    modeData.patNames = modeData.patNames.map(n => sanitize(n) || n);
  }
  if (modeData.patDescriptions && Array.isArray(modeData.patDescriptions)) {
    modeData.patDescriptions = modeData.patDescriptions.map(d => sanitize(d) || d);
  }
  return modeData;
}

module.exports = {
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  sanitize,
  validateName,
  validateDescription,
  validateModeInput,
  validatePatInput,
  validateUploadSubmit,
  sanitizeSessionModeData
};
