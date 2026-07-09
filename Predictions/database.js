const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 🚨 التوجيه الحاسم: ربط هذا الملف بالداتابيز الموحدة لإنهاء خطأ الأوامر الأخرى
const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('خطأ في تحويل مسار قاعدة البيانات:', err.message);
    else console.log('✅ تم توجيه ملف مجلد Predictions بنجاح إلى الداتابيز الموحدة.');
});

module.exports = db;