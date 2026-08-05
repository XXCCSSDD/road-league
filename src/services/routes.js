export function normalizeMission(mission) {
  return {
    ...mission,
    distanceMiles: Number(mission.distanceMiles || 0),
    climbingFt: Number(mission.climbingFt || 0)
  };
}
