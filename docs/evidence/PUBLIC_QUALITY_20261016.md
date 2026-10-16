# Public interaction and CI follow-up — 16 October 2026

Reviewed baseline: f5a924d83cf8d9f94ed857b6df5da5dd041f56cb.

- Fixed double-escaped donation amount validation in browser JavaScript. Valid
  selected amounts now reach the existing checkout continuation link.
- Added a stop/disconnect control after explicit YouTube activation. It removes
  the iframe, restores the poster/play control and keyboard focus, and allows
  playback again only after another explicit activation. It does not claim to
  erase information already sent to YouTube.
- Restored the missing same-origin static dot-flag fallback and fixed its CSS URL.
  The owner-requested absence of hero pause controls is preserved (PR #35).
- Added repository-wide JavaScript correctness lint, a credential-pattern scanner,
  an explicit formatting tool/configuration, a PR template, and `npm run verify`.
  TypeScript remains checked with tsc. Formatter enforcement initially covers the
  new quality/test files; historic compressed source is not mass-reformatted.
- The credential scanner reports only file/type/line and never credential values.
  The only complete credential-URL exception is the fixed loopback CI database.
  This is a known-pattern scan, not a claim to detect arbitrary sensitive content.

Unit regressions exercise actual browser script behavior via a DOM harness. New
three-engine browser tests verify consent, disconnect, replay, focus restoration,
and no-JavaScript static fallback. CI stores screenshots and result JSON.

No full-package acceptance is inferred from these fixes. G28-02 still needs branch
protection evidence: the repository ruleset list is empty and the connected app
receives HTTP 403 for the classic branch-protection endpoint. G28-12 still needs
actual approved issue media/captions. G28-10 still needs measured motion/CPU evidence.

PR #95 separately contains the team/event implementation and passed CI run
38924346444 (276 unit tests, 45 integration tests with no skips, all three browser
engines, reviewer journeys and zero reported production dependency vulnerabilities).
Automatic approval review rejected its merge into main as requiring explicit
approval for that exact merge. It remains unmerged; no deployment is claimed.

PR #96 standalone head `3310df69eba606d3d68fd9ac0a64cd71e1fbe1bf` passed
hosted CI run 38941833517, including PostgreSQL and all three browser engines.
The subsequent integrated candidate incorporates #95, preserves both browser
suites, and passes 282 local unit tests, lint, formatting, credential scan,
validation, type checks and both builds. Hosted combined checks are required
before merging; standalone runs are not a substitute for combined verification.
