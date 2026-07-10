const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 🚨 يستدعي ملف الداتابيز الموحد من نفس المجلد
const db = require('./database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ترتيب-التوقعات')
        .setDescription('عرض لوحة صدارة مسابقة التوقعات لجميع الأعضاء المشاركين بالكامل'),

    async execute(interaction) {
        await interaction.deferReply();

        // تم تعديل الاستعلام لجلب تفاصيل عدد التوقعات الصحيحة أيضاً لجمالية العرض وزيادة الحماس
        db.all(`SELECT userId, points, exactMatches, winnerOnlyMatches FROM tournament_points ORDER BY points DESC`, async (err, rows) => {
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

            // تعديل: الحلقات التكرارية تعرض الآن جميع الصفوف المتواجدة بالداتابيز دون حد معين (سواء 10 أو 30 أو أكثر)
            for (let i = 0; i < rows.length; i++) {
                const rank = i + 1;
                let medal = `\`#${rank}\``;
                if (i === 0) medal = '🥇';
                if (i === 1) medal = '🥈';
                if (i === 2) medal = '🥉';

                leaderboardText += `${medal} <@${rows[i].userId}> — **${rows[i].points}** نقطة\n`;
                // إضافة تفاصيل التوقعات بالملي والفائز فقط تحت كل عضو لإعطاء مظهر احترافي ومفصل للجدول العام
                leaderboardText += `└ 🎯 بالملي: \`${rows[i].exactMatches || 0}\` | 👑 فائز فقط: \`${rows[i].winnerOnlyMatches || 0}\`\n\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 لوحة صدارة مسابقة التوقعات 📊')
                .setDescription(leaderboardText)
                .setColor('Blurple')
                .setTimestamp()
                .setFooter({ text: 'يتم تحديث الترتيب تلقائياً بعد كل مباراة' });

            // 💡 تم حذف حقل "ترتيبك الحالي" بالكامل من هنا لكي تظهر الرسالة عامة وصحيحة للجميع دون لخبطة.

            await interaction.editReply({ embeds: [embed] });
        });
    }
};