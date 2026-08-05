export function scoreLoopQuality({ overlapPercent = 0, uTurns = 0 }) {
  const overlapPenalty = Math.min(60, overlapPercent * 4);
  const uTurnPenalty = Math.min(30, uTurns * 10);
  return Math.max(0, Math.round(100 - overlapPenalty - uTurnPenalty));
}
