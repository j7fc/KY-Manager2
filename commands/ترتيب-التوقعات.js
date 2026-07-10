const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 🚨 استدعاء ملف الداتابيز الموحد من المجلد الرئيسي
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ترتيب-التوقعات')
        .setDescription('عرض لوحة صدارة مسابقة التوقعات لجميع الأعضاء المشاركين بالكامل'),

    async execute(interaction) {
        // الرد المبدئي السريع لمنع ظهور "التطبيق لا يستجيب"
        await interaction.deferReply();

        // 1️⃣ إنشاء الجدول فوراً إذا لم يكن موجوداً خطوة أمان سريعة
        db.run(`CREATE TABLE IF NOT EXISTS tournament_points (
            userId TEXT PRIMARY KEY,
            points INTEGER DEFAULT 0,
            exactMatches INTEGER DEFAULT 0,
            winnerOnlyMatches INTEGER DEFAULT 0,
            wrongMatches INTEGER DEFAULT 0
        )`, (createErr) => {
            if (createErr) {
                console.error("🚨 خطأ أثناء إنشاء الجدول:", createErr);
                return interaction.editReply({ content: '❌ حدث خطأ داخلي في تهيئة قاعدة البيانات.' });
            }

            // 2️⃣ جلب البيانات مباشرة بعد التأكد من الجدول
            db.all(`SELECT userId, points, exactMatches, winnerOnlyMatches FROM tournament_points ORDER BY points DESC`, async (err, rows) => {
                if (err) {
                    console.error("🚨 خطأ أثناء جلب لوحة الصدارة:", err);
                    return interaction.editReply({ content: `❌ حدث خطأ أثناء جلب بيانات لوحة الصدارة: \`${err.message}\`` });
                }

                if (!rows || rows.length === 0) {
                    const emptyEmbed = new EmbedBuilder()
                        .setTitle('🏆 لوحة صدارة مسابقة التوقعات 📊')
                        .setDescription('ℹ️ لا توجد نقاط مسجلة لأي عضو حتى الآن. ابدأ باعتماد نتائج المباريات لتظهر الصدارة هنا!')
                        .setColor('Blurple')
                        .setTimestamp();
                    
                    return interaction.editReply({ embeds: [emptyEmbed] });
                }

                let leaderboardText = '';

                // عرض جميع الصفوف بالكامل بدون ليميت 10 أعضاء
                for (let i = 0; i < rows.length; i++) {
                    const rank = i + 1;
                    let medal = `\`#${rank}\``;
                    if (i === 0) medal = '🥇';
                    if (i === 1) medal = '🥈';
                    if (i === 2) medal = '🥉';

                    leaderboardText += `${medal} <@${rows[i].userId}> — **${rows[i].points}** نقطة\n`;
                    leaderboardText += `└ 🎯 بالملي: \`${rows[i].exactMatches || 0}\` | 👑 فائز فقط: \`${rows[i].winnerOnlyMatches || 0}\`\n\n`;
                }

                const embed = new EmbedBuilder()
                    .setTitle('🏆 لوحة صدارة مسابقة التوقعات 📊')
                    .setDescription(leaderboardText)
                    .setColor('Blurple')
                    .setTimestamp()
                    .setFooter({ text: 'يتم تحديث الترتيب تلقائياً بعد كل مباراة' });

                await interaction.editReply({ embeds: [embed] });
            });
        });
    }
};