// scripts/db-push-if-env.cjs
const { spawnSync } = require('node:child_process');

// Skip on Vercel builds or when explicitly disabled
const isVercel = process.env.VERCEL === '1';
const skip = isVercel || process.env.SKIP_DB_PUSH === '1';

if (skip) {
  console.log('Skipping drizzle push (build environment or SKIP_DB_PUSH=1).');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL not set; skipping drizzle push.');
  process.exit(0);
}

console.log('DATABASE_URL found, running drizzle-kit push...');
const res = spawnSync('npx', ['drizzle-kit', 'push'], { stdio: 'inherit', shell: true });
process.exit(res.status ?? 0);