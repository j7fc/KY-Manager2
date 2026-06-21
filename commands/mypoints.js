const {
    SlashCommandBuilder
} = require('discord.js');

const db = require('../database');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('نقاطي')
        .setDescription('عرض نقاطك'),

    async execute(interaction) {

        const userId = interaction.user.id;

        db.get(
            'SELECT * FROM users WHERE userId = ?',
            [userId],
            (err, row) => {

                if (err) {
                    return interaction.reply('حدث خطأ.');
                }

                if (!row) {

                    db.run(
                        'INSERT INTO users (userId) VALUES (?)',
                        [userId]
                    );

                    return interaction.reply(
                        'نقاط الإدارة: 0\nنقاط الرقابة: 0'
                    );
                }

                interaction.reply(
                    `نقاط الإدارة: ${row.adminPoints}\nنقاط الرقابة: ${row.monitorPoints}`
                );

            }
        );

    }

};