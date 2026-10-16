# Campaign content manager: source-bound handoff

Updated 16 October 2026. This handoff concerns the generic editorial extension in PR #97, not acceptance of the entire website. Never add actual editorial campaign names, scripts, database exports, owner credentials or real draft screenshots to Git, PR metadata, logs or artifacts.

## Durable source and plan

The owner-approved ten-part implementation plan is `docs/CAMPAIGN_CONTENT_PR_PLAN.md`. The extension is on `feat/campaign-content-manager`, PR https://github.com/neophilism/Galinsky-2028/pull/97. The branch incorporates the observed main branch at `d2b3c4dd369d1d4ab4dd523f444086bae4de1d35` without modifying unrelated work. A feature commit does not prove a merge or deployment.

The full application pipeline passed for source `f986300dade0e47276bb30e2f486c967c7b6c655`: https://github.com/neophilism/Galinsky-2028/actions/runs/38958607564, job 117167665587. This includes unit and actual HTTP/PostgreSQL integration, Astro/React builds, the existing application and reviewer journeys, both new three-browser suites, and the production dependency audit. Browser evidence artifact 12071228585 is synthetic and contains no actual editorial labels or draft copy.

Visual inspection of that evidence found a narrow-screen long-heading/portrait overlap and an unreadable menu with a permitted high-contrast palette. Source `db1f17bb3a9fed1d67685aeefa4ad1253a26aa29` corrects those problems: the portrait follows the copy in normal mobile layout, menu and dropdown use validated foreground/surface tokens, and dropdown placement avoids appearance controls. It adds explicit overlap/menu-contrast/dropdown-position assertions and enabled no-JavaScript mode coverage. Its full validation run is https://github.com/neophilism/Galinsky-2028/actions/runs/38959472974; inspect the live result rather than assuming success from this checkpoint. This document is written before that final result is known.

## Implemented functionality

| Requirement | Source and evidence |
|---|---|
| Arbitrary independent campaigns, create/duplicate/rename/archive, search and pagination | `apps/api/src/campaign-store.mjs`, `apps/editor/editor.mjs`; no two-campaign enumeration or product count cap. Ordinary page/payload/media-allocation limits still apply. |
| Eight shared marketing routes and 80 editable fields | `packages/core/campaign-content.mjs`, `campaign-template.mjs`, `tests/campaign-template-coverage.test.mjs`; fixed policy/legal/financial and operational strings are outside the editorial contract. |
| Single-campaign and arbitrary-pair text comparison | Page/section navigation, changed/identical/missing filters, same-campaign comparison, copy-field action, independent saved versions and dirty/conflict states in the editor. |
| Text, theme and hero in the same workspace | Thirteen theme tokens; image selection/upload, alt description, separate mobile/desktop focal points and hero preview. Image controls are collapsible so editing text does not require scrolling through the whole media panel. |
| Independent default, day and night selections | Versioned settings, explicit enable/disable, published-only selections, same or different campaigns permitted. Visitor Day/Night/System follows user/device choice, never identity or inferred politics. |
| Drafts, publication and rollback | Immutable revisions, optimistic concurrency, transaction-protected writes, restore-as-draft, archive safeguards and audit metadata. Publishing an assigned campaign atomically updates all of its current assignments. |
| Dynamic delivery without a code deploy for each edit | Existing private website server consumes one published snapshot and renders copy, theme, hero, title and description consistently. Bounded versioned cache and published-only transient-failure fallback. |
| Authorization separation | Existing verified portal owner/editor sessions, fresh role lookup, CSRF/origin checks and bounded requests. Publication/settings/archive are owner-only. Reviewer-only, volunteer and financial roles cannot use the editorial API. |

The editor has a **hero preview**, not a complete WYSIWYG full-page draft preview. Full-page draft preview and arbitrary link-destination editing are not implemented and must not be implied by the current UI. The existing legacy checked-in public baseline remains as a compatibility template while dynamic rendering is disabled; new editable campaign content is not exported back into it.

## Actual database preparation

Target verified: Neon project `soft-bread-25523698`, preview branch `br-purple-tooth-b4ra2kbm`, database `neondb`. No production database, donor record or volunteer account was modified by this extension.

Two initial editorial documents were inserted idempotently in `g28.content_revisions`, each with 80 text fields, theme tokens and a reference to the existing genuine portrait. Both remain **drafts**. No publication or site-selection record was inserted. No replacement portrait was supplied or generated. Actual editorial labels and text remain in those database records only.

The additive projection migration `db/migrations/20261016_campaign_public_views.sql` was applied to this exact preview branch after passing isolated PostgreSQL tests. It adds only `g28.campaign_public_releases`, `g28.campaign_public_settings` and `g28.campaign_public_media`, with explicit public-field projections and no PUBLIC grants. Its migration version is recorded.

The existing `g28_review_web` role was granted schema usage and SELECT on those three views only. A subsequent query actually connected **as that role** and verified:

- SELECT/INSERT/UPDATE/DELETE authority on `g28.content_revisions`: false.
- SELECT on all three published projections: true.
- Visible published releases: zero; visible settings: zero.

