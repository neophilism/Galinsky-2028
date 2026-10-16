# Engineering verification

Use the Node version pinned by package.json and the lockfile: `npm ci`.
`npm run verify` runs syntax/publication/registry checks, JavaScript correctness
lint, formatting checks, known credential-pattern checks, TypeScript, unit and
HTTP/PostgreSQL tests, both builds, and cross-browser/reviewer tests.

Set TEST_DATABASE_URL to the disposable loopback database documented in CI before
verification. A local run without it skips PostgreSQL tests and is not complete
acceptance. Never point destructive integration fixtures at Neon or a live DB.
Install browsers with `npx playwright install --with-deps chromium firefox webkit`.
An unavailable browser engine is a failure to obtain evidence, not a passing test.

`npm run format -- path/to/file` formats a chosen file. The initial formatter gate
covers the new scanner/config/test files; use it for added files. Existing source
is not bulk reformatted merely to make a feature diff harder to review.

`npm run secrets:check` scans tracked text for private keys, GitHub tokens, Stripe
secret keys, AWS access-key IDs and credential-bearing PostgreSQL URLs. It also
rejects tracked runtime .env files. Findings contain no matched values. It does
not replace source review, dependency audit or protection of runtime secrets.

Both existing CircleCI and GitHub workflow files invoke these checks. Observed
successful hosted CI is currently GitHub Actions; the presence of CircleCI YAML
alone is not evidence of a CircleCI run. Branch protection must be inspected with
an account that has permission; a 403 is not evidence that protection is absent.
