const mongoose = require('mongoose');

const ModeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  deviceType: {
    type: String,
    required: true
  },
  patternSets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatternSet'
  }],
  ledPatternOrder: [{
    type: Number,
    required: true
  }],
  flags: {
    type: Number,
    required: true
  },
  dataHash: {
    type: String,
    required: true,
    unique: true
  },
  votes: {
    type: Number,
    default: 0
  },
  upvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

ModeSchema.index({ dataHash: 1 }, { unique: true }); // Create an index on dataHash

module.exports = mongoose.model('Mode', ModeSchema);
