const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const db = require('../database');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('نقاط-عضو')
        .setDescription('عرض نقاط أي عضو')
        .addUserOption(option =>
            option
                .setName('العضو')
                .setDescription('اختر العضو')
                .setRequired(true)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser('العضو');

        db.get(
            'SELECT * FROM users WHERE userId = ?',
            [user.id],
            (err, row) => {

                if (err) {
                    console.error(err);
                    return interaction.reply('❌ حدث خطأ.');
                }

                if (!row) {
                    return interaction.reply('❌ لا توجد نقاط لهذا العضو.');
                }

                const embed = new EmbedBuilder()
                    .setTitle('📊 معلومات العضو')
                    .addFields(
                        {
                            name: '👤 العضو',
                            value: `<@${user.id}>`,
                            inline: false
                        },
                        {
                            name: '🏛️ نقاط الإدارة',
                            value: row.adminPoints.toString(),
                            inline: true
                        },
                        {
                            name: '🛡️ نقاط الرقابة',
                            value: row.monitorPoints.toString(),
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