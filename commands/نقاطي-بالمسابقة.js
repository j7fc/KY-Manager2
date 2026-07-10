const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('نقاطي-بالمسابقة')
        .setDescription('عرض ملفك الإحصائي الشامل ونقاطك الحالية في المسابقة'),

    async execute(interaction) {
        await interaction.deferReply();
        const targetUser = interaction.user;

        // 1. جلب الترتيب العام لجميع الأعضاء لمعرفة المركز بدقة
        db.all(`SELECT userId, points FROM tournament_points ORDER BY points DESC`, (err, allUsers) => {
            if (err) {
                console.error("🚨 خطأ أثناء جلب الترتيب العام:", err);
                return interaction.editReply({ content: '❌ حدث خطأ أثناء جلب بيانات الترتيب من قاعدة البيانات.' });
            }

            let rank = 'غير مسجل';
            if (allUsers && allUsers.length > 0) {
                const foundIndex = allUsers.findIndex(u => u.userId === targetUser.id);
                if (foundIndex !== -1) {
                    rank = `#${foundIndex + 1}`;
                }
            }

            // 2. جلب البيانات التفصيلية والإحصائيات الخاصة بالعضو
            db.get(`SELECT * FROM tournament_points WHERE userId = ?`, [targetUser.id], (dbErr, data) => {
                if (dbErr) {
                    console.error("🚨 خطأ أثناء جلب إحصائيات العضو:", dbErr);
                    return interaction.editReply({ content: '❌ حدث خطأ أثناء جلب إحصائيات ملفك الشخصي.' });
                }

                // إذا كان العضو جديداً وليس له سجل، نضع القيم الافتراضية أصفاراً بدلاً من إظهار خطأ
                const points = data ? data.points : 0;
                const exact = data ? data.exactMatches : 0;
                const winnerOnly = data ? data.winnerOnlyMatches : 0;
                const wrong = data ? data.wrongMatches : 0;
                const totalPredicted = exact + winnerOnly + wrong;

                const embed = new EmbedBuilder()
                    .setTitle(`📊 الملف الشخصي للمسابقة | ${targetUser.username}`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setColor('Green')
                    .addFields(
                        { name: '⭐ مجموع النقاط الحالي', value: `\`${points}\` نقطة`, inline: true },
                        { name: '📊 ترتيبك في السيرفر', value: `\`${rank}\``, inline: true },
                        { name: '🎯 إجمالي المباريات المتوقعة', value: `\`${totalPredicted}\` مباراة`, inline: true },
                        { name: '✅ توقعات صحيحة بالملي', value: `\`${exact}\` (3 نقاط)`, inline: true },
                        { name: '🥈 توقع الفائز صحيح فقط', value: `\`${winnerOnly}\` (1 نقطة)`, inline: true },
                        { name: '❌ توقعات خاطئة تماماً', value: `\`${wrong}\` (0 نقاط)`, inline: true }
                    )
                    .setFooter({ text: 'استمر في التوقع الصحيح للوصول للصدارة! 🏆' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            });
        });
    }
};