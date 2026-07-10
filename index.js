const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 🚨 الاتصال بقاعدة بيانات التوقعات والمباريات
const dbPath = path.join(__dirname, 'predictions_final.sqlite');
const db = new sqlite3.Database(dbPath);

// 🚨 الاتصال بقاعدة بيانات النقاط الأساسية للسيرفر (points.db) لتوزيع مكافآت التوقعات عليها
const dbPointsPath = path.join(__dirname, 'points.db');
const dbPoints = new sqlite3.Database(dbPointsPath);

// 🛠️ إنشاء الجداول والتأكد من تهيئتها بالشكل الموحد الصحيح
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

    // 2. جدول التوقعات لضمان سرية وحفظ مشاركات الأعضاء
    db.run(`CREATE TABLE IF NOT EXISTS predictions (
        matchId TEXT,
        userId TEXT,
        winner TEXT,
        score TEXT,
        PRIMARY KEY (matchId, userId)
    )`);

    // 3. 🚨 جدول نقاط وإحصائيات المسابقة الموحد
    db.run(`CREATE TABLE IF NOT EXISTS tournament_points (
        userId TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0,
        exactMatches INTEGER DEFAULT 0,
        winnerOnlyMatches INTEGER DEFAULT 0,
        wrongMatches INTEGER DEFAULT 0
    )`);
    
    console.log('✅ قاعدة بيانات مسابقة التوقعات بجميع جداولها جاهزة للعمل بنسبة 100%!');
});

// التأكد من وجود جدول النقاط القديم في قاعدة بيانات السيرفر الأساسية
dbPoints.serialize(() => {
    dbPoints.run(`CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        points INTEGER DEFAULT 0
    )`);
    console.log('✅ تم ربط والتحقق من قاعدة بيانات النقاط الأساسية (points.db)!');
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

                // التحقق من حالة المباراة في الداتابيز
                if (match.status !== 'open') {
                    return interaction.reply({ content: '⏰ نأسف، تم إغلاق التوقعات لهذه المباراة نهائياً وعبر الإدارة.', ephemeral: true });
                }

                // فحص وقت الإغلاق التلقائي عند الضغط على الزر
                const closeTimestamp = Date.parse(match.matchTime);
                if (!isNaN(closeTimestamp) && Date.now() > closeTimestamp) {
                    db.run(`UPDATE matches SET status = 'closed' WHERE matchId = ?`, [matchId]);
                    return interaction.reply({ content: '⏰ تم إغلاق التوقعات لهذه المباراة تلقائياً لانتهاء الوقت المحدد وعبر بداية اللقاء الحقيقي.', ephemeral: true });
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

        // رتب الحماية والصلاحيات لأزرار الإدارة القديمة والترقيات
        const ALLOWED_USER_ID = '1229374664107884597'; 
        const ALLOWED_ROLE_ID = '1511200506557632623'; 

        const hasRole = interaction.member.roles.cache.has(ALLOWED_ROLE_ID);
        const isOwner = interaction.user.id === ALLOWED_USER_ID;

        if (!isOwner && !hasRole) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية للتحكم بالأزرار الإدارية.', ephemeral: true });
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

    // استقبال بيانات الـ Modal وحفظها أو تعديلها الذكي
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('predict_modal_')) {
            const matchId = interaction.customId.split('_')[2];
            const winner = interaction.fields.getTextInputValue('predicted_winner').trim();
            const score = interaction.fields.getTextInputValue('predicted_score').trim();

            // 1. فحص إضافي صارم للوقت وحالة المباراة عند إرسال المودال مباشرة لمنع التلاعب
            db.get(`SELECT * FROM matches WHERE matchId = ?`, [matchId], (matchErr, match) => {
                if (matchErr || !match) {
                    return interaction.reply({ content: '❌ لم يتم العثور على هذه المباراة في قاعدة البيانات.', ephemeral: true });
                }

                if (match.status !== 'open') {
                    return interaction.reply({ content: '⏰ نأسف، تم إغلاق التوقعات لهذه المباراة ولا يمكن استقبال توقعك.', ephemeral: true });
                }

                const closeTimestamp = Date.parse(match.matchTime);
                if (!isNaN(closeTimestamp) && Date.now() > closeTimestamp) {
                    db.run(`UPDATE matches SET status = 'closed' WHERE matchId = ?`, [matchId]);
                    // 🚨 التعديل الجوهري الحاسم هنا: إضافة الـ return يوقف الكود ويمنع حفظ التوقع نهائياً!
                    return interaction.reply({ content: '⏰ نأسف، انتهى الوقت المسموح به لهذه المباراة أثناء كتابتك للتوقع، تم رفض الإرسال وعملية التعديل.', ephemeral: true });
                }

                // 2. التحقق المسبق لمعرفة إذا كان العضو يملك توقعاً قديماً لتعديل الرسالة
                db.get(`SELECT * FROM predictions WHERE matchId = ? AND userId = ?`, [matchId, interaction.user.id], (predErr, existingPred) => {
                    const isUpdate = !!existingPred; // تصبح true إذا وجدنا سجل قديم للعضو

                    db.run(
                        `INSERT INTO predictions (matchId, userId, winner, score) VALUES (?, ?, ?, ?)
                         ON CONFLICT(matchId, userId) DO UPDATE SET winner = excluded.winner, score = excluded.score`,
                        [matchId, interaction.user.id, winner, score],
                        (err) => {
                            if (err) {
                                console.error("🚨 خطأ أثناء حفظ التوقع:", err);
                                return interaction.reply({ content: `❌ حدث خطأ أثناء حفظ توقعك بسبب:\n\`${err.message}\``, ephemeral: true });
                            }
                            
                            // تخصيص نص الرسالة حسب الحالة
                            if (isUpdate) {
                                return interaction.reply({
                                    content: `⚙️ <@${interaction.user.id}>، **تم تعديل توقعك بنجاح** للمباراة **#${matchId}**!\n🎯 **التوقع الجديد:** الفائز: \`${winner}\` | النتيجة: \`${score}\`\n*(ملاحظة: يمكنك تعديل توقعك مجدداً في أي وقت قبل بداية اللقاء)*`,
                                    ephemeral: true
                                });
                            } else {
                                return interaction.reply({
                                    content: `✅ <@${interaction.user.id}>، تم حفظ توقعك بنجاح للمباراة **#${matchId}**!\n🎯 **توقعك الحالي:** الفائز: \`${winner}\` | النتيجة: \`${score}\`\n*(ملاحظة: يمكنك تعديل توقعك بالضغط على الزر مجدداً حتى بداية اللقاء)*`,
                                    ephemeral: true
                                });
                            }
                        }
                    );
                });
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
        await interaction.reply({ content: 'صار خطأ أثناء تنفيذ الأمر.', ephemeral: true });
    }
});

// خادم الويب الأساسي لمنع استضافة Render من النوم والدخول في وضع الخمول
const http = require('http');
http.createServer((req, res) => {
    res.write("Bot is running 24/7");
    res.end();
}).listen(8080, () => {
    console.log("Web server is listening on port 8080");
});

client.login(process.env.TOKEN);