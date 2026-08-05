const TITLES = [
  { level: 100, title: 'Grand Tour Legend', verified: true, glow: 5 },
  { level: 75, title: 'Road Marshal', verified: true, glow: 4 },
  { level: 50, title: 'Northern Journeyman', verified: true, glow: 4 },
  { level: 40, title: 'Elite Road Captain', verified: true, glow: 3 },
  { level: 30, title: 'Endurance Machine', verified: true, glow: 3 },
  { level: 20, title: 'KOM Hunter', verified: true, glow: 2 },
  { level: 10, title: 'Breakaway Specialist', verified: false, glow: 1 },
  { level: 5, title: 'Road Warrior', verified: false, glow: 0 },
  { level: 1, title: 'Club Rider', verified: false, glow: 0 }
];

export function decoratePlayer(state) {
  const level = Math.max(1, Math.floor(Number(state.xp || 0) / 500) + 1);
  const rank = TITLES.find(item => level >= item.level) || TITLES.at(-1);
  return { ...state, level, ...rank };
}
