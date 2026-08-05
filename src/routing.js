const start = [-1.321025, 54.521583];

export const missionDefinitions = {
  short: {
    name: "The Yarm Flyer",
    profile: "fastbike",
    variants: [
      [start,[-1.3557,54.5030],[-1.4145,54.5190],[-1.5260,54.4938],[-1.5557,54.4827],[-1.5120,54.4510],[-1.4380,54.4380],[-1.3720,54.4630],[-1.3330,54.4824],start],
      [start,[-1.3557,54.5030],[-1.4035,54.4590],[-1.4670,54.4568],[-1.5260,54.4938],[-1.4920,54.5350],[-1.4180,54.5480],[-1.3520,54.5410],start],
      [start,[-1.3330,54.4824],[-1.4035,54.4590],[-1.4670,54.4568],[-1.5260,54.4938],[-1.5100,54.5360],[-1.4300,54.5530],[-1.3557,54.5030],start]
    ]
  },
  long: {
    name: "Teesdale Grinder",
    profile: "fastbike",
    variants: [[start,[-1.5557,54.4827],[-1.6123,54.3948],[-1.7373,54.4039],[-1.9443,54.3880],[-1.8310,54.3102],[-1.5915,54.2887],[-1.4320,54.3390],[-1.3990,54.4375],start]]
  },
  boss: {
    name: "Buttertubs Beast",
    profile: "fastbike",
    variants: [[start,[-1.5557,54.4827],[-1.7373,54.4039],[-1.9443,54.3880],[-2.0740,54.3810],[-2.1420,54.3763],[-2.2070,54.3470],[-2.1965,54.3047],[-2.0790,54.3150],[-1.9830,54.2910],[-1.8310,54.3100],[-1.5915,54.2887],[-1.4320,54.3390],start]]
  }
};

const radians = value => value * Math.PI / 180;
function bearing(a, b) {
  const lat1 = radians(a[0]), lat2 = radians(b[0]), delta = radians(b[1] - a[1]);
  return (Math.atan2(Math.sin(delta) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta)) * 180 / Math.PI + 360) % 360;
}
const angleDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
export function geoPoints(geojson) {
  const feature = geojson?.features?.find(item => item.geometry?.type === "LineString") || geojson?.features?.[0];
  return feature?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];
}
export function loopQuality(geojson) {
  const points = geoPoints(geojson);
  if (points.length < 3) return { overlapPercent: 100, uTurns: 99, flowing: false };
  const trim = Math.max(4, Math.floor(points.length * .02));
  const edges = new Map(), cells = new Map();
  let repeated = 0, revisits = 0, uTurns = 0;
  for (let index = trim; index < points.length - trim - 1; index++) {
    const current = points[index], next = points[index + 1];
    const a = `${current[0].toFixed(5)},${current[1].toFixed(5)}`;
    const b = `${next[0].toFixed(5)},${next[1].toFixed(5)}`;
    const edge = [a, b].sort().join("|");
    if (edges.has(edge)) repeated += 1; else edges.set(edge, index);
    const cell = `${current[0].toFixed(4)},${current[1].toFixed(4)}`;
    const last = cells.get(cell);
    if (last != null && index - last > 18) revisits += 1;
    cells.set(cell, index);
    if (index > trim && angleDifference(bearing(points[index - 1], current), bearing(current, next)) > 135) uTurns += 1;
  }
  const usable = Math.max(1, points.length - trim * 2 - 1);
  const overlapPercent = Number(((repeated + revisits * .45) / usable * 100).toFixed(1));
  return { overlapPercent, uTurns, flowing: overlapPercent <= 2 && uTurns === 0 };
}
export async function buildRoute(definition) {
  const candidates = [];
  for (const variant of definition.variants) {
    const lonlats = variant.map(([lng, lat]) => `${lng},${lat}`).join("|");
    for (const alternative of [0, 1, 2]) {
      try {
        const url = new URL(process.env.BROUTER_URL || "https://brouter.de/brouter");
        url.searchParams.set("lonlats", lonlats);
        url.searchParams.set("profile", definition.profile);
        url.searchParams.set("alternativeidx", String(alternative));
        url.searchParams.set("format", "geojson");
        const response = await fetch(url, { headers: { "User-Agent": "Road-League/1.0" } });
        if (!response.ok) continue;
        const geojson = await response.json();
        candidates.push({ geojson, quality: loopQuality(geojson) });
      } catch {}
    }
  }
  if (!candidates.length) throw new Error("Route generation failed");
  candidates.sort((a, b) => (a.quality.uTurns * 1000 + a.quality.overlapPercent * 25) - (b.quality.uTurns * 1000 + b.quality.overlapPercent * 25));
  return candidates[0];
}
const escapeXml = value => String(value ?? "").replace(/[<>&"']/g, char => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[char]));
export function createGpx(name, geojson) {
  const points = geoPoints(geojson);
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Road League" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${escapeXml(name)}</name><trkseg>${points.map(([lat,lng]) => `<trkpt lat="${lat}" lon="${lng}"/>`).join("")}</trkseg></trk></gpx>`;
}
