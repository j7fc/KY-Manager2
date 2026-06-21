const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {

const filePath = path.join(commandsPath, file);
const command = require(filePath);

commands.push(command.data.toJSON());

}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {

try {

await rest.put(
Routes.applicationCommands('1516574540787093604'),
{ body: commands }
);

console.log('تم تسجيل الأوامر');

} catch (error) {
console.error(error);
}

})();