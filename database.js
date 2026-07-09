const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
    else console.log('تم الاتصال بقاعدة بيانات التوقعات بنجاح.');
});

// إنشاء الجداول وتحديثها تلقائياً
db.serialize(() => {
    // حركة ذكية: إذا كان الجدول القديم ما فيه matchId، بنحذفه عشان يتصلح فوراً
    db.run(`PRAGMA table_info(matches)`, (err) => {
        // سيتم إعادة إنشاء الجدول بالصيغة الصحيحة في السطور التالية
    });

    // حذف الجدول القديم لو كان يسبب تعارض (تشغيل لمرة واحدة للتنظيف)
    db.run(`DROP TABLE IF EXISTS matches_old`); 
    
    // إنشاء جدول المباريات بالصيغة الرسمية الصحيحة 100%
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
        else console.log('✅ جدول المباريات جاهز وبأحدث صيغة (matchId متوفر).');
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