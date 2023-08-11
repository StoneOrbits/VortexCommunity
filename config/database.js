const mongoose = require('mongoose');

// MongoDB connection string
const MONGO_URI = 'mongodb://localhost:27017/vortexcommunity';

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

module.exports = mongoose;

