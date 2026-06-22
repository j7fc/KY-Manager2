const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const ALLOWED_USERS = [
    '1229374664107884597'
];

const ROLE_REPLACEMENTS = {

    // الإدارة
    '1507095924952928346': '1410364972676153505', // إداري عام ← سينيور أدمن
    '1516991623362379826': '1507095924952928346', // نائب مسؤول الإدارة ← إداري عام

    // الرقابة
    '1507096025523949840': '1507384597929787485', // رقابي عام ← مشرف رقابي
    '1517187339804348617': '1507096025523949840'  // نائب الرقابة ← رقابي عام

};

module.exports = {

    data: new SlashCommandBuilder()
        .setName('اعتماد-ترقية')
        .setDescription('اعتماد ترقية عضو')

        .addUserOption(option =>
            option
                .setName('العضو')
                .setDescription('العضو المراد ترقيته')
                .setRequired(true)
        )

        .addRoleOption(option =>
            option
                .setName('الرتبة')
                .setDescription('الرتبة الجديدة')
                .setRequired(true)
        ),

    async execute(interaction) {

        const ALLOWED_ROLES = [
    '1391032193026883754',
    '1391112056706568333'
];

const hasRole = interaction.member.roles.cache.some(role =>
    ALLOWED_ROLES.includes(role.id)
);

if (!hasRole) {
            return interaction.reply({
                content: '❌ لا تملك صلاحية استخدام هذا الأمر.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('العضو');
        const newRole = interaction.options.getRole('الرتبة');

        const member = await interaction.guild.members.fetch(user.id);

        const oldRoleId = ROLE_REPLACEMENTS[newRole.id];

        if (oldRoleId && member.roles.cache.has(oldRoleId)) {
            await member.roles.remove(oldRoleId);
        }

        if (!member.roles.cache.has(newRole.id)) {
            await member.roles.add(newRole.id);
        }

        const embed = new EmbedBuilder()
            .setTitle('🎉 تم اعتماد الترقية')
            .addFields(
                {
                    name: '👤 العضو',
                    value: `<@${user.id}>`
                },
                {
                    name: '🏅 الرتبة الجديدة',
                    value: `<@&${newRole.id}>`
                },
                {
                    name: '👮 تمت بواسطة',
                    value: `<@${interaction.user.id}>`
                }
            )
            .setTimestamp();

        interaction.reply({
            embeds: [embed]
        });

    }

};