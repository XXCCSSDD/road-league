export function analyseRide(ride) {
  return {
    distanceMiles: Number(ride.distanceMiles || 0),
    climbingFt: Number(ride.climbingFt || 0),
    averageSpeedMph: Number(ride.averageSpeedMph || 0)
  };
}
