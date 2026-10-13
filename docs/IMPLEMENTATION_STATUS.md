# Implementation status - foundation delivery

> **Historical foundation status as of 11 October 2026.** The latest [13 October package audit](evidence/ACCEPTANCE_AUDIT_20261013.md) identifies 8 accepted packages, 46 partially implemented and 7 unstarted. This historical document's older CI/Render SHAs and acceptance counts are not the current registry; public launch remains blocked.

Status updated 11 October 2026. The private *public-site preview* is deployed and independently HTTP-verified behind a required password. This is not a public production campaign launch and not completion of all 60 work packages. Both the public site and the actual React/Fastify volunteer portal/API are now deployed in the designated Render project, connected to Neon staging. Signup, payments, staff administration and protected reports remain disabled or incomplete.

## Implemented in this foundation

The eight public routes reproduce the approved design, plus a real 404 page. All three issue pages place a large video panel above the policy explanation. Video IDs and policy destinations are independently configurable and deliberately unset. Third-party video connections wait for explicit activation. Mobile navigation, the role finder, donation amount/frequency choices, actual portrait, original illustrations and accessible motion controls are included.

The React volunteer application contains signup and verification, a responsive workspace, all twelve roles, current-material search/read/download, session-local bookmarks, twelve local planning worksheets with text download/print, self-directed starter tasks, activity-status explanation, optional email consent, logout and account closure. The account flow uses real server sessions, single-use browser-bound email links, explicit confirmation and CSRF protection. It never creates a fake account in browser storage.

The backend includes strict configuration, server-authorized library access, Postgres persistence, transactional migrations, single-consumer login tokens, shared rate buckets, an encrypted account-email outbox, leased jobs/retries, cleanup and an actual Resend delivery adapter. Development memory storage cannot silently run in production. Sensitive content, staff operations and fundraising fail closed before request-body handling.

The original 36 source documents have a tracked manifest with hashes. They are not automatically approved or publicly bundled. A transactional publication command accepts actual independently reviewed current material revisions and rejects stale/self-approved releases.

## Verification states

The website and the real volunteer portal/API are both deployed behind a password. Their private previews are live, but no publicly launched production website, open volunteer registration, or complete platform has been accepted; none of the 60 work packages has undergone full package-level acceptance.

