const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const db = require('../database');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('سجل-النقاط')
        .setDescription('عرض آخر عمليات النقاط'),

    async execute(interaction) {

        db.all(
            'SELECT * FROM logs ORDER BY id DESC LIMIT 20',
            [],
            (err, rows) => {

                if (err) {
                    console.error(err);
                    return interaction.reply('❌ حدث خطأ.');
                }

                if (!rows.length) {
                    return interaction.reply('❌ لا يوجد سجل.');
                }

                let history = '';

                rows.forEach(log => {

                    history +=
`👤 <@${log.userId}>
${log.points > 0 ? '➕' : '➖'} ${Math.abs(log.points)} نقطة
📝 ${log.reason}

`;

                });

                const embed = new EmbedBuilder()
                    .setTitle('📜 آخر عمليات النقاط')
                    .setDescription(history.substring(0, 4000))
                    .setTimestamp();

                interaction.reply({
                    embeds: [embed]
                });

            }
        );

    }

};