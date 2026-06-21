require('dotenv').config();
require('./database');

const fs = require('fs');
const path = require('path');

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events
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

        const ALLOWED_USERS = [
            '1391032193026883754',
            '1391112056706568333'
        ];

        if (!ALLOWED_USERS.includes(interaction.user.id)) {

            return interaction.reply({
                content: '❌ ليس لديك صلاحية.',
                ephemeral: true
            });

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