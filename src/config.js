import dotenv from 'dotenv';

dotenv.config();

export const config = Object.freeze({
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  stravaClientId: process.env.STRAVA_CLIENT_ID || '',
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET || '',
  stravaVerifyToken: process.env.STRAVA_VERIFY_TOKEN || 'road-league-webhook-token'
});
