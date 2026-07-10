const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// ربط مباشر وصارم بملف الداتابيز الصحيح في المجلد الرئيسي
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
            let pointsChange = interaction.options.getInteger('النقاط');
            const displayPoints = pointsChange; // للعرض الرقمي الموجب
            
            if (subcommand === 'خصم-نقاط') pointsChange = -pointsChange;

            await interaction.deferReply({ ephemeral: true });

            // 1️⃣ فحص هل العضو مسجل مسبقاً في جدول الصدارة أم لا
            db.get(`SELECT points FROM tournament_points WHERE userId = ?`, [targetUser.id], (searchErr, row) => {
                if (searchErr) {
                    console.error("🚨 خطأ أثناء البحث عن العضو:", searchErr);
                    return interaction.editReply({ content: '❌ حدث خطأ أثناء فحص بيانات العضو في الداتابيز.' });
                }

                if (row) {
                    // 2️⃣ إذا كان العضو موجوداً، قم بعمل UPDATE مباشر ونظيف لصحته
                    const newPoints = row.points + pointsChange;
                    db.run(`UPDATE tournament_points SET points = ? WHERE userId = ?`, [newPoints, targetUser.id], (updateErr) => {
                        if (updateErr) {
                            console.error("🚨 خطأ أثناء تحديث نقاط العضو الحالية:", updateErr);
                            return interaction.editReply({ content: '❌ حدث خطأ أثناء تحديث نقاط العضو الحالية.' });
                        }
                        return sendSuccessEmbed(interaction, subcommand, displayPoints, targetUser);
                    });
                } else {
                    // 3️⃣ إذا لم يكن موجوداً، قم بعمل INSERT عادي ومبسط جداً
                    // نقاط البدء لا يمكن أن تكون أقل من صفر في الحسبة الطبيعية
                    const startingPoints = pointsChange < 0 ? 0 : pointsChange; 
                    db.run(`INSERT INTO tournament_points (userId, points, exactMatches, winnerOnlyMatches, wrongMatches) VALUES (?, ?, 0, 0, 0)`, 
                    [targetUser.id, startingPoints], (insertErr) => {
                        if (insertErr) {
                            console.error("🚨 خطأ أثناء إدخال العضو الجديد للمرة الأولى:", insertErr);
                            return interaction.editReply({ content: '❌ حدث خطأ أثناء تسجيل العضو الجديد بنقاطه الأولى.' });
                        }
                        return sendSuccessEmbed(interaction, subcommand, displayPoints, targetUser);
                    });
                }
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

// دالة مساعدة لإنشاء وإرسال الإمبيد بنجاح تقليلاً لتكرار الكود
function sendSuccessEmbed(interaction, subcommand, displayPoints, targetUser) {
    const isAdd = subcommand === 'إضافة-نقاط';
    const embed = new EmbedBuilder()
        .setTitle(isAdd ? '✨ إضافة نقاط يدوية' : '🔻 خصم نقاط يدوي')
        .setDescription(isAdd 
            ? `✅ تم بنجاح إضافة **${displayPoints}** نقطة إلى حساب <@${targetUser.id}> في المسابقة.`
            : `✅ تم بنجاح خصم **${displayPoints}** نقطة من حساب <@${targetUser.id}> في المسابقة.`
        )
        .setColor(isAdd ? 'Green' : 'Red')
        .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}