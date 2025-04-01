
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('winner')
    .setDescription('Show the winner of the most recent BLOODBATH event.'),

  async execute(interaction) {
    let history;
    let mapData;

    try {
      history = JSON.parse(fs.readFileSync('history.json', 'utf8'));
      mapData = JSON.parse(fs.readFileSync('map_pool.json', 'utf8'));
    } catch (err) {
      return await interaction.reply({ content: '⚠️ Unable to read winner data.', ephemeral: true });
    }

    const winners = history.tournament_winners || [];
    const latestWinner = winners[winners.length - 1];
    const lastMap = history.last_map_played || 'Unknown';
    const totalWins = history.player_stats?.[latestWinner]?.wins || 0;

    if (!latestWinner) {
      return await interaction.reply({ content: '❌ No BLOODBATH winner has been recorded yet.', ephemeral: true });
    }

    const message = `🏆 **Most Recent BLOODBATH Champion:** ${latestWinner}
🗺️ Map: ${lastMap}
🏅 Total Wins: ${totalWins}`;
    await interaction.reply({ content: message, ephemeral: false });
  }
};
