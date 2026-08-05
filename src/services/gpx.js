export function createGpx({ name, coordinates = [], waypoints = [] }) {
  const points = coordinates.map(([lat, lon]) => `    <trkpt lat="${lat}" lon="${lon}" />`).join('\n');
  const waypointXml = waypoints.map(point => `  <wpt lat="${point.lat}" lon="${point.lon}"><name>${point.name}</name></wpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Road League" xmlns="http://www.topografix.com/GPX/1/1">\n${waypointXml}\n  <trk><name>${name}</name><trkseg>\n${points}\n  </trkseg></trk>\n</gpx>`;
}
