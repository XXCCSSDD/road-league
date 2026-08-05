import Database from "better-sqlite3";
import path from "node:path";

export function createDatabase(rootDir) {
  const db = new Database(path.join(rootDir, "data", "road-league.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS athlete(
      id INTEGER PRIMARY KEY CHECK(id=1), strava_athlete_id TEXT,
      firstname TEXT DEFAULT 'Hutchy', lastname TEXT, access_token TEXT,
      refresh_token TEXT, expires_at INTEGER, scope TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS player_state(
      id INTEGER PRIMARY KEY CHECK(id=1), xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0, lifetime_miles REAL DEFAULT 0,
      lifetime_climbing_ft REAL DEFAULT 0, boss_rides INTEGER DEFAULT 0,
      last_ride_date TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS rides(
      id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL,
      external_id TEXT UNIQUE, name TEXT NOT NULL, started_at TEXT,
      distance_miles REAL NOT NULL, moving_minutes REAL DEFAULT 0,
      elapsed_minutes REAL DEFAULT 0, climbing_ft REAL DEFAULT 0,
      average_speed_mph REAL DEFAULT 0, max_speed_mph REAL DEFAULT 0,
      average_watts REAL, weighted_average_watts REAL, max_watts REAL,
      kilojoules REAL, average_heartrate REAL, max_heartrate REAL,
      average_cadence REAL, calories REAL, suffer_score REAL,
      map_polyline TEXT, start_lat REAL, start_lng REAL,
      end_lat REAL, end_lng REAL, mission_type TEXT DEFAULT 'free',
      xp_awarded INTEGER DEFAULT 0, achievement_count INTEGER DEFAULT 0,
      pr_count INTEGER DEFAULT 0, kom_count INTEGER DEFAULT 0,
      top10_count INTEGER DEFAULT 0, segment_count INTEGER DEFAULT 0,
      analysed_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS segment_efforts(
      id INTEGER PRIMARY KEY AUTOINCREMENT, strava_effort_id TEXT UNIQUE,
      ride_external_id TEXT NOT NULL, segment_id TEXT, segment_name TEXT NOT NULL,
      elapsed_seconds INTEGER DEFAULT 0, moving_seconds INTEGER DEFAULT 0,
      distance_miles REAL DEFAULT 0, average_grade REAL DEFAULT 0,
      climb_category INTEGER DEFAULT 0, kom_rank INTEGER, pr_rank INTEGER,
      achievement_type TEXT, start_lat REAL, start_lng REAL,
      end_lat REAL, end_lng REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS athlete_lifetime_stats(
      id INTEGER PRIMARY KEY CHECK(id=1), ride_count INTEGER DEFAULT 0,
      distance_miles REAL DEFAULT 0, moving_hours REAL DEFAULT 0,
      elevation_ft REAL DEFAULT 0, biggest_ride_miles REAL DEFAULT 0,
      biggest_climb_ft REAL DEFAULT 0, refreshed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS palmares_scan(
      id INTEGER PRIMARY KEY CHECK(id=1), next_page INTEGER DEFAULT 1,
      scanned_activities INTEGER DEFAULT 0, complete INTEGER DEFAULT 0,
      last_error TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mission_routes(
      id INTEGER PRIMARY KEY AUTOINCREMENT, route_date TEXT NOT NULL,
      mission_type TEXT NOT NULL, name TEXT NOT NULL, geojson TEXT,
      distance_miles REAL, climbing_ft REAL,
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(route_date, mission_type)
    );
    INSERT OR IGNORE INTO athlete(id) VALUES(1);
    INSERT OR IGNORE INTO player_state(id,xp,streak) VALUES(1,3420,6);
    INSERT OR IGNORE INTO athlete_lifetime_stats(id) VALUES(1);
    INSERT OR IGNORE INTO palmares_scan(id) VALUES(1);
  `);

  const columns = table => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(x => x.name));
  const add = (table, name, type) => { if (!columns(table).has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`); };
  for (const [name,type] of Object.entries({lastname:"TEXT",strava_athlete_id:"TEXT",access_token:"TEXT",refresh_token:"TEXT",expires_at:"INTEGER",scope:"TEXT",updated_at:"TEXT"})) add("athlete",name,type);
  for (const [name,type] of Object.entries({lifetime_miles:"REAL DEFAULT 0",lifetime_climbing_ft:"REAL DEFAULT 0",boss_rides:"INTEGER DEFAULT 0",last_ride_date:"TEXT",updated_at:"TEXT"})) add("player_state",name,type);
  for (const [name,type] of Object.entries({elapsed_minutes:"REAL DEFAULT 0",max_speed_mph:"REAL DEFAULT 0",average_watts:"REAL",weighted_average_watts:"REAL",max_watts:"REAL",kilojoules:"REAL",average_heartrate:"REAL",max_heartrate:"REAL",average_cadence:"REAL",calories:"REAL",suffer_score:"REAL",map_polyline:"TEXT",start_lat:"REAL",start_lng:"REAL",end_lat:"REAL",end_lng:"REAL",mission_type:"TEXT DEFAULT 'free'",xp_awarded:"INTEGER DEFAULT 0",achievement_count:"INTEGER DEFAULT 0",pr_count:"INTEGER DEFAULT 0",kom_count:"INTEGER DEFAULT 0",top10_count:"INTEGER DEFAULT 0",segment_count:"INTEGER DEFAULT 0",analysed_at:"TEXT"})) add("rides",name,type);

  const athleteColumns = columns("athlete");
  if (athleteColumns.has("strava_id")) db.exec("UPDATE athlete SET strava_athlete_id=COALESCE(strava_athlete_id,strava_id)");
  const stateColumns = columns("player_state");
  if (stateColumns.has("miles")) db.exec("UPDATE player_state SET lifetime_miles=CASE WHEN COALESCE(lifetime_miles,0)=0 THEN COALESCE(miles,0) ELSE lifetime_miles END");
  if (stateColumns.has("climbing_ft")) db.exec("UPDATE player_state SET lifetime_climbing_ft=CASE WHEN COALESCE(lifetime_climbing_ft,0)=0 THEN COALESCE(climbing_ft,0) ELSE lifetime_climbing_ft END");
  const rideColumns = columns("rides");
  if (rideColumns.has("mission")) db.exec("UPDATE rides SET mission_type=CASE WHEN COALESCE(mission_type,'free')='free' THEN COALESCE(mission,'free') ELSE mission_type END");
  if (rideColumns.has("xp")) db.exec("UPDATE rides SET xp_awarded=CASE WHEN COALESCE(xp_awarded,0)=0 THEN COALESCE(xp,0) ELSE xp_awarded END");
  return db;
}
