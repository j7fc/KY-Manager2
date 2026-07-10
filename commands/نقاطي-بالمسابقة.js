const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('نقاطي-بالمسابقة')
        .setDescription('عرض بطاقة إحصائياتك التفصيلية والترتيب الحالي بالمسابقة'),

    async execute(interaction) {
        const userId = interaction.user.id;

        // جلب جميع الأعضاء لحساب الترتيب الفعلي للعضو بدقة
        db.all(`SELECT userId, points FROM tournament_stats ORDER BY points DESC`, [], (err, rows) => {
            if (err) return interaction.reply({ content: '❌ حدث خطأ أثناء جلب البيانات.', ephemeral: true });

            const userIndex = rows.findIndex(r => r.userId === userId);
            const rank = userIndex !== -1 ? `#${userIndex + 1}` : 'غير مصنف';

            db.get(`SELECT * FROM tournament_stats WHERE userId = ?`, [userId], (statErr, stats) => {
                const embed = new EmbedBuilder()
                    .setTitle(`🎯 بطاقة توقعاتك | ${interaction.user.username}`)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setColor('Blue')
                    .addFields(
                        { name: '⭐ مجموع النقاط الحالي', value: `\`${stats ? stats.points : 0}\` نقطة`, inline: true },
                        { name: '📊 ترتيبك في السيرفر', value: `\`${rank}\``, inline: true },
                        { name: '🎯 إجمالي المباريات المتوقعة', value: `\`${stats ? stats.totalPredictions : 0}\` مباراة`, inline: true },
                        { name: '✅ التوقعات بالملي (الصحيحة)', value: `\`${stats ? stats.exactMatches : 0}\``, inline: true },
                        { name: '🥈 توقع الفائز فقط', value: `\`${stats ? stats.winnerOnlyMatches : 0}\``, inline: true },
                        { name: '❌ التوقعات الخاطئة', value: `\`${stats ? stats.wrongMatches : 0}\``, inline: true }
                    )
                    .setFooter({ text: 'استمر بالتوقع للوصول للصدارة!' }).setTimestamp();

                return interaction.reply({ embeds: [embed] });
            });
        });
    }
};