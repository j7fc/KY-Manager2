const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const db = require('../database');
const { checkPromotion } = require('../promotionSystem');

// تم تعديل المعرفات هنا لتكون معرفات رتب بدلاً من معرف حسابك الشخصي
const ALLOWED_ROLES = [
    '1391032193026883754',
    '1391112056706568333'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('إضافة-نقاط')
        .setDescription('إضافة نقاط لعضو')

        .addUserOption(option =>
            option
                .setName('العضو')
                .setDescription('اختر العضو')
                .setRequired(true))

        .addStringOption(option =>
            option
                .setName('القسم')
                .setDescription('القسم')
                .setRequired(true)
                .addChoices(
                    { name: 'الإدارة', value: 'admin' },
                    { name: 'الرقابة', value: 'monitor' }
                ))

        .addIntegerOption(option =>
            option
                .setName('النقاط')
                .setDescription('عدد النقاط')
                .setRequired(true))

        .addStringOption(option =>
            option
                .setName('السبب')
                .setDescription('سبب إضافة النقاط')
                .setRequired(true)),

    async execute(interaction) {

        const hasRole = interaction.member.roles.cache.some(role =>
            ALLOWED_ROLES.includes(role.id)
        );

        if (!hasRole) {
            return interaction.reply({
                content: '❌ ليس لديك صلاحية استخدام هذا الأمر.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('العضو');
        const department = interaction.options.getString('القسم');
        const points = interaction.options.getInteger('النقاط');
        const reason = interaction.options.getString('السبب');

        db.get(
            'SELECT * FROM users WHERE userId = ?',
            [user.id],
            async (err, row) => {

                if (err) {
                    console.error(err);
                    return interaction.reply('❌ حدث خطأ.');
                }

                if (!row) {
                    db.run(
                        'INSERT INTO users (userId, adminPoints, monitorPoints) VALUES (?, 0, 0)',
                        [user.id]
                    );

                    row = {
                        adminPoints: 0,
                        monitorPoints: 0
                    };
                }

                let newPoints;

                if (department === 'admin') {
                    newPoints = row.adminPoints + points;

                    db.run(
                        'UPDATE users SET adminPoints = ? WHERE userId = ?',
                        [newPoints, user.id]
                    );
                } else {
                    newPoints = row.monitorPoints + points;

                    db.run(
                        'UPDATE users SET monitorPoints = ? WHERE userId = ?',
                        [newPoints, user.id]
                    );
                }

                db.run(
                    'INSERT INTO logs (userId, reason, points, department, addedBy) VALUES (?, ?, ?, ?, ?)',
                    [
                        user.id,
                        reason,
                        points,
                        department,
                        interaction.user.id
                    ]
                );

                try {
                    const member = await interaction.guild.members.fetch(user.id);
                    await checkPromotion(
                        member,
                        newPoints,
                        department
                    );
                } catch (e) {
                    console.error(e);
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ إضافة نقاط ناجحة')
                    .addFields(
                        {
                            name: '👤 العضو',
                            value: `<@${user.id}>`,
                            inline: false
                        },
                        {
                            name: '📂 القسم',
                            value: department === 'admin' ? 'الإدارة' : 'الرقابة',
                            inline: true
                        },
                        {
                            name: '➕ النقاط المضافة',
                            value: points.toString(),
                            inline: true
                        },
                        {
                            name: '📝 السبب',
                            value: reason,
                            inline: false
                        },
                        {
                            name: '📊 المجموع الحالي',
                            value: newPoints.toString(),
                            inline: true
                        },
                        {
                            name: '👮 تمت بواسطة',
                            value: `<@${interaction.user.id}>`,
                            inline: true
                        }
                    )
                    .setTimestamp();

                interaction.reply({
                    embeds: [embed]
                });
            }
        );
    }
};