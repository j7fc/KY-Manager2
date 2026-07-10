const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('اعتماد-النتيجة')
        .setDescription('اعتماد النتيجة النهائية للمباراة وتوزيع النقاط على التوقعات الصحيحة')
        .addStringOption(option => option.setName('رقم_المباراة').setDescription('رقم المباراة الحالية').setRequired(true))
        .addStringOption(option => option.setName('الفائز_الفعلي').setDescription('اسم الفريق الفائز أو تعادل بالظبط').setRequired(true))
        .addStringOption(option => option.setName('النتيجة_الفعلية').setDescription('النتيجة الحقيقية مثل: 2-1').setRequired(true)),

    async execute(interaction) {
        const ALLOWED_USER_ID = '1229374664107884597'; 
        const ALLOWED_ROLE_ID = '1511200506557632623'; 
        if (interaction.user.id !== ALLOWED_USER_ID && !interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المسابقات فقط.', ephemeral: true });
        }

        const matchId = interaction.options.getString('رقم_المباراة');
        const actualWinner = interaction.options.getString('الفائز_الفعلي').trim();
        const actualScore = interaction.options.getString('النتيجة_الفعلية').trim();

        await interaction.deferReply();

        db.get(`SELECT * FROM matches WHERE matchId = ?`, [matchId], (err, match) => {
            if (err || !match) return interaction.editReply({ content: '❌ لم يتم العثور على المباراة.' });
            if (match.status === 'rewarded') return interaction.editReply({ content: '⚠️ تم اعتماد نقاط هذه المباراة سابقاً.' });

            db.all(`SELECT * FROM predictions WHERE matchId = ?`, [matchId], async (predErr, rows) => {
                if (predErr || !rows || rows.length === 0) {
                    db.run(`UPDATE matches SET status = 'rewarded' WHERE matchId = ?`, [matchId]);
                    return interaction.editReply({ content: '🏁 انتهت المباراة ولم يشارك أحد بالتوقعات.' });
                }

                let exactList = [];
                let winnerOnlyList = [];
                let wrongList = [];
                const multiplier = match.doublePoints ? 2 : 1;

                db.serialize(() => {
                    rows.forEach(p => {
                        let pointsGained = 0;
                        let isExact = 0, isWinnerOnly = 0, isWrong = 0;

                        if (p.winner === actualWinner && p.score === actualScore) {
                            pointsGained = 3 * multiplier; exactList.push(`<@${p.userId}>`); isExact = 1;
                        } else if (p.winner === actualWinner) {
                            pointsGained = 1 * multiplier; winnerOnlyList.push(`<@${p.userId}>`); isWinnerOnly = 1;
                        } else {
                            wrongList.push(`<@${p.userId}>`); isWrong = 1;
                        }

                        // تحديث جدول إحصائيات التوقعات التفصيلي
                        db.run(`INSERT INTO tournament_stats (userId, points, totalPredictions, exactMatches, winnerOnlyMatches, wrongMatches) 
                                VALUES (?, ?, 1, ?, ?, ?)
                                ON CONFLICT(userId) DO UPDATE SET 
                                points = points + excluded.points,
                                totalPredictions = totalPredictions + 1,
                                exactMatches = exactMatches + ?,
                                winnerOnlyMatches = winnerOnlyMatches + ?,
                                wrongMatches = wrongMatches + ?`,
                                [p.userId, pointsGained, isExact, isWinnerOnly, isWrong, isExact, isWinnerOnly, isWrong]
                        );
                    });
                });

                db.run(`UPDATE matches SET status = 'rewarded' WHERE matchId = ?`, [matchId]);

                const embed = new EmbedBuilder()
                    .setTitle('🏆 تم احتساب نتائج المباراة بالتفصيل')
                    .setDescription(`⚽ **${match.team1} ${actualScore} ${match.team2}**\n👑 الفائز الفعلي: \`${actualWinner}\`\n⭐ مضاعف النقاط: ${match.doublePoints ? '`X2 دبل`' : '`عادي`'}`)
                    .addFields(
                        { name: `🥇 توقع النتيجة بالملي (+${3 * multiplier} نقاط):`, value: exactList.length > 0 ? exactList.join(', ') : 'لا أحد', inline: false },
                        { name: `🥈 توقع الفائز فقط (+${1 * multiplier} نقاط):`, value: winnerOnlyList.length > 0 ? winnerOnlyList.join(', ') : 'لا أحد', inline: false },
                        { name: `❌ توقعات خاطئة (0 نقاط):`, value: wrongList.length > 0 ? wrongList.join(', ') : 'لا أحد', inline: false }
                    )
                    .setColor('Green').setTimestamp();

                // منشن جماعي لكل من شارك في المباراة ليعلم بنتيجته فوراً
                const allMentions = rows.map(p => `<@${p.userId}>`).join(' ');
                await interaction.editReply({ content: `🔔 **إعلان نتائج المسابقة:** ${allMentions}`, embeds: [embed] });
            });
        });
    }
};