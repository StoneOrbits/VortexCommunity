const mongoose = require('mongoose');

const ModeSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    file: Buffer,
    thumbnail: {
        type: Buffer,
        required: false // You can make this required if you always want a thumbnail
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
        ref: 'User', // Assuming your user model is named 'User'
        required: true
    }
});

module.exports = mongoose.model('Mode', ModeSchema);

