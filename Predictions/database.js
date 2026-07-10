const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// ربط الملف بالداتابيز الموحدة في المجلد الرئيسي
const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('خطأ في تحويل مسار قاعدة البيانات:', err.message);
    else console.log('✅ تم توجيه ملف مجلد Predictions بنجاح إلى الداتابيز الموحدة.');
});

// التأكد الصارم من وجود الجداول لضمان عدم حدوث كراش
db.serialize(() => {
    // 1. جدول المباريات
    db.run(`CREATE TABLE IF NOT EXISTS matches (
        matchId TEXT PRIMARY KEY,
        team1 TEXT,
        team2 TEXT,
        matchTime TEXT,
        status TEXT DEFAULT 'open',
        channelId TEXT,
        messageId TEXT,
        doublePoints INTEGER DEFAULT 0
    )`);

    // 2. جدول التوقعات
    db.run(`CREATE TABLE IF NOT EXISTS predictions (
        matchId TEXT,
        userId TEXT,
        winner TEXT,
        score TEXT,
        PRIMARY KEY (matchId, userId)
    )`);

    // 3. جدول صدارة المسابقة
    db.run(`CREATE TABLE IF NOT EXISTS tournament_points (
        userId TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0,
        exactMatches INTEGER DEFAULT 0,
        winnerOnlyMatches INTEGER DEFAULT 0,
        wrongMatches INTEGER DEFAULT 0
    )`);
});

module.exports = db;