
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('match')
    .setDescription('Declare the winner of a Bo1 match and auto-progress the bracket.')
    .addStringOption(option =>
      option.setName('name')
        .setDescription("The winner's name")
        .setRequired(true)),

  async execute(interaction) {
    const winner = interaction.options.getString('name').trim();
    let data = { bracket: [], current_round: [], recaps: [] };

    try {
      data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    } catch (err) {
      return await interaction.reply({ content: "❌ No active bracket found.", ephemeral: true });
    }

    let updated = false;
    let loser = null;

    for (let i = 0; i < data.bracket.length; i++) {
      const match = data.bracket[i];
      if (Array.isArray(match) && match.includes(winner)) {
        if (match.length === 2) {
          loser = match.find(p => p !== winner);
          data.bracket[i] = winner;
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      return await interaction.reply({ content: `⚠️ Could not update bracket. Either ${winner} already advanced or no match found.`, ephemeral: true });
    }

    const remaining = data.bracket.filter(e => typeof e === 'string');
    const bracketComplete = remaining.length === 1;

    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));

    const resultsChannel = interaction.guild.channels.cache.get(process.env.RESULTS_CHANNEL_ID);
    if (resultsChannel) {
      await resultsChannel.send(`✅ ${winner} has won their match and advances.`);
    }

    // 🧠 Update history
    const history = JSON.parse(fs.readFileSync('history.json', 'utf8'));
    history.player_stats = history.player_stats || {};
    history.season_stats = history.season_stats || {};

    if (!history.player_stats[winner]) history.player_stats[winner] = { wins: 0, map_wins: {} };
    if (!history.season_stats[winner]) history.season_stats[winner] = { wins: 0, losses: 0 };
    if (loser) {
      if (!history.season_stats[loser]) history.season_stats[loser] = { wins: 0, losses: 0 };
      history.season_stats[loser].losses += 1;
    }

    history.player_stats[winner].wins += 1;
    history.season_stats[winner].wins += 1;

    const mapData = JSON.parse(fs.readFileSync('map_pool.json', 'utf8'));
    const currentMap = mapData.used_maps.length > 0 ? mapData.used_maps[mapData.used_maps.length - 1].name : "Unknown";
    if (!history.player_stats[winner].map_wins[currentMap]) {
      history.player_stats[winner].map_wins[currentMap] = 0;
    }
    history.player_stats[winner].map_wins[currentMap] += 1;
    history.last_map_played = currentMap;
    history.tournament_winners = history.tournament_winners || [];
    history.tournament_winners.push(winner);
    fs.writeFileSync('history.json', JSON.stringify(history, null, 2));

    // 🔁 Assign Blood Rank Role
    const assignRole = async (player) => {
      const stats = history.season_stats[player];
      const netWins = stats.wins - stats.losses;
      let newRole = "Bloodless Casual";
      if (netWins >= 6) newRole = "Arena Overlord";
      else if (netWins >= 4) newRole = "Quad Hunter";
      else if (netWins >= 2) newRole = "Rip & Tear";
      else if (netWins === 1) newRole = "First Frag";
      else if (netWins === 0) newRole = "Bloodless Casual";
      else if (netWins >= -3) newRole = "Milk Drinker";
      else if (netWins >= -6) newRole = "Peace Negotiator";
      else newRole = "Pacifist";

      try {
        const member = await interaction.guild.members.fetch({ user: player, force: true });
        const roleToAdd = interaction.guild.roles.cache.find(role => role.name === newRole);
        const allRanks = [
          "Arena Overlord", "Quad Hunter", "Rip & Tear", "First Frag",
          "Bloodless Casual", "Milk Drinker", "Peace Negotiator", "Pacifist"
        ];
        const rolesToRemove = member.roles.cache.filter(role => allRanks.includes(role.name));
        await member.roles.remove(rolesToRemove);
        if (roleToAdd) await member.roles.add(roleToAdd);
      } catch (err) {
        console.log("Role assignment error:", err.message);
      }
    };

    await assignRole(winner);
    if (loser) await assignRole(loser);

    // 🏁 Final winner check
    if (bracketComplete) {
      const finalWinner = remaining[0];
      const messages = JSON.parse(fs.readFileSync('messages.json', 'utf8'));
      const winnerLines = messages.winner;
      const selected = winnerLines[Math.floor(Math.random() * winnerLines.length)].replace("{winner}", finalWinner);
      const followup = `Winner recorded: ${finalWinner} – ${currentMap} – ${history.player_stats[finalWinner].wins} total BLOODBATH wins.`;

      if (resultsChannel) {
        await resultsChannel.send(`🏆 ${selected}`);
        await resultsChannel.send(followup);
      }

      // 🧠 Season summary post
      const usedMaps = mapData.used_maps || [];
      const currentSeasonSize = usedMaps.length;
      const currentSeason = history.tournament_winners.slice(-currentSeasonSize);
      const seasonStats = {};

      for (const winner of currentSeason) {
        if (!seasonStats[winner]) seasonStats[winner] = 0;
        seasonStats[winner]++;
      }

      if (Object.keys(seasonStats).length > 0 && resultsChannel) {
        const summaryLines = [
          '🩸 **Thank you, you bloody legends, for another brutal BLOODBATH season!**',
          '📜 **Season Summary:**'
        ];
        let rankOrder = Object.entries(seasonStats)
          .sort(([, a], [, b]) => b - a)
          .map(([player, wins], i) => `${i + 1}. ${player} – ${wins} map win${wins !== 1 ? 's' : ''} – ${getBloodRank(history.season_stats[player])}`);
        summaryLines.push(...rankOrder);
        await resultsChannel.send(summaryLines.join("\n"));
      }

      // 🕘 Post new registration after 20h
      const registrationLines = messages.registration;
      const nextMessage = registrationLines[Math.floor(Math.random() * registrationLines.length)];
      const delay = 1000 * 60 * 60 * 20;

      setTimeout(() => {
        if (mapData.available_maps.length === 0) {
          mapData.available_maps = mapData.used_maps;
          mapData.used_maps = [];
        }

        const nextMap = mapData.available_maps.splice(Math.floor(Math.random() * mapData.available_maps.length), 1)[0];
        mapData.used_maps.push(nextMap);
        fs.writeFileSync('map_pool.json', JSON.stringify(mapData, null, 2));

        const messageText = `🗺️ **Next Map: ${nextMap.name}**
${nextMap.description}

${nextMessage}`;

        resultsChannel.send(messageText).then(msg => {
          fs.writeFileSync('data.json', JSON.stringify({ ...data, bracket: [], messageId: msg.id }, null, 2));
        });
      }, delay);
    }

    await interaction.reply({ content: `Bracket updated: ${winner} advanced.`, ephemeral: true });
  }
};

function getBloodRank({ wins = 0, losses = 0 }) {
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
