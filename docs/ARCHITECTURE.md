# Road League architecture

## Current shape

- `src/server.js` — process entrypoint
- `src/app.js` — HTTP application and API composition
- `src/config.js` — environment configuration
- `src/db/` — SQLite connection and schema
- `src/services/` — domain logic such as progression, Strava, routing and scoring
- `public/` — mobile-first web client

## Principles

1. Migrations must be additive and safe against an existing local database.
2. Secrets and OAuth tokens never enter Git.
3. Mission maps and GPX files must share the same exact road geometry.
4. Strava data is cached and rate-limit aware.
5. The mobile route-selection flow is the primary product surface.
6. New work should land through focused feature branches and pull requests.

## Next modules

- Strava OAuth and activity import service
- Lifetime athlete statistics service
- Route generation and loop-quality service
- Mission GPX/Wahoo share service
- Segment target engine
- Heatmap and exploration service
