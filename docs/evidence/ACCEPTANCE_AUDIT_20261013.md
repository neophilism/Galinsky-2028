# Galinsky 2028 — evidence-based acceptance audit (13 October 2026)

**Reviewed source:** `0e70c5cee4b34e5de78aea3b304cbe7aa73c3228` (main).
**Successful CI:** https://github.com/neophilism/Galinsky-2028/actions/runs/38462635121
**Live private website:** Render deploy `dep-db79b2d9fdbs73dblj80` at the same source SHA. **Private portal:** previous live deployment `c263d8fd8a331b238ddc884b052c672558cee96e`.
**Actual GitHub PR history:** 82 merged; 5 closed without merge; 0 open at the start of the audit. PRs are not work packages.

## Results

| Work packages | Number | Meaning |
|---|---:|---|
| Accepted | **8** | Package-level scope tested and evidenced |
| In progress | **46** | Some code exists but at least one criterion remains unfinished |
| Not started | **7** | No usable functional implementation for this scoped feature |

An accepted package does not certify the entire website, and does not turn on campaign donations or protected activities. The one accepted repo-only package is the project handoff; the other seven have deployed implementation components. A paid external expert review is not an engineering blocker under current owner instructions; actual missing code, failed tests and release approvals remain blockers.

## Every package

| Package | Assessment | Evidence (accepted) or actual missing criterion |
|---|---|---|
| G28-01 | **Accepted** | `README.md`, `AGENTS.md`, `docs/DEVELOPMENT_PLAN.md`, `docs/design/ASSET_REGISTER.json`, `tests/public.test.mjs` |
| G28-02 | In progress | The complete CI suite passes, but the original G28-02 scope also calls for formatting/lint tooling, dedicated secret scanning, a PR template and branch-rule evidence. Those are absent or unverified; CI success alone is not full package acceptance. |
| G28-03 | In progress | Keyboard/mobile components are built, but full baseline side-by-side UI approval and focus/gallery evidence are missing. |
| G28-04 | **Accepted** | `scripts/migrate.mjs`, `apps/api/src/config.mjs`, `tests/integration/postgres.test.mjs`, `docs/operations/RENDER_VERIFIED_PLACEMENT.md` |
| G28-05 | In progress | Security boundaries exist; verified complete E2EESA component/flow inventory and profile mapping do not. |
| G28-06 | In progress | Material publication protections exist; atomic public content release, cross-source versioning and rollback remain incomplete. |
| G28-07 | In progress | Assets/sanitization exist; comprehensive rights metadata and hostile-editor upload testing are unfinished. |
| G28-08 | In progress | Engine Room manifests exist; actual 61-package import, accepted colors and denominator have not been observed. |
| G28-09 | **Accepted** | `content/public/pages/index.html`, `docs/design/BASELINE_NOTES.md`, `tests/public.test.mjs`, `tests/browser/journeys.mjs` |
| G28-10 | In progress | Dot-star animation exists but user pause/persistent stop and CPU/mobile motion evidence are absent. |
| G28-11 | **Accepted** | `content/public/pages/issues.html`, `content/public/site.json`, `tests/issue-card-navigation.test.mjs`, `tests/indexing.test.mjs` |
| G28-12 | In progress | Lazy YouTube component exists; revoke-consent and full live accessibility activation are not verified. |
| G28-13 | In progress | Kirk-Evers draft and source reader exist; final approved legislation/PDF and versioned public downloads are missing. |
| G28-14 | In progress | Garden page exists; verified canonical external URL and final issue video are absent. |
| G28-15 | In progress | Cornerstone page exists; verified canonical external URL and final issue video are absent. |
| G28-16 | **Accepted** | `content/public/pages/volunteer.html`, `packages/core/roles.mjs`, `tests/flag-real-portal.test.mjs`, `tests/browser/journeys.mjs` |
| G28-17 | **Accepted** | `content/public/pages/donate.html`, `packages/core/stripe-web-checkout.mjs`, `tests/public.test.mjs`, `tests/stripe-web-checkout.test.mjs` |
| G28-18 | **Accepted** | `packages/core/indexing.mjs`, `scripts/public-renderer.mjs`, `tests/indexing.test.mjs`, `tests/accessibility-navigation.test.mjs` |
| G28-19 | In progress | Real signup code exists, but actual portal still has signup=false and mail delivery disabled. |
| G28-20 | In progress | Treasury/owner basics exist; staff MFA, scoped roles and negative authorization journeys are missing. |
| G28-21 | Not started | No recipient-key enrollment, device verification or key-substitution implementation. |
| G28-22 | Not started | Protected ciphertext submission/recipient system is not implemented or enabled. |
| G28-23 | In progress | Account export/revocation exists; protected device/key recovery and trust restoration are incomplete. |
| G28-24 | In progress | Durable outbox exists; verified live sender, delivery callbacks, opt-out suppression and retries remain. |
| G28-25 | In progress | Historical sources inventoried privately; full revised-policy crosswalk and current publication queue are unfinished. |
| G28-26 | In progress | Materials reader/bookmarks exist; no approved current materials published and signup disabled. |
| G28-27 | In progress | First-hour checklist exists; real newly registered volunteer/session acceptance is unavailable. |
| G28-28 | In progress | Reading acknowledgments exist; orientation/training lifecycle and activated prerequisites are incomplete. |
| G28-29 | In progress | Fail-closed activity rules exist; live verified jurisdiction module admin/publish/revoke flow is missing. |
| G28-30 | In progress | Simple task checklist exists; task assignments, capacity and verified activity reporting are missing. |
| G28-31 | In progress | All twelve local worksheets render, but the original source templates contain fields not yet mapped to typed controls and the required coverage matrix, print/privacy and role-boundary evidence is incomplete. |
| G28-32 | Not started | No working team membership or scoped captain-coordination system. |
| G28-33 | Not started | No event scheduling, capacity/RSVP or cancellation backend. |
| G28-34 | Not started | No secure protected incident intake, reply or private-attachment workflow. |
| G28-35 | Not started | No approved asset-sharing/QR versioning and withdrawal system. |
| G28-36 | In progress | Role instruction paths exist; provider-approved field-tool handoffs and opt-out tests are missing. |
| G28-37 | In progress | CLI video/link preparation exists; nontechnical editor, publish and rollback UI is missing. |
| G28-38 | In progress | Treasury admin preview exists; operational captain/support admin roles and step-up are incomplete. |
| G28-39 | In progress | Stripe test API and Checkout work; political-merchant approval and live account/settlement capability are unverified. |
| G28-40 | In progress | Linked election terms exist; live donor aggregation, approved limits and personal-card enforcement are incomplete. |
| G28-41 | In progress | Hosted sandbox checkout works; full retry/back-navigation/duplicate handling and live release remain unverified. |
| G28-42 | In progress | Signed event validator and synthetic replay tests exist; real signed paid event delivery/reconciliation not verified. |
| G28-43 | In progress | Staging financial ledger exists; real settlement, deposit reconciliation and all-channel totals are missing. |
| G28-44 | Not started | No receipts/recurring donor self-service or cancellation workflow. |
| G28-45 | In progress | Outage quarantine and exceptions partly exist; live refunds, disputes and remedy workflow are missing. |
| G28-46 | In progress | Encrypted treasury configuration exists; compliant treasurer exports/import validation are unfinished. |
| G28-47 | In progress | Adversarial sandbox tests exist; full direct-link, real provider, refund and failure acceptance unverified. |
| G28-48 | In progress | Release checks exist; real merchant/treasurer approval and authorized live payment reconciliation are missing. |
| G28-49 | In progress | Account deletion/export exist; legal holds, protected object cleanup and retention/backup tests are incomplete. |
| G28-50 | In progress | Privacy-minimal operations counts exist; consent-based real analytics dashboard and retention tests are missing. |
| G28-51 | In progress | Automated keyboard/browser tests exist; actual assistive-technology audit across released flows is missing. |
| G28-52 | In progress | Cross-browser screenshots exist; approved reference visual comparisons and exceptions are incomplete. |
| G28-53 | In progress | Images optimized; measured LCP/INP/CLS, load/fault and bundle acceptance not done. |
| G28-54 | In progress | Owner deferred paid external review; substantive complete AI source/security assessment and applicable controls still pending. |
| G28-55 | In progress | Outbox retry tests exist; backup restore rehearsal, custody and measured recovery acceptance missing. |
| G28-56 | In progress | Registry/deployed SHA hooks exist; live Engine Room refresh/failure/stale behavior unverified. |
| G28-57 | In progress | Partial staging checks exist; complete release rehearsal across real configured services unverified. |
| G28-58 | In progress | Policy source reader exists; final videos, bill/links and publication signoff missing. |
| G28-59 | In progress | Private previews live; public origin, signup/mail, current materials and live fundraising unavailable. |
| G28-60 | In progress | Handoff docs exist; full live release walkthrough, final status and operational owners incomplete. |
| G28-61 | **Accepted** | `docs/operations/PRIVATE_REVIEW_ACCEPTANCE_20261012.md`, `tests/review-accounts.test.mjs`, `tests/browser/review-journeys.mjs` |

