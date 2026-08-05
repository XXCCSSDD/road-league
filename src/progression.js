export function titleFor(level) {
  if (level >= 100) return { title: "Grand Tour Legend", verified: true, tier: "mythic", glow: "mythic" };
  if (level >= 75) return { title: "Road Marshal", verified: true, tier: "marshal", glow: "marshal" };
  if (level >= 50) return { title: "Northern Journeyman", verified: true, tier: "legend", glow: "legend" };
  if (level >= 40) return { title: "Elite Road Captain", verified: true, tier: "elite", glow: "elite" };
  if (level >= 30) return { title: "Endurance Machine", verified: true, tier: "endurance", glow: "endurance" };
  if (level >= 20) return { title: "KOM Hunter", verified: true, tier: "kom", glow: "kom" };
  if (level >= 10) return { title: "Breakaway Specialist", verified: false, tier: "breakaway", glow: "breakaway" };
  if (level >= 5) return { title: "Road Warrior", verified: false, tier: "warrior", glow: null };
  return { title: "Club Rider", verified: false, tier: "club", glow: null };
}
export function decorate(state) {
  const level = Math.min(100, Math.max(1, Math.floor(Number(state.xp || 0) / 500) + 1));
  return { ...state, level, ...titleFor(level) };
}
export function classify(distance, elevation) {
  if (distance >= 100) return "boss";
  if (distance >= 55 && elevation >= 2500) return "long";
  if (distance >= 20) return "short";
  return "free";
}
export function score(ride, summary = {}) {
  const rules = { short: { base: 100, target: 20.5 }, long: { base: 250, target: 18.5 }, boss: { base: 500, target: 18 } };
  const type = ride.missionType || classify(ride.distanceMiles, ride.climbingFt);
  const rule = rules[type];
  let xp = rule ? rule.base : 25;
  if (rule && ride.averageSpeedMph > rule.target) xp += 25;
  if (ride.climbingFt >= 5000) xp += 20;
  if (type === "boss") xp += 200;
  return xp + (summary.prCount || 0) * 10 + (summary.komCount || 0) * 100 + Math.min(summary.top10Count || 0, 5) * 20;
}
