const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const app = express();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers 
    ] 
});

let isApplyOpen = true; 

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); 
app.use(session({ 
    secret: 'world_star_secure_key', 
    resave: false, 
    saveUninitialized: false 
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/#apply');
});
app.get('/api/user', (req, res) => {
    // نرسل حالة التقديم (isApplyOpen) مع بيانات المستخدم
    res.json({ 
        user: req.user || null, 
        isOpen: isApplyOpen 
    });
});
// استقبال التقديم بجميع الحقول الـ 7
app.post('/api/submit', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'سجل دخولك أولاً' });
    if (!isApplyOpen) return res.status(403).json({ error: 'التقديم مغلق حالياً' });

    const data = req.body;
    const channel = client.channels.cache.get(ADMIN_CHANNEL_ID);

    if (channel) {
// ... داخل دالة التقديم ...
const embed = new EmbedBuilder()
    .setTitle('🎥 تقديم صانع محتوى جديد')
    .setColor('#1DA1F2')
    .setAuthor({ name: `المقدم: ${req.user.username}` })
    .addFields(
        { name: '👤 الاسم الكامل:', value: data.fullName || 'N/A', inline: true },
        { name: '🎂 العمر:', value: data.age || 'N/A', inline: true },
        { name: '🔗 الروابط:', value: data.links || 'N/A' },
        { name: '📊 الإحصائيات:', value: data.stats || 'N/A' },
        { name: '✍️ عن المحتوى:', value: data.about || 'N/A' },
        { name: '🛠️ الاحتياجات:', value: data.needs || 'N/A' },
        { name: '🎯 الأهداف:', value: data.goals || 'N/A' },
        // السؤال الثامن (الخيار المختار)
        { name: '🎬 نوع المحتوى:', value: `**${data.contentType}**` || 'N/A' }, 
        { name: '🆔 المنشن:', value: `<@${req.user.id}>` }
    )
    .setTimestamp();
// ... باقي الكود ...
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`accept_${req.user.id}`).setLabel('قبول ✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`reject_${req.user.id}`).setLabel('رفض ❌').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [buttons] });
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'قناة الإدارة غير موجودة' });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (!interaction.member.permissions.has('Administrator')) return interaction.reply({ content: 'للإدارة فقط', ephemeral: true });

    const [action, userId] = interaction.customId.split('_');
    const user = await client.users.fetch(userId).catch(() => null);

    if (action === 'accept') {
        if (user) user.send('تهانينا! 🎉 تم قبول طلبك لتكون استريمر في **وورلد ستار**. سيتم التواصل معك قريباً لتسليم الرتبة.**World Star**.').catch(() => null);
        await interaction.update({ content: `✅ تم قبول اللاعب <@${userId}> بواسطة <@${interaction.user.id}>`, embeds: [], components: [] });
    } else if (action === 'reject') {
        if (user) user.send('❌ نعتذر منك، تم رفض طلبك للتقديم حالياً. حظاً موفقاً في المرة القادمة.').catch(() => null);
        await interaction.update({ content: `❌ تم رفض اللاعب <@${userId}> بواسطة <@${interaction.user.id}>`, embeds: [], components: [] });
    }
});
// --- أوامر التحكم عن طريق الديسكورد ---
client.on('messageCreate', message => {
    // أمر إغلاق التقديم
    if (message.content === '!close') {
        if (!message.member.permissions.has('Administrator')) return;
        isApplyOpen = false;
        message.reply("🔒 تم إغلاق التقديم في الموقع بنجاح.");
    }

    // أمر فتح التقديم
    if (message.content === '!open') {
        if (!message.member.permissions.has('Administrator')) return;
        isApplyOpen = true;
        message.reply("🔓 تم فتح التقديم في الموقع بنجاح.");
    }
    
    // أمر التبديل (اختياري)
    if (message.content === '!apply toggle') {
        if (!message.member.permissions.has('Administrator')) return;
        isApplyOpen = !isApplyOpen;
        message.reply(`حالة التقديم الآن: **${isApplyOpen ? 'مفتوح ✅' : 'مغلق ❌'}**`);
    }
});
client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});





