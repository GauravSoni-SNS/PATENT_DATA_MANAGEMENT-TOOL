/**
 * Starts embedded PostgreSQL (no Docker required) and runs migrations + seed.
 * Usage: npm run db:init
 */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '.pgdata');
const envPath = path.join(__dirname, '..', '.env');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/lexpatent?schema=public';

async function main() {
  console.log('Starting embedded PostgreSQL...');
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port: 5432,
    persistent: true,
  });

  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    await pg.initialise();
  }
  await pg.start();

  try {
    await pg.createDatabase('lexpatent');
  } catch {
    // database may already exist
  }

  // Update .env with connection string
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${DATABASE_URL}"`);
  } else {
    envContent += `\nDATABASE_URL="${DATABASE_URL}"\n`;
  }
  fs.writeFileSync(envPath, envContent);
  process.env.DATABASE_URL = DATABASE_URL;

  console.log('Running prisma db push...');
  execSync('npx prisma db push --accept-data-loss', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL },
  });

  console.log('Seeding database...');
  execSync('npx tsx prisma/seed.ts', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL },
  });

  console.log('\n✅ Database ready at', DATABASE_URL);
  console.log('Keep this process running while using the app, or run: npm run db:start');
  console.log('Login: s.jenkins@lexpatent-ip.com / password123');

  // Keep postgres running
  process.on('SIGINT', async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
