const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 🚨 الاتصال المباشر والموحد بقاعدة البيانات النهائية
const dbPath = path.join(__dirname, 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

// 🛠️ إنشاء جميع الجداول الناقصة فوراً لضمان عمل التوقعات وأوامر النقاط
db.serialize(() => {
    // 1. جدول المباريات
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

    // 2. جدول التوقعات (تم إصلاح نظام الـ PRIMARY KEY ليتوافق مع الحفظ)
    db.run(`CREATE TABLE IF NOT EXISTS predictions (
        matchId TEXT,
        userId TEXT,
        winner TEXT,
        score TEXT,
        PRIMARY KEY (matchId, userId)
    )`);

    // 3. جدول النقاط للمستخدمين (عشان أوامر إضافة وخصم النقاط تشتغل)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0
    )`);
    
    console.log('✅ جميع جداول قاعدة البيانات (مباريات، توقعات، نقاط) جاهزة للعمل!');
});

require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    EmbedBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// قراءة الأوامر من المجلدات الفرعية
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);

        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        if (!file.endsWith('.js')) continue;

        const command = require(filePath);

        if (command.data) {
            client.commands.set(command.data.name, command);
        }
    }
}

loadCommands(commandsPath);

client.once(Events.ClientReady, () => {
    console.log(`تم تشغيل البوت بنجاح: ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    if (interaction.isButton()) {
        console.log('Button Clicked By:', interaction.user.id);

        // تفاعل زر مسابقة التوقعات
        if (interaction.customId.startsWith('predict_btn_')) {
            const matchId = interaction.customId.split('_')[2];

            db.get(`SELECT * FROM matches WHERE matchId = ?`, [matchId], (err, match) => {
                if (err || !match) {
                    return interaction.reply({ content: '❌ لم يتم العثور على هذه المباراة في قاعدة البيانات.', ephemeral: true });
                }

                if (match.status !== 'open') {
                    return interaction.reply({ content: '⏰ نأسف، تم إغلاق التوقعات لهذه المباراة نهائياً.', ephemeral: true });
                }

                const closeTimestamp = Date.parse(match.matchTime);
                if (Date.now() > closeTimestamp) {
                    db.run(`UPDATE matches SET status = 'closed' WHERE matchId = ?`, [matchId]);
                    return interaction.reply({ content: '⏰ تم إغلاق التوقعات لهذه المباراة تلقائياً لانتهاء الوقت المحدد.', ephemeral: true });
                }

                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                
                const modal = new ModalBuilder()
                    .setCustomId(`predict_modal_${matchId}`)
                    .setTitle('🎯 تقديم / تعديل التوقع');

                const winnerInput = new TextInputBuilder()
                    .setCustomId('predicted_winner')
                    .setLabel(`الفائز (اكتب: اسم الفريق أو تعادل)`)
                    .setPlaceholder(`مثال: ${match.team1} أو تعادل`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const scoreInput = new TextInputBuilder()
                    .setCustomId('predicted_score')
                    .setLabel('النتيجة المتوقعة (أرقام فقط)')
                    .setPlaceholder('مثال: 2-1')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(winnerInput),
                    new ActionRowBuilder().addComponents(scoreInput)
                );

                interaction.showModal(modal);
            });
            return;
        }

        // أزرار الإدارة والترقيات القديمة
        const ALLOWED_USERS = ['1229374664107884597'];

        if (!ALLOWED_USERS.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
        }

        if (interaction.customId.startsWith('accept_')) {
            const parts = interaction.customId.split('_');
            const userId = parts[1];
            const roleId = parts[2];
            const oldRoleId = parts[3];

            try {
                const member = await interaction.guild.members.fetch(userId);
                if (oldRoleId !== 'none') await member.roles.remove(oldRoleId);
                await member.roles.add(roleId);

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم اعتماد الترقية')
                    .addFields(
                        { name: '👤 العضو', value: `<@${member.id}>` },
                        { name: '🏅 الرتبة الجديدة', value: `<@&${roleId}>` },
                        { name: '👮 اعتمد بواسطة', value: `<@${interaction.user.id}>` }
                    )
                    .setColor('Green')
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ حدث خطأ أثناء الترقية.', ephemeral: true });
            }
            return;
        }

        if (interaction.customId.startsWith('reject_')) {
            const parts = interaction.customId.split('_');
            const userId = parts[1];

            try {
                const member = await interaction.guild.members.fetch(userId);
                const embed = new EmbedBuilder()
                    .setTitle('❌ تم رفض الترقية')
                    .addFields(
                        { name: '👤 العضو', value: `<@${member.id}>` },
                        { name: '👮 تم الرفض بواسطة', value: `<@${interaction.user.id}>` }
                    )
                    .setColor('Red')
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ حدث خطأ أثناء رفض الترقية.', ephemeral: true });
            }
            return;
        }
        return;
    }

    // استقبال بيانات الـ Modal وحفظها
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
                    if (err) {
                        console.error("🚨 خطأ أثناء حفظ التوقع:", err);
                        return interaction.reply({ content: `❌ حدث خطأ أثناء حفظ توقعك بسبب:\n\`${err.message}\``, ephemeral: true });
                    }
                    return interaction.reply({
                        content: `✅ <@${interaction.user.id}>، تم حفظ توقعك بنجاح للمباراة **#${matchId}**!\n🎯 **توقعك:** الفائز: \`${winner}\` | النتيجة: \`${score}\``,
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

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'صار خطأ أثناء تنفيذ الأمر.', ephemeral: true });
    }
});

// خادم ويب وهمي لـ Render لمنع السكون
const http = require('http');
http.createServer((req, res) => {
    res.write("Bot is running 24/7");
    res.end();
}).listen(8080, () => {
    console.log("Web server is listening on port 8080");
});

client.login(process.env.TOKEN);