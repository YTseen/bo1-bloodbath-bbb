
      // 🔁 Update live rank role
      const member = await interaction.guild.members.fetch({ user: finalWinner, force: true }).catch(() => null);
      if (member) {
        const netWins = seasonStats.wins - seasonStats.losses;
        let newRole = "Bloodless Casual";

        if (netWins >= 6) newRole = "Arena Overlord";
        else if (netWins >= 4) newRole = "Quad Hunter";
        else if (netWins >= 2) newRole = "Rip & Tear";
        else if (netWins === 1) newRole = "First Frag";
        else if (netWins === 0) newRole = "Bloodless Casual";
        else if (netWins >= -3) newRole = "Milk Drinker";
        else if (netWins >= -6) newRole = "Peace Negotiator";
        else newRole = "Pacifist";

        const roleToAdd = interaction.guild.roles.cache.find(role => role.name === newRole);
        if (roleToAdd) {
          const allRanks = [
            "Arena Overlord", "Quad Hunter", "Rip & Tear", "First Frag",
            "Bloodless Casual", "Milk Drinker", "Peace Negotiator", "Pacifist"
          ];
          const rolesToRemove = member.roles.cache.filter(role => allRanks.includes(role.name));
          await member.roles.remove(rolesToRemove);
          await member.roles.add(roleToAdd);
        }
      }
