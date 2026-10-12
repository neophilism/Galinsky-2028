# Private-review acceptance — 12 October 2026

Scope: added package G28-61; individual owner-managed website policy-review
accounts only. The original sixty full-launch packages retain their separate
acceptance gates.

## Implementation evidence before deployment

- `npm run check`: syntax/publication-boundary validation passes.
- `npm run typecheck`: passes.
- `npm test`: 246 tests pass; zero failures/skips.
- Both Astro website and React portal production builds pass.
- `npm audit --omit=dev --audit-level=high`: zero reported vulnerabilities.
- PostgreSQL-protocol integration: 42 tests pass, zero failures/skips, using
  isolated local PGlite/Postgres over TCP. Includes reviewer password hashes,
  durable sessions across independent controllers and application restarts,
  immediate database revocation and existing volunteer/outbox boundaries.
- Actual Chromium owner/reviewer UI: 20 policy-page views across four viewport
  widths; owner setup/create/reset/revoke, required password replacement and
  denied account-management/financial routes pass with no page errors.
  Firefox/WebKit are configured in CI, but were not executed locally.
- Local runtime: Node 24.19.0; Render uses the repository's Node 22.23.3 and
  runs the new real-password test before building the website.

The new additive credential column was applied first to existing migration
check branch `br-calm-sunset-b47kkm89`; its boolean type, NOT NULL and false
default were verified. Applied only to authorized staging
`br-purple-tooth-b4ra2kbm` after the isolated tests. The default production
branch was not migrated. Existing restricted `g28_review_web` has no
superuser/role/database-create privileges and no volunteer/treasury reads;
the runtime performs the same permission check before listening.

## Deployment/live acceptance

Pending verified deployment. Do not mark this section passed based on source
merge. Record exact commit, service/environment IDs, both Render deployments
and the redacted actual-HTTPS live acceptance event after deployment.

No real reviewer or owner password was created in chat or GitHub. Owner setup
remains unclaimed so the owner chooses their final password privately.
