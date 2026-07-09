const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 🚨 تغيير اسم الملف هنا سيجبر Render على إنشاء قاعدة بيانات جديدة ونظيفة فوراً
const dbPath = path.join(__dirname, 'predictions_v2.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
    else console.log('✅ تم إنشاء واتصال قاعدة بيانات التوقعات الجديدة V2 بنجاح.');
});

db.serialize(() => {
    // إنشاء جدول المباريات بالصيغة الرسمية الصحيحة وبوجود الـ matchId
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
        if (err) console.error('❌ خطأ في إنشاء جدول المباريات:', err.message);
        else console.log('⭐ جدول المباريات الجديد جاهز تماماً والـ matchId متوفر.');
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