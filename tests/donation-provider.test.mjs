import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedHostedDonationUrl, validateAnedotHostedUrl} from '../packages/core/donation-provider.mjs';

const url='https://secure.anedot.com/approved-committee/donate';
test('fundraising is off by default and in preview mode', () => {
  assert.equal(approvedHostedDonationUrl({},'production'),null);
  assert.equal(approvedHostedDonationUrl({DONATIONS_ENABLED:'true',ANEDOT_DONATION_URL:url},'production'),null);
  assert.equal(approvedHostedDonationUrl({DONATIONS_ENABLED:'true',DONATIONS_TREASURER_APPROVED:'true',ANEDOT_DONATION_URL:url},'preview'),null);
});
test('requires a verified hosted link before production activation', () => {
  assert.equal(approvedHostedDonationUrl({DONATIONS_ENABLED:'true',DONATIONS_TREASURER_APPROVED:'true',ANEDOT_DONATION_URL:url},'production'),url);
  assert.throws(() => approvedHostedDonationUrl({DONATIONS_ENABLED:'true',DONATIONS_TREASURER_APPROVED:'true'},'production'),/ANEDOT_DONATION_URL/);
});
test('rejects third-party or unsafe checkout URLs', () => {
  for(const bad of ['http://secure.anedot.com/a/b','https://stripe.com/a/b','https://secure.anedot.com.evil.example/a/b','https://secure.anedot.com/a/b?token=abc','https://secure.anedot.com/a/b#x','https://user:secret@secure.anedot.com/a/b','https://secure.anedot.com/a']) {
    assert.throws(() => validateAnedotHostedUrl(bad), /ANEDOT_DONATION_URL/);
  }
});
