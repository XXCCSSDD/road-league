import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabase } from "./src/db.js";
import { createStravaService } from "./src/strava.js";
import { createApp } from "./src/app.js";

dotenv.config();
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const appUrl = process.env.APP_URL || `http://localhost:${port}`;
const db = createDatabase(rootDir);
const strava = createStravaService(db);
const app = createApp({ db, strava, rootDir, appUrl });
app.listen(port, () => console.log(`Road League working MVP running at ${appUrl}`));
