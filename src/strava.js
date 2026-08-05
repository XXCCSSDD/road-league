import { classify, score } from "./progression.js";

const miles = metres => Number(metres || 0) / 1609.344;
const feet = metres => Number(metres || 0) * 3.28084;
const point = value => Array.isArray(value) ? value : [null, null];

export function createStravaService(db) {
  async function validToken() {
    const athlete = db.prepare("SELECT * FROM athlete WHERE id=1").get();
    if (!athlete.refresh_token) throw new Error("Strava is not connected.");
    const now = Math.floor(Date.now() / 1000);
    if (athlete.access_token && athlete.expires_at > now + 60) return athlete.access_token;
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID || "",
        client_secret: process.env.STRAVA_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: athlete.refresh_token
      })
    });
    if (!response.ok) throw new Error(`Strava token refresh failed (${response.status})`);
    const token = await response.json();
    db.prepare("UPDATE athlete SET access_token=?,refresh_token=?,expires_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=1")
      .run(token.access_token, token.refresh_token, token.expires_at);
    return token.access_token;
  }
  async function request(endpoint) {
    const response = await fetch(`https://www.strava.com/api/v3${endpoint}`, { headers: { Authorization: `Bearer ${await validToken()}` } });
    if (!response.ok) throw new Error(`Strava request failed (${response.status})`);
    return response.json();
  }
  function mapActivity(activity) {
    const start = point(activity.start_latlng), end = point(activity.end_latlng);
    return {
      externalId: String(activity.id), name: activity.name || "Cycling",
      startedAt: activity.start_date_local || activity.start_date,
      distanceMiles: miles(activity.distance), movingMinutes: Number(activity.moving_time || 0) / 60,
      elapsedMinutes: Number(activity.elapsed_time || 0) / 60, climbingFt: feet(activity.total_elevation_gain),
      averageSpeedMph: Number(activity.average_speed || 0) * 2.236936,
      maxSpeedMph: Number(activity.max_speed || 0) * 2.236936,
      averageWatts: activity.average_watts ?? null, weightedAverageWatts: activity.weighted_average_watts ?? null,
      maxWatts: activity.max_watts ?? null, kilojoules: activity.kilojoules ?? null,
      averageHeartrate: activity.average_heartrate ?? null, maxHeartrate: activity.max_heartrate ?? null,
      averageCadence: activity.average_cadence ?? null, calories: activity.calories ?? null,
      sufferScore: activity.suffer_score ?? null, mapPolyline: activity.map?.summary_polyline || activity.map?.polyline || null,
      startLat: start[0], startLng: start[1], endLat: end[0], endLng: end[1]
    };
  }
  function summarise(activity) {
    const efforts = activity.segment_efforts || [];
    return {
      efforts: efforts.map(effort => ({
        effortId: String(effort.id), segmentId: String(effort.segment?.id || ""),
        name: effort.segment?.name || "Segment", elapsed: Number(effort.elapsed_time || 0),
        moving: Number(effort.moving_time || 0), distanceMiles: miles(effort.distance || effort.segment?.distance),
        grade: Number(effort.segment?.average_grade || 0), category: Number(effort.segment?.climb_category || 0),
        komRank: effort.kom_rank ?? null, prRank: effort.pr_rank ?? null,
        achievement: effort.achievements?.map(item => item.type).join(",") || null,
        startLat: effort.segment?.start_latlng?.[0] ?? null, startLng: effort.segment?.start_latlng?.[1] ?? null,
        endLat: effort.segment?.end_latlng?.[0] ?? null, endLng: effort.segment?.end_latlng?.[1] ?? null
      })),
      komCount: efforts.filter(effort => effort.kom_rank === 1).length,
      top10Count: efforts.filter(effort => effort.kom_rank && effort.kom_rank <= 10).length,
      prCount: efforts.filter(effort => effort.pr_rank === 1 || effort.achievements?.some(item => item.type === "pr")).length,
      segmentCount: efforts.length
    };
  }
  function saveSegments(externalId, summary) {
    const insert = db.prepare(`INSERT OR REPLACE INTO segment_efforts(
      strava_effort_id,ride_external_id,segment_id,segment_name,elapsed_seconds,moving_seconds,
      distance_miles,average_grade,climb_category,kom_rank,pr_rank,achievement_type,
      start_lat,start_lng,end_lat,end_lng) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    db.transaction(() => {
      for (const effort of summary.efforts) insert.run(effort.effortId,externalId,effort.segmentId,effort.name,effort.elapsed,effort.moving,effort.distanceMiles,effort.grade,effort.category,effort.komRank,effort.prRank,effort.achievement,effort.startLat,effort.startLng,effort.endLat,effort.endLng);
    })();
    db.prepare("UPDATE rides SET pr_count=?,kom_count=?,top10_count=?,segment_count=?,analysed_at=CURRENT_TIMESTAMP WHERE external_id=?")
      .run(summary.prCount, summary.komCount, summary.top10Count, summary.segmentCount, externalId);
  }
  function storeRide(ride, summary) {
    const existing = db.prepare("SELECT id FROM rides WHERE external_id=?").get(ride.externalId);
    const type = classify(ride.distanceMiles, ride.climbingFt);
    const xp = score({ ...ride, missionType: type }, summary);
    if (existing) {
      db.prepare(`UPDATE rides SET name=?,started_at=?,distance_miles=?,moving_minutes=?,elapsed_minutes=?,climbing_ft=?,average_speed_mph=?,max_speed_mph=?,average_watts=?,weighted_average_watts=?,max_watts=?,kilojoules=?,average_heartrate=?,max_heartrate=?,average_cadence=?,calories=?,suffer_score=?,map_polyline=?,start_lat=?,start_lng=?,end_lat=?,end_lng=? WHERE external_id=?`)
        .run(ride.name,ride.startedAt,ride.distanceMiles,ride.movingMinutes,ride.elapsedMinutes,ride.climbingFt,ride.averageSpeedMph,ride.maxSpeedMph,ride.averageWatts,ride.weightedAverageWatts,ride.maxWatts,ride.kilojoules,ride.averageHeartrate,ride.maxHeartrate,ride.averageCadence,ride.calories,ride.sufferScore,ride.mapPolyline,ride.startLat,ride.startLng,ride.endLat,ride.endLng,ride.externalId);
      saveSegments(ride.externalId, summary);
      return { duplicate: true };
    }
    db.prepare(`INSERT INTO rides(source,external_id,name,started_at,distance_miles,moving_minutes,elapsed_minutes,climbing_ft,average_speed_mph,max_speed_mph,average_watts,weighted_average_watts,max_watts,kilojoules,average_heartrate,max_heartrate,average_cadence,calories,suffer_score,map_polyline,start_lat,start_lng,end_lat,end_lng,mission_type,xp_awarded,pr_count,kom_count,top10_count,segment_count,analysed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
      .run("strava",ride.externalId,ride.name,ride.startedAt,ride.distanceMiles,ride.movingMinutes,ride.elapsedMinutes,ride.climbingFt,ride.averageSpeedMph,ride.maxSpeedMph,ride.averageWatts,ride.weightedAverageWatts,ride.maxWatts,ride.kilojoules,ride.averageHeartrate,ride.maxHeartrate,ride.averageCadence,ride.calories,ride.sufferScore,ride.mapPolyline,ride.startLat,ride.startLng,ride.endLat,ride.endLng,type,xp,summary.prCount,summary.komCount,summary.top10Count,summary.segmentCount);
    saveSegments(ride.externalId, summary);
    db.prepare("UPDATE player_state SET xp=xp+?,lifetime_miles=lifetime_miles+?,lifetime_climbing_ft=lifetime_climbing_ft+?,boss_rides=boss_rides+?,last_ride_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=1")
      .run(xp,ride.distanceMiles,ride.climbingFt,type === "boss" ? 1 : 0,ride.startedAt?.slice(0,10));
    return { duplicate: false, xp, type };
  }
  async function importActivity(id) {
    const detail = await request(`/activities/${id}?include_all_efforts=true`);
    const ride = mapActivity(detail), summary = summarise(detail);
    return { result: storeRide(ride, summary), ride, summary };
  }
  return { request, importActivity, mapActivity, summarise, storeRide };
}
