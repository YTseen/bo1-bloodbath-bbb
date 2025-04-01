
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TWITCH_USERNAME = process.env.TWITCH_USERNAME;
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID;

let wasLive = false;

const checkTwitchLive = async () => {
  try {
    const response = await fetch(`https://decapi.me/twitch/status/${TWITCH_USERNAME}`);
    const statusText = await response.text();

    const isLive = statusText.toLowerCase().includes('online');
    const titleMatch = statusText.toLowerCase().includes('bo1-bloodbath');

    if (isLive && titleMatch && !wasLive) {
      const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
      if (channel) {
        await channel.send(`🔴 BLOODBATH is LIVE on Twitch!\nJoin the arena: https://twitch.tv/${TWITCH_USERNAME}`);
        wasLive = true;
      }
    }

    if (!isLive) wasLive = false;
  } catch (err) {
    console.error("Twitch monitor error:", err.message);
  }
};

client.once('ready', () => {
  console.log(`🧠 Twitch monitor started for ${TWITCH_USERNAME}`);
  checkTwitchLive();
  setInterval(checkTwitchLive, 2 * 60 * 1000);
});

client.login(process.env.TOKEN);
