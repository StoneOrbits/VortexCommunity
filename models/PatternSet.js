const mongoose = require('mongoose');

// a PatternSet is a Pattern + Colorset, often referred to as just a Pattern or pat
const PatternSetSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  data: { // the json object containing the 1-led pat sorted
    type: mongoose.Schema.Types.Mixed, // or simply 'type: {}'
    required: true,
    unique: true
  },
  dataHash: { // hash of the above data for comparison/lookup
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
    ref: 'User',
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now // Automatically set to the current date when a new document is created
  },
});

PatternSetSchema.index({ dataHash: 1 }, { unique: true }); // Create an index on dataHash

module.exports = mongoose.model('PatternSet', PatternSetSchema);
