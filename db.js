const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./vortex.db');

// Initialize tables
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, email TEXT, password TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS modes (id INTEGER PRIMARY KEY, name TEXT, description TEXT, userId INTEGER, FOREIGN KEY(userId) REFERENCES users(id))');
    db.run('CREATE TABLE IF NOT EXISTS favorites (userId INTEGER, modeId INTEGER, PRIMARY KEY(userId, modeId), FOREIGN KEY(userId) REFERENCES users(id), FOREIGN KEY(modeId) REFERENCES modes(id))');
    db.run('CREATE TABLE IF NOT EXISTS upvotes (userId INTEGER, modeId INTEGER, PRIMARY KEY(userId, modeId), FOREIGN KEY(userId) REFERENCES users(id), FOREIGN KEY(modeId) REFERENCES modes(id))');
});

module.exports = db;
db.run('ALTER TABLE users ADD COLUMN profilePic TEXT');
db.run('ALTER TABLE modes ADD COLUMN preview TEXT');
db.run('ALTER TABLE modes ADD COLUMN upvotes INTEGER DEFAULT 0');
