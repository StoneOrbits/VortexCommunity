const mongoose = require('mongoose');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const modeSchema = new Schema({
    name: String,
    description: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    upvotes: Number,
    fileLink: String,
    thumbnailLink: String
});

module.exports = mongoose.model('Mode', modeSchema);
