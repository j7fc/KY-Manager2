const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
    else console.log('تم الاتصال بقاعدة بيانات التوقعات بنجاح.');
});

// تنفيذ أمر مسح وبناء إجباري لتصحيح الأعمدة في Render
db.serialize(() => {
    
    // 🚨 السطر السحري: حذف الجدول القديم المتعارض غصب ليتم تجديده بالكامل
    db.run(`DROP TABLE IF EXISTS matches`);

    // إعادة إنشاء جدول المباريات بالصيغة الرسمية الصحيحة 100% وبوجود الـ matchId
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
        else console.log('✅ جدول المباريات تم تحديثه وإعادة بنائه بنجاح (matchId متوفر الآن).');
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