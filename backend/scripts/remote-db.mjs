/**
 * Pushes the schema and seeds a REMOTE database.
 *
 * Guards the mistakes that are easy to make from a terminal:
 *  - refuses to run without an explicit DATABASE_URL in the environment
 *  - refuses to touch localhost, so a mistyped variable cannot silently wipe
 *    the local development database
 *  - rewrites a Neon pooled host to the direct one, because prisma db push
 *    issues DDL that is unreliable through a transaction pooler
 *  - drops channel_binding, which Prisma's driver does not accept
 *  - always prints the target host before doing anything
 *
 * Usage (from backend/):
 *   node scripts/remote-db.mjs           push schema, then seed
 *   node scripts/remote-db.mjs --no-seed push schema only
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = process.env.DATABASE_URL;

function fail(message) {
  console.error('\n  ' + message + '\n');
  process.exit(1);
}

if (!raw) {
  fail(
    'DATABASE_URL is not set in this shell.\n\n' +
      '  PowerShell:  $env:DATABASE_URL="postgresql://..."\n' +
      '  cmd.exe:     set "DATABASE_URL=postgresql://..."\n\n' +
      '  It is deliberately not read from .env, so this can never target your local database.'
  );
}

let url;
try {
  url = new URL(raw);
} catch {
  fail('DATABASE_URL is not a valid URL.');
}

if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
  fail(
    'DATABASE_URL points at ' + url.hostname + '.\n\n' +
      '  This script only targets remote databases. For local work use:\n' +
      '    npm run db:push && npm run db:seed'
  );
}

const originalHost = url.hostname;
if (url.hostname.includes('-pooler.')) {
  url.hostname = url.hostname.replace('-pooler.', '.');
}
url.searchParams.delete('channel_binding');
if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'require');

const target = url.toString();

console.log('');
console.log('  target database : ' + url.pathname.replace('/', '') + ' at ' + url.hostname);
if (originalHost !== url.hostname) {
  console.log('  note            : switched from the pooled host to the direct one');
}
console.log('');

const env = { ...process.env, DATABASE_URL: target };

const push = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prisma', 'db', 'push', '--skip-generate'],
  { cwd: backendDir, env, stdio: 'inherit' }
);
if (push.status !== 0) fail('Schema push failed; the database was not seeded.');

if (process.argv.includes('--no-seed')) {
  console.log('\n  Schema pushed. Seeding skipped (--no-seed).\n');
  process.exit(0);
}

console.log('\n  Seeding (this deletes existing rows first)...\n');

const seed = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsx', 'prisma/seed.ts'],
  { cwd: backendDir, env, stdio: 'inherit' }
);
if (seed.status !== 0) fail('Seeding failed.');

console.log('\n  Done. Log in with s.jenkins@lexpatent-ip.com / password123\n');
