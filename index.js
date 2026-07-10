const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// الاتصال بقاعدة البيانات النهائية الموحدة
const dbPath = path.join(__dirname, 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

// إنشاء وتحديث الجداول لتدعم الإحصائيات الفخمة
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS matches (
        matchId TEXT PRIMARY KEY,
        team1 TEXT,
        team2 TEXT,
        matchTime TEXT,
        status TEXT DEFAULT 'open',
        channelId TEXT,
        messageId TEXT,
        doublePoints INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS predictions (
        matchId TEXT,
        userId TEXT,
        winner TEXT,
        score TEXT,
        PRIMARY KEY (matchId, userId)
    )`);

    // جدول الإحصائيات التفصيلية لكل عضو في المسابقة
    db.run(`CREATE TABLE IF NOT EXISTS tournament_stats (
        userId TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0,
        totalPredictions INTEGER DEFAULT 0,
        exactMatches INTEGER DEFAULT 0,
        winnerOnlyMatches INTEGER DEFAULT 0,
        wrongMatches INTEGER DEFAULT 0
    )`);
    
    console.log('✅ سيستم المسابقات وجداول الإحصائيات جاهزة بالكامل!');
});

require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

// قراءة الأوامر
const commandsPath = path.join(__dirname, 'commands');
function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) { loadCommands(filePath); continue; }
        if (!file.endsWith('.js')) continue;
        const command = require(filePath);
        if (command.data) client.commands.set(command.data.name, command);
    }
}
loadCommands(commandsPath);

client.once(Events.ClientReady, () => console.log(`تم تشغيل البوت بنجاح: ${client.user.tag}`));

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('predict_btn_')) {
            const matchId = interaction.customId.split('_')[2];

            db.get(`SELECT * FROM matches WHERE matchId = ?`, [matchId], (err, match) => {
                if (err || !match) return interaction.reply({ content: '❌ لم يتم العثور على هذه المباراة.', ephemeral: true });
                if (match.status !== 'open') return interaction.reply({ content: '⏰ نأسف، تم إغلاق التوقعات لهذه المباراة نهائياً.', ephemeral: true });

                const closeTimestamp = Date.parse(match.matchTime);
                if (Date.now() > closeTimestamp) {
                    db.run(`UPDATE matches SET status = 'closed' WHERE matchId = ?`, [matchId]);
                    return interaction.reply({ content: '⏰ تم إغلاق التوقعات لهذه المباراة تلقائياً لانتهاء الوقت المحدد.', ephemeral: true });
                }

                // فحص إذا كان للعضو توقع سابق لعرضه داخل الـ Placeholder كـ تعديل
                db.get(`SELECT * FROM predictions WHERE matchId = ? AND userId = ?`, [matchId, interaction.user.id], (predErr, existingPred) => {
                    const modal = new ModalBuilder().setCustomId(`predict_modal_${matchId}`).setTitle('🎯 تقديم / تعديل التوقع');

                    const winnerInput = new TextInputBuilder()
                        .setCustomId('predicted_winner')
                        .setLabel(`الفائز (اسم الفريق بالملي أو تعادل)`)
                        .setPlaceholder(existingPred ? `توقعك الحالي: ${existingPred.winner}` : `مثال: ${match.team1} أو تعادل`)
                        .setStyle(TextInputStyle.Short).setRequired(true);

                    const scoreInput = new TextInputBuilder()
                        .setCustomId('predicted_score')
                        .setLabel('النتيجة المتوقعة (أرقام فقط)')
                        .setPlaceholder(existingPred ? `توقعك الحالي: ${existingPred.score}` : 'مثال: 2-1')
                        .setStyle(TextInputStyle.Short).setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(winnerInput), new ActionRowBuilder().addComponents(scoreInput));
                    interaction.showModal(modal);
                });
            });
            return;
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('predict_modal_')) {
            const matchId = interaction.customId.split('_')[2];
            const winner = interaction.fields.getTextInputValue('predicted_winner').trim();
            const score = interaction.fields.getTextInputValue('predicted_score').trim();

            db.run(
                `INSERT INTO predictions (matchId, userId, winner, score) VALUES (?, ?, ?, ?)
                 ON CONFLICT(matchId, userId) DO UPDATE SET winner = excluded.winner, score = excluded.score`,
                [matchId, interaction.user.id, winner, score],
                (err) => {
                    if (err) return interaction.reply({ content: '❌ حدث خطأ أثناء حفظ توقعك.', ephemeral: true });
                    return interaction.reply({
                        content: `✅ تم حفظ توقعك بنجاح للمباراة **#${matchId}**!\n🎯 **توقعك:** الفائز: \`${winner}\` | النتيجة: \`${score}\`\n💡 (يمكنك التعديل بالضغط على الزر مجدداً قبل بداية المباراة)`,
                        ephemeral: true
                    });
                }
            );
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction); } catch (error) { console.error(error); }
});

const http = require('http');
http.createServer((req, res) => { res.write("Bot is running 24/7"); res.end(); }).listen(8080);
client.login(process.env.TOKEN);