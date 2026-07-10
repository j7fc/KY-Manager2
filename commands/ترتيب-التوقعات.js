const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 🚨 تم التعديل: يستدعي ملف الداتابيز الموحد من نفس المجلد
const db = require('./database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ترتيب-التوقعات')
        .setDescription('عرض لوحة صدارة مسابقة التوقعات والأعضاء الأعلى نقاطاً'),

    async execute(interaction) {
        await interaction.deferReply();

        db.all(`SELECT userId, points FROM tournament_points ORDER BY points DESC`, async (err, rows) => {
            if (err) {
                console.error("🚨 خطأ أثناء جلب لوحة الصدارة:", err);
                return interaction.editReply({ content: '❌ حدث خطأ أثناء جلب بيانات لوحة الصدارة من قاعدة البيانات.' });
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
            let userRank = 0;
            let userPoints = 0;

            const topLimit = Math.min(rows.length, 10);
            for (let i = 0; i < topLimit; i++) {
                let medal = `\`#${i + 1}\``;
                if (i === 0) medal = '🥇';
                if (i === 1) medal = '🥈';
                if (i === 2) medal = '🥉';

                leaderboardText += `${medal} <@${rows[i].userId}> — **${rows[i].points}** نقطة\n`;
            }

            for (let i = 0; i < rows.length; i++) {
                if (rows[i].userId === interaction.user.id) {
                    userRank = i + 1;
                    userPoints = rows[i].points;
                    break;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 لوحة صدارة مسابقة التوقعات 📊')
                .setDescription(leaderboardText)
                .setColor('Blurple')
                .setTimestamp();

            if (userRank > 0) {
                embed.addFields({ name: '━━━━━━━━━━━━━━━━━━━━', value: `📍 **ترتيبك الحالي:** \`#${userRank}\` — رصيدك: **${userPoints}** نقطة` });
            } else {
                embed.addFields({ name: '━━━━━━━━━━━━━━━━━━━━', value: `📍 **ترتيبك الحالي:** \`#غير مسجل\` — لم تشارك أو تحصل على نقاط بعد.` });
            }

            await interaction.editReply({ embeds: [embed] });
        });
    }
};