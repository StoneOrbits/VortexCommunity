const mongoose = require('mongoose');

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
    // List of references to modes
    modes: [{ type: Schema.Types.ObjectId, ref: 'Mode' }]
});

module.exports = mongoose.model('User', UserSchema);
