export class RoadLeagueError extends Error {
  constructor(message, code = 'ROAD_LEAGUE_ERROR') {
    super(message);
    this.name = 'RoadLeagueError';
    this.code = code;
  }
}
