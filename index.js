require('dotenv').config();
require('./database');

const fs = require('fs');
const path = require('path');

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    EmbedBuilder
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data) {
        client.commands.set(command.data.name, command);
    }
}

client.once(Events.ClientReady, () => {
    console.log(`تم تشغيل البوت: ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    if (interaction.isButton()) {
        console.log('Button Clicked By:', interaction.user.id);

        const ALLOWED_USERS = [
            '1229374664107884597'
        ];

        if (!ALLOWED_USERS.includes(interaction.user.id)) {
            return interaction.reply({
                content: '❌ ليس لديك صلاحية.',
                ephemeral: true
            });
        }

        // تفاعل زر الاعتماد والترقية
        if (interaction.customId.startsWith('accept_')) {
            const parts = interaction.customId.split('_');
            const userId = parts[1];
            const roleId = parts[2];
            const oldRoleId = parts[3];

            try {
                const member = await interaction.guild.members.fetch(userId);

                if (oldRoleId !== 'none') {
                    await member.roles.remove(oldRoleId);
                }

                await member.roles.add(roleId);

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم اعتماد الترقية')
                    .addFields(
                        {
                            name: '👤 العضو',
                            value: `<@${member.id}>`
                        },
                        {
                            name: '🏅 الرتبة الجديدة',
                            value: `<@&${roleId}>`
                        },
                        {
                            name: '👮 اعتمد بواسطة',
                            value: `<@${interaction.user.id}>`
                        }
                    )
                    .setColor('Green')
                    .setTimestamp();

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

            } catch (err) {
                console.error(err);
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء الترقية أو جلب العضو.',
                    ephemeral: true
                });
            }
            return;
        }

        // تفاعل زر الرفض
        if (interaction.customId.startsWith('reject_')) {
            const parts = interaction.customId.split('_');
            const userId = parts[1];

            try {
                const member = await interaction.guild.members.fetch(userId);

                const embed = new EmbedBuilder()
                    .setTitle('❌ تم رفض الترقية')
                    .addFields(
                        {
                            name: '👤 العضو',
                            value: `<@${member.id}>`
                        },
                        {
                            name: '👮 تم الرفض بواسطة',
                            value: `<@${interaction.user.id}>`
                        }
                    )
                    .setColor('Red')
                    .setTimestamp();

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

            } catch (err) {
                console.error(err);
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء رفض الترقية.',
                    ephemeral: true
                });
            }
            return;
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'صار خطأ.',
            ephemeral: true
        });
    }
});

client.login(process.env.TOKEN);