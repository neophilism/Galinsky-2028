# Engineering verification

Use the Node version pinned by package.json and the lockfile: `npm ci`.
`npm run verify` runs syntax/publication/registry checks, JavaScript correctness
lint, formatting checks, known credential-pattern checks, TypeScript, unit and
HTTP/PostgreSQL tests, both builds, performance budgets, cross-browser/reviewer
tests, and `npm audit --omit=dev --audit-level=high`.

## Disposable database boundary

Set TEST_DATABASE_URL to a disposable loopback database before verification.
The full command refuses missing configuration rather than silently skipping
PostgreSQL tests. Never point destructive integration fixtures at Neon or a live
DB, including a live database exposed through a local port forward.

The supported verification URL uses `postgres:` or `postgresql:`, the exact host
`127.0.0.1` or `localhost`, an optional port from 1 through 65535, and an explicit
simple database name (letters, digits, underscore or hyphen). For example,
`postgresql://127.0.0.1:5432/g28test` selects that disposable local database;
configure its test-only authentication in the local environment. See the CI
workflow for its synthetic service credentials. Do not reuse real credentials.

Query options and fragments are rejected, including empty `?` or `#` suffixes.
The PostgreSQL connection-string parser can let a query option override the URL
host and can read TLS files named in options; checking only URL.hostname is not
sufficient. An omitted database can also fall back to environment configuration.
The guard deliberately does not try to predict every present or future option.
It does not prove that a loopback server contains disposable data: the operator
must still provision a separate test database. This preflight is for the full
verification command, not a replacement for the application's production
connection configuration or individual test-entrypoint safeguards.

## Execution and evidence

Install browsers with `npx playwright install --with-deps chromium firefox webkit`.
An unavailable browser engine, failed dependency audit, unavailable npm command,
spawn error or interrupted command makes full verification fail. The runner
stops at the first failed gate and does not run later gates. Diagnostics identify
the fixed gate name without echoing connection URLs or underlying spawn errors.
Child commands run from the repository root with the preflight-checked environment.
A focused unit-test run is not a successful full verification run.

`npm run format -- path/to/file` formats a chosen file. The formatter gate covers
the scanner/config/test files and the verification runner and its regressions.
Existing source is not bulk reformatted merely to make a feature diff harder to
review.

`npm run secrets:check` scans tracked text for private keys, GitHub tokens, Stripe
secret keys, AWS access-key IDs and credential-bearing PostgreSQL URLs. It also
rejects tracked runtime .env files. Findings contain no matched values. It does
not replace source review, dependency audit or protection of runtime secrets.

GitHub Actions is the project's authorized CI provider. Required checks and
actual branch rules must be verified for the exact PR head; a 403 response is not
evidence that protection is absent. Passing local orchestration tests does not
prove that the application, database, browsers or production release passed.

## G28-002 regression evidence - 2026-10-18

The original verification runner at commit
`b5e50ffcaab0f0b3fd4f0bc96cdf66f0b9116ff0` (blob
`85d8562fa3cce928ae54083d6fd03f6848090edf`) accepted three negative fixtures:
a host-override query, an omitted database, and a fragment. All three expected
rejections failed locally before the patch; no database connection was attempted.

The replacement tests cover invalid/ambiguous targets, accepted local URLs,
redacted diagnostics, the complete gate list including dependency audit,
fail-fast behavior at every gate, subprocess signals/errors, and real CLI failure
paths. Injected successful subprocess results test orchestration only, not the
underlying tools. The actual CLI tests intentionally supply unsafe/missing
configuration or an empty executable PATH and perform no database operation.

Focused tests ran with the available isolated Node v22.16.0, not the project's
pinned Node v22.23.3. Dependency installation for the pinned formatter returned
`EAI_AGAIN` resolving registry.npmjs.org. Full lint/format/build/browser/database
checks and the pinned runtime therefore require hosted CI; no local full-suite
pass or complete G28-002 acceptance is claimed by this evidence.
