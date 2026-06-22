const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function createPromotionButtons(userId, roleId, oldRoleId) {

    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_${userId}_${roleId}_${oldRoleId}`)
                .setLabel('قبول')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`reject_${userId}`)
                .setLabel('رفض')
                .setStyle(ButtonStyle.Danger)
        );
}

module.exports = {
    createPromotionButtons
};