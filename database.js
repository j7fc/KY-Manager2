const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ربط الملف الخارجي بقاعدة بيانات النقاط الأساسية للسيرفر (points.db)
const dbPath = path.join(__dirname, 'points.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('🚨 خطأ في الاتصال بقاعدة بيانات النقاط الأساسية:', err.message);
    else console.log('✅ تم تشغيل واتصال قاعدة بيانات النقاط الأساسية (points.db) بنجاح.');
});

// التأكد من وجود جدول المستخدمين الأساسي الخاص بنظام النقاط والترقيات القديم (الإدارة)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0
    )`);
});

module.exports = db;