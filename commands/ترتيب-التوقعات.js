const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ترتيب-التوقعات')
        .setDescription('عرض لوحة صدارة مسابقة التوقعات والأعضاء الأعلى نقاطاً'),

    async execute(interaction) {
        await interaction.deferReply();

        // جلب جميع الأعضاء مرتبين من الأعلى للنقاط إلى الأقل
        db.all(`SELECT userId, points FROM tournament_points ORDER BY points DESC`, async (err, rows) => {
            if (err) {
                console.error("🚨 خطأ أثناء جلب لوحة الصدارة:", err);
                return interaction.editReply({ content: '❌ حدث خطأ أثناء جلب بيانات لوحة الصدارة من قاعدة البيانات.' });
            }

            // إذا كانت قاعدة البيانات فارغة تماماً ولا توجد نقاط لأي عضو
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

            // بناء قائمة أفضل 10 مشاركين
            const topLimit = Math.min(rows.length, 10);
            for (let i = 0; i < topLimit; i++) {
                let medal = `\`#${i + 1}\``;
                if (i === 0) medal = '🥇';
                if (i === 1) medal = '🥈';
                if (i === 2) medal = '🥉';

                leaderboardText += `${medal} <@${rows[i].userId}> — **${rows[i].points}** نقطة\n`;
            }

            // البحث عن ترتيب العضو الذي نفذ الأمر
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

            // إظهار مكان العضو الحالي أسفل الإيمبد
            if (userRank > 0) {
                embed.addFields({ name: '━━━━━━━━━━━━━━━━━━━━', value: `📍 **ترتيبك الحالي:** \`#${userRank}\` — رصيدك: **${userPoints}** نقطة` });
            } else {
                embed.addFields({ name: '━━━━━━━━━━━━━━━━━━━━', value: `📍 **ترتيبك الحالي:** \`#غير مسجل\` — لم تشارك أو تحصل على نقاط بعد.` });
            }

            await interaction.editReply({ embeds: [embed] });
        });
    }
};