const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./points.db');

db.serialize(() => {

db.run(`
CREATE TABLE IF NOT EXISTS users (
userId TEXT PRIMARY KEY,
adminPoints INTEGER DEFAULT 0,
monitorPoints INTEGER DEFAULT 0
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS logs (
id INTEGER PRIMARY KEY AUTOINCREMENT,
userId TEXT,
reason TEXT,
points INTEGER,
department TEXT,
addedBy TEXT,
date DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

});

module.exports = db;