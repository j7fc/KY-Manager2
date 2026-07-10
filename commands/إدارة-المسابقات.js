const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 🚨 تم التعديل: ربط دقيق ومباشر بملف الداتابيز الصحيح (predictions_final.sqlite) في المجلد الرئيسي
const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('إدارة-المسابقات')
        .setDescription('أوامر التحكم اليدوي وإلغاء المباريات ونقاط الأعضاء')
        .addSubcommand(sub => sub.setName('إضافة-نقاط').setDescription('إضافة نقاط يدوي لعضو').addUserOption(o => o.setName('العضو').setDescription('العضو المستهدف').setRequired(true)).addIntegerOption(o => o.setName('النقاط').setDescription('النقاط المضافة').setRequired(true)))
        .addSubcommand(sub => sub.setName('خصم-نقاط').setDescription('خصم نقاط يدوي من عضو').addUserOption(o => o.setName('العضو').setDescription('العضو المستهدف').setRequired(true)).addIntegerOption(o => o.setName('النقاط').setDescription('النقاط المخصومة').setRequired(true)))
        .addSubcommand(sub => sub.setName('حذف-مباراة').setDescription('حذف وإلغاء مباراة بالكامل').addStringOption(o => o.setName('رقم_المباراة').setDescription('رقم المباراة المطلوب حذفها').setRequired(true)))
        .addSubcommand(sub => sub.setName('قفل-التوقعات').setDescription('قفل يدوي فوري لاستقبال توقعات مباراة معينة').addStringOption(o => o.setName('رقم_المباراة').setDescription('رقم المباراة').setRequired(true))),

    async execute(interaction) {
        const ALLOWED_USER_ID = '1229374664107884597'; 
        const ALLOWED_ROLE_ID = '1511200506557632623'; 
        if (interaction.user.id !== ALLOWED_USER_ID && !interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المسابقات فقط.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'إضافة-نقاط' || subcommand === 'خصم-نقاط') {
            const targetUser = interaction.options.getUser('العضو');
            let points = interaction.options.getInteger('النقاط');
            const displayPoints = points; // للاحتفاظ بالرقم الموجب للعرض في الرسالة
            
            if (subcommand === 'خصم-نقاط') points = -points;

            // 🛠️ خطوة أمان: التأكد من إنشاء الجدول أولاً لمنع حدوث خطأ أثناء الإدخال اليدوي
            db.run(`CREATE TABLE IF NOT EXISTS tournament_points (
                userId TEXT PRIMARY KEY,
                points INTEGER DEFAULT 0,
                exactMatches INTEGER DEFAULT 0,
                winnerOnlyMatches INTEGER DEFAULT 0,
                wrongMatches INTEGER DEFAULT 0
            )`, (createErr) => {
                if (createErr) {
                    console.error("🚨 خطأ في إنشاء جدول النقاط اليدوية:", createErr);
                    return interaction.reply({ content: '❌ حدث خطأ في تهيئة جدول النقاط اليدوية.', ephemeral: true });
                }

                // تنفيذ عملية الإضافة أو الخصم بأمان
                db.run(`INSERT INTO tournament_points (userId, points) VALUES (?, ?)
                        ON CONFLICT(userId) DO UPDATE SET points = points + excluded.points`, [targetUser.id, points], (err) => {
                    if (err) {
                        console.error("🚨 خطأ أثناء التحديث اليدوي:", err);
                        return interaction.reply({ content: '❌ حدث خطأ أثناء التحديث اليدوي للنقاط.', ephemeral: true });
                    }
                    
                    const isAdd = subcommand === 'إضافة-نقاط';
                    const embed = new EmbedBuilder()
                        .setTitle(isAdd ? '✨ إضافة نقاط يدوية' : '🔻 خصم نقاط يدوي')
                        .setDescription(isAdd 
                            ? `✅ تم بنجاح إضافة **${displayPoints}** نقطة إلى حساب <@${targetUser.id}> في المسابقة.`
                            : `✅ تم بنجاح خصم **${displayPoints}** نقطة من حساب <@${targetUser.id}> في المسابقة.`
                        )
                        .setColor(isAdd ? 'Green' : 'Red')
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed] });
                });
            });
        }

        if (subcommand === 'حذف-مباراة') {
            const matchId = interaction.options.getString('رقم_المباراة');
            db.run(`DELETE FROM matches WHERE matchId = ?`, [matchId]);
            db.run(`DELETE FROM predictions WHERE matchId = ?`, [matchId]);
            return interaction.reply({ content: `🗑️ تم حذف المباراة رقم \`#${matchId}\` وإلغاء كافة التوقعات المسجلة لها نهائياً.` });
        }

        if (subcommand === 'قفل-التوقعات') {
            const matchId = interaction.options.getString('رقم_المباراة');
            db.run(`UPDATE matches SET status = 'closed' WHERE matchId = ?`, [matchId], (err) => {
                if (err) return interaction.reply({ content: '❌ فشل قفل التوقعات.' });
                return interaction.reply({ content: `🔒 تم قفل استقبال التوقعات للمباراة رقم \`#${matchId}\` يدوياً وفوراً.` });
            });
        }
    }
};