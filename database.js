const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
    else console.log('تم الاتصال بقاعدة بيانات التوقعات بنجاح.');
});

// إنشاء الجداول وتحديثها تلقائياً
db.serialize(() => {
    // إنشاء جدول المباريات مع عمود doublePoints
    db.run(`CREATE TABLE IF NOT EXISTS matches (
        matchId TEXT PRIMARY KEY,
        team1 TEXT,
        team2 TEXT,
        matchTime TEXT,
        status TEXT DEFAULT 'open',
        channelId TEXT,
        messageId TEXT,
        doublePoints INTEGER DEFAULT 0
    )`, (err) => {
        if (!err) {
            // حركة ذكية: إذا كان الجدول موجوداً من قبل بدون العمود، نضيفه الآن لتفادي الخطأ
            db.run(`ALTER TABLE matches ADD COLUMN doublePoints INTEGER DEFAULT 0`, (alterErr) => {
                // يتجاهل الخطأ إذا كان العمود موجوداً بالفعل
            });
        }
    });

    // إنشاء جدول التوقعات
    db.run(`CREATE TABLE IF NOT EXISTS predictions (
        matchId TEXT,
        userId TEXT,
        winner TEXT,
        score TEXT,
        PRIMARY KEY (matchId, userId)
    )`);
});

module.exports = db;