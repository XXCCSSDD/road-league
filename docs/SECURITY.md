# Security notes

- Never commit `.env`, OAuth tokens, refresh tokens or SQLite databases.
- Strava tokens should be encrypted at rest before multi-user deployment.
- OAuth state validation, CSRF protection and secure sessions are required before public testing.
- API rate-limit responses must be cached and surfaced without automatic retry loops.
- Webhook processing should move to a queue before production.
