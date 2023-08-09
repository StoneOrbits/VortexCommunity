const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./vortex.db');

// Create tables if they don't exist
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS modes (id INTEGER PRIMARY KEY, name TEXT, description TEXT, file BLOB, votes INTEGER)');
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS favorites (userId INTEGER, modeId INTEGER)');
});

module.exports = db;
