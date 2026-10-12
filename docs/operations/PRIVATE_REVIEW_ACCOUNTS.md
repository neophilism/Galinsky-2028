# Individual private policy-review accounts

Owner-requested scope, 12 October 2026: each selected reviewer receives their
own revocable login for the existing private website. These accounts are a
separate Better Auth 1.7.7 username/password realm. Its internal `admin` role
means only **preview account owner**. It grants no campaign staff, editorial,
volunteer, financial, or protected-data permissions.

## Owner: claim your account once

1. Open the existing website service's protected Render environment settings:
   https://dashboard.render.com/web/srv-db5teuajnfac73bm8pug/env
2. Find `G28_REVIEW_SETUP_KEY`. Copy it privately; do not send it in chat,
   email, a screenshot, a URL, or GitHub.
3. Open https://galinsky-2028-private-preview.onrender.com/preview/setup/.
   Enter that key in the password field and choose your own name, username,
   and strong password. Use a password manager to generate/save the password.
4. Sign in at https://galinsky-2028-private-preview.onrender.com/preview/.
   Open **Manage reviewer accounts**.

An atomic database claim prevents a second owner setup. The owner password
is not known to the development agent. The setup key can be removed from
Render after successful setup; its removal requires a later deployment to
clear it from process memory. A stale key cannot claim another owner.
The existing shared Basic credential remains an operator fallback and grants
no reviewer-account management authority. Do not distribute it to reviewers.

## Create and distribute reviewer access securely

1. Create a separate display name and username for each intended person. The
   form accepts only website reviewer access; there is no staff/finance role
   selector. Set a reasonable expiration date for the review period.
2. Use **Generate** beside Password or a password manager. Save the initial
   password in the password manager before submitting. Account responses
   never return a password, and the form clears on success.
3. Send the sign-in URL and username directly to the intended person. Share
   the initial password using a recipient-restricted password-manager share
   with a short expiration/one-view limit where supported, or another private
   channel after verifying the recipient. Do not post it in chat, GitHub,
   public links, screenshots, documents, or meeting notes. No invitation is
   sent automatically by this application.
4. The first sign-in requires choosing a different password before policy
   pages or assets can be read. The owner does not see the chosen password.
5. Ask the reviewer to use **Sign out** when finished. **My account** at
   `/preview/` lets them change their password with the current password.

## Reset, revoke, renew

**Reset password** issues a new initial password, revokes existing sessions,
and requires another password change before site access. Share that initial
password through the same private process. Existing passwords cannot be
retrieved; a forgotten password is reset by the owner, without unverified
email recovery.

**Disable access** immediately revokes all sessions and blocks further
sign-ins. Every website, asset, policy-download and video request checks the
durable account status; there is no cookie/session cache that preserves
revoked access. **Restore access** allows a disabled reviewer to sign in
again. **Change expiration** updates the review period and revokes sessions;
expiry is also enforced against existing sessions on every request.
The review owner cannot be disabled/reset through the reviewer controls.

## Deployment and permissions

Use only the existing web service `srv-db5teuajnfac73bm8pug` and portal
`srv-db5v0lfavr4c73a62870` within `evm-db57fnm7bikc739783qg` in project
`prj-db57fnm7bikc739783q0`; keep auto-deploy disabled and free service plans.
Apply migrations 011/012 only to the assigned staging Neon branch
`br-purple-tooth-b4ra2kbm` in `soft-bread-25523698`. Default production branch
`br-bitter-king-b4g5sx99` is outside this preview migration.

The web runtime uses the restricted SQL-created `g28_review_web` credential.
It has no volunteer-account or treasury table privileges, no superuser or
role/database-creation privileges. It must never be replaced by the portal's
privileged credential. Set `G28_REVIEW_DATABASE_URL`,
`G28_REVIEW_AUTH_SECRET` (independent, random 32+ characters), exact HTTPS
`G28_REVIEW_ORIGIN`, `G28_REVIEW_SETUP_KEY` (independent random 32+ characters)
and `G28_REVIEW_ACCOUNTS_ENABLED=true` only on the existing website service.
Merge environment updates; preserve all existing preview/portal secrets.

Review cookies are host-only, Secure, HttpOnly and SameSite=Lax. No credentials
are saved in browser local/session storage. Passwords are library-generated
scrypt hashes. Public self-registration, role mutation, impersonation and
raw library admin endpoints are blocked. State-changing operations require
same-origin JSON requests. Username logins use durable database rate limits.
Synthetic nondeliverable email-shaped identifiers remain unverified; no
reviewer email, political opinion or volunteer record is collected.

The only unauthenticated responses are empty login/setup/account shells,
their dedicated CSS/JS, and limited authentication/status endpoints. Private
site assets/documents require a valid session or the operator's Basic login.
Review sessions have an explicit GET/HEAD website allowlist and cannot invoke
checkout/webhooks, admin APIs, health diagnostics, staff or protected flows.
The portal does not recognize reviewer cookies, even if manually replayed.
Public signup, email-delivery release, financial processing, staff identity
and protected-content gates remain separate and disabled as configured.
Original policy-library downloads still depend on their existing authorized
read-only source configuration; this change does not publish new source files.

## Verification and troubleshooting

`npm test` exercises real passwords, owner-only provisioning, first-password
replacement, CSRF, role-injection attempts, reset, revocation, expiry, throttling
and denial of finance/admin routes. `npm run test:api` adds PostgreSQL session
persistence across application instances/restarts. `npm run test:review-browser`
uses Chromium, Firefox and WebKit by default and tests actual owner/reviewer UI.
Local environment evidence must name which engines actually ran.

Startup checks the deployed restricted Postgres adapter using one disposable
reviewer, independent authentication instances, immediate revocation and denied
volunteer/treasury table access. It cleans up that exact synthetic identity and
logs only `private_review_runtime_verified` and nonsecret boolean results.

For one release, `G28_REVIEW_LIVE_CHECK=true` runs real HTTPS requests against
the exact serving Render commit and the existing portal. It verifies private
pages/assets, required initial-password replacement, Secure cookie attributes,
owner/financial/portal denial and revocation. Credentials remain in memory;
the synthetic reviewer is deleted in `finally`. Inspect the redacted
`private_review_live_verified` event, then set the flag false for subsequent
releases. Failure logs only `private_review_live_failed`; do not call it passed
without the success record and matching commit. No real users are created by
this test, no mail is sent and no financial transaction is attempted.

Database failure fails closed. An interrupted setup in `claiming` needs an
operator to inspect owner/account rows before recovery; do not simply reset
the setup state. Owner recovery is a separate protected operator procedure,
not a public endpoint or permission for a reviewer to become owner.

See `PRIVATE_REVIEW_ACCEPTANCE_20261012.md` for exact release/test evidence.
This private-review delivery does not close all sixty full-launch packages.
