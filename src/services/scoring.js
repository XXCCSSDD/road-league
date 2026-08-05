export const missionRules = Object.freeze({
  short: { baseXp: 100, targetMph: 20.5 },
  long: { baseXp: 250, targetMph: 18.5 },
  boss: { baseXp: 500, targetMph: 18 }
});

export function scoreRide({ missionType, averageSpeedMph = 0, climbingFt = 0 }) {
  const rule = missionRules[missionType];
  if (!rule) return 25;
  let xp = rule.baseXp;
  if (averageSpeedMph > rule.targetMph) xp += 25;
  if (climbingFt >= 5000) xp += 20;
  if (missionType === 'boss') xp += 200;
  return xp;
}
