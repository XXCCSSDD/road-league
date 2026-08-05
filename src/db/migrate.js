import { db, migrate } from './index.js';

try {
  migrate();
  console.log('Road League database migration complete.');
} finally {
  db.close();
}
