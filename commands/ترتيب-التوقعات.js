const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ترتيب-التوقعات')
        .setDescription('عرض لوحة الصدارة لأعلى أعضاء السيرفر نقاطاً بالمسابقة'),

    async execute(interaction) {
        db.all(`SELECT userId, points FROM tournament_stats ORDER BY points DESC`, [], async (err, rows) => {
            if (err) return interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle('🥇 لوحة صدارة مسابقة التوقعات الكبرى')
                .setColor('Gold')
                .setTimestamp();

            let leaderboardText = '';
            const topTen = rows.slice(0, 10);

            topTen.forEach((row, index) => {
                let medal = '🔹';
                if (index === 0) medal = '🥇';
                if (index === 1) medal = '🥈';
                if (index === 2) medal = '🥉';
                leaderboardText += `${medal} **#${index + 1}** <@${row.userId}> — \`${row.points}\` نقطة\n`;
            });

            embed.setDescription(leaderboardText || 'لا توجد بيانات نقاط حالياً.');

            // ميزة رهيبة: لو كان العضو برا التوب 10، نضيف له ترتيبه الحالي تحت بالأسفل
            const userIndex = rows.findIndex(r => r.userId === interaction.user.id);
            if (userIndex >= 10) {
                embed.addFields({ name: '━━━━━━━━━━━━━━', value: `📍 **ترتيبك الحالي:** \`#${userIndex + 1}\` رصيدك (${rows[userIndex].points} نقطة)` });
            }

            return interaction.reply({ embeds: [embed] });
        });
    }
};