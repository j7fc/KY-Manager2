const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function createPromotionButtons(roleId, oldRoleId) {

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_${roleId}_${oldRoleId}`)
                .setLabel('قبول')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`reject_${roleId}`)
                .setLabel('رفض')
                .setStyle(ButtonStyle.Danger)
        );

    return row;
}

module.exports = {
    createPromotionButtons
};