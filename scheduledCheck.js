
require('dotenv').config();
const fs = require('fs');
const cron = require('node-cron');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
});

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

client.once('ready', () => {
  console.log(`🕘 BloodBot scheduler active for Friday 10PM SAST...`);

  cron.schedule('0 20 * * 5', async () => {
    console.log("📅 Friday 10PM SAST triggered. Running bracket flow...");

    try {
      const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
      const messageId = data.messageId;

      const channel = await client.channels.fetch(process.env.ANNOUNCEMENT_CHANNEL_ID);
      if (!channel) return console.error("❌ Announcement channel not found.");

      const message = await channel.messages.fetch(messageId);
      const reaction = message.reactions.cache.find(r => r.emoji.name === process.env.ANNOUNCEMENT_EMOJI || r.emoji.name === '🍻');

      if (!reaction) return console.log("❌ No matching 🍻 reaction found.");

      const users = await reaction.users.fetch();
      const participants = users.filter(u => !u.bot).map(u => u.username);

      console.log("✅ Participants:", participants);

      // Load winner history
      let history = {};
      try {
        history = JSON.parse(fs.readFileSync('history.json', 'utf8'));
      } catch {
        history = { tournament_winners: [], player_stats: {} };
      }

      const pastWinners = history.tournament_winners || [];
      const highSeed = [];
      const lowSeed = [];

      participants.forEach(player => {
        if (pastWinners.includes(player)) {
          highSeed.push(player);
        } else {
          lowSeed.push(player);
        }
      });

      shuffle(highSeed);
      shuffle(lowSeed);
      const allPlayers = [...highSeed, ...lowSeed];

      if (allPlayers.length % 2 !== 0) {
        allPlayers.push("BYE");
      }

      const matchups = [];
      for (let i = 0; i < allPlayers.length; i += 2) {
        matchups.push([allPlayers[i], allPlayers[i + 1]]);
      }

      let bracketText = "🏆 **BO1 BLOODBATH BRACKET**\n\n";
      matchups.forEach((pair, i) => {
        bracketText += `**Match ${i + 1}:** ${pair[0]} vs ${pair[1]}\n`;
      });

      await channel.send(bracketText);
      console.log("📤 Bracket posted in announcements.");

    } catch (err) {
      console.error("💥 Error in scheduled bracket post:", err);
    }
  });
});

client.login(process.env.DISCORD_TOKEN);
