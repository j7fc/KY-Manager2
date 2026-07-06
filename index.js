require('dotenv').config();
require('./database');

// --- الحل الذكي لضمان تشغيل مجلد التوقعات تلقائياً بدون مشاكل حروف Linux ---
const fs = require('fs');
const path = require('path');
const predictionsDir = fs.readdirSync(__dirname).find(f => f.toLowerCase() === 'predictions');
if (predictionsDir) {
    require(path.join(__dirname, predictionsDir, 'database'));
} else {
    console.error("❌ لم يتم العثور على مجلد التوقعات!");
}

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
        GatewayIntentBits.GuildMembers // إضافة هذا الـ Intent لجلب بيانات الأعضاء والرتب بشكل صحيح
    ]
});

client.commands = new Collection();

// --- بداية التعديل الجديد لقراءة الأوامر من المجلدات الفرعية ---
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
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
// --- نهاية التعديل الجديد ---

client.once(Events.ClientReady, () => {
    console.log(`تم تشغيل البوت: ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    if (interaction.isButton()) {
        console.log('Button Clicked By:', interaction.user.id);

        // ==========================================
        // 🎯 أولاً: تفاعل زر مسابقة التوقعات (متاح للجميع)
        // ==========================================
        if (interaction.customId.startsWith('predict_btn_')) {
            const matchId = interaction.customId.split('_')[2];
            
            // جلب المسار بشكل ديناميكي لتفادي خطأ الحروف
            const predictionsDirBtn = fs.readdirSync(__dirname).find(f => f.toLowerCase() === 'predictions');
            const db = require(path.join(__dirname, predictionsDirBtn, 'database'));

            db.get(`SELECT * FROM matches WHERE matchId = ?`, [matchId], (err, match) => {
                if (err || !match) {
                    return interaction.reply({ content: '❌ لم يتم العثور على هذه المباراة.', ephemeral: true });
                }

                if (match.status !== 'open') {
                    return interaction.reply({ content: '⏰ نأسف، تم إغلاق التوقعات لهذه المباراة نهائياً.', ephemeral: true });
                }

                // التحقق التلقائي من الوقت الحالي مقارنة بوقت الإغلاق المحدد
                const closeTimestamp = Date.parse(match.matchTime);
                if (Date.now() > closeTimestamp) {
                    db.run(`UPDATE matches SET status = 'closed' WHERE matchId = ?`, [matchId]);
                    return interaction.reply({ content: '⏰ تم إغلاق التوقعات لهذه المباراة تلقائياً لانتهاء الوقت المحدد.', ephemeral: true });
                }

                // فتح النافذة (Modal) للتوقع
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

        // ==========================================
        // 👮 ثانياً: أزرار الإدارة والترقيات القديمة (مغلقة بالصلاحيات)
        // ==========================================
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
                        { name: '👤 العضو', value: `<@${member.id}>` },
                        { name: '🏅 الرتبة الجديدة', value: `<@&${roleId}>` },
                        { name: '👮 اعتمد بواسطة', value: `<@${interaction.user.id}>` }
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
                        { name: '👤 العضو', value: `<@${member.id}>` },
                        { name: '👮 تم الرفض بواسطة', value: `<@${interaction.user.id}>` }
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

    // ==========================================
    // 📩 ثالثاً: استقبال بيانات الـ Modal وحفظها بالمنشن والـ ID
    // ==========================================
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('predict_modal_')) {
            const matchId = interaction.customId.split('_')[2];
            const winner = interaction.fields.getTextInputValue('predicted_winner').trim();
            const score = interaction.fields.getTextInputValue('predicted_score').trim();
            
            // جلب المسار بشكل ديناميكي لتفادي خطأ الحروف
            const predictionsDirModal = fs.readdirSync(__dirname).find(f => f.toLowerCase() === 'predictions');
            const db = require(path.join(__dirname, predictionsDirModal, 'database'));

            db.run(
                `INSERT INTO predictions (matchId, userId, winner, score) VALUES (?, ?, ?, ?)
                 ON CONFLICT(matchId, userId) DO UPDATE SET winner = excluded.winner, score = excluded.score`,
                [matchId, interaction.user.id, winner, score],
                (err) => {
                    if (err) {
                        console.error(err);
                        return interaction.reply({ content: '❌ حدث خطأ أثناء حفظ توقعك.', ephemeral: true });
                    }
                    
                    // الرد بالمنشن تلقائياً
                    return interaction.reply({
                        content: `✅ <@${interaction.user.id}>، تم حفظ توقعك بنجاح للمباراة **#${matchId}**!\n🎯 **توقعك الحركي:** الفائز: \`${winner}\` | النتيجة: \`${score}\``,
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
        await interaction.reply({
            content: 'صار خطأ.',
            ephemeral: true
        });
    }
});

// تشغيل خادم ويب وهمي لـ Render لاستقبال طلبات الـ Ping ومنع السكون
http.createServer((req, res) => {
    res.write("Bot is running 24/7");
    res.end();
}).listen(8080, () => {
    console.log("Web server is listening on port 8080");
});

client.login(process.env.TOKEN);