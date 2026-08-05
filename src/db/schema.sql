CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS athlete (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  strava_athlete_id TEXT,
  firstname TEXT NOT NULL DEFAULT 'Hutchy',
  lastname TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  scope TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  lifetime_miles REAL NOT NULL DEFAULT 0,
  lifetime_climbing_ft REAL NOT NULL DEFAULT 0,
  boss_rides INTEGER NOT NULL DEFAULT 0,
  last_ride_date TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  started_at TEXT,
  distance_miles REAL NOT NULL DEFAULT 0,
  moving_minutes REAL NOT NULL DEFAULT 0,
  climbing_ft REAL NOT NULL DEFAULT 0,
  average_speed_mph REAL NOT NULL DEFAULT 0,
  average_power REAL,
  weighted_power REAL,
  max_power REAL,
  average_heartrate REAL,
  max_heartrate REAL,
  average_cadence REAL,
  max_speed_mph REAL,
  kilojoules REAL,
  calories REAL,
  polyline TEXT,
  mission_type TEXT NOT NULL DEFAULT 'free',
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  kom_count INTEGER NOT NULL DEFAULT 0,
  top10_count INTEGER NOT NULL DEFAULT 0,
  pr_count INTEGER NOT NULL DEFAULT 0,
  detailed_synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mission_type TEXT NOT NULL,
  geometry_json TEXT,
  gpx TEXT,
  distance_miles REAL,
  climbing_ft REAL,
  estimated_minutes REAL,
  overlap_percent REAL NOT NULL DEFAULT 0,
  wind_direction TEXT,
  wind_speed_mph REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  distance_m REAL,
  average_grade REAL,
  maximum_grade REAL,
  elevation_gain_m REAL,
  start_lat REAL,
  start_lng REAL,
  end_lat REAL,
  end_lng REAL,
  best_rank INTEGER,
  best_time_seconds INTEGER,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO athlete (id) VALUES (1);
INSERT OR IGNORE INTO player_state (id, xp, streak) VALUES (1, 0, 0);
