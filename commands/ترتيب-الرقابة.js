const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const db = require('../database');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('ترتيب-الرقابة')
        .setDescription('عرض أعلى الرقابيين بالنقاط'),

    async execute(interaction) {

        db.all(
            'SELECT * FROM users ORDER BY monitorPoints DESC LIMIT 10',
            [],
            async (err, rows) => {

                if (err) {
                    console.error(err);
                    return interaction.reply('❌ حدث خطأ.');
                }

                if (!rows.length) {
                    return interaction.reply('❌ لا يوجد بيانات.');
                }

                let leaderboard = '';

                for (let i = 0; i < rows.length; i++) {

                    leaderboard +=
                        `#${i + 1} • <@${rows[i].userId}> — ${rows[i].monitorPoints} نقطة\n`;

                }

                const embed = new EmbedBuilder()
                    .setTitle('🏆 ترتيب الرقابة')
                    .setDescription(leaderboard)
                    .setTimestamp();

                interaction.reply({
                    embeds: [embed]
                });

            }
        );

    }

};