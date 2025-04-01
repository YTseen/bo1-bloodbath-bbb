
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const Parser = require('rss-parser');
const parser = new Parser();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let lastVideoId = null;
const KEYWORDS = ['bloodbath', 'bo1', 'quake', 'tournament'];

client.once('ready', async () => {
    console.log('📺 YouTube monitor active for BloodBot.');

    const feed = await parser.parseURL('https://www.youtube.com/feeds/videos.xml?channel_id=' + process.env.YOUTUBE_CHANNEL_ID);
    if (!feed || !feed.items || feed.items.length === 0) return;

    const latest = feed.items[0];
    if (latest.id === lastVideoId) return;

    const title = latest.title.toLowerCase();
    const description = latest.contentSnippet?.toLowerCase() || '';

    if (!KEYWORDS.some(keyword => title.includes(keyword) || description.includes(keyword))) {
        console.log('⏩ Skipped: No highlight keywords found.');
        return;
    }

    lastVideoId = latest.id;

    const highlightChannel = await client.channels.fetch(process.env.YOUTUBE_HIGHLIGHT_CHANNEL);
    if (!highlightChannel) return;

    // Optional stat placeholders if you manually add stats in the video title
    const statsPattern = /\[(.*?)\]/;
    const statMatch = latest.title.match(statsPattern);
    let statsText = '';
    if (statMatch) {
        const [kills, acc, weapon] = statMatch[1].split('|');
        statsText = `\n👑 MVP: YTseen\n📊 Match Stats: ${kills} – ${acc} Accuracy – ${weapon}`;
    }

    const messages = [
        '💽 NEW BLOODBATH HIGHLIGHTS – Awoken',
        '',
        '🔴 Clutch rails.\n💀 Brutal killstreaks.\n🔥 One player walked out alive.',
        statsText,
        '',
        `💥 Watch the carnage: ${latest.link}`
    ];

    await highlightChannel.send(messages.filter(Boolean).join('\n'));
});

client.login(process.env.TOKEN);
