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

**Passed on the actual HTTPS preview.** Implementation PR #79:
https://github.com/neophilism/Galinsky-2028/pull/79

Exact deployed source: `c263d8fd8a331b238ddc884b052c672558cee96e`.
Both existing services remain in project `prj-db57fnm7bikc739783q0`,
environment `evm-db57fnm7bikc739783qg`, free plan, auto-deploy off.

| Service | Successful deployment | Live timestamp (UTC) |
|---|---|---|
| Private website `srv-db5teuajnfac73bm8pug` | `dep-db6lloaj9qps73cu802g` | 2026-10-12T22:11:36Z |
| Volunteer portal `srv-db5v0lfavr4c73a62870` | `dep-db6llps9v7es7380kk7g` | 2026-10-12T22:11:32Z |

The actual restricted Neon/Postgres runtime verified password login, session
persistence across independent authentication instances, immediate revocation
and no volunteer/treasury table access at 2026-10-12T22:11:30.615890164Z.
Redacted event: `private_review_runtime_verified`.

At **2026-10-12T22:11:42.212794293Z**, HTTPS requests from the deployed service
to `https://galinsky-2028-private-preview.onrender.com` verified the exact
serving commit and recorded `private_review_live_verified` with:

- Anonymous and wrong-credential campaign-page/asset requests denied.
- Real independent reviewer username/password sign-in and mandatory initial
  password replacement before opening pages.
- HTTP 200 for home, issue index, Kirk-Evers, Garden, Cornerstone and portrait.
- Host-only Secure, HttpOnly, SameSite=Lax session cookie.
- HTTP 403 for account management, campaign admin/health diagnostics, checkout
  and contribution-routing endpoints with the reviewer cookie.
- HTTP 401 for materials, administration, protected records, financial ledger
  and config on the existing volunteer portal even with the reviewer cookie.
- Immediate loss of an existing policy-page session after revocation and
  blocked subsequent sign-in.
- Exact disposable reviewer removed; no email or financial operation.

Follow-up database query confirmed owner count 0, reviewer count 0 and owner
setup `unclaimed`: the owner can privately choose their own final password.
`G28_REVIEW_LIVE_CHECK` was set false for subsequent deployments after success.

GitHub Actions run 38314937387 failed before runner test steps (job 115029205825
has no steps/logs). No hosted-CI success is claimed and no paid minutes were
purchased. The Render website build executed the real password journey plus
its existing release tests on the supported Node version before going live.

The cloud browser could not open the Render host (`ERR_BLOCKED_BY_CLIENT`).
The live result above is actual HTTPS request evidence; the interactive UI
journey was separately verified in local Chromium. Firefox/WebKit and an
independent production security review remain outside this scoped evidence.


No real reviewer or owner password was created in chat or GitHub. Owner setup
remains unclaimed so the owner chooses their final password privately.
