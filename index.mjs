
import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import Parser from 'rss-parser';
import schedule from 'node-schedule';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup path handling
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load all commands dynamically
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);
    client.commands.set(command.data.name, command);
}

// Slash command handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ There was an error executing that command.', ephemeral: true });
    }
});

// -------------------- TWITCH MONITOR --------------------
let wasLive = false;
const checkTwitchLive = async () => {
  try {
    const response = await fetch(`https://decapi.me/twitch/status/${process.env.TWITCH_USERNAME}`);
    const statusText = await response.text();
    const isLive = statusText.toLowerCase().includes('online');
    const titleMatch = statusText.toLowerCase().includes('bo1-bloodbath');

    if (isLive && titleMatch && !wasLive) {
      const channel = await client.channels.fetch(process.env.ANNOUNCE_CHANNEL_ID);
      if (channel) {
        await channel.send(`🔴 BLOODBATH is LIVE on Twitch!\nJoin the arena: https://twitch.tv/${process.env.TWITCH_USERNAME}`);
        wasLive = true;
      }
    }
    if (!isLive) wasLive = false;
  } catch (err) {
    console.error("Twitch monitor error:", err.message);
  }
};

// -------------------- YOUTUBE MONITOR --------------------
const parser = new Parser();
let lastVideoId = null;
const YT_KEYWORDS = ['bloodbath', 'bo1', 'quake', 'tournament'];

async function checkYouTube() {
  try {
    const feed = await parser.parseURL('https://www.youtube.com/feeds/videos.xml?channel_id=' + process.env.YOUTUBE_CHANNEL_ID);
    if (!feed || !feed.items || feed.items.length === 0) return;
    const latest = feed.items[0];
    const title = latest.title.toLowerCase();
    const desc = latest.contentSnippet?.toLowerCase() || '';
    if (!YT_KEYWORDS.some(k => title.includes(k) || desc.includes(k))) return;
    if (latest.id === lastVideoId) return;

    lastVideoId = latest.id;
    const ch = await client.channels.fetch(process.env.HIGHLIGHT_CHANNEL_ID);
    if (!ch) return;

    const statMatch = latest.title.match(/\[(.*?)\]/);
    let statsText = '';
    if (statMatch) {
        const [kills, acc, weapon] = statMatch[1].split('|');
        statsText = `\n👑 MVP: YTseen\n📊 Match Stats: ${kills} – ${acc} Accuracy – ${weapon}`;
    }

    await ch.send([
      `🎥 NEW BLOODBATH HIGHLIGHTS – Awoken`,
      '',
      `🩸 Clutch rails.\n💀 Brutal killstreaks.\n🔥 One player walked out alive.`,
      statsText,
      '',
      `💥 Watch the carnage: ${latest.link}`
    ].filter(Boolean).join('\n'));
  } catch (e) {
    console.error('YouTube monitor error:', e.message);
  }
}

// -------------------- SCHEDULED BRACKET BUILDER --------------------
import { buildBracketFromReactions } from './utils/bracketBuilder.js';

schedule.scheduleJob('0 22 * * 5', () => {
  console.log('🕘 Running Friday 10PM bracket check...');
  buildBracketFromReactions(client);
});

// -------------------- BOT ONLINE --------------------
client.once('ready', () => {
  console.log(`🩸 BloodBot is online as ${client.user.tag}`);
  setInterval(checkTwitchLive, 2 * 60 * 1000);
  setInterval(checkYouTube, 3 * 60 * 1000);
});

client.login(process.env.TOKEN);
