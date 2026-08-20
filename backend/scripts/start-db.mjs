/** Keep embedded PostgreSQL running for dev sessions */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

const alreadyInit = fs.existsSync(path.join(dataDir, 'PG_VERSION'));
if (!alreadyInit) {
  await pg.initialise();
}
await pg.start();
try { await pg.createDatabase('lexpatent'); } catch { /* exists */ }

console.log('Embedded PostgreSQL running on localhost:5432 (database: lexpatent)');
console.log('Press Ctrl+C to stop');

process.on('SIGINT', async () => { await pg.stop(); process.exit(0); });

// Keep alive
setInterval(() => {}, 60000);
