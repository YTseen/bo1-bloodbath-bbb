
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bracket')
    .setDescription('View the current BLOODBATH bracket.'),

  async execute(interaction) {
    let data;

    try {
      data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    } catch (err) {
      return await interaction.reply({ content: '❌ Bracket data not found.', ephemeral: true });
    }

    const bracket = data.bracket || [];

    if (bracket.length === 0) {
      return await interaction.reply({ content: '📭 No bracket has been created yet.', ephemeral: false });
    }

    const lines = ['🩸 **BLOODBATH Bracket**'];

    let round = 1;
    let inRound = [];

    for (const entry of bracket) {
      if (Array.isArray(entry)) {
        inRound.push(`- ${entry[0]} vs ${entry[1]}`);
      } else if (typeof entry === 'string') {
        if (inRound.length > 0) {
          lines.push(`
[ Round ${round} ]`, ...inRound);
          inRound = [];
          round++;
        }
        lines.push(`✅ ${entry} advanced`);
      }
    }

    if (inRound.length > 0) {
      lines.push(`
[ Round ${round} ]`, ...inRound);
    }

    if (bracket.length === 1 && typeof bracket[0] === 'string') {
      lines.push(`
🏆 BLOODBATH Complete! Final Winner: ${bracket[0]}`);
    }

    await interaction.reply({ content: lines.join('\n'), ephemeral: false });
  }
};
