import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { decorate } from "./progression.js";
import { buildRoute, createGpx, loopQuality, missionDefinitions } from "./routing.js";

export function createApp({ db, strava, rootDir, appUrl }) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(rootDir, "public")));

  app.get("/api/missions/today", async (req, res) => {
    try {
      const routeDate = new Date().toISOString().slice(0, 10);
      const missions = [];
      for (const [missionType, definition] of Object.entries(missionDefinitions)) {
        let cached = db.prepare("SELECT * FROM mission_routes WHERE route_date=? AND mission_type=?").get(routeDate, missionType);
        let geojson = cached?.geojson ? JSON.parse(cached.geojson) : null;
        let quality = geojson ? loopQuality(geojson) : null;
        if (!geojson || !quality.flowing || req.query.regenerate === "1") {
          const generated = await buildRoute(definition);
          geojson = generated.geojson;
          quality = generated.quality;
          const properties = geojson.features?.[0]?.properties || {};
          db.prepare(`INSERT INTO mission_routes(route_date,mission_type,name,geojson,distance_miles,climbing_ft)
            VALUES(?,?,?,?,?,?) ON CONFLICT(route_date,mission_type) DO UPDATE SET
            geojson=excluded.geojson,distance_miles=excluded.distance_miles,
            climbing_ft=excluded.climbing_ft,generated_at=CURRENT_TIMESTAMP`)
            .run(routeDate, missionType, definition.name, JSON.stringify(geojson), Number(properties.trackLength || properties.distance || 0) / 1609.344, Number(properties.ascend || properties.ascent || 0) * 3.28084);
        }
        missions.push({ missionType, name: definition.name, geojson, loopQuality: quality, climbs: [] });
      }
      res.json({ routeDate, missions });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/missions/:missionType/gpx", async (req, res) => {
    try {
      const definition = missionDefinitions[req.params.missionType];
      if (!definition) return res.status(404).json({ error: "Mission not found" });
      const routeDate = new Date().toISOString().slice(0, 10);
      let cached = db.prepare("SELECT * FROM mission_routes WHERE route_date=? AND mission_type=?").get(routeDate, req.params.missionType);
      if (!cached) {
        const generated = await buildRoute(definition);
        cached = { geojson: JSON.stringify(generated.geojson) };
      }
      const filename = `${definition.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.gpx`;
      res.setHeader("Content-Type", "application/gpx+xml");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(createGpx(definition.name, JSON.parse(cached.geojson)));
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/state", (_req, res) => {
    const state = decorate(db.prepare("SELECT * FROM player_state WHERE id=1").get());
    const athlete = db.prepare("SELECT firstname,lastname,strava_athlete_id FROM athlete WHERE id=1").get();
    const rides = db.prepare("SELECT * FROM rides ORDER BY COALESCE(started_at,created_at) DESC LIMIT 30").all();
    const totals = db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN kom_rank=1 THEN 1 ELSE 0 END),0) koms,
      COALESCE(SUM(CASE WHEN pr_rank=1 THEN 1 ELSE 0 END),0) prs,
      COALESCE(SUM(CASE WHEN kom_rank BETWEEN 1 AND 10 THEN 1 ELSE 0 END),0) top10s,
      COUNT(DISTINCT segment_id) unique_segments FROM segment_efforts`).get();
    res.json({ athlete, state, rides, totals, lifetime: db.prepare("SELECT * FROM athlete_lifetime_stats WHERE id=1").get(), palmares: db.prepare("SELECT * FROM palmares_scan WHERE id=1").get() });
  });

  app.get("/api/rides/:id", (req, res) => {
    const ride = db.prepare("SELECT * FROM rides WHERE id=?").get(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    const segments = ride.external_id ? db.prepare("SELECT * FROM segment_efforts WHERE ride_external_id=? ORDER BY kom_rank IS NULL,kom_rank,pr_rank IS NULL,pr_rank").all(ride.external_id) : [];
    const verdict = ride.kom_count ? `${ride.kom_count} KOM landed. Absolute weapon behaviour.` : ride.pr_count ? `${ride.pr_count} personal record${ride.pr_count === 1 ? "" : "s"} show genuine progression.` : "Ride complete. Consistency banked.";
    res.json({ ride, segments, verdict });
  });

  app.post("/api/rides/:id/analyse", async (req, res) => {
    try {
      const ride = db.prepare("SELECT * FROM rides WHERE id=?").get(req.params.id);
      if (!ride?.external_id) return res.status(400).json({ error: "Ride is not linked to Strava" });
      const imported = await strava.importActivity(ride.external_id);
      res.json({ ok: true, ...imported.summary });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/strava/sync", async (_req, res) => {
    try {
      const activities = await strava.request("/athlete/activities?per_page=30&page=1");
      let imported = 0, refreshed = 0;
      for (const activity of activities) {
        if (!["Ride", "VirtualRide", "EBikeRide"].includes(activity.sport_type || activity.type)) continue;
        const result = await strava.importActivity(activity.id);
        result.result.duplicate ? refreshed += 1 : imported += 1;
      }
      res.json({ ok: true, imported, refreshed });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/strava/analyse-recent", async (_req, res) => {
    try {
      const rides = db.prepare("SELECT external_id FROM rides WHERE external_id IS NOT NULL ORDER BY started_at DESC LIMIT 20").all();
      for (const ride of rides) await strava.importActivity(ride.external_id);
      res.json({ ok: true, analysed: rides.length });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/strava/lifetime", async (_req, res) => {
    try {
      const athlete = db.prepare("SELECT strava_athlete_id FROM athlete WHERE id=1").get();
      const data = await strava.request(`/athletes/${athlete.strava_athlete_id}/stats`);
      const all = data.all_ride_totals || {};
      db.prepare("UPDATE athlete_lifetime_stats SET ride_count=?,distance_miles=?,moving_hours=?,elevation_ft=?,biggest_ride_miles=?,biggest_climb_ft=?,refreshed_at=CURRENT_TIMESTAMP WHERE id=1")
        .run(all.count || 0, Number(all.distance || 0) / 1609.344, Number(all.moving_time || 0) / 3600, Number(all.elevation_gain || 0) * 3.28084, Number(data.biggest_ride_distance || 0) / 1609.344, Number(data.biggest_climb_elevation_gain || 0) * 3.28084);
      res.json({ ok: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/palmares/scan", async (req, res) => {
    try {
      const scan = db.prepare("SELECT * FROM palmares_scan WHERE id=1").get();
      const batch = Math.min(10, Math.max(1, Number(req.body?.batch || 5)));
      const activities = await strava.request(`/athlete/activities?per_page=${batch}&page=${scan.next_page}`);
      let count = 0;
      for (const activity of activities) { await strava.importActivity(activity.id); count += 1; }
      const complete = activities.length < batch ? 1 : 0;
      db.prepare("UPDATE palmares_scan SET next_page=next_page+1,scanned_activities=scanned_activities+?,complete=?,updated_at=CURRENT_TIMESTAMP WHERE id=1").run(count, complete);
      res.json({ ok: true, ...db.prepare("SELECT * FROM palmares_scan WHERE id=1").get() });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/auth/strava", (_req, res) => {
    const state = crypto.randomBytes(18).toString("hex");
    const url = new URL("https://www.strava.com/oauth/authorize");
    Object.entries({ client_id: process.env.STRAVA_CLIENT_ID, redirect_uri: `${appUrl}/api/auth/strava/callback`, response_type: "code", approval_prompt: "auto", scope: "read,profile:read_all,activity:read_all", state }).forEach(([key, value]) => url.searchParams.set(key, value));
    res.redirect(url.toString());
  });

  app.get("/api/auth/strava/callback", async (req, res) => {
    try {
      const response = await fetch("https://www.strava.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID || "", client_secret: process.env.STRAVA_CLIENT_SECRET || "", code: String(req.query.code || ""), grant_type: "authorization_code" }) });
      const token = await response.json();
      db.prepare("UPDATE athlete SET strava_athlete_id=?,firstname=?,lastname=?,access_token=?,refresh_token=?,expires_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=1")
        .run(String(token.athlete?.id || ""), token.athlete?.firstname || "Hutchy", token.athlete?.lastname || "", token.access_token, token.refresh_token, token.expires_at);
      res.redirect("/");
    } catch { res.redirect("/?strava=error"); }
  });

  app.use((_req, res) => res.sendFile(path.join(rootDir, "public", "index.html")));
  return app;
}
