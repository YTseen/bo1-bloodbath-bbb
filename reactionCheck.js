
require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
});

client.once('ready', async () => {
  console.log(`🕵️ BloodBot is checking saved message for 🍻 reactions...`);

  try {
    // Load the saved message ID
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    const messageId = data.messageId;

    const channel = await client.channels.fetch(process.env.ANNOUNCEMENT_CHANNEL_ID);
    if (!channel) return console.error("❌ Announcement channel not found.");

    const message = await channel.messages.fetch(messageId);
    const reaction = message.reactions.cache.find(r => r.emoji.name === process.env.ANNOUNCEMENT_EMOJI || r.emoji.name === '🍻');

    if (!reaction) return console.log("❌ No matching reaction found on the message.");

    const users = await reaction.users.fetch();
    const participants = users.filter(u => !u.bot).map(u => u.username);

    console.log(`✅ Participants who reacted with 🍻:`, participants);
  } catch (err) {
    console.error("💥 Error checking reactions:", err);
  }

  process.exit(); // Stop the script after one check
});

client.login(process.env.DISCORD_TOKEN);
