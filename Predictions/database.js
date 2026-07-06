const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./predictions.db');

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team1 TEXT,
            team2 TEXT,
            matchTime INTEGER,
            isDouble INTEGER,
            status TEXT DEFAULT 'open'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matchId INTEGER,
            userId TEXT,
            winner TEXT,
            score TEXT,
            UNIQUE(matchId, userId)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS prediction_points (
            userId TEXT PRIMARY KEY,
            points INTEGER DEFAULT 0
        )
    `);

});

// ===========================
// جدول نقاط مسابقة التوقعات
// ===========================

db.run(`
CREATE TABLE IF NOT EXISTS prediction_points (
    userId TEXT PRIMARY KEY,
    points INTEGER DEFAULT 0
)
`);

// ===========================
// جدول المباريات
// ===========================

db.run(`
CREATE TABLE IF NOT EXISTS matches (
    matchId INTEGER PRIMARY KEY AUTOINCREMENT,
    team1 TEXT,
    team2 TEXT,
    matchTime TEXT,
    doublePoints INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    messageId TEXT,
    channelId TEXT,
    result TEXT,
    score TEXT
)
`);

// ===========================
// جدول توقعات الأعضاء
// ===========================

db.run(`
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matchId INTEGER,
    userId TEXT,
    winner TEXT,
    score TEXT,
    UNIQUE(matchId, userId)
)
`);

module.exports = db;