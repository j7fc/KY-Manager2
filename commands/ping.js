const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('اختبر')
        .setDescription('اختبار البوت'),

    async execute(interaction) {
        await interaction.reply('🏓 البوت شغال!');
    }
};