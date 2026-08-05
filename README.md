# Road League

Road League is a mobile-first cycling mission planner and progression app built around daily wind-aware routes, Strava activity analysis, exact GPX generation, rider levels, targets, and Wahoo handoff.

## Local development

```bash
npm install
cp .env.example .env
npm run migrate
npm run dev
```

Open `http://localhost:3000`.

## Repository safety

The following stay local and are ignored by Git:

- `.env`
- Strava OAuth tokens
- `data/*.db`
- SQLite WAL files
- `node_modules`

## Structure

- `src/` — backend, database and domain services
- `public/` — mobile-first web client
- `docs/` — architecture and product decisions
- `data/` — local SQLite storage, excluded from Git

See `docs/ARCHITECTURE.md` for the development direction.
