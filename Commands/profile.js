
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

function getBloodRank(wins, losses) {
  const net = wins - losses;

  if (net >= 6) return "Arena Overlord 👑";
  if (net >= 4) return "Quad Hunter 🩸";
  if (net >= 2) return "Rip & Tear 🔪";
  if (net === 1) return "First Frag 🔫";
  if (net === 0) return "Bloodless Casual ☠️";
  if (net >= -3) return "Milk Drinker 🥛";
  if (net >= -6) return "Peace Negotiator ✌️";
  return "Pacifist 🕊️";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("View a player's BLOODBATH stats.")
    .addStringOption(option =>
      option.setName('name')
        .setDescription("The player's name")
        .setRequired(true)),

  async execute(interaction) {
    const player = interaction.options.getString('name').trim();
    const history = JSON.parse(fs.readFileSync('history.json', 'utf8'));

    const stats = history.player_stats[player];
    const seasonStats = (history.season_stats && history.season_stats[player]) || { wins: 0, losses: 0 };

    if (!stats) {
      return await interaction.reply({ content: `❌ No stats found for ${player}.`, ephemeral: true });
    }

    const lines = [];

    // 1. Season W/L and Rank
    lines.push(`📅 Season Record: ${seasonStats.wins}W / ${seasonStats.losses}L`);
    lines.push(`🏅 Blood Rank: ${getBloodRank(seasonStats.wins, seasonStats.losses)}`);

    // 2. Map Wins
    lines.push(`
🗺️ Map Wins:`);
    if (stats.map_wins && Object.keys(stats.map_wins).length > 0) {
      for (const [map, wins] of Object.entries(stats.map_wins)) {
        lines.push(`- ${map}: ${wins}`);
      }
    } else {
      lines.push("- None");
    }

    // 3. Total Wins
    lines.push(`
🧠 Total Wins: ${stats.wins}`);

    await interaction.reply({ content: lines.join('\n'), ephemeral: false });
  }
};
