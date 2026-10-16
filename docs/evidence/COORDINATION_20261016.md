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
