const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const db = require('../Predictions/database'); // استدعاء قاعدة البيانات المخصصة للتوقعات

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
        const ALLOWED_USER_ID = '1229374664107884597'; // الآيدي الخاص بك
        const ALLOWED_ROLE_ID = '1511200506557632623'; // آيدي رتبة مسؤول المسابقات

        const hasRole = interaction.member.roles.cache.has(ALLOWED_ROLE_ID);
        const isOwner = interaction.user.id === ALLOWED_USER_ID;

        if (!isOwner && !hasRole) {
            return interaction.reply({
                content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر. (مخصص فقط لصاحب البوت أو مسؤول المسابقات)',
                ephemeral: true
            });
        }

        // --- جلب البيانات المدخلة ---
        const tournament = interaction.options.getString('البطولة');
        const team1 = interaction.options.getString('الفريق_الأول');
        const team2 = interaction.options.getString('الفريق_الثاني');
        const timeInput = interaction.options.getString('وقت_الإغلاق');
        const pointsType = interaction.options.getString('نوع_النقاط');

        // تحويل تاريخ الإدخال إلى Timestamp لمقارنته بالوقت الحالي بدقة
        const closeTimestamp = Date.parse(timeInput);
        if (isNaN(closeTimestamp)) {
            return interaction.reply({
                content: '❌ صيغة الوقت خاطئة! يرجى إدخال الوقت مثل هذا المثال تماماً:\n`2026-07-20 21:00`',
                ephemeral: true
            });
        }

        await interaction.deferReply(); // حجز التفاعل لمنع اختفاء الاستجابة أثناء الكتابة في الداتابيز

        const isDouble = pointsType === 'double' ? 1 : 0;

        // --- إدراج المباراة مبدئياً في قاعدة البيانات لجلب الـ matchId تلقائياً ---
        db.run(
            `INSERT INTO matches (team1, team2, matchTime, doublePoints, status) VALUES (?, ?, ?, ?, 'open')`,
            [team1, team2, timeInput, isDouble],
            async function (err) {
                if (err) {
                    console.error(err);
                    return interaction.editReply({ content: '❌ حدث خطأ أثناء حفظ المباراة في قاعدة البيانات.' });
                }

                const currentMatchId = this.lastID; // الآيدي التلقائي للمباراة الحالية

                // --- تصميم الـ Embed الاحترافي ---
                const embed = new EmbedBuilder()
                    .setTitle(`🏆 ${tournament}`)
                    .setDescription(`**${team1}**  ×  **${team2}**\n\n📅 **موعد الإغلاق:** ${timeInput}\n⭐ **دبل النقاط:** ${isDouble ? 'نعم' : 'لا'}`)
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

                // --- تصميم زر "توقع الآن" ---
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`predict_btn_${currentMatchId}`)
                        .setLabel('🎯 توقع الآن')
                        .setStyle(ButtonStyle.Primary)
                );

                // إرسال الإيمبد في الروم الحالي
                const message = await interaction.channel.send({
                    embeds: [embed],
                    components: [row]
                });

                // --- تحديث قاعدة البيانات بمعلومات الرسالة والروم لربطها لاحقاً ---
                db.run(
                    `UPDATE matches SET messageId = ?, channelId = ? WHERE matchId = ?`,
                    [message.id, interaction.channel.id, currentMatchId],
                    (updateErr) => {
                        if (updateErr) console.error('خطأ تحديث تفاصيل الرسالة:', updateErr);
                    }
                );

                // تأكيد نجاح العملية للإداري برقم المباراة
                await interaction.editReply({
                    content: `✅ تم إنشاء المباراة رقم \`#${currentMatchId}\` وإرسالها بنجاح في هذا الروم!`
                });
            }
        );
    }
};