These checks concern the dedicated publication-reader role. They are not a claim that every legacy role in the existing application has been audited or narrowed. Do not change financial/account role grants as an incidental editorial migration.

## Tests and security review scope

Core tests exercise strict schemas, bounded plain text, prototype/unknown-key rejection, attribute/text escaping, safe theme interpolation, contrast, stable-field comparisons and appearance precedence. The image normalizer checks actual static raster structure, checksums, bounded decompression/pixel count, trailing/polyglot payloads and metadata stripping; accepted data is re-encoded. The browser converts supported source raster formats to a bounded static PNG; this is not a general-purpose arbitrary image decoder.

Actual isolated PostgreSQL tests cover persistence across store instances, independent copies, pagination, simultaneous stale writes, immutable publications, atomic selected-release updates, idempotent publish, restore-as-draft, archive protection, missing-media rollback and view-only SQL privileges. Real Fastify/HTTP tests cover authentication before body parsing, fresh role boundaries, CSRF/origin failures and absent publication.

The editor browser suite uses the real UI with a synthetic store harness. The public browser suite uses the real private-preview server, renderer, templates and static assets with a synthetic published-store adapter. Both run Chromium, Firefox and WebKit. Neither suite is misrepresented as a live Neon/Render owner journey.

AI-assisted source review checked new trust boundaries, malicious input handling, public projection rather than whole-record serialization, transactional revision updates, safe media paths and preservation of the existing preview/financial routes. It also found and corrected final-newline validation bypasses, repeated hero-image requests during typing, settings-save input races and the visual mobile regressions described above. No independent human audit or certification is claimed or required to continue development.

Fallback is deliberately limited: only recognized transient database connection failures may use an already validated publication, keyed by appearance preference and at most five minutes old. Permission errors, malformed documents, missing publications and cold starts without a valid snapshot fail closed. The cache is not a durable backup or a completed recovery rehearsal.

## Exact remaining integration and activation work

1. **Canonical tracking remains to be reconciled.** `registry/prs.json` and `docs/PR_REGISTER.json` still contain the original 61-unit register. The ten added units G28-062 through G28-071 are specified in the plan, but have not been appended to both registers. Preserve all original entries, approvals and evidence; add the ten contracts and partial PR #97 contributions, then run both registry validators. Do not claim the canonical denominator is already 71 or that any new unit is fully accepted merely because this PR is green.
2. Verify the latest full CI and source diff, record any final visual evidence, and obtain the repository's normal merge result. The PR is a draft at this checkpoint. No main-branch merge or Render deployment is claimed here.
3. Verify existing portal administrative login readiness and an actual owner session. The editor deliberately uses the existing verified-account authorization path. Do not promote a policy reviewer, a shared preview password or a database credential into editorial authority. If verified mail/owner login is unconfigured, report that concrete missing configuration without weakening authentication.
4. On the existing authorized portal only, deploy the tested source and enable `G28_CAMPAIGN_EDITOR_ENABLED=true` after confirming its normal protected account configuration. The editor route is `/editor/campaigns`; the API is `/api/editorial`. No additional service or CMS is required.
5. Keep `G28_CAMPAIGN_PUBLIC_ENABLED` disabled until an owner explicitly publishes the intended initial document and saves a valid default selection. Day/night assignments may use any published campaigns and remain optional. Importing a draft does not authorize publication or change the live selection.
6. The public runtime accepts `G28_CAMPAIGN_READ_DATABASE_URL`, or the existing restricted `G28_REVIEW_DATABASE_URL` when it passes the startup privilege check. It never substitutes the general financial `DATABASE_URL`. Do not print or transfer credentials into Git. Verify actual deployed credentials match the narrow reader role before enabling runtime rendering.
7. Deploy only existing authorized web/portal services in the established project/environment, preserving password protection, noindex and disabled financial/public-launch gates. Perform a live owner draft/save/publish/selection test and a separate permitted preview read, with no private content in screenshots/logs/artifacts. Verify rollback, cross-page appearance continuity and exact deployed commit. Those live acceptance steps are not yet complete.

Existing authorized placement: Render project `prj-db57fnm7bikc739783q0`, environment `evm-db57fnm7bikc739783qg`, website `srv-db5teuajnfac73bm8pug`, portal `srv-db5v0lfavr4c73a62870`. Recheck placement before deployment. Do not create duplicate services, purchase plans, enable charges, remove preview protection or make unrelated account/finance changes.

## Verification commands

From a full checkout with the pinned dependencies and an isolated local PostgreSQL test database:

```sh
npm ci
npm run check
npm run typecheck
npm test
npm run test:api
npm run build
npm run test:browser
npm run test:review-browser
npm audit --omit=dev --audit-level=high
```

The local partial source mirror passed its available 49 focused tests before the final visual correction. The complete hosted pipeline, not that partial mirror, is the evidence for application, database and browser acceptance. Never point TEST_DATABASE_URL at the assigned Neon branch.
