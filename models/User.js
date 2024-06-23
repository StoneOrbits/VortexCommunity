const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: true
  },
  profilePic: String,
  bio: String,
  // List of references to pats uploaded by user (PatternSets)
  pats: [{
    type: Schema.Types.ObjectId,
    ref: 'PatternSet'
  }],
  // List of references to favorite pats
  favPats: [{
    type: Schema.Types.ObjectId,
    ref: 'PatternSet'
  }],
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, required: false }
});

module.exports = mongoose.model('User', UserSchema);
