import test from 'node:test';
import assert from 'node:assert/strict';
import { scanSecrets } from '../scripts/scan-secrets.mjs';
test('credential detector covers known credential types without returning credential values', () => {
  const suffix = 'AbC123xYz098'.repeat(5);
  for (const value of [
    'ghp' + '_' + suffix,
    'sk' + '_live_' + suffix,
    'sk' + '_test_' + suffix,
    'AKIA' + 'ABCDEFGHIJKLMNOP',
    '-----BEGIN ' + 'PRIVATE KEY-----',
    'postgresql' + '://user:very-private@database.example.test/db',
  ]) {
    const findings = scanSecrets('Header\n' + value);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].line, 2);
    assert(!JSON.stringify(findings).includes(value));
  }
});
test('local CI fixture exception cannot match production hosts or different passwords', () => {
  assert.deepEqual(scanSecrets('postgresql' + '://g28test:g28local@127.0.0.1:5432/g28test'), []);
  assert.equal(
    scanSecrets('postgresql' + '://g28test:g28local@db.example.test:5432/g28test').length,
    1,
  );
  assert.equal(
    scanSecrets('postgresql' + '://g28test:not-the-fixture@127.0.0.1:5432/g28test').length,
    1,
  );
  assert.deepEqual(scanSecrets('DATABASE_URL=\nSTRIPE_SECRET_KEY=\n'), []);
});
