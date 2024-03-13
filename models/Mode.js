const mongoose = require('mongoose');

const ModeSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  modeData: { // the json object containing the 1-led mode sorted
    type: mongoose.Schema.Types.Mixed, // or simply 'type: {}'
    required: true,
    unique: true
  },
  modeDataHash: { // hash of the above data for comparison/lookup
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

ModeSchema.index({ modeDataHash: 1 }, { unique: true }); // Create an index on modeDataHash

module.exports = mongoose.model('Mode', ModeSchema);
