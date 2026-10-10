# Deployment and operator runbook

## Resource placement

The user's designated Render project is `prj-db57fnm7bikc739783q0`; the assigned Neon project is `soft-bread-25523698`. These are identifiers, not passwords. The Render create-service connector currently accepts a workspace, not a project/environment assignment. Do not deploy into an excluded default workspace or assume a project ID is a workspace ID. Resolve the intended placement through the actual dashboard/authorized connector first. Never substitute another project's database.

## Public preview

After a green merge, use `render.yaml` in the intended project. It builds with the exact Node/lockfile and publishes only `dist/web`. Preview remains noindex and explicitly announces that accounts and payments are closed. Confirm all eight routes, 404, assets, the three large video placeholders, mobile navigation, reduced motion and donation disclosures on the real URL. A successful build is not a successful HTTP smoke check.

## Portal/API

Create a separately authorized Node service with build `npm ci && npm run build:portal`, start `npm start`, health `/healthz` and readiness `/readyz`. Set `NODE_ENV=production`, assigned `DATABASE_URL`, exact HTTPS `PUBLIC_ORIGIN` and `PORTAL_ORIGIN`. Keep all release flags false initially. Use separate staging and production secrets; never paste them into GitHub source or a public issue.

Run `npm run db:migrate` as an explicit deployment step using the assigned database. Migrations acquire a lock and use transactions. Preview/test databases must be separate branches or local instances. Restore an actual backup before claiming recoverability.

## Verified-email activation

Review terms/privacy/consent and sender setup. Configure `MAIL_PROVIDER=resend`, a verified `MAIL_FROM`, `RESEND_API_KEY`, random 32-byte base64 `DELIVERY_KEY` and high-entropy `LOGIN_PEPPER`. Start a separately approved durable worker with `npm run worker`; do not use a free sleeping web process as evidence of timely queue delivery. Only then enable `SIGNUP_ENABLED=true` and update the public portal origin. Request a real test link, verify it in the initiating browser, test expiration/replay and check actual deliveries and unsubscribe preferences. Do not claim this happened from the synthetic transport tests.

## Materials

Reconcile source texts from the original user-supplied volunteer archive. Record actual author/reviewer identities and revision-specific approval. Add approved volunteer-facing records to `content/materials/current.json`; run `npm run materials:publish`. Search, read and download them with a newly verified volunteer account. The CLI deliberately cannot approve historical documents itself. Staff administration is a separate future integration.

## Videos and issue links

Edit each issue in `content/public/site.json`. A YouTube URL or 11-character ID is validated; no unrelated placeholder ID is allowed. Set the reviewed transcript and real canonical issue website URLs. Rebuild, check captions and verify no third-party request before activation. The Kirk-Evers bill needs its actual approved source file and accessible publication workflow before linking a download.

## Feature release

Do not set `DONATIONS_ENABLED`, `STAFF_IDENTITY_ENABLED` or `PROTECTED_CONTENT_ENABLED` to true in this foundation. Startup intentionally rejects them because their reviewed adapters do not exist. Complete the corresponding work packages and release evidence first. No boolean bypass is a valid completion shortcut.

## Recovery and incident behavior

Rotate compromised session/identity delivery credentials using a documented migration; changing the lookup pepper or delivery key without migration can make historical records unusable. Pause signup if email delivery or its worker fails. Preserve minimal diagnostic codes, not personal data. Revoke account sessions through the account lifecycle; sensitive future records require their own key-aware recovery policy. Roll back the public deployment independently of the account database. Record schema compatibility before rolling back the API.
