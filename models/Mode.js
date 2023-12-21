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
    modeData: {
        type: mongoose.Schema.Types.Mixed, // or simply 'type: {}'
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
        ref: 'User',
        required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now // Automatically set to the current date when a new document is created
    },
});

module.exports = mongoose.model('Mode', ModeSchema);

