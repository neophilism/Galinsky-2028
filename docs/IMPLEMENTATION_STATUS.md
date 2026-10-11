# Implementation status - foundation delivery

Status updated 11 October 2026. This is implemented code for the public site and an initial volunteer application, not completion of all 60 work packages or a claim that the campaign is live. A mandatory server-side private-preview password gate has been added to the Render Web Service plan; services are not deployed or configured yet.

## Implemented in this foundation

The eight public routes reproduce the approved design, plus a real 404 page. All three issue pages place a large video panel above the policy explanation. Video IDs and policy destinations are independently configurable and deliberately unset. Third-party video connections wait for explicit activation. Mobile navigation, the role finder, donation amount/frequency choices, actual portrait, original illustrations and accessible motion controls are included.

The React volunteer application contains signup and verification, a responsive workspace, all twelve roles, current-material search/read/download, session-local bookmarks, twelve local planning worksheets with text download/print, self-directed starter tasks, activity-status explanation, optional email consent, logout and account closure. The account flow uses real server sessions, single-use browser-bound email links, explicit confirmation and CSRF protection. It never creates a fake account in browser storage.

The backend includes strict configuration, server-authorized library access, Postgres persistence, transactional migrations, single-consumer login tokens, shared rate buckets, an encrypted account-email outbox, leased jobs/retries, cleanup and an actual Resend delivery adapter. Development memory storage cannot silently run in production. Sensitive content, staff operations and fundraising fail closed before request-body handling.

The original 36 source documents have a tracked manifest with hashes. They are not automatically approved or publicly bundled. A transactional publication command accepts actual independently reviewed current material revisions and rejects stale/self-approved releases.

## Verification states

The production source is on the repository's main branch, but there has been **no production deployment** and no formal acceptance of all 60 work packages.

- Foundation PR #1 (https://github.com/neophilism/Galinsky-2028/pull/1) merged to main at `0e576ee14ec63717ed6598bc3157da0ba3b03395`. Final pull-request CI run `38096683496` passed: 92 unit tests, 20 HTTP/worker/PostgreSQL integration tests, complete Astro and React builds, Chromium/Firefox/WebKit browser journeys with 32 layout checks per engine, and production dependency audit with zero reported vulnerabilities.
- Indexing and metadata PR #2 (https://github.com/neophilism/Galinsky-2028/pull/2) merged to main at `06ad5793f2543321b82e36070e9c28a6420277e6`. CI run `38096874116` passed: 97 unit tests, 20 integration tests, three-browser journeys and zero reported production dependency vulnerabilities.
- Missing-page and verified-delivery evidence PR #3 (https://github.com/neophilism/Galinsky-2028/pull/3) merged to main at `e048a3c2ce892fba4f54156ac5c508d8150c8fe7`. CI run `38097052494` passed syntax and publishing-boundary checks, TypeScript, unit and PostgreSQL integration tests, Astro/React builds, three-browser HTTP journeys and the production dependency audit.
- Production-copy clarity PR #4 (https://github.com/neophilism/Galinsky-2028/pull/4) merged to main at `efe07090d18233d6bb1f240cc6810d320f559de5`. CI run `38097158009` passed the same full application pipeline. This evidence does not claim deployment, activated signup, payments or acceptance of any complete work package.
- Actual protected-content review, donor processing integration, production email authorization, live domain/DNS, deployed smoke checks, independent accessibility review and durable operations remain separate, incomplete release gates.

The indexed public release requires a real `CANONICAL_ORIGIN` and explicitly set `G28_PUBLIC_MODE=production`. Preview builds remain noindex and serve a disallowing robots.txt. The missing-page route is a distinct, nonindexed 404 and is not part of the sitemap.

## External inputs and deployment

- Assigned Render project: `prj-db57fnm7bikc739783q0`. No service was created in the excluded default workspace. The available connector cannot directly set a project/environment on create; deployment placement remains unresolved.
- Assigned Neon project: `soft-bread-25523698`, Galinsky 2028. No production schema or credentials have been changed.
- Needed: verified campaign/public and portal origins, authorized Render placement, sender domain/account credentials, three actual YouTube links, actual Kirk-Evers publication files and verified Garden/Cornerstone URLs.
- Needed for production fundraising: provider/account selection, credentials and treasurer/legal acceptance. No charges are enabled.
- Needed for sensitive production content: exact reviewed E2EESA implementation/profile and key/recovery review. No insecure substitute is offered.

## Remaining engineering (not mislabeled as credentials)

Staff authentication and editorial/operations administration, authenticated recipient/device key management, protected reports, persistent task/team/training/event workflows, full policy reconciliation and publishing UI, fundraising checkout/webhook/ledger/treasury implementation, retention beyond the initial account lifecycle, independent accessibility/security review, production monitoring, restore rehearsal and live deployment acceptance remain open. The original register retains all 60 work packages. Foundation code and partial package progress do not count as all packages accepted.

The latest PR/commit/CI evidence and exact next step are recorded in `docs/evidence/DELIVERY.json` as they become available. This status must be updated after those results, not used to imply they already passed.
