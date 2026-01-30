require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ChannelType } = require('discord.js');
const Groq = require('groq-sdk');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message]
});

// إعداد Groq - الأسرع في العالم حالياً للبرمجة والدردشة
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// تخزين إعدادات الغرف
let config = {
    aiChannelId: null,
};

if (fs.existsSync('./config.json')) {
    config = JSON.parse(fs.readFileSync('./config.json'));
}

function saveConfig() {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
}

client.once('ready', () => {
    console.log(`🚀 Bot is online as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // أمر تحديد غرفة الذكاء الاصطناعي
    if (message.content.startsWith('!set-ai-channel')) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ تحتاج لصلاحيات مسؤول.');
        }
        config.aiChannelId = message.channel.id;
        saveConfig();
        return message.reply(`✅ تم تحديد هذه الغرفة للذكاء الاصطناعي!`);
    }

    // التعامل مع الرسائل في غرفة الذكاء الاصطناعي
    if (message.channel.id === config.aiChannelId) {
        try {
            // إنشاء ثريد (Thread) تلقائياً
            const thread = await message.startThread({
                name: `AI-Chat-${message.author.username}`,
                autoArchiveDuration: 60,
            });

            await handleAIChat(thread, message.content, message.author);
        } catch (error) {
            console.error(error);
        }
    }

    // التعامل مع الرسائل داخل الثريد الخاص بالبوت
    if (message.channel.isThread() && message.channel.ownerId === client.user.id) {
        await handleAIChat(message.channel, message.content, message.author);
    }
});

async function handleAIChat(channel, prompt, user) {
    await channel.sendTyping();

    try {
        // التحقق من طلب توليد صورة (مجاني تماماً عبر Pollinations)
        const imageTriggers = ['صورة:', 'تخيل:', 'image:', 'imagine:'];
        const trigger = imageTriggers.find(t => prompt.toLowerCase().startsWith(t));

        if (trigger) {
            const imagePrompt = prompt.slice(trigger.length).trim();
            const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&model=flux`;

            const embed = new EmbedBuilder()
                .setTitle('🎨 تم توليد الصورة (مجاناً)')
                .setDescription(`**الوصف:** ${imagePrompt}`)
                .setImage(imageUrl)
                .setColor('#FF00FF')
                .setFooter({ text: `بواسطة: ${user.username} | عبر Pollinations` });

            return await channel.send({ embeds: [embed] });
        }

        // الدردشة والبرمجة باستخدام Groq (Llama 3 70B)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "أنت مساعد ذكاء اصطناعي فائق الذكاء، خبير عالمي في البرمجة وتطوير البرمجيات. ردودك سريعة جداً ودقيقة. تتحدث العربية بطلاقة. دائماً استخدم كتل الأكواد (Markdown Code Blocks) عند كتابة البرمجة." 
                },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile", // موديل قوي جداً ومجاني حالياً عبر Groq
        });

        const reply = chatCompletion.choices[0].message.content;

        // تقسيم الرسالة إذا كانت طويلة
        if (reply.length > 2000) {
            const chunks = reply.match(/[\s\S]{1,1900}/g);
            for (const chunk of chunks) {
                await channel.send(chunk);
            }
        } else {
            await channel.send(reply);
        }

    } catch (error) {
        console.error('Error:', error);
        await channel.send('❌ حدث خطأ في الاتصال بالمزود. تأكد من إعدادات API Key.');
    }
}

client.login(process.env.DISCORD_TOKEN);
