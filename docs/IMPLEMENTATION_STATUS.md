# Implementation status - foundation delivery

Status recorded 10 October 2026. This is implemented code for the public site and an initial volunteer application, not completion of all 60 work packages or a claim that the campaign is live.

## Implemented in this foundation

The eight public routes reproduce the approved design, plus a real 404 page. All three issue pages place a large video panel above the policy explanation. Video IDs and policy destinations are independently configurable and deliberately unset. Third-party video connections wait for explicit activation. Mobile navigation, the role finder, donation amount/frequency choices, actual portrait, original illustrations and accessible motion controls are included.

The React volunteer application contains signup and verification, a responsive workspace, all twelve roles, current-material search/read/download, session-local bookmarks, twelve local planning worksheets with text download/print, self-directed starter tasks, activity-status explanation, optional email consent, logout and account closure. The account flow uses real server sessions, single-use browser-bound email links, explicit confirmation and CSRF protection. It never creates a fake account in browser storage.

The backend includes strict configuration, server-authorized library access, Postgres persistence, transactional migrations, single-consumer login tokens, shared rate buckets, an encrypted account-email outbox, leased jobs/retries, cleanup and an actual Resend delivery adapter. Development memory storage cannot silently run in production. Sensitive content, staff operations and fundraising fail closed before request-body handling.

The original 36 source documents have a tracked manifest with hashes. They are not automatically approved or publicly bundled. A transactional publication command accepts actual independently reviewed current material revisions and rejects stale/self-approved releases.

## Verification states

Local core/public/publication tests: 92 passing. Fastify API tests: 10 passing before the patched dependency refresh. Worker transport tests, full PostgreSQL integration and cross-browser HTTP journeys are included and must be checked in the final CI record. Local TypeScript check and Astro/Vite builds passed after fixing JSX, CSS module typing and Astro source-root resolution. The initial dependency audit found vulnerable Fastify 5.12.0; source is pinned to the patched 5.12.5 and the lockfile/audit must be regenerated and rechecked before merge.

Offline Chromium visual inspection covered eight public pages at 320, 390, 768 and 1440 pixels with no horizontal overflow and exactly one primary heading. This is layout evidence, not an HTTP/CSP, WCAG audit or deployed test. GitHub runner output is the authoritative final clean-install/build/route/browser test evidence.

## External inputs and deployment

- Assigned Render project: `prj-db57fnm7bikc739783q0`. No service was created in the excluded default workspace. The available connector cannot directly set a project/environment on create; deployment placement remains unresolved.
- Assigned Neon project: `soft-bread-25523698`, Galinsky 2028. No production schema or credentials have been changed.
- Needed: verified campaign/public and portal origins, authorized Render placement, sender domain/account credentials, three actual YouTube links, actual Kirk-Evers publication files and verified Garden/Cornerstone URLs.
- Needed for production fundraising: provider/account selection, credentials and treasurer/legal acceptance. No charges are enabled.
- Needed for sensitive production content: exact reviewed E2EESA implementation/profile and key/recovery review. No insecure substitute is offered.

## Remaining engineering (not mislabeled as credentials)

Staff authentication and editorial/operations administration, authenticated recipient/device key management, protected reports, persistent task/team/training/event workflows, full policy reconciliation and publishing UI, fundraising checkout/webhook/ledger/treasury implementation, retention beyond the initial account lifecycle, independent accessibility/security review, production monitoring, restore rehearsal and live deployment acceptance remain open. The original register retains all 60 work packages. Foundation code and partial package progress do not count as all packages accepted.

The latest PR/commit/CI evidence and exact next step are recorded in `docs/evidence/DELIVERY.json` as they become available. This status must be updated after those results, not used to imply they already passed.
