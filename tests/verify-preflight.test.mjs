import test from 'node:test';
import assert from 'node:assert/strict';
import { verificationPreflight } from '../scripts/verify.mjs';
test('full verification rejects missing or nonlocal databases instead of silently skipping or using live data', () => {
  for (const url of [
    undefined,
    'invalid',
    'postgresql://db.example.test/neondb',
    'https://localhost/db',
  ])
    assert.throws(() => verificationPreflight({ TEST_DATABASE_URL: url }));
  assert.doesNotThrow(() =>
    verificationPreflight({ TEST_DATABASE_URL: 'postgresql://127.0.0.1/test' }),
  );
});