- Foundation PR #1 (https://github.com/neophilism/Galinsky-2028/pull/1) merged to main at `0e576ee14ec63717ed6598bc3157da0ba3b03395`. Final pull-request CI run `38096683496` passed: 92 unit tests, 20 HTTP/worker/PostgreSQL integration tests, complete Astro and React builds, Chromium/Firefox/WebKit browser journeys with 32 layout checks per engine, and production dependency audit with zero reported vulnerabilities.
- Indexing and metadata PR #2 (https://github.com/neophilism/Galinsky-2028/pull/2) merged to main at `06ad5793f2543321b82e36070e9c28a6420277e6`. CI run `38096874116` passed: 97 unit tests, 20 integration tests, three-browser journeys and zero reported production dependency vulnerabilities.
- Missing-page and verified-delivery evidence PR #3 (https://github.com/neophilism/Galinsky-2028/pull/3) merged to main at `e048a3c2ce892fba4f54156ac5c508d8150c8fe7`. CI run `38097052494` passed syntax and publishing-boundary checks, TypeScript, unit and PostgreSQL integration tests, Astro/React builds, three-browser HTTP journeys and the production dependency audit.
- Production-copy clarity PR #4 (https://github.com/neophilism/Galinsky-2028/pull/4) merged to main at `efe07090d18233d6bb1f240cc6810d320f559de5`. CI run `38097158009` passed the same full application pipeline. This evidence does not claim deployment, activated signup, payments or acceptance of any complete work package.
- Render cleanup: approved duplicate-service deletion [run 38164565395](https://github.com/neophilism/Galinsky-2028/actions/runs/38164565395) removed exactly five services after passing audit [run 38164309166](https://github.com/neophilism/Galinsky-2028/actions/runs/38164309166). The RAM Marketplace PostgreSQL database `dpg-db39gm1srm7s73b62mv0-a` remains intact and available; row-level contents were not inspected.
- Render private-preview creation [run 38164605594](https://github.com/neophilism/Galinsky-2028/actions/runs/38164605594): service `srv-db5teuajnfac73bm8pug` in project `prj-db57fnm7bikc739783q0`, environment `evm-db57fnm7bikc739783qg`; deployment `dep-db5tev2jnfac73bm8sn0` reached `live` from commit `46d4b836cebe6a9915f37c983e22b69dfd0e3d2f`.
- Deployed HTTP acceptance [run 38164974556](https://github.com/neophilism/Galinsky-2028/actions/runs/38164974556): anonymous and invalid-password requests returned 401 on all nine tested paths; authenticated page and robots.txt checks passed. The password itself was not logged.
- Real volunteer deployment: [provisioning run 38172023426](https://github.com/neophilism/Galinsky-2028/actions/runs/38172023426) created service `srv-db5v0lfavr4c73a62870`, same project and environment, separate origin `https://galinsky-2028-volunteer-portal.onrender.com`; Neon staging branch `br-purple-tooth-b4ra2kbm` configured as secret (not in Git). [Live API run 38181063632](https://github.com/neophilism/Galinsky-2028/actions/runs/38181063632) verified password protection, twelve canonical roles, and database readiness.
- PR #41 ([account lifecycle](https://github.com/neophilism/Galinsky-2028/pull/41)): CI [38181416466](https://github.com/neophilism/Galinsky-2028/actions/runs/38181416466) passed real PostgreSQL, API, and browser tests. Account data export excludes token hashes and private delivery ciphertext; sign-out-everywhere revokes all active sessions. Deployed in real portal.
- PR #42 ([real volunteer entry](https://github.com/neophilism/Galinsky-2028/pull/42)): CI [38181706838](https://github.com/neophilism/Galinsky-2028/actions/runs/38181706838) passed. The public volunteer page no longer contains local-storage imitation controls; all twelve role cards, the role finder and the header point to the real volunteer application. Public-site deployment `dep-db614dnlk1mc73bhs8ig` and portal deployment `dep-db614gqd0e5s7390qjb0` are live at commit `5aef1f8d2bcabee093960f552ce482f9adfd9f4b`.
- Actual protected-content review, donor processing integration, production email authorization, public-domain/DNS activation, **production** deployment acceptance, independent accessibility review, and durable operations remain separate, incomplete release gates.

The indexed public release requires a real `CANONICAL_ORIGIN` and explicitly set `G28_PUBLIC_MODE=production`. Preview builds remain noindex and serve a disallowing robots.txt. The missing-page route is a distinct, nonindexed 404 and is not part of the sitemap.

## External inputs and deployment

- Assigned Render project: `prj-db57fnm7bikc739783q0` in Phillip's workspace, explicitly approved by the user. The exact-project GitHub Actions provisioner created the private-preview service in environment `evm-db57fnm7bikc739783qg`; automatic deploys are disabled. The 19 other workspace services were intentionally left in the workspace root without relocation.
- Assigned Neon project: `soft-bread-25523698`, Galinsky 2028. Branch `br-purple-tooth-b4ra2kbm` is connected to the volunteer service and staging migrations 001–005 are present; production remains unlaunched. Neon credentials were injected directly into Render and never written to Git.
- Needed for production: verified canonical campaign and portal origins, sender domain/account credentials, three actual YouTube links, actual Kirk-Evers publication files and verified Garden/Cornerstone URLs.
- Needed for production fundraising: provider/account selection, credentials and treasurer/legal acceptance. No charges are enabled.
- Needed for sensitive production content: exact reviewed E2EESA implementation/profile and key/recovery review. No insecure substitute is offered.

## Remaining engineering (not mislabeled as credentials)

Staff authentication and editorial/operations administration, authenticated recipient/device key management, protected reports, persistent task/team/training/event workflows, full policy reconciliation and publishing UI, fundraising checkout/webhook/ledger/treasury implementation, retention beyond the initial account lifecycle, independent accessibility/security review, production monitoring, restore rehearsal and **public production** deployment acceptance remain open. The original register retains all 60 work packages. Foundation code and partial package progress do not count as all packages accepted.

The latest PR/commit/CI evidence and exact next step are recorded in `docs/evidence/DELIVERY.json` as they become available. This status must be updated after those results, not used to imply they already passed.
