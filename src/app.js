import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, migrate } from './db/index.js';
import { decoratePlayer } from './services/progression.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  migrate();
  const app = express();
  app.use(express.json());
  app.use(express.static(path.resolve(__dirname, '../public')));

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'road-league' }));

  app.get('/api/dashboard', (_req, res) => {
    const athlete = db.prepare('SELECT firstname, lastname, strava_athlete_id FROM athlete WHERE id = 1').get();
    const state = decoratePlayer(db.prepare('SELECT * FROM player_state WHERE id = 1').get());
    const rides = db.prepare(`
      SELECT id, name, started_at, distance_miles, moving_minutes, climbing_ft,
             average_speed_mph, average_power, kom_count, top10_count, pr_count
      FROM rides
      ORDER BY COALESCE(started_at, created_at) DESC
      LIMIT 12
    `).all();
    const missions = db.prepare('SELECT * FROM missions ORDER BY created_at DESC LIMIT 3').all();
    res.json({ athlete, state, rides, missions });
  });

  // Express 5 / path-to-regexp no longer accepts app.get('*', ...).
  // A final middleware without a path safely serves the SPA shell for all
  // non-API routes while preserving 404s returned by API handlers above.
  app.use((_req, res) => {
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
  });

  return app;
}