## Remaining production launch blockers

- The public site and volunteer portal remain password-protected previews; production domain/indexing/HTTPS release has not been verified.
- Real volunteer registration is disabled and the portal reports mail delivery disabled. No live verified-email new-volunteer journey has passed.
- `content/materials/current.json` is empty; there are no published reviewed volunteer guides.
- Final three issue videos and canonical Garden/Cornerstone URLs are still not configured, and Kirk–Evers is a discussion draft.
- Owner successfully reached Stripe sandbox card checkout. A signed real test-card `checkout.session.completed` receipt, real merchant approval, live settlement and approved financial controls are separate and outstanding.
- Team/event coordination, sensitive submissions, comprehensive staff operations and full E2EESA implementation remain incomplete; those must not be represented as available.

## How to maintain this registry

`registry/prs.json` is the sole canonical PR-to-work-unit mapping; `docs/PR_REGISTER.json` supplies the actual acceptance criteria and statuses. Historical `.exechub` files and the retired `registry/roadmap.json` are not independent authoritative registries. A later agent must check merged PRs, code, green tests and relevant actual deployment before promoting any unit, and change the two registries together. A passing synthetic browser journey cannot replace live email, published source documents or payment settlement evidence. Every incomplete package above records its particular missing requirement. This audit does not claim an independent human certification.
