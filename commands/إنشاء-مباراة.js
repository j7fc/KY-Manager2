const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 🚨 الاتصال المباشر والمستقل داخل الأمر لضمان استخدام جدول صحيح 100%
const dbPath = path.join(__dirname, '..', 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

// التأكد من بناء الجدول الصحيح داخلياً فوراً
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS matches (
        matchId TEXT PRIMARY KEY,
        team1 TEXT,
        team2 TEXT,
        matchTime TEXT,
        status TEXT DEFAULT 'open',
        channelId TEXT,
        messageId TEXT,
        doublePoints INTEGER DEFAULT 0
    )`);
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('إنشاء-مباراة')
        .setDescription('إنشاء مباراة جديدة للتوقعات (للإدارة فقط)')
        .addStringOption(option =>
            option.setName('البطولة').setDescription('مثال: دوري أبطال أوروبا').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('الفريق_الأول').setDescription('اسم الفريق الأول').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('الفريق_الثاني').setDescription('اسم الفريق الثاني').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('وقت_الإغلاق').setDescription('صيغة: YYYY-MM-DD HH:MM').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('نوع_النقاط').setDescription('عادية أو دبل').setRequired(true)
            .addChoices(
                { name: 'عادية', value: 'normal' },
                { name: 'دبل', value: 'double' }
            )
        ),

    async execute(interaction) {
        const ALLOWED_USER_ID = '1229374664107884597'; 
        const ALLOWED_ROLE_ID = '1511200506557632623'; 

        const hasRole = interaction.member.roles.cache.has(ALLOWED_ROLE_ID);
        const isOwner = interaction.user.id === ALLOWED_USER_ID;

        if (!isOwner && !hasRole) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', ephemeral: true });
        }

        const tournament = interaction.options.getString('البطولة');
        const team1 = interaction.options.getString('الفريق_الأول');
        const team2 = interaction.options.getString('الفريق_الثاني');
        const timeInput = interaction.options.getString('وقت_الإغلاق');
        const pointsType = interaction.options.getString('نوع_النقاط');

        const closeTimestamp = Date.parse(timeInput);
        if (isNaN(closeTimestamp)) {
            return interaction.reply({ content: '❌ صيغة الوقت خاطئة! يرجى إدخال الوقت مثل: `2026-07-20 21:00`', ephemeral: true });
        }

        await interaction.deferReply(); 
        const isDouble = pointsType === 'double' ? 1 : 0;

        // قراءة العدد وتوليد الآيدي من الملف المباشر الجديد
        db.get(`SELECT COUNT(*) as count FROM matches`, [], async (countErr, rowCount) => {
            if (countErr) {
                return interaction.editReply({ content: `❌ خطأ في فحص جدول المباريات:\n\`${countErr.message}\`` });
            }

            const currentMatchId = String((rowCount ? rowCount.count : 0) + 1);

            // محاولة الإدخال في الملف المباشر
            db.run(
                `INSERT INTO matches (matchId, team1, team2, matchTime, doublePoints, status) VALUES (?, ?, ?, ?, ?, 'open')`,
                [currentMatchId, team1, team2, timeInput, isDouble],
                async function (err) {
                    if (err) {
                        return interaction.editReply({ content: `❌ فشل الحفظ بسبب:\n\`${err.message}\`` });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(`🏆 ${tournament}`)
                        .setDescription(`**${team1}** ×  **${team2}**\n\n📅 **موعد الإغلاق:** ${timeInput}\n⭐ **دبل النقاط:** ${isDouble ? 'نعم' : 'لا'}`)
                        .setColor(isDouble ? 'Gold' : 'Blue')
                        .setFooter({ text: `رقم المباراة: #${currentMatchId}` })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`predict_btn_${currentMatchId}`).setLabel('🎯 توقع الآن').setStyle(ButtonStyle.Primary)
                    );

                    const message = await interaction.channel.send({ embeds: [embed], components: [row] });

                    db.run(`UPDATE matches SET messageId = ?, channelId = ? WHERE matchId = ?`, [message.id, interaction.channel.id, currentMatchId]);

                    await interaction.editReply({ content: `✅ تم إنشاء المباراة رقم \`#${currentMatchId}\` بنجاح!` });
                }
            );
        });
    }
};