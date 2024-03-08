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
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  profilePic: String,
  bio: String,
  // List of references to modes uploaded by user
  modes: [{
    type: Schema.Types.ObjectId,
    ref: 'Mode'
  }],
  // List of references to favorite modes
  favorites: [{
    type: Schema.Types.ObjectId,
    ref: 'Mode'
  }],
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, required: false }
});

module.exports = mongoose.model('User', UserSchema);
