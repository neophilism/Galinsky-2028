import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {parsePrRegistry} from '../registry/pr-contract.mjs';

const registry = parsePrRegistry(readFileSync('registry/prs.json', 'utf8'), 'neophilism/Galinsky-2028').document;
const plan = JSON.parse(readFileSync('docs/PR_REGISTER.json', 'utf8'));
const delivery = JSON.parse(readFileSync('docs/evidence/DELIVERY.json', 'utf8'));
const prs = new Map(registry.pullRequests.map(p => [p.number, p]));

test('all 61 work-package statuses, accepted mappings and counts are synchronized', () => {
  assert.equal(registry.units.length, 61);
  assert.equal(plan.packages.length, 61);
  assert.equal(registry.plannedPrCount, 61);
  for (let i = 0; i < 61; i++) {
    const n = i + 1;
    const unit = registry.units[i], pkg = plan.packages[i];
    assert.equal(unit.id, 'G28-' + String(n).padStart(3, '0'));
    assert.equal(pkg.id, 'G28-' + String(n).padStart(2, '0'));
    assert.equal(unit.status, pkg.status);
    assert.ok(['completed', 'in_progress', 'not_started'].includes(pkg.status));
    assert.deepEqual([...(unit.prs || [])].sort((a,b)=>a-b), [...(pkg.github_prs || [])].sort((a,b)=>a-b));
    assert.equal(pkg.acceptance_review?.status, pkg.status);
    assert.ok(typeof pkg.implementation_note === 'string' && pkg.implementation_note.length > 25);
    if (pkg.status === 'completed') {
      assert.ok(unit.prs.length > 0, unit.id + ' has no complete merged PRs');
      assert.ok(unit.acceptanceSummary?.length > 25, unit.id);
      assert.match(unit.reviewedSourceSha, /^[a-f0-9]{40}$/);
      assert.ok(Number.isFinite(Date.parse(unit.acceptedAt)));
      assert.ok(unit.evidence?.length > 0, unit.id);
      for (const source of unit.evidence) assert.ok(existsSync(source), unit.id + ': ' + source);
      for (const number of unit.prs) assert.ok(prs.get(number)?.mergedAt, unit.id + ' maps nonmerged PR ' + number);
      assert.ok(!unit.prs.some(number => (unit.contributingPrs || []).includes(number)));
    } else {
      assert.equal(unit.prs.length, 0, unit.id + ' falsely implies complete mapped PR');
      assert.ok(unit.acceptanceBlocker?.length > 25, unit.id + ' lacks exact blocker');
    }
  }
  const counts = Object.fromEntries(['completed', 'in_progress', 'not_started'].map(status => [status, plan.packages.filter(p => p.status === status).length]));
  assert.deepEqual(counts, {completed:8, in_progress:46, not_started:7});
  assert.equal(plan.implemented_packages, counts.completed);
  assert.equal(plan.merged_packages, counts.completed);
  assert.equal(plan.deployed_packages, plan.packages.filter(p => p.status === 'completed' && p.acceptance_review.scoped_deployed).length);
  assert.equal(delivery.full_work_packages_accepted, counts.completed);
  assert.equal(delivery.last_acceptance_audit.completed, counts.completed);
  assert.equal(delivery.last_acceptance_audit.in_progress, counts.in_progress);
  assert.equal(delivery.last_acceptance_audit.not_started, counts.not_started);
  assert.equal(registry.pullRequests.filter(p => p.mergedAt).length, 82);
  assert.equal(delivery.production_release_verified, false);
  assert.ok(existsSync('docs/evidence/ACCEPTANCE_AUDIT_20261013.md'));
});

test('test-only, gated and missing production workflows are not misclassified as accepted', () => {
  for (const number of [2,19,21,22,26,31,42,43,44,48,54,55,57,58,59,60])
    assert.notEqual(registry.units[number - 1].status, 'completed', 'G28-' + number + ' cannot pass yet');
  assert.equal(registry.units[60].status, 'completed');
  assert.deepEqual(registry.units[60].prs, [79]);
});
