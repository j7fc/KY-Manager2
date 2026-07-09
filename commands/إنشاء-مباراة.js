const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

// --- حل ذكي ومضمون: جلب قاعدة البيانات من الـ require الرئيسي مباشرة لتفادي مشاكل الحروف ---
const path = require('path');
const fs = require('fs');
const predictionsDir = fs.readdirSync(path.join(__dirname, '..')).find(f => f.toLowerCase() === 'predictions');
const db = require(path.join(__dirname, '..', predictionsDir, 'database'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('إنشاء-مباراة')
        .setDescription('إنشاء مباراة جديدة للتوقعات (للإدارة فقط)')
        .addStringOption(option =>
            option
                .setName('البطولة')
                .setDescription('مثال: دوري أبطال أوروبا، كأس العالم 2026')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('الفريق_الأول')
                .setDescription('اسم الفريق الأول')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('الفريق_الثاني')
                .setDescription('اسم الفريق الثاني')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('وقت_الإغلاق')
                .setDescription('تاريخ ووقت إغلاق التوقعات (صيغة: YYYY-MM-DD HH:MM)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('نوع_النقاط')
                .setDescription('عادية أو دبل')
                .setRequired(true)
                .addChoices(
                    { name: 'عادية', value: 'normal' },
                    { name: 'دبل', value: 'double' }
                )
        ),

    async execute(interaction) {
        // --- حماية الصلاحيات والأمان ---
        const ALLOWED_USER_ID = '1229374664107884597'; 
        const ALLOWED_ROLE_ID = '1511200506557632623'; 

        const hasRole = interaction.member.roles.cache.has(ALLOWED_ROLE_ID);
        const isOwner = interaction.user.id === ALLOWED_USER_ID;

        if (!isOwner && !hasRole) {
            return interaction.reply({
                content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.',
                ephemeral: true
            });
        }

        const tournament = interaction.options.getString('البطولة');
        const team1 = interaction.options.getString('الفريق_الأول');
        const team2 = interaction.options.getString('الفريق_الثاني');
        const timeInput = interaction.options.getString('وقت_الإغلاق');
        const pointsType = interaction.options.getString('نوع_النقاط');

        const closeTimestamp = Date.parse(timeInput);
        if (isNaN(closeTimestamp)) {
            return interaction.reply({
                content: '❌ صيغة الوقت خاطئة! يرجى إدخال الوقت مثل هذا المثال تماماً:\n`2026-07-20 21:00`',
                ephemeral: true
            });
        }

        await interaction.deferReply(); 

        const isDouble = pointsType === 'double' ? 1 : 0;

        // جلب عدد المباريات لتوليد معرف فرعي ونقدي
        db.get(`SELECT COUNT(*) as count FROM matches`, [], async (countErr, rowCount) => {
            if (countErr) {
                console.error("🚨 خطأ أثناء قراءة الـ Count:", countErr);
                return interaction.editReply({ content: '❌ حدث خطأ أثناء فحص قاعدة البيانات.' });
            }

            const currentMatchId = String((rowCount ? rowCount.count : 0) + 1);

            // إدراج البيانات
            db.run(
                `INSERT INTO matches (matchId, team1, team2, matchTime, doublePoints, status) VALUES (?, ?, ?, ?, ?, 'open')`,
                [currentMatchId, team1, team2, timeInput, isDouble],
                async function (err) {
                    if (err) {
                        console.error("🚨 خطأ الداتابيز بالتفصيل عند الإدراج:", err);
                        return interaction.editReply({ content: '❌ حدث خطأ أثناء حفظ المباراة في قاعدة البيانات.' });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(`🏆 ${tournament}`)
                        .setDescription(`**${team1}** ×  **${team2}**\n\n📅 **موعد الإغلاق:** ${timeInput}\n⭐ **دبل النقاط:** ${isDouble ? 'نعم' : 'لا'}`)
                        .addFields(
                            {
                                name: '🎯 نظام النقاط المعتمد',
                                value: `🥇 توقع النتيجة كاملة وصحيحة = **${isDouble ? '+6' : '+3'}** نقاط\n🥈 توقع الفائز/التعادل فقط = **${isDouble ? '+2' : '+1'}** نقطة\n❌ توقع خاطئ تماماً = **0** نقاط`,
                                inline: false
                            }
                        )
                        .setColor(isDouble ? 'Gold' : 'Blue')
                        .setFooter({ text: `رقم المباراة: #${currentMatchId} | التوقعات تقفل تلقائياً عند الموعد` })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`predict_btn_${currentMatchId}`)
                            .setLabel('🎯 توقع الآن')
                            .setStyle(ButtonStyle.Primary)
                    );

                    const message = await interaction.channel.send({
                        embeds: [embed],
                        components: [row]
                    });

                    db.run(
                        `UPDATE matches SET messageId = ?, channelId = ? WHERE matchId = ?`,
                        [message.id, interaction.channel.id, currentMatchId],
                        (updateErr) => {
                            if (updateErr) console.error('خطأ تحديث تفاصيل الرسالة:', updateErr);
                        }
                    );

                    await interaction.editReply({
                        content: `✅ تم إنشاء المباراة رقم \`#${currentMatchId}\` وإرسالها بنجاح في هذا الروم!`
                    });
                }
            );
        });
    }
};