const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 🚨 ربط صارم ومباشر بملف الداتابيز الموحد الصحيح في المجلد الرئيسي
const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

// 1️⃣ دالة تنظيف وتوحيد أسماء الفرق وتقليل الأخطاء الإملائية والمسافات
function cleanText(text) {
    if (!text) return '';
    return text
        .trim()                              // إزالة المسافات من الأطراف
        .replace(/\s+/g, '')                 // إزالة أي مسافات داخلية
        .replace(/[أإآأ]/g, 'ا')             // توحيد الألفات (أحمد/احمد)
        .replace(/ة/g, 'ه')                  // توحيد التاء المربوطة والهاء (المباراة/المباراه)
        .replace(/^(ال)/, '');               // إزالة "ال" التعريف لضمان التطابق (النصر -> نصر)
}

// 2️⃣ دالة توحيد ترتيب الأرقام (مثال: تحويل "1-2" و "2-1" إلى شكل موحد "1-2")
function normalizeScore(scoreStr) {
    if (!scoreStr) return '';
    const clean = scoreStr.replace(/\s+/g, '');
    const parts = clean.split('-');
    if (parts.length === 2) {
        const num1 = parseInt(parts[0], 10);
        const num2 = parseInt(parts[1], 10);
        if (!isNaN(num1) && !isNaN(num2)) {
            return num1 < num2 ? `${num1}-${num2}` : `${num2}-${num1}`;
        }
    }
    return clean;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('اعتماد-النتيجة')
        .setDescription('اعتماد النتيجة النهائية للمباراة وتوزيع النقاط على التوقعات الصحيحة')
        .addStringOption(option => option.setName('رقم_المباراة').setDescription('رقم المباراة الحالية').setRequired(true))
        .addStringOption(option => option.setName('الفائز_الفعلي').setDescription('اسم الفريق الفائز أو تعادل بالضبط').setRequired(true))
        .addStringOption(option => option.setName('النتيجة_الفعلية').setDescription('النتيجة الحقيقية مثل: 2-1').setRequired(true)),

    async execute(interaction) {
        const ALLOWED_USER_ID = '1229374664107884597'; 
        const ALLOWED_ROLE_ID = '1511200506557632623'; 
        if (interaction.user.id !== ALLOWED_USER_ID && !interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المسابقات فقط.', ephemeral: true });
        }

        const matchId = interaction.options.getString('رقم_المباراة');
        const actualWinner = interaction.options.getString('الفائز_الفعلي');
        const actualScore = interaction.options.getString('النتيجة_الفعلية');

        const cleanedActualWinner = cleanText(actualWinner);
        const normalizedActualScore = normalizeScore(actualScore);

        await interaction.deferReply();

        db.get(`SELECT * FROM matches WHERE matchId = ?`, [matchId], (err, match) => {
            if (err || !match) return interaction.editReply({ content: '❌ لم يتم العثور على المباراة في قاعدة البيانات الموحدة.' });
            if (match.status === 'rewarded') return interaction.editReply({ content: '⚠️ تم اعتماد نقاط هذه المباراة سابقاً.' });

            db.all(`SELECT * FROM predictions WHERE matchId = ?`, [matchId], async (predErr, rows) => {
                if (predErr || !rows || rows.length === 0) {
                    db.run(`UPDATE matches SET status = 'rewarded' WHERE matchId = ?`, [matchId]);
                    return interaction.editReply({ content: '🏁 انتهت المباراة ولم يشارك أحد بالتوقعات في هذه الداتابيز.' });
                }

                let exactList = [];
                let winnerOnlyList = [];
                let wrongList = [];
                const multiplier = match.doublePoints ? 2 : 1;

                // معالجة وحفظ كل توقع بشكل آمن خطوة بخطوة لمنع الكراش والتعليق
                for (const p of rows) {
                    let pointsGained = 0;
                    let isExact = 0, isWinnerOnly = 0, isWrong = 0;

                    const cleanedUserWinner = cleanText(p.winner);
                    const normalizedUserScore = normalizeScore(p.score);

                    if (cleanedUserWinner === cleanedActualWinner && normalizedUserScore === normalizedActualScore) {
                        pointsGained = 3 * multiplier; exactList.push(`<@${p.userId}>`); isExact = 1;
                    } else if (cleanedUserWinner === cleanedActualWinner) {
                        pointsGained = 1 * multiplier; winnerOnlyList.push(`<@${p.userId}>`); isWinnerOnly = 1;
                    } else {
                        wrongList.push(`<@${p.userId}>`); isWrong = 1;
                    }

                    // الاستعلام الآمن البديل لـ ON CONFLICT لضمان الثبات الكامل
                    await new Promise((resolve) => {
                        db.get(`SELECT points, exactMatches, winnerOnlyMatches, wrongMatches FROM tournament_points WHERE userId = ?`, [p.userId], (searchErr, row) => {
                            if (row) {
                                // تحديث الحساب الحالي
                                const nPoints = row.points + pointsGained;
                                const nExact = row.exactMatches + isExact;
                                const nWinner = row.winnerOnlyMatches + isWinnerOnly;
                                const nWrong = row.wrongMatches + isWrong;

                                db.run(`UPDATE tournament_points SET points = ?, exactMatches = ?, winnerOnlyMatches = ?, wrongMatches = ? WHERE userId = ?`,
                                    [nPoints, nExact, nWinner, nWrong, p.userId], () => resolve());
                            } else {
                                // إنشاء سجل جديد كلياً
                                db.run(`INSERT INTO tournament_points (userId, points, exactMatches, winnerOnlyMatches, wrongMatches) VALUES (?, ?, ?, ?, ?)`,
                                    [p.userId, pointsGained, isExact, isWinnerOnly, isWrong], () => resolve());
                            }
                        });
                    });
                }

                // تحديث حالة اللقاء إلى تم التوزيع
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

                const allMentions = rows.map(p => `<@${p.userId}>`).join(' ');
                await interaction.editReply({ content: `🔔 **إعلان نتائج المسابقة:** ${allMentions}`, embeds: [embed] });
            });
        });
    }
};