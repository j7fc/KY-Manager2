const {
    EmbedBuilder
} = require('discord.js');
const {
    createPromotionButtons
} = require('./promotionButtons');

const PROMOTION_CHANNEL_ID = '1454118050163982436';

async function checkPromotion(member, points, department) {

    if (points >= 300) return;

    const guild = member.guild;
    const channel = guild.channels.cache.get(PROMOTION_CHANNEL_ID);

    if (!channel) return;

    if (department === 'admin') {

        if (
            points >= 20 &&
            member.roles.cache.has('1507354241264783421')
        ) {

            await member.roles.remove('1507354241264783421');
            await member.roles.add('1507353817858183338');

            const embed = new EmbedBuilder()
                .setTitle('🏆 ترقية تلقائية')
                .setDescription(`<@${member.id}> تمت ترقيته تلقائياً.`)
                .addFields(
                    {
                        name: '🏅 الرتبة الجديدة',
                        value: 'إداري'
                    },
                    {
                        name: '📊 النقاط الحالية',
                        value: points.toString()
                    },
                    {
                        name: '📝 سبب الترقية',
                        value: 'وصل إلى الحد المطلوب للترقية.'
                    }
                )
                .setColor('Green')
                .setTimestamp();

            channel.send({ embeds: [embed] });

            return;
        }

        if (
            points >= 50 &&
            member.roles.cache.has('1507353817858183338')
        ) {

            await member.roles.remove('1507353817858183338');
            await member.roles.add('1454325177272893714');

            const embed = new EmbedBuilder()
                .setTitle('🏆 ترقية تلقائية')
                .setDescription(`<@${member.id}> تمت ترقيته تلقائياً.`)
                .addFields(
                    { name: '🏅 الرتبة الجديدة', value: 'مشرف إداري' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 سبب الترقية', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Green')
                .setTimestamp();

            channel.send({ embeds: [embed] });

            return;
        }

        if (
            points >= 90 &&
            member.roles.cache.has('1454325177272893714')
        ) {

            await member.roles.remove('1454325177272893714');
            await member.roles.add('1454325312514035782');

            const embed = new EmbedBuilder()
                .setTitle('🏆 ترقية تلقائية')
                .setDescription(`<@${member.id}> تمت ترقيته تلقائياً.`)
                .addFields(
                    { name: '🏅 الرتبة الجديدة', value: 'أدمن' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 سبب الترقية', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Green')
                .setTimestamp();

            channel.send({ embeds: [embed] });

            return;
        }

        if (
            points >= 140 &&
            member.roles.cache.has('1454325312514035782')
        ) {

            await member.roles.remove('1454325312514035782');
            await member.roles.add('1410364972676153505');

            const embed = new EmbedBuilder()
                .setTitle('🏆 ترقية تلقائية')
                .setDescription(`<@${member.id}> تمت ترقيته تلقائياً.`)
                .addFields(
                    { name: '🏅 الرتبة الجديدة', value: 'سينيور أدمن' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 سبب الترقية', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Green')
                .setTimestamp();

            channel.send({ embeds: [embed] });

            return;
        }

        if (points >= 260) {

            const embed = new EmbedBuilder()
                .setTitle('📢 طلب اعتماد ترقية')
                .setDescription(`<@${member.id}>`)
                .addFields(
                    { name: '🏅 الرتبة المستحقة', value: 'نائب مسؤول الإدارة' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 السبب', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Orange')
                .setTimestamp();

            channel.send({
                embeds: [embed],
                components: [
                    createPromotionButtons(
    member.id,
    '1516991623362379826',
    '1507095924952928346'
)
                ]
            });
            return;
        }

        if (points >= 200) {

            const embed = new EmbedBuilder()
                .setTitle('📢 طلب اعتماد ترقية')
                .setDescription(`<@${member.id}>`)
                .addFields(
                    { name: '🏅 الرتبة المستحقة', value: 'إداري عام' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 السبب', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Orange')
                .setTimestamp();

            channel.send({
                embeds: [embed],
                components: [
                    createPromotionButtons(
    member.id,
    '1507095924952928346',
    '1410364972676153505'
)
                ]
            });
            return;
        }

    } else {

        if (
            points >= 25 &&
            member.roles.cache.has('1507354041250873535')
        ) {

            await member.roles.remove('1507354041250873535');
            await member.roles.add('1507353716200571011');

            const embed = new EmbedBuilder()
                .setTitle('🏆 ترقية تلقائية')
                .setDescription(`<@${member.id}> تمت ترقيته تلقائياً.`)
                .addFields(
                    { name: '🏅 الرتبة الجديدة', value: 'رقابي' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 سبب الترقية', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Green')
                .setTimestamp();

            channel.send({ embeds: [embed] });

            return;
        }

        if (
            points >= 60 &&
            member.roles.cache.has('1507353716200571011')
        ) {

            await member.roles.remove('1507353716200571011');
            await member.roles.add('1507384597929787485');

            const embed = new EmbedBuilder()
                .setTitle('🏆 ترقية تلقائية')
                .setDescription(`<@${member.id}> تمت ترقيته تلقائياً.`)
                .addFields(
                    { name: '🏅 الرتبة الجديدة', value: 'مشرف رقابي' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 سبب الترقية', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Green')
                .setTimestamp();

            channel.send({ embeds: [embed] });

            return;
        }

        if (points >= 150) {

            const embed = new EmbedBuilder()
                .setTitle('📢 طلب اعتماد ترقية')
                .setDescription(`<@${member.id}>`)
                .addFields(
                    { name: '🏅 الرتبة المستحقة', value: 'نائب الرقابة' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 السبب', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Orange')
                .setTimestamp();

            channel.send({
                embeds: [embed],
                components: [
                    createPromotionButtons(
    member.id,
    '1517187339804348617',
    '1507096025523949840'
)
                ]
            });
            return;
        }

        if (points >= 75) {

            const embed = new EmbedBuilder()
                .setTitle('📢 طلب اعتماد ترقية')
                .setDescription(`<@${member.id}>`)
                .addFields(
                    { name: '🏅 الرتبة المستحقة', value: 'رقابي عام' },
                    { name: '📊 النقاط الحالية', value: points.toString() },
                    { name: '📝 السبب', value: 'وصل إلى الحد المطلوب للترقية.' }
                )
                .setColor('Orange')
                .setTimestamp();

            channel.send({
                embeds: [embed],
                components: [
                    createPromotionButtons(
    member.id,
    '1507096025523949840',
    '1507384597929787485'
)
                ]
            });
            return;
        }

    }

}

module.exports = { checkPromotion };