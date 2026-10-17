import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export function verificationPreflight(env) {
  if (!env.TEST_DATABASE_URL)
    throw new Error(
      'TEST_DATABASE_URL must identify an isolated loopback test database. Full verification cannot skip PostgreSQL tests.',
    );
  let url;
  try {
    url = new URL(env.TEST_DATABASE_URL);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost'].includes(url.hostname)
  )
    throw new Error(
      'Full verification accepts only an isolated loopback PostgreSQL database. Never use a live database.',
    );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    verificationPreflight(process.env);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  for (const script of [
    'check',
    'lint',
    'format:check',
    'secrets:check',
    'typecheck',
    'test',
    'test:api',
    'build',
    'perf:budget',
    'test:browser',
    'test:review-browser',
    'test:public-browser',
    'test:coordination-browser',
  ]) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
      stdio: 'inherit',
    });
    if (result.error || result.status !== 0) process.exit(result.status || 1);
  }
}
