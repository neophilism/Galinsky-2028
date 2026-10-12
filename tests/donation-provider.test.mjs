import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approvedDonationRoutes, validateHostedDonationUrl,
  MAX_DONATION_PROCESSORS, MIN_DONATION_PROCESSORS
} from '../packages/core/donation-provider.mjs';

function configured(count = 3) {
  const env = {DONATIONS_ENABLED:'true', DONATIONS_TREASURER_APPROVED:'true'};
  for (let i = 1; i <= count; i++) {
    const prefix = 'DONATIONS_PROCESSOR_' + i + '_';
    env[prefix + 'APPROVED'] = 'true';
    env[prefix + 'ID'] = 'processor-' + i;
    env[prefix + 'NAME'] = 'Independent Processor ' + i;
    env[prefix + 'HOST'] = 'checkout.processor-' + i + '.com';
    env[prefix + 'URL'] = 'https://checkout.processor-' + i + '.com/contribute/committee';
  }
  return env;
}

test('requires three independent routes and supports four', () => {
  assert.equal(MIN_DONATION_PROCESSORS, 3);
  assert.equal(MAX_DONATION_PROCESSORS, 4);
  assert.equal(approvedDonationRoutes(configured(3), 'production').length, 3);
  assert.equal(approvedDonationRoutes(configured(4), 'production').length, 4);
});
test('preview and unapproved release never advertise hosted payment routes', () => {
  assert.deepEqual(approvedDonationRoutes(configured(), 'preview'), []);
  assert.deepEqual(approvedDonationRoutes({}, 'production'), []);
  const env = configured();
  env.DONATIONS_ENABLED = 'false';
  assert.deepEqual(approvedDonationRoutes(env, 'production'), []);
  env.DONATIONS_ENABLED = 'true';
  env.DONATIONS_TREASURER_APPROVED = 'false';
  assert.deepEqual(approvedDonationRoutes(env, 'production'), []);
});
test('releases with fewer than three approved providers fail closed', () => {
  assert.throws(() => approvedDonationRoutes(configured(1), 'production'), /at least three/);
  assert.throws(() => approvedDonationRoutes(configured(2), 'production'), /at least three/);
  const env = configured(3);
  env.DONATIONS_PROCESSOR_3_APPROVED = 'false';
  assert.throws(() => approvedDonationRoutes(env, 'production'), /at least three/);
});
test('preferred primary may change while all backups remain visible', () => {
  const env = configured(4);
  env.DONATIONS_PRIMARY_PROCESSOR_ID = 'processor-3';
  const routes = approvedDonationRoutes(env, 'production');
  assert.deepEqual(routes.map(r => r.id), ['processor-3','processor-1','processor-2','processor-4']);
  env.DONATIONS_PRIMARY_PROCESSOR_ID = 'unapproved';
  assert.throws(() => approvedDonationRoutes(env, 'production'), /primary processor/);
});
test('unapproved processor URL is never published', () => {
  const env = configured(4);
  env.DONATIONS_PROCESSOR_4_APPROVED = 'false';
  env.DONATIONS_PROCESSOR_4_URL = 'https://unapproved.example.test/anything';
  assert.equal(approvedDonationRoutes(env, 'production').length, 3);
});
test('strict exact checkout origin and HTTPS; do not proxy cards', () => {
  const good = 'https://checkout.processor-1.com/contribute/committee';
  assert.equal(validateHostedDonationUrl(good, 'checkout.processor-1.com'), good);
  for (const bad of [
    'http://checkout.processor-1.com/contribute',
    'https://checkout.processor-1.com.evil.com/contribute',
    'https://user:pass@checkout.processor-1.com/contribute',
    'https://checkout.processor-1.com:8443/contribute',
    'https://checkout.processor-1.com/contribute#token',
    'https://checkout.processor-2.com/contribute'
  ]) {
    assert.throws(() => validateHostedDonationUrl(bad, 'checkout.processor-1.com'), /Donation provider configuration/);
  }
});
test('Stripe, localhost and IP addresses are forbidden as payment hosts', () => {
  for (const host of ['checkout.stripe.com','stripepayments.com','localhost','pay.local','127.0.0.1','[::1]']) {
    assert.throws(() => validateHostedDonationUrl('https://' + host + '/donate', host), /Donation provider configuration/);
  }
});
test('approved routes must be distinct by provider ID and hostname', () => {
  const env = configured();
  env.DONATIONS_PROCESSOR_2_ID = 'processor-1';
  assert.throws(() => approvedDonationRoutes(env, 'production'), /distinct/);
  const next = configured();
  next.DONATIONS_PROCESSOR_2_HOST = next.DONATIONS_PROCESSOR_1_HOST;
  next.DONATIONS_PROCESSOR_2_URL = next.DONATIONS_PROCESSOR_1_URL;
  assert.throws(() => approvedDonationRoutes(next, 'production'), /distinct/);
});
test('approved route configuration must not be missing or labeled Stripe', () => {
  const env = configured();
  delete env.DONATIONS_PROCESSOR_1_URL;
  assert.throws(() => approvedDonationRoutes(env, 'production'), /required/);
  const next = configured();
  next.DONATIONS_PROCESSOR_1_NAME = 'Stripe Alternative';
  assert.throws(() => approvedDonationRoutes(next, 'production'), /safe unique/);
});
