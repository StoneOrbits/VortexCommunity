const mongoose = require('mongoose');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: String,
    password: String,
    email: String,
    profilePic: String,
    bio: String
});

module.exports = mongoose.model('User', userSchema);
