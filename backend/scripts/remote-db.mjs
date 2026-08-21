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
import { existsSync } from 'fs';
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

console.log('');
console.log('  target database : ' + url.pathname.replace('/', '') + ' at ' + url.hostname);
if (originalHost !== url.hostname) {
  console.log('  note            : switched from the pooled host to the direct one');
}
console.log('');

const env = { ...process.env, DATABASE_URL: url.toString() };

/**
 * Runs a CLI that lives in node_modules by calling its entry point with the
 * current node binary. Spawning npx.cmd fails with EINVAL on Node 22 for
 * Windows, and going through a shell would need the connection string quoted
 * correctly on two different shells.
 */
function runLocalCli(label, relativeEntry, args) {
  const entry = path.join(backendDir, relativeEntry);
  if (!existsSync(entry)) {
    fail(label + ' is not installed at ' + relativeEntry + '. Run npm install in backend/ first.');
  }

  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    fail('Could not start ' + label + ': ' + result.error.message);
  }
  if (result.status !== 0) {
    fail(label + ' exited with code ' + result.status + '. Nothing further was run.');
  }
}

runLocalCli('prisma db push', 'node_modules/prisma/build/index.js', ['db', 'push', '--skip-generate']);

if (process.argv.includes('--no-seed')) {
  console.log('\n  Schema pushed. Seeding skipped (--no-seed).\n');
  process.exit(0);
}

console.log('\n  Seeding (this deletes existing rows first)...\n');

runLocalCli('seed', 'node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts']);

console.log('\n  Done. Log in with s.jenkins@lexpatent-ip.com / password123\n');
