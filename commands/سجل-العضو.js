const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const db = require('../database');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('سجل-العضو')
        .setDescription('عرض سجل نقاط عضو')
        .addUserOption(option =>
            option
                .setName('العضو')
                .setDescription('اختر العضو')
                .setRequired(true)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser('العضو');

        db.all(
            'SELECT * FROM logs WHERE userId = ? ORDER BY id DESC LIMIT 10',
            [user.id],
            (err, rows) => {

                if (err) {
                    console.error(err);
                    return interaction.reply('❌ حدث خطأ.');
                }

                if (!rows.length) {
                    return interaction.reply('❌ لا يوجد سجل لهذا العضو.');
                }

                const history = rows.map(log =>
                    `• ${log.points > 0 ? '➕' : '➖'} ${Math.abs(log.points)} | ${log.reason}`
                ).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('📋 سجل العضو')
.addFields(
    { name: '👤 العضو', value: `<@${user.id}>` }
)
                    .setDescription(history)
                    .setTimestamp();

                interaction.reply({
                    embeds: [embed]
                });

            }
        );

    }

};