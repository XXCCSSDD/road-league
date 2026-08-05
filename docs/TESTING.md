# Testing checklist

Before merging a feature:

1. `npm install`
2. `npm run migrate`
3. `npm run check`
4. `npm run dev`
5. Verify `/api/health`
6. Verify dashboard loads at mobile and desktop widths
7. Confirm `.env` and `data/*.db` are not tracked
8. Confirm Strava 429 responses do not trigger retry loops
