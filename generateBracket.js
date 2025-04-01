
const fs = require('fs');

// Load participant list from a reaction check (simulated for now)
const participants = [
  'YTseen', 'Fragger', 'Z1k3', 'Sh0ckz', 'Reaper', 'SleepyTim', 'Pixel', 'DoomBot'
];

// Load optional past winners history
let history = {};
try {
  history = JSON.parse(fs.readFileSync('history.json', 'utf8'));
} catch (err) {
  console.log("⚠️ No history.json found. Proceeding with fresh bracket.");
  history = { tournament_winners: [], player_stats: {} };
}

// Fair shuffle: separate past winners from general pool
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

// Fisher-Yates shuffle for randomness
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

shuffle(highSeed);
shuffle(lowSeed);

const allPlayers = [...highSeed, ...lowSeed];

// Ensure even number of participants (add BYE if needed)
if (allPlayers.length % 2 !== 0) {
  allPlayers.push("BYE");
}

const matchups = [];
for (let i = 0; i < allPlayers.length; i += 2) {
  matchups.push([allPlayers[i], allPlayers[i + 1]]);
}

console.log("🏆 BO1 BLOODBATH BRACKET\n");
matchups.forEach((pair, i) => {
  console.log(`Match ${i + 1}: ${pair[0]} vs ${pair[1]}`);
});
