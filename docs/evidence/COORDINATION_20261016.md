# Team and event implementation — 16 October 2026

Baseline main: `f5a924d83cf8d9f94ed857b6df5da5dd041f56cb` (use git history for the full revision). Initial baseline:
271 unit tests passed, validation/types and both production builds passed.

New implementation: team invitations and opt-in membership, owner-assigned captain
scope, weekly plans, reviewed event proposals, atomic RSVP/waitlist/cancellation,
React operator/member screens, SQL migration, audit writes and account cleanup.
See `docs/operations/VOLUNTEER_COORDINATION.md` for remaining scope.

Local verification: 276 unit tests passed; 28 HTTP/worker tests passed. Four local
PostgreSQL suites skipped without TEST_DATABASE_URL and are **not** claimed passed.
TypeScript and source/registry validation passed. Browser installation failed in
the local environment; all three browser journeys are wired into CI and must pass
before merge. CI evidence is recorded in the PR and subsequent handoff.

G28-32 and G28-33 move from not started to in progress. G28-38 remains in progress.
All original acceptance criteria remain in force. No live notifications were sent,
no production flag was enabled, and no payment or public-launch setting changed.

## Hosted CI evidence

PR #95 head `6d5f80e267eef2fe3559ea4bbc59831cd295e527` passed run
38924346444: 276 unit tests and 45 integration tests, zero skips, production builds,
Chromium/Firefox/WebKit standard and coordination journeys, reviewer account
journeys, and zero reported production dependency vulnerabilities. AI source review
is recorded on PR #95. Main-branch merge was rejected by automatic approval review;
no deploy occurred. Migration 014 was validated on the existing isolated Neon test
branch `review-account-migration-test-20261012`, not applied to staging/production.
