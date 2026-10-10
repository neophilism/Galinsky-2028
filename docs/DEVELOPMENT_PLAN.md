# Galinsky 2028: Comprehensive Development Plan

**Repository:** `neophilism/Galinsky-2028`  
**Campaign:** Phillip Galinsky for America 2028  
**Slogan:** Justice for All  
**Version/date:** 1.0 / 10 October 2026  
**Scope:** Approved marketing design plus a complete volunteer platform, integrated fundraising, administration, E2EESA-scoped security, deployment and operations.  
**Delivery state:** Planning specification. The repository read during this planning session reported empty. None of the work packages below is claimed implemented, merged, deployed or independently reviewed by this document.

## 1. Objective and governing decisions

Build the approved site, not a new visual interpretation and not a bare-bones software dashboard. The candidate and his governing philosophy must be as compelling as the policies. The public pages should feel like one confident national campaign: a white background, Old Glory red and blue, large typography, a real candidate portrait, substantial imagery, clear explanations and direct invitations to act.

The governing priority order is: the owner's explicit requirements and subsequent amendments; the approved mockup/layout package; approved current campaign source content; this implementation plan; then ordinary implementation choices documented in decision records. Security, accessibility and truthful disclosure are acceptance conditions, not excuses for a generic redesign.

The latest explicit amendment is mandatory: **each individual issue page must have a large video at the top.** The original screenshots do not override this amendment. Implement the component now with empty real-video configuration; the owner will provide three YouTube links in a later development session.

The three launch issues are **Kirk-Evers, The Garden and The Cornerstone**. The system must support future issues, but must not expose the other historical policy kits as additional launch positions. The approved homepage explains the debt of injustice: actual wrongs can leave continuing losses, and government has a responsibility to repair them without creating a new injustice. Preserve that principle across political disagreements without inventing candidate achievements, policy guarantees, legislation or endorsements.

### 1.1 What the delivered product includes

The eight approved essential views are home, issue overview, three issue pages, public volunteering, volunteer workspace and donation flow. Production adds the pages needed to make those views real: account/verification/recovery, document readers, training, tasks, forms, teams/events, support/reporting, donor management, editorial/volunteer/finance administration and privacy/accessibility/contact pages.

The public marketing site, volunteer operations and fundraising are related but have different trust and data boundaries. A visitor can read the whole public platform without joining. A verified volunteer gets immediate access to current volunteer materials without manual staff approval. Access to materials does not authorize restricted fieldwork. A donor does not have to become a volunteer or join a mailing list.

### 1.2 Explicit exclusions

Do not add a new campaign social network, supporter/voter surveillance database, scraped contact lists, demographic political targeting, automatic mass calling/texting, AI-generated personal persuasion, merchandise store, native mobile app, custom credit-card vault, or autonomous legal/FEC filing system. There is no need for a rotating hero carousel or a new visual theme. No third-party ad pixels, session replay or hidden profiling belong in this implementation.

Approved external manual outreach tools may be linked/integrated only under current campaign authorization. The platform can manage readiness and lawful task handoff without pretending an unprovisioned calling or election system already exists.

## 2. Approved source baseline and content readiness

`docs/design/ASSET_REGISTER.json` records hashes of the supplied mockup ZIP, design PDF, desktop/mobile boards, original portrait and volunteer archive. The ZIP includes working prototype source, eight desktop and eight mobile captures, original concept illustrations, design notes, source notes and prototype-only QA records. Those QA records are historical prototype evidence, not production tests.

The volunteer archive identifies itself as **Edition 1.0, September 2026**. Direct inspection confirms 36 Markdown documents, 36 Word counterparts, two principal PDFs and one orientation deck. It contains twelve role playbooks and seventeen policy action kits. It does not contain a Kirk-Evers kit. Garden/Cornerstone and their derived messaging must be reconciled with current campaign decisions. The compiled manual duplicates material and must not pollute ordinary search results.

Treat the archive as the supplied baseline, not proof that no newer edition exists. Preserve original bytes and provenance, then publish reviewed current versions. The archive's `galinsky2028.us` domain reference is a source reference, not verification that the campaign currently controls its DNS or that it is the production destination.

**Repository-publication warning:** the mockup ZIP embeds the complete volunteer archive, a `source/` directory and `materials.js`. Do not upload the whole prototype blindly to a public repository or CDN. Import public-safe design assets/code and screenshots; preserve restricted source material in durable authorized storage with a manifest. Repository access and website access are different security boundaries. A public GitHub file cannot meaningfully be described as restricted to signed-up volunteers.

## 3. Design specification and visual acceptance

### 3.1 Tokens and composition

Use the approved tokens: blue `#0A3161`, red `#B31942`, white `#FFFFFF`, ink `#112C50`, muted text `#56657A`, border `#DCE3ED` and pale surface `#F3F6FA`. Preserve the approximately 1240px content width, spacious sections, strong headline weight, rectangular buttons/cards, original flag mark and navy/red/white section rhythm. Small-screen spacing must be derived from the supplied source CSS rather than guessed.

Use the supplied portrait, optimized into responsive derivatives; do not replace or alter the face or gesture. Preserve the pointing hand and upward direction in hero crops. Keep the original issue illustrations identified as concepts rather than photographs of real implemented projects. Add further real candidate photography only when supplied/approved with rights and consent.

Use the original typography stack as the visual baseline. Any web font must have an appropriate license, be legally acquired during development, be self-hosted where approved and have tested fallbacks. This planning package does not distribute font files.

### 3.2 Motion

The primary headline and calls to action stay visible and stationary. Red/blue network dots resolve into a flag behind the portrait; the portrait scales only subtly. Pause/resume, reduced motion, hidden-tab suspension, off-screen suspension and a no-JavaScript still composition are mandatory. Do not autoplay audio or load a background-video service. Accessibility criteria include motion controls and non-flashing behavior. [R6]

### 3.3 Page contracts

| View | Required production behavior |
|---|---|
| Home | Candidate-forward hero; philosophy/debt of injustice; three issues; real candidate introduction; volunteer invitation; working donation amount/frequency entry; complete disclosures; meaningful footer. |
| Issues | Exactly three launch issues, illustrated and concise; consistent justice principle; clear links to their detail pages; future issues handled by publication state. |
| Kirk-Evers | Compact title and large video first; extended summary; mechanism; safeguards; FAQ; accessible approved bill, versioned downloads and supporting sources. |
| The Garden | Compact title and large video first; current extended summary and safeguards; multiple contextual links to one verified canonical dedicated site. |
| The Cornerstone | Compact title and large video first; current extended summary and safeguards; multiple contextual links to one verified canonical dedicated site. |
| Volunteer | Approved marketing layout; all twelve roles; three-question finder; clear operating lanes; short real signup and optional communications consent. |
| Workspace | Approved sidebar/dashboard; useful first action; checklist; roles; current materials/search; training; task/activity status; bookmarks; real progress. |
| Donate | Approved candidate/layout shell; processor-owned secure payment fields; accurate choice/eligibility/designation; receipts, recurring controls and honest errors. |

New operational/admin screens reuse the same design system, but do not force the public website to resemble an administrative console. At ordinary mobile widths, stack the content without hiding essential features. Test from 320px through large desktop, keyboard and zoom/reflow.

## 4. Large issue videos: exact behavior

Use one component, `IssueVideo`, with separate records for `kirk-evers`, `garden` and `cornerstone`. Place it after the compact breadcrumb/title/one-line introduction and before the extended policy explanation. On desktop it spans the main reading container, not a small sidebar; use a full-width 16:9 box and generous surrounding space. On mobile it fills the available width without horizontal overflow. Reposition the existing concept illustration below/within the summary so it does not push the video far down the page.

Example content shape (configuration only, not production code):

```json
{
  "issueId": "kirk-evers",
  "video": {
    "provider": "youtube",
    "videoId": null,
    "status": "unconfigured",
    "title": "Phillip Galinsky on Kirk-Evers",
    "posterAssetId": null,
    "transcriptDocumentId": null,
    "accessibilityReviewStatus": "pending"
  }
}
```

Accept recognized YouTube URL formats through a strict parser and normalize to the validated ID; never embed arbitrary supplied HTML. Use a locally hosted approved poster and play control. With no configured video, display an honest large preview placeholder with no broken iframe or unrelated sample. Admin can save/preview/publish each link without code changes.

Before activation there must be no request to YouTube/Google, including thumbnails, preconnects and player scripts. After an explicit play/consent action, use the supported privacy-enhanced embed, controls, fullscreen and a player-compatible referrer policy. Explain that activating an external video sends information to that provider; privacy-enhanced mode is not anonymous viewing or E2EE. [R5]

Provide accessible title, captions reviewed for accuracy, transcript and audio description where needed under the applicable criteria. Do not assume a transcript is a universal substitute for captions/audio description. Handle private/deleted/age-restricted/non-embeddable/unavailable videos with a stable poster, explanation and a safe external-view link when meaningful. Do not falsely claim every external error can be detected without loading the player. A later link replacement must pass publication checks but never require redesign.

## 5. Architecture and implementation defaults

### 5.1 Stack

Use a TypeScript monorepo with **Astro and React islands for the public marketing site**, **React/Vite for the portal**, **Fastify for the portal/API host**, **Postgres on Neon**, and a small **Postgres-backed job/outbox worker**. Share typed contracts, design tokens, validation and content models. Astro's islands model suits a predominantly public static marketing experience while keeping interactive components isolated. Render supports the static-site deployment pattern. [R7][R8]

Use a maintained authentication library, with Better Auth as the baseline Fastify-compatible candidate, plus its reviewed supported passkey/verification mechanisms. Pin exact supported versions and recheck advisories during implementation; the plan does not promise that a current package version will remain secure forever. Do not write custom authentication or cryptographic protocols. [R9]

Use one Render static site and one portal/API web service initially, plus the existing Neon account/workspace with project-specific isolation and private object storage. A durable job runner may initially share the API deployment only if the process stays reliably available and leases/retries are proven; split it into a worker when reliability/load requires it. No Redis/search cluster/microservice fleet is required merely to launch this site.

### 5.2 Origins and trust boundaries

The public domain serves public marketing. A separate `volunteer.<verified-domain>` origin serves portal/admin/API with host-only secure cookies and no YouTube/payment/marketing scripts. Public `/volunteer` stays the marketing front door; its signup opens the branded protected origin. Public routes may link to a separate provider-owned donation origin or approved embedded checkout. Do not share broad domain cookies across public and protected surfaces.

Illustrative domains are placeholders until DNS ownership is verified. Use exact allowlists for hosts, CORS, redirects, frames and content destinations. The same design system does not mean the same script or data trust boundary. Browser-delivered E2EE still depends on authentic client code and endpoint security; a compromised script delivery path can steal plaintext/keys. Mitigate and disclose that threat rather than promising magical protection from malicious executing code.

### 5.3 Content publishing

The editorial database stores immutable content versions and approvals. A publication action builds a signed/versioned public content release, runs validation and triggers an atomic static deployment. The last good public release remains active on failure. The admin shows draft, approved and actually-live versions separately. Export the approved public release into repository-readable source artifacts so a new agent can reconstruct the site without chat history.

Volunteer restricted materials use authorized storage/API, not public static bundles. Maintain one canonical policy record/version and derive the public summary, current volunteer kit pointers and linked sources from it. Allow issue-specific wording while keeping factual policy definitions in sync. Content changes do not require an engineer for ordinary edits.

### 5.4 Persistence and API requirements

Recommended logical entities are accounts/sessions/devices; roles/grants; consent events; public content/releases; issues/videos/media/documents/versions; memberships; training/acknowledgments; tasks/claims/results; modules/verifiers/approvals; events/RSVPs; protected submissions/envelopes/recipient grants; audit events; outbox/jobs; finance configuration/events/projections/reconciliation/export records.

Every record has an ID, version, creation/update provenance and retention classification. Monetary values use integer minor units. Timestamps retain UTC and the relevant display/election time zone. Authorization is enforced for every operation and object, never solely in navigation. Transactions and idempotency protect task claims, RSVP capacity, webhook receipt and financial state. Use optimistic concurrency for editorial changes and schema-versioned content/envelopes.

API families cover authentication/verification, current materials/search/downloads, the caller's profile/progress, authorized tasks/modules/events, protected submissions, administrative publication/operations and processor webhooks. Generate typed clients/OpenAPI contracts from validated schemas. Never accept client-selected staff roles, arbitrary redirect URLs, raw executable content, payment status or claimed account ownership as authority.

Use appropriate pooled runtime database connections and a least-privilege migration role; verify direct-versus-pooled requirements for the chosen driver and migration tools. [R10] Row-level security may supplement application authorization but is not its replacement, and session/transaction context must be safe with pooling.

## 6. Complete volunteer functionality

### 6.1 Signup and accounts

Collect the minimum: name/display name as approved, verified email, jurisdiction at the granularity needed and optional role interests. Ask no voter ID, Social Security number, full birth date, ancestry, medical history or immigration documents. Do not repurpose donor eligibility attestations into a blanket volunteer eligibility rule. Jurisdiction/activity-specific requirements belong in reviewed modules. Youth participation/safeguarding is a campaign policy input; collect no minors' sensitive data or unsupervised activity permissions by accident.

Verification grants immediate access to every current volunteer-facing document. Core acknowledgment/training can gate performing tasks, not reading materials. Support login, passkeys, sessions, signout, consent preferences, profile changes, lost-device recovery states, account closure and understandable errors. Account access and cryptographic access are separate.

### 6.2 All twelve roles

Implement Personal Network Organizer; Digital Ambassador; Issue Ambassador; Canvassing and Tabling; Phone and Text; Event Host; Recruiter and Onboarder; Local Team Captain; Ballot-Access Petition; Voter Registration/GOTV/Election Day; Small-Dollar Fundraising; and Skills and Operations. Each has a current playbook, first action, estimated effort, prerequisites, approved material/tool, stop conditions and completion/report path.

The role finder uses time, preferred activity and willingness to train, never demographics or inferred political beliefs. It explains its recommendation and allows any role to be browsed. Sharing is limited to approved public links; private volunteer or supporter data must not be copied to personal spreadsheets or external AI systems.

### 6.3 Materials, training and tasks

Build searchable HTML first, with stable links, accessible headings/TOC, related materials, date/version/reviewer status, optional PDF/DOCX downloads and printable forms. Current views exclude stale, withdrawn and unpublished kits. A separately labeled authorized archive preserves provenance. Search the current library, not the duplicate compiled manual plus the same constituent documents.

Workspace state includes first-hour checklist, bookmarks, reading/training progress, role preferences, relevant tasks, safe activity status and notifications of changed guidance. Training records differentiate read, acknowledged, self-completed and independently verified states. No badge is a substitute for legal authority.

Tasks support available/claimed/in-progress/submitted/verified/withdrawn status as appropriate, rechecking current modules at action time. Reports use anonymous aggregate outcomes about contacts, not named political opinions. Signed-in volunteer reports may identify the submitting volunteer; say so rather than promising perfect anonymity.

### 6.4 All twelve worksheets

Convert the one-hour action card, three-line debrief, conversation practice card, event plan/run of show, call-bank party checklist, content/creative QA, policy research source card, correction record, state activation sheet, petition custody log, incident first-response card and weekly team plan. A local worksheet need not send data to a server. Every stored field needs a purpose, recipient and retention decision.

### 6.5 Authorization, teams and field operations

The universal green/yellow/red model is executable product behavior. Low-risk green actions are available after the relevant core acknowledgment. Yellow actions require a current approved tool and instructions. Red actions require the correct current module and approvals; no general packet activates them.

A module identifies exact jurisdiction/election/activity, official sources, allowed process, required forms/tools/training, dates/deadlines, custody/privacy rules, two distinct qualified verifiers, publisher approval and review expiry. Expired/revoked/mismatched modules fail closed and say why. Tools that cannot honor suppression/opt-outs must pause affected outreach. Do not generate national legal rules from stale packet text.

Teams, captain assignments, orientation/events, RSVP/cancellation, confidential incident reporting, content correction and support are included. No public volunteer directory or personal-location map is included. Staff authority is scoped by function/team; technical administration alone grants no decryption or finance access.

## 7. Fundraising implementation and controls

### 7.1 Provider boundary and user experience

Evaluate Anedot first, but choose only after validating the real account's supported capabilities, committee onboarding, current fees and required control coverage. The processor owns all card-entry fields and payment credentials. Use supported branding/embedding to match the approved shell; cross-origin fields cannot be restyled arbitrarily. A secure clearly labeled hosted fallback is preferable to breaking the payment boundary to achieve a pixel match.

Home-page amounts/frequency lead into the same approved flow as the dedicated donate page. Default to one-time, personal-credit-card giving. Any recurring schedule requires an explicit choice, clear terms and a working cancellation path. No ACH, crypto, cash, debit/business payment expansion or wallet option is silently enabled contrary to the personal-credit-card policy. Verify practical processor enforcement and retain donor attestations/treasurer review: software cannot prove citizenship, source of funds or card ownership from a checkbox.

The campaign-supplied text is preserved in `docs/DONATION_COPY.md` and the appendix. Add the accurate committee paid-for disclaimer and applicable contributor-information notice. Keep the supplied rules visible, readable and close to the form, without making the page ugly. A suggested 14-16px design treatment is not a legal safe harbor; counsel/treasurer must approve actual presentation. [R1][R3]

### 7.2 Effective rules and truthfulness

Do not hard-code a 2028 limit based on an earlier chart. Store effective dates, election designations and rules as approved configuration, including the correct approach for this candidacy's election path. The FEC page inspected for this plan still presents 2025-2026 values; it is not proof of a later-cycle limit. [R2]

Version campaign restrictions separately from statutory restrictions. Preserve the minimum age 18, no PACs and all the stated source exclusions even where a campaign choice is stricter than general law. Do not treat a donor's residence/IP outside the country as proof of foreign-national status or an email address as a unique legal donor identity.

Cover other/offline contributions, concurrent checkout, direct provider URLs and recurring installments in aggregation. Browser-only limits are bypassable. Missing reconciliation or an unsupported recurring cap must produce an explicit safe policy, blocked feature or review queue, not a claim of guaranteed compliance. Do not invent bank/committee registration facts.

### 7.3 Events, ledger and donor service

The provider callback, not a browser thank-you URL, establishes payment state. Anedot currently documents HMAC-SHA256 verification through `X-Request-Signature`; implement against exact raw body bytes and revalidate the current contract. [R4] Authenticate the expected account/action page, persist before acknowledging, deduplicate and protect against reordered/replayed events. Do not assume a timestamp exists in the signed payload; fetch authoritative state or reconcile where ordering is ambiguous.

Keep an append-only financial event record and reconciled projections for gross donations, fees, payouts, designations, refunds, disputes and recurring commitments. Minimize exported provider payloads; do not log donor addresses or full raw payloads by default. Store only necessary card metadata, never PAN/CVV. Treasurers need audited corrections, best-efforts follow-up, exception handling, receipts, controlled exports and report reconciliation. The site does not automatically submit FEC filings.

Donors can obtain receipts and manage/cancel recurring contributions without becoming volunteers. The processor is authoritative for payment-method changes. Link donor/volunteer accounts only through optional verified consent, never because emails happen to match. Live charges/refunds require actual authorization; test-mode success is not permission to charge anyone.

## 8. E2EESA implementation, privacy and data boundaries

The observed upstream reference on 10 October 2026 is commit `6ec85d51f9207da31f0e90fd8a7c82ffff8448f6`. Its README identifies development toward `0.9.0-rc.2` after audit remediation and says that the development tree is not a production-certification basis. This is a source observation, **not** a mandate to deploy that revision as approved cryptography. Recheck/pin the appropriate reviewed basis and record exact applicable component/flow profiles. [R11][R12]

| Data/flow | Intended treatment | What must not be claimed |
|---|---|---|
| Published policies/images/bill | Intentionally public; signed/versioned publication, integrity and secure delivery. | That public material is confidential E2EE. |
| General volunteer training | Authenticated distribution of reviewed campaign material; classify as non-sensitive unless specifically restricted. | That login or public-repo hosting makes it cryptographically private. |
| Account email and delivery metadata | Minimal declared service processing; least privilege, encryption at rest/in transit, retention and disclosure of providers. | That an email provider cannot see the address it must deliver to. |
| Sensitive volunteer profiles/reports/notes | Encryption on the submitting authorized endpoint to identified volunteer/campaign recipient endpoints under a reviewed profile. General hosting stores ciphertext and declared metadata. | That a server key or generic HTTPS is client-to-recipient E2EE. |
| Donor information/payments | Intentional processing by approved processor and authorized committee finance systems; required reporting/retention. | That financial processing/FEC disclosures are private donor-to-candidate E2EE. |
| YouTube playback | Optional explicit third-party activation on public pages only. | Anonymous viewing or absence of disclosure after activation. |
| Audit/monitoring | Minimal event identifiers/status/timestamps, access-controlled where necessary. | Immutability, zero metadata leakage or anonymous operation without evidence. |

Protected content requires recipient authentication, secure device enrollment, key-change handling, record/context binding, revocation, controlled export and an explicit recovery policy. No provider silently becomes an authorized content recipient by relabeling a service. New staff membership must not silently confer historical decryption. Missing/failed cryptography never falls back to plaintext.

Use vetted implementations and exact protocol pins. Do not invent a password-derived AES wrapper and call it the standard. A web app cannot promise to erase copies already downloaded or undo endpoint compromise. Private content must stay out of server search indexes, embeddings, logs, crash reports, analytics, email previews and public support tickets. Public/admin file sanitization does not justify decrypting private attachments at the server; protected attachments require separately reviewed recipient-side handling.

Independent-review and production-eligibility gates remain separate from schema validity, fixture tests and merges. Continue safe engineering while a review is pending; create the exact review packet and hold only the dependent production flows. Never label the whole website certified because one component passed configuration tests.

## 9. Nontechnical administration

The administrator must be able to edit public copy, replace each video, manage media, publish/rollback issues, update canonical links, upload/review documents, manage current materials, create tasks, schedule orientation/events, assign scoped staff, review modules, pause activity and inspect operational health. A treasurer has separate finance tools; safety recipients have separate confidential report access.

Common operations must not require GitHub, SQL or deployment-console editing. Sensitive changes require the appropriate role, step-up and approval. The publishing UI displays draft/approved/live versions and the reason a release is blocked. Every admin operation has an audit trail with protected content omitted. Bulk exports and destructive operations are explicit and narrowly authorized.

## 10. Acceptance, testing and quality budgets

Tests exist at unit, schema/contract, database integration, real-browser, visual, accessibility, security, provider-sandbox, recovery and deployed-smoke levels. Fixtures are synthetic. Required scenarios include every public route, all three top videos, signup/verification/replay, current-material access, stale/private material denial, staff scope, task/module expiry, every worksheet, team/event capacity, encrypted report exchange, content publish/rollback, donation tampering/duplicates/recurrence/refunds and infrastructure failure.

Visual comparisons use the supplied eight-view desktop/mobile source baseline plus the mandatory video amendment. Freeze motion for deterministic screenshots, but test motion separately. Do not accept snapshot changes without explaining the design difference. Test current Chromium, Firefox and WebKit/Safari, and actual mobile/browser behavior where available.

Target WCAG 2.2 AA with both automated and manual evidence. [R6] Proposed performance budgets are p75 LCP <=2.5s, INP <=200ms and CLS <=0.1, assessed with sufficient real field data after launch; prelaunch lab conditions must be recorded. Aim for <=100KB compressed initial marketing JavaScript excluding user-activated third-party content and avoid eager full-resolution images. These are project targets, not results already observed.

Suggested runtime target: 99.9% monthly availability for account/API functions if the approved hosting tier supports it. Suggested starting recovery goals: ordinary operational-content RPO <=24h and RTO <=4h, with all accepted financial events recoverable through durable/provider records. Measure/adjust to actual tier and cost; do not promise high availability or point-in-time restore from an unverified free plan. Static public pages should continue serving during portal/provider outages.

Every work package requires code/content tests appropriate to its scope, docs, migration/rollback where applicable, and evidence mapped to requirements. Security-sensitive changes require meaningful review. No tests are disabled to make a PR green. A merged PR is not proof that a deployment exists or a business workflow is operational.

## 11. Environments, secrets, jobs and costs

Maintain separate local, staging and production databases, storage namespaces, auth settings, sending credentials and processor credentials. Never copy production data into previews/CI. Secrets are referenced by names in `.env.example`, not values; recipient E2EE private keys are not ordinary server environment variables. Use least-privilege service credentials and rotate any exposed credential.

Config categories include public/portal origins, database runtime/migration URLs, auth/session material, mail provider/sender, object store, processor/account/page IDs and webhook secret, approved content-release IDs and feature/release gates. Record the canonical actual resource IDs once provisioned, without inventing a workspace name or reusing another project's database.

Provision Render/Neon through existing authorized connected accounts where suitable. Prefer a static public site, modest portal/API compute and durable Postgres-backed jobs. A free static site does not make backend email/storage/recovery/payment fees free. Verify costs, sleep behavior, limits and backup retention before production; request only genuine funding/account decisions. Do not purchase services or initiate live charges under a generic implementation assumption.

Application jobs are actual deployed workers for mail, retries, reconciliation, expiry and cleanup. They are not promises that ChatGPT will work overnight. The user's ChatGPT development scheduler is off; do not restart it. Unattended operation requires a real configured runner with logs and an owner.

## 12. Work-package plan and dependencies

There are **60 initial planned work packages**, `G28-01` through `G28-60`. These are stable plan IDs, not predicted GitHub PR numbers and not an assertion of exact effort. A package may need more than one PR; it completes only when its acceptance criteria are met. Split work explicitly, preserve parent relationships and update the count/denominator without double counting. New scope belongs in the plan, not hidden in an untracked extras category.

| Phase | IDs | Outcome |
|---|---|---|
| A | 01-08 | Durable baseline, engineering foundation, security/data contract and Engine Room registration. |
| B | 09-18 | Visually faithful complete public campaign experience including three large issue videos. |
| C | 19-26 | Verified accounts, scoped security, reliable messages and current authorized materials. |
| D | 27-38 | Complete volunteer workspaces, training, tasks, forms, teams/events and administration. |
| E | 39-48 | Real fundraising provider integration, records, donor service and treasury controls. |
| F | 49-60 | Privacy lifecycle, quality/security review, recovery, monitoring, launch and handoff. |

Work in dependency order, not mechanically by numeric order. Start processor onboarding/capability validation (`G28-39`), content reconciliation and source collection as soon as their prerequisites exist. Public work can continue while keys, bills, external review or payment accounts are pending. Multiple agents can work on nonconflicting branches/contracts, but merges must remain coherent and deployable.

### G28-01 - Freeze the approved design and establish the complete handoff

**Dependencies:** None  
**Initial status:** Not started.

**Scope.** Import this plan, agent instructions, requirements traceability, decision log, content register and machine-readable PR register. Inventory the approved HTML/CSS, screenshots, portrait, illustrations and original volunteer archive with hashes. Preserve the issue-video amendment as a requirement that overrides the earlier screenshots. Inspect archive contents before repository publication; the prototype includes a complete volunteer source archive and materials.js.

**Acceptance.** An agent starting with only the repository can locate the governing design, every requirement, the next work package and all outstanding inputs. Public-safe design sources are available in the repo; restricted originals have durable authorized storage references, not temporary ChatGPT links. No volunteer archive, credential or sensitive source is accidentally committed.

**Evidence.** Inventory report, checksum verification, repository-publication review and a cold-start handoff exercise.

**External inputs.** None beyond the listed dependencies.

### G28-02 - Create the monorepo and mandatory CI

**Dependencies:** G28-01  
**Initial status:** Not started.

**Scope.** Set up Astro marketing, React/TypeScript portal, Fastify API/static portal host, shared UI/contracts/content/security packages, pnpm workspace and pinned supported Node/tool versions. Add formatting, lint, type checks, unit/integration/browser test runners, secret scanning, dependency review, branch rules and PR templates. Keep pending features behind server-side flags.

**Acceptance.** A clean checkout installs reproducibly and passes the documented verification command. CI tests the merge candidate; no production secret is available to untrusted PRs. Empty test suites and skipped security gates cannot be reported as passing implementation evidence.

**Evidence.** Lockfile, CI configuration, green bootstrap run and documented local setup.

**External inputs.** None beyond the listed dependencies.

### G28-03 - Build the exact design system and shared navigation

**Dependencies:** G28-02  
**Initial status:** Not started.

**Scope.** Extract the approved color, spacing, typography, button, card, form, sidebar, footer, responsive navigation and layout tokens. Preserve the original flag mark, white canvas and portrait-led visual hierarchy. Provide accessible focus, errors, loading, success and empty states. Use source CSS as the baseline rather than substituting a generic component theme.

**Acceptance.** Header/footer and representative components match approved desktop/mobile references. Keyboard navigation, skip link, menu state and focus restoration work. Legal text remains readable; an accessibility fix may improve a tiny prototype label without changing the design direction.

**Evidence.** Component gallery, screenshot baselines and keyboard/accessibility component tests.

**External inputs.** None beyond the listed dependencies.

### G28-04 - Establish runtime, databases and preview infrastructure

**Dependencies:** G28-02  
**Initial status:** Not started.

**Scope.** Create local Postgres setup, typed migrations, API error contracts, strict configuration validation, health/readiness endpoints and infrastructure-as-code for a Render static site plus portal/API service using Neon. Establish isolated development, staging and production configuration. Add a durable Postgres outbox/job abstraction and a preview deployment path; no real fundraising or volunteer data yet.

**Acceptance.** Migrations work on a fresh database and on an upgrade fixture. Startup rejects missing critical settings. Preview data is synthetic, credentials are isolated and health distinguishes process uptime from dependency readiness. Production resources are not purchased without an approved budget.

**Evidence.** Migration tests, preview smoke results, environment matrix and service resource inventory.

**External inputs.** Workspace access and any approved paid-resource budget are required to instantiate cloud resources, not to write and test the infrastructure.

### G28-05 - Define the E2EESA security and privacy contract

**Dependencies:** G28-01, G28-02  
**Initial status:** Not started.

**Scope.** Inventory every component, data field, recipient, integration, export, log and storage path. Pin the reviewed E2EESA source basis and identify the exact applicable profiles and upstream remediation/review dependencies. Write threat model, privacy/retention matrix, browser trust boundary, account-versus-key recovery behavior and security claims register. Separate public content, restricted training, protected volunteer content, identity metadata and intentionally disclosed financial processing.

**Acceptance.** No TLS-only or provider-managed encryption is called E2EE. The build can identify every protected flow and its intended recipients. Missing upstream production evidence blocks protected production use but not public UI development. Unknown capabilities fail closed instead of selecting a weaker fallback.

**Evidence.** Component/data-flow inventory, profile decision record, egress matrix, release-gate specification and reviewer handoff requirements.

**External inputs.** Production profile eligibility and required expert review remain independent gates; they are not presumed satisfied by this plan.

### G28-06 - Implement versioned content and publication contracts

**Dependencies:** G28-04, G28-05  
**Initial status:** Not started.

**Scope.** Add schemas and persistence for campaign copy, issues, videos, documents, approved links, legal copy, media and content releases. Use sanitized Markdown/structured blocks, not executable author-supplied MDX. Implement draft/review/approved/published/superseded/withdrawn states with immutable versions, role-scoped approvals and rollback. A published immutable release feeds the static site; repository exports preserve approved public content for handoff.

**Acceptance.** Unapproved documents cannot enter a public release or volunteer current-materials view. Publishing is atomic; stale edits cannot overwrite newer versions. A failed build leaves the previous public release live. No second manual copy of policy definitions is needed for volunteer summaries.

**Evidence.** Schema tests, publication state-machine tests, rollback fixture and source-to-release traceability.

**External inputs.** None beyond the listed dependencies.

### G28-07 - Implement media, document and provenance handling

**Dependencies:** G28-03, G28-06  
**Initial status:** Not started.

**Scope.** Add portrait derivatives, local concept illustrations, responsive image sizes, focal points, asset rights/consent fields, alt text, upload limits and content hashes. Split public assets from authenticated or encrypted objects. Scan and sanitize public editorial uploads; reject active SVG/HTML and deceptive MIME types. Retain original sources with explicit publication status.

**Acceptance.** The real candidate likeness and pointing pose are preserved. No public asset or ZIP exposes restricted source materials or metadata. Every displayed/downloadable asset has a rights record, correct content type and accessible alternative. Portrait and illustration loading does not shift layout.

**Evidence.** Asset register, malicious-upload tests, image comparison and download authorization tests.

**External inputs.** None beyond the listed dependencies.

### G28-08 - Register the project and its full plan in Engine Room

**Dependencies:** G28-01, G28-02  
**Initial status:** Not started.

**Scope.** Inspect the current Engine Room ingestion/schema rather than copying an outdated manifest. Register Galinsky 2028, this repository, all 60 work-package IDs, dependencies, plan location, preview/production fields and blocked-input categories. Supply the adapter/manifest it actually accepts, including .exechub/project.yml where applicable.

**Acceptance.** Engine Room shows planned work before PRs exist. Green means accepted/merged planned work, yellow means implemented but not yet accepted/merged work, and empty means not implemented. New planned work increases the denominator. Deployment and security readiness are separate from merge progress.

**Evidence.** Manifest validation, ingestion test and an observed Engine Room project entry; screenshots alone are not the data source.

**External inputs.** None beyond the listed dependencies.

### G28-09 - Build the complete candidate-forward homepage

**Dependencies:** G28-03, G28-06, G28-07  
**Initial status:** Not started.

**Scope.** Reproduce the approved hero composition, Justice for All statement, promise strip, debt-of-injustice explanation, three issue cards, candidate introduction, volunteer invitation, donation area and footer. Keep factual biography entries source-backed. Make all calls to action real routes/anchors, even while transactional features remain disabled in preview.

**Acceptance.** The full page matches the approved section order, visual balance and mobile stacking. Exactly three launch issues appear. The philosophy is readable without video, animation, third-party requests or JavaScript. No invented achievements, endorsements, crowds or campaign statistics are added.

**Evidence.** Desktop/mobile screenshots, link checks, semantic heading tests and source-to-copy review.

**External inputs.** None beyond the listed dependencies.

### G28-10 - Implement the network-flag hero motion

**Dependencies:** G28-09  
**Initial status:** Not started.

**Scope.** Recreate red/blue dots and connecting lines assembling into the flag, with a subtle portrait-scale cycle. Prefer lightweight SVG/canvas/CSS over a large animation library. Add an obvious pause/resume control, persistent local motion preference, reduced-motion still state and off-screen/background-tab suspension.

**Acceptance.** The headline and buttons never rotate away or move out of reach. Animation is decorative, silent and non-flashing; it stops when requested and remains paused across navigation. Low-power/mobile behavior and disabled-JavaScript still composition remain attractive.

**Evidence.** Motion-state tests, reduced-motion screenshots, CPU/long-task measurements and mobile visual review.

**External inputs.** None beyond the listed dependencies.

### G28-11 - Build the issues overview and extensible issue collection

**Dependencies:** G28-06, G28-07, G28-09  
**Initial status:** Not started.

**Scope.** Reproduce the approved illustrated overview of Kirk-Evers, The Garden and The Cornerstone, common principles, short summaries and distinct issue links. Implement an ordered published-issue collection that can add future issues without redesigning navigation or hard-coding the count.

**Acceptance.** Only the three launch records are published. A draft fourth issue never leaks through search, sitemap, navigation or API projections. Each card has one clear destination and accessible illustration treatment.

**Evidence.** Collection/publication tests, links and desktop/mobile snapshots.

**External inputs.** None beyond the listed dependencies.

### G28-12 - Build the large top-of-page YouTube component

**Dependencies:** G28-03, G28-06, G28-07  
**Initial status:** Not started.

**Scope.** Implement one shared IssueVideo component and independent configuration for all three issues. Place a compact title/breadcrumb then a full-width 16:9 video panel before the extended summary. Store provider, validated video ID, approved poster, accessible title, transcript/captions references and publication state. Start all actual video IDs as null; do not insert demonstration videos.

**Acceptance.** All three issue pages visibly reserve a large video area at the top. There are zero YouTube/Google thumbnail, player, DNS-preconnect or script requests before visitor activation. Activation loads a privacy-enhanced player with controls, fullscreen and suitable referrer configuration. Invalid/unavailable videos, denied embeds and revoked consent have accessible fallbacks. Editing one video does not alter another.

**Evidence.** Network-interception tests, URL-parser adversarial tests, keyboard/screen-reader checks, no-video screenshots and documented later-link connection instructions.

**External inputs.** The three actual YouTube links, approved posters if different, and reviewed accessibility material are publication inputs. Missing links do not block component implementation.

### G28-13 - Build Kirk-Evers and the legislative document reader

**Dependencies:** G28-11, G28-12, G28-06  
**Initial status:** Not started.

**Scope.** Reproduce the approved summary, mechanism, safeguards, FAQ, source area and volunteer invitation beneath the large video. Add stable bill/version routes, accessible HTML text, section anchors, document metadata and PDF/DOCX downloads when approved sources exist. Show version and proposal status without claiming enactment.

**Acceptance.** Approved legislative text is preserved exactly in the source record; summaries do not silently replace it. Download links resolve to the stated version/hash, and older versions are clearly superseded. Missing files are honest preview placeholders, not dead or fabricated downloads.

**Evidence.** HTML-to-source comparison, bill anchor tests, download/hash checks, visual tests and legal-content review checklist.

**External inputs.** Approved publication bill and supporting documents are needed to publish the actual legislative library.

### G28-14 - Build The Garden issue page

**Dependencies:** G28-11, G28-12, G28-06  
**Initial status:** Not started.

**Scope.** Reproduce the approved extended summary, negotiated remedy, self-government, safeguards and questions. Link repeatedly and contextually to the canonical dedicated Garden site using one managed destination record. Use the current approved policy source, not the old volunteer kit as authority.

**Acceptance.** Large video is first major content. Links in the introduction, mechanism/source area and closing invitation resolve to the verified destination. The summary preserves voluntary participation, victim-negotiated repair and safeguards; no unapproved land, membership, eligibility or financing promise is introduced.

**Evidence.** Copy/source review, destination verification, broken-link tests and responsive screenshots.

**External inputs.** Verified Garden public URL and reconciled policy material are publication inputs.

### G28-15 - Build The Cornerstone issue page

**Dependencies:** G28-11, G28-12, G28-06  
**Initial status:** Not started.

**Scope.** Reproduce the approved explanation of government-caused livelihood loss and worker-owned replacement opportunity, mechanism, safeguards, FAQ and contextual links to its dedicated website. Drive both the public summary and volunteer explanation from the same approved policy definition.

**Acceptance.** Large video is first major content. The livelihood/material-effect test and approved scope remain intact; no blanket compensation entitlement is invented. Repeated external links use the verified destination, and missing links remain explicit in preview.

**Evidence.** Copy/source review, external-link checks and desktop/mobile screenshots.

**External inputs.** Verified Cornerstone public URL and current policy source are publication inputs.

### G28-16 - Build the public volunteer page and role finder

**Dependencies:** G28-03, G28-06, G28-11  
**Initial status:** Not started.

**Scope.** Reproduce the approved welcome, benefits, short onboarding explanation, three-question role finder, all twelve role cards, operating rules and brief signup form. Recommendations use explicit time, preferred activity and training willingness only. Make every role independently browseable and distinguish materials access from activity authorization.

**Acceptance.** All chooser combinations produce understandable recommendations with a neutral fallback. No demographics or inferred political traits are requested. Signup fields and privacy/consent copy match the data inventory; the form visibly remains preview-only until the real flow is wired.

**Evidence.** Chooser tests, all-role coverage, form validation and visual/accessibility snapshots.

**External inputs.** None beyond the listed dependencies.

### G28-17 - Build the donation UI and exact disclosure components

**Dependencies:** G28-03, G28-06, G28-09  
**Initial status:** Not started.

**Scope.** Reproduce homepage amount/frequency selection and the dedicated donation layout, with the complete supplied eligibility rules, restricted-source paragraph, committee explanation and tax statement. Keep disclosure content in one versioned component. Add contributor-information notice and sitewide paid-for disclaimer subject to treasurer review.

**Acceptance.** One-time is the default; no fee coverage, tip or recurring upgrade is preselected. Every supplied sentence is present beside or directly under the donation interface on desktop and mobile, not hidden solely in an accordion or footer. No card data is collected by campaign-owned fields.

**Evidence.** Exact-copy snapshot test, responsive legibility checks, amount/frequency state tests and inactive-preview boundary tests.

**External inputs.** None beyond the listed dependencies.

### G28-18 - Finish public navigation, SEO and essential information pages

**Dependencies:** G28-09, G28-11, G28-13, G28-14, G28-15, G28-16, G28-17  
**Initial status:** Not started.

**Scope.** Add privacy, accessibility, contact/help, donation-policy and error pages; canonical URLs, per-page metadata, social previews, sitemap and robots rules. Index only published public material; exclude portal/admin/staging and previews. Use valid truthful structured data and permanent public issue URLs. Keep external social widgets out.

**Acceptance.** All navigation works with descriptive titles, no orphaned issue pages and no fake contact channel. Staging is access-controlled/noindex; robots is not treated as authorization. Search/social descriptions do not expose draft policies or private material.

**Evidence.** Crawl report, metadata validation, noindex tests, error-state screenshots and contact-route ownership record.

**External inputs.** None beyond the listed dependencies.

### G28-19 - Implement real signup, email verification and authentication

**Dependencies:** G28-04, G28-05, G28-16  
**Initial status:** Not started.

**Scope.** Integrate a maintained authentication library with verified-email signup, passkey enrollment, session management, logout and account recovery states. Use single-use bounded verification tokens; avoid consumption by email-link scanners. Give verified volunteers immediate reviewed-library access. Separate optional marketing consent from essential account delivery.

**Acceptance.** A real new account can verify, sign in, sign out and return from another session without a staff approval queue for materials. Expired, replayed, tampered and scanner-opened links are handled safely. Account enumeration, abuse throttling, origin/CSRF checks and accessible recovery paths are tested.

**Evidence.** Authentication integration tests, mail delivery evidence in staging and full new-volunteer browser journey.

**External inputs.** An authorized sending domain and email provider credentials are needed for deployed mail delivery.

### G28-20 - Implement staff MFA and scoped authorization

**Dependencies:** G28-19, G28-05  
**Initial status:** Not started.

**Scope.** Add server-enforced permissions for volunteer, captain, coordinator, editor, publisher, module verifier/approver, safety reviewer, treasurer and security administrator. Require strong staff authentication and step-up for sensitive changes. Keep technical administration separate from decryption/financial authority. Use least-privilege database and service identities.

**Acceptance.** Changing client flags, route URLs, object IDs or API payloads never increases access. A captain cannot access another team, a publisher cannot read donor data and a technical admin cannot automatically decrypt volunteer records. Privilege changes and session revocation are auditable.

**Evidence.** Role-resource-action authorization matrix, negative IDOR/BOLA tests, staff enrollment and revocation tests.

**External inputs.** None beyond the listed dependencies.

### G28-21 - Implement approved recipient keys and device enrollment

**Dependencies:** G28-05, G28-19, G28-20  
**Initial status:** Not started.

**Scope.** Integrate the selected reviewed E2EESA implementation for recipient/device identity, authenticated key directory, key-change notices and enrollment. Pin the exact protocol/library versions and evidence. Separate authentication identity from cryptographic authority. Define authorized campaign recipient groups without silent future-member access.

**Acceptance.** Tampered or substituted recipient keys are detected according to the selected profile. A new/reset account does not inherit old verified keys. Private recipient keys are not stored in server environment variables. Unavailable or unsupported protection blocks protected submissions, not a silent plaintext fallback.

**Evidence.** Interoperability/test vectors, key-substitution tests, enrollment evidence and profile-conformance mapping.

**External inputs.** A suitable reviewed implementation/profile is a dependency; writing a novel cryptographic scheme is not an acceptable shortcut.

### G28-22 - Implement protected volunteer records and submissions

**Dependencies:** G28-21, G28-04, G28-05  
**Initial status:** Not started.

**Scope.** Add client-to-authorized-recipient encryption for sensitive volunteer profile fields, private reports, operational notes and protected attachments. Bind envelopes to record/type/version/recipient context using the reviewed implementation. Store only ciphertext plus declared minimal metadata on general hosting. Use restricted origins, restrictive CSP and no third-party scripts in protected views.

**Acceptance.** Database, logs, job payloads, support tools and object storage inspections show no protected plaintext. Unauthorized recipients cannot decrypt. Updates cannot swap envelopes between records, replay stale versions or expand recipients without authorization. Loss of network/key access gives an explicit recoverable error.

**Evidence.** Plaintext-canary tests, recipient/record-binding tests, egress traces and storage/log inspection evidence.

**External inputs.** None beyond the listed dependencies.

### G28-23 - Implement recovery, revocation and controlled export

**Dependencies:** G28-21, G28-22  
**Initial status:** Not started.

**Scope.** Implement the selected key recovery/no-recovery policy, trusted-device changes, emergency revocation, backup-generation handling and explicit item/recipient export authorization. Expose understandable warnings for irreversible key loss and previously downloaded copies. Require step-up and audit for authorized bulk exports.

**Acceptance.** Email reset, support override or role reassignment cannot silently restore old cryptographic trust. Revoked users receive no new protected content; the UI does not promise to erase retained old copies. Exports are scoped, authorized and absent from ordinary analytics/email paths.

**Evidence.** Lost-device and account-takeover simulations, export negative tests, backup/restore key tests and readable user guidance.

**External inputs.** None beyond the listed dependencies.

### G28-24 - Implement consent-aware messaging and reliable jobs

**Dependencies:** G28-04, G28-19, G28-22  
**Initial status:** Not started.

**Scope.** Add transactional email templates, verification/welcome/security notices, user-controlled onboarding reminders, separate opt-in campaign subscriptions, unsubscribe/suppression state and a transactional outbox. Use leased, idempotent retryable jobs with dead-letter handling and provider delivery callbacks. Protected reports trigger generic notices, never plaintext email summaries.

**Acceptance.** An outbox retry never creates duplicate account messages or resurrects an unsubscribe. Optional campaigning stops after opt-out without disabling essential account access. Bounces/complaints suppress correctly; recipient addresses and tokens are redacted in logs. Jobs survive process restarts.

**Evidence.** Retry/crash tests, suppression tests, delivery callback verification and evidence from staging email accounts.

**External inputs.** None beyond the listed dependencies.

### G28-25 - Import and reconcile the volunteer source edition

**Dependencies:** G28-06, G28-07, G28-05  
**Initial status:** Not started.

**Scope.** Inventory the 36 Markdown documents, 36 Word originals, two principal PDFs and orientation deck from Edition 1.0. Preserve immutable provenance. Reconcile Garden/Cornerstone, add a Kirk-Evers kit, refresh the universal core/messaging/onboarding as necessary and classify the fifteen other policy kits as unpublished reference unless separately approved. Classify owner-maintainer documents separately from volunteer-facing materials.

**Acceptance.** Every source item has a stable ID, version, intended audience, owner, review status and source hash. No historic packet becomes current legal guidance by import alone. All twelve roles remain represented. The compiled manual is not duplicated into normal search results.

**Evidence.** Import reconciliation report, document inventory, changed-policy crosswalk and content approval queue.

**External inputs.** Current policy sources/reviewer approval are needed for publication; ingesting an archive is not that approval.

### G28-26 - Implement the authorized materials library and reader

**Dependencies:** G28-19, G28-20, G28-25  
**Initial status:** Not started.

**Scope.** Provide searchable/filterable HTML materials, role/issue collections, table of contents, related resources, version history, current downloads and printable views. Serve library data/search/downloads only through the appropriate authenticated contract. Generate standard downloads from the same approved content where practical; retain original source versions separately.

**Acceptance.** Every verified volunteer can immediately access all current volunteer-facing materials without staff approval. Direct URLs, object keys, search APIs and static bundles do not bypass authorization. Superseded/withdrawn items are absent from default search. Sensitive records are not placed in a server plaintext search index.

**Evidence.** Full-library access and leakage tests, search relevance fixtures, accessibility checks and download/source version parity.

**External inputs.** None beyond the listed dependencies.

### G28-27 - Build the volunteer first-hour workspace

**Dependencies:** G28-26, G28-16, G28-24  
**Initial status:** Not started.

**Scope.** Reproduce the approved workspace sidebar, first action, starting checklist, current materials and activity-status panel. Add role preferences, bookmarks, last-read position, progress and resumable first-hour guidance. A visitor can change roles without losing access to other approved playbooks.

**Acceptance.** Progress persists across legitimate sessions and devices at the declared privacy level. A new volunteer sees a useful low-risk action, not an empty dashboard. No fabricated completion, attendance or activity counts are displayed; completion is identified as self-reported or verified.

**Evidence.** New/returning volunteer journeys, progress synchronization tests and desktop/mobile visual snapshots.

**External inputs.** None beyond the listed dependencies.

### G28-28 - Implement orientation, training and versioned acknowledgments

**Dependencies:** G28-26, G28-27  
**Initial status:** Not started.

**Scope.** Convert the orientation guide/deck into accessible navigable training, with transcript/slide-text equivalents, short knowledge checks and acknowledgments of the current universal core. Track training version, completion evidence and expiry only where relevant. Material changes prompt targeted re-acknowledgment.

**Acceptance.** All training remains readable immediately after signup. Completing a lesson is not represented as legal authority, certification or automatic activation of regulated activity. Training prerequisites gate task execution rather than hiding the entire library.

**Evidence.** Training state-machine tests, old-version acknowledgment tests and assistive-technology walkthrough.

**External inputs.** None beyond the listed dependencies.

### G28-29 - Implement jurisdiction/activity activation gates

**Dependencies:** G28-20, G28-25, G28-28, G28-06  
**Initial status:** Not started.

**Scope.** Create versioned state/jurisdiction/election/activity modules with official sources, permitted actions, eligibility/process rules, tools, training, start/end/review dates, custody rules, two distinct verifier records and campaign publication approval. Enforce green/yellow/red authorization server-side with expiry/revocation and emergency pause.

**Acceptance.** A worksheet, downloaded packet, expired module or one verifier cannot activate regulated work. Mismatched jurisdiction/election/activity, missing training, withdrawn approval or tool outage blocks the action with a clear reason. Every sensitive operation rechecks authorization; a stale open tab is not sufficient.

**Evidence.** Authorization decision-table tests, clock-boundary/revocation tests, two-verifier separation tests and admin audit evidence.

**External inputs.** None beyond the listed dependencies.

### G28-30 - Implement actionable tasks and activity reporting

**Dependencies:** G28-27, G28-28, G28-29, G28-22  
**Initial status:** Not started.

**Scope.** Create role-linked tasks with scope, estimated time, current material/tool, stop conditions, availability, assignment/claiming, completion and feedback. Include low-risk first actions, training tasks and module-gated field tasks. Collect aggregate results, not voter/supporter dossiers, and label the limits of anonymity for signed-in reporting.

**Acceptance.** Tasks cannot be claimed or completed outside current authorization. Race conditions cannot overbook exclusive assignments. Reporting excludes supporter identities and sensitive personal attributes; counts have validation and clear self-reported/verified provenance.

**Evidence.** Task concurrency tests, activity privacy fixtures, task lifecycle tests and volunteer-to-coordinator journeys.

**External inputs.** None beyond the listed dependencies.

### G28-31 - Convert every worksheet into an appropriate web tool

**Dependencies:** G28-22, G28-29, G28-30  
**Initial status:** Not started.

**Scope.** Implement web versions of the action card, three-line debrief, conversation practice, event plan/run of show, call-bank checklist, creative QA, source card, correction record, state activation sheet, petition custody log, incident first-response card and weekly team plan. Use local/no-save mode where submission is unnecessary; protected submission where needed. Offer accessible print/download views.

**Acceptance.** Each original form maps to a working typed form or intentionally local worksheet; none is merely a PDF embedded in an iframe. Required warnings and no-supporter-data rules remain. Custody logs use sheet identifiers rather than copying signatures or voter identities. Admin-only activation fields cannot be submitted by ordinary volunteers.

**Evidence.** Form-to-source coverage matrix, field/privacy validation, authorization tests and print layout checks.

**External inputs.** None beyond the listed dependencies.

### G28-32 - Implement local teams and captain coordination

**Dependencies:** G28-20, G28-22, G28-29, G28-30  
**Initial status:** Not started.

**Scope.** Add opt-in team membership, invitation/acceptance, scoped captain assignments, weekly plans, anonymous result summaries and authorized member contact handling. Do not publish a volunteer directory or precise private locations. Make leaving a team immediate and remove future access on role change.

**Acceptance.** Captains see only the minimum data and tasks of authorized members. Joining a team does not grant access to historic private records. Invite forwarding, revoked invites, self-promotion and cross-team enumeration fail safely.

**Evidence.** Team lifecycle tests, privacy/access matrix and revoked-captain browser journey.

**External inputs.** None beyond the listed dependencies.

### G28-33 - Implement events and orientation participation

**Dependencies:** G28-29, G28-31, G28-32, G28-24  
**Initial status:** Not started.

**Scope.** Provide approved orientation/event listings, accessible details, time zones, RSVP/capacity/waitlist/cancellation, attendee-only private details when appropriate and reminders. Support event-plan submission/review with venue, accessibility, safety and required authorization fields. Link to approved external meeting providers without exposing protected records.

**Acceptance.** Double booking/capacity races, cancellation and time-zone boundaries are handled. Public calendars never reveal private addresses or attendee identities. An RSVP does not authorize spending, contracts, permits, field operations or recording participants.

**Evidence.** Capacity/time-zone tests, privacy projections, cancellation notifications and event-host walkthrough.

**External inputs.** None beyond the listed dependencies.

### G28-34 - Implement secure incident, help and correction workflows

**Dependencies:** G28-22, G28-23, G28-24, G28-31, G28-20  
**Initial status:** Not started.

**Scope.** Route private incidents to named authorized safety recipients, content corrections to editors and ordinary help to the appropriate support role. Provide receipt/status, controlled replies and escalation without making emergency-response promises. Use a separate protected attachment quarantine/recipient-side review path; public document scanners must not decrypt private submissions.

**Acceptance.** Immediate-danger guidance is visible; the form is not described as emergency services. Reports do not appear in public logs, dashboards or email. Unauthorized staff cannot read a report. Corrections can supersede affected published material with traceable approval.

**Evidence.** End-to-end encrypted report/reply tests, attachment-handling threat tests and correction-to-publication audit trail.

**External inputs.** None beyond the listed dependencies.

### G28-35 - Implement approved sharing and campaign asset tools

**Dependencies:** G28-07, G28-26, G28-06  
**Initial status:** Not started.

**Scope.** Provide current share links, printable issue cards, campaign-supplied images, QR generation for approved public destinations, social-preview previews and simple copy-link functions. Preserve required disclaimers and asset usage terms. Personal sharing remains separate from official-account publishing.

**Acceptance.** QR codes resolve to approved stable public URLs, not private portal objects, expiring tokens or PII-bearing tracking links. Withdrawn assets are marked and removed from current collections. No automatic posting, supporter tracking or fabricated endorsement is introduced.

**Evidence.** QR decode/link tests, current-asset/version checks, image rights review and mobile share behavior tests.

**External inputs.** None beyond the listed dependencies.

### G28-36 - Implement official-tool handoffs for outreach roles

**Dependencies:** G28-29, G28-30, G28-24, G28-20  
**Initial status:** Not started.

**Scope.** Add an administrator-managed registry of approved tools for manual calling/texting, canvassing and other activated work. Support scoped assignments, current scripts, launch/deep links, tool health/status and opt-out reconciliation where an actual provider supports it. Require an integration capability review before enabling a connector; no fictitious API or native bulk-messaging engine.

**Acceptance.** All twelve roles have a usable instruction/task path. Roles requiring an unavailable tool are honestly unavailable, not mislabeled ready. No autodialer, artificial voice, ringless voicemail, bulk text, scraped list or personal export is enabled. Failed suppression sync pauses affected outreach.

**Evidence.** Connector contract tests, inactive-tool tests, opt-out failure scenario and role-to-tool readiness matrix.

**External inputs.** An actual approved outreach provider/module is required only to activate those activities. The platform must work normally for other volunteer roles.

### G28-37 - Build the nontechnical content/media administration UI

**Dependencies:** G28-06, G28-07, G28-20, G28-12, G28-25  
**Initial status:** Not started.

**Scope.** Provide friendly editing, preview, review, publication and rollback for homepage copy, issues, each YouTube URL/poster/transcript, canonical links, documents, legal text and media. Add change comparison, concurrent-edit protection and a publication readiness checklist. No GitHub knowledge is required for ordinary content changes.

**Acceptance.** A publisher can replace one issue video, fix a link or publish a reviewed document without a code change. The static public release updates atomically after a successful build; failed publication leaves the previous version intact. Legal/security-controlled fields retain their special approvals.

**Evidence.** Editor-to-publisher acceptance journeys, simultaneous-edit tests, build-failure rollback and content-version reconciliation.

**External inputs.** None beyond the listed dependencies.

### G28-38 - Build volunteer operations and support administration

**Dependencies:** G28-20, G28-27, G28-29, G28-30, G28-31, G28-32, G28-33, G28-34, G28-36  
**Initial status:** Not started.

**Scope.** Create role-scoped management of volunteers, teams, tasks, training, events, modules, approval queues, support cases and operational notices. Include emergency activity pause, membership revocation, training/module expiry and evidence links. Keep finance and safety content out of general dashboards.

**Acceptance.** Every administrative write is validated server-side and auditable; dangerous actions require step-up and explicit confirmation. Staff can operate all supported workflows through the UI without database edits. Counts reflect real records and never conceal blocked integrations.

**Evidence.** Full admin action matrix, abuse tests, coordinator/captain/safety role walkthroughs and scoped audit review.

**External inputs.** None beyond the listed dependencies.

### G28-39 - Validate the fundraising processor and actual account capabilities

**Dependencies:** G28-05, G28-17  
**Initial status:** Not started.

**Scope.** Evaluate Anedot first against the required hosted fields, personal-credit-card policy, recurring management, custom donor attestations, designation/limits, receipts, signed webhooks, exports, accessibility, branding, test environment, fees and committee onboarding. Record verified capabilities and gaps. Implement a narrow provider adapter contract and a fake provider for CI only.

**Acceptance.** Processor selection is evidence-backed, not an assumption. Direct hosted-page donations, recurring charges and offline contributions are included in the compliance feasibility review. No undocumented endpoint or CSS access to a cross-origin frame is assumed. A material capability gap is resolved before enabling affected features.

**Evidence.** Provider capability matrix, documented test/sandbox path, cost/onboarding record and treasurer selection decision.

**External inputs.** Committee-authorized processor account/KYC, treasurer identity, current service terms and approved costs are external inputs. Start this package early in parallel after its dependencies.

### G28-40 - Implement approved donation policy and election configuration

**Dependencies:** G28-39, G28-06, G28-20  
**Initial status:** Not started.

**Scope.** Create versioned treasurer-approved configurations for committee identity, election designations/dates, effective limits, campaign-specific exclusions, donor attestations, record fields, recurring caps and remedy workflows. Define authoritative aggregation across processor and offline records with concurrency handling and conservative reconciliation of uncertain identities.

**Acceptance.** No 2025-2026 number is hard-coded as a 2028 rule. Campaign choices such as age 18 and no PAC money are preserved without being mislabeled universal law. Stale/missing approval disables fundraising. Frontend checks are not the enforcement boundary; provider-direct and recurring paths are covered or explicitly blocked.

**Evidence.** Configuration approval tests, concurrency/cycle boundary fixtures, donor-identity ambiguity tests and treasurer-reviewed policy matrix.

**External inputs.** Treasurer/election-counsel approval of applicable rules is required before live fundraising.

### G28-41 - Integrate hosted checkout with the approved donation design

**Dependencies:** G28-17, G28-39, G28-40, G28-04  
**Initial status:** Not started.

**Scope.** Wire homepage amount/frequency selection and the dedicated donation page to processor-hosted fields or a reviewed embedded checkout. Keep the campaign-owned shell visually faithful; use supported theming for the secure form. Preserve amount, frequency, election designation and consent when entering checkout without leaking donor PII in URLs. Provide a trusted hosted fallback when embedding is blocked.

**Acceptance.** Card numbers/CVV never reach campaign servers, logs or analytics. Unchecked eligibility, invalid amounts or unapproved election configuration stop the flow. Closing/retrying/back navigation cannot silently duplicate a gift or switch its frequency. External handoff is clear and does not introduce a second unapproved recipient.

**Evidence.** Sandbox checkout journeys, iframe/hosted fallback accessibility, network inspection and amount/designation tampering tests.

**External inputs.** None beyond the listed dependencies.

### G28-42 - Implement authenticated, idempotent payment webhooks

**Dependencies:** G28-39, G28-04, G28-05  
**Initial status:** Not started.

**Scope.** Validate the provider signature over exact raw request bytes before JSON processing; enforce account/page allowlists, size bounds and supported event types. Durably accept events, deduplicate, redact/drop unnecessary donor fields and route financial changes into the outbox/ledger. Apply replay/state-order protections without assuming the provider supplies a signed timestamp.

**Acceptance.** Invalid signatures and wrong-account events never alter records. Duplicate, delayed, reordered and replayed valid events cannot double count or roll state backward. Server crash after receipt causes safe replay; success is never inferred from a browser return URL.

**Evidence.** Provider signature vectors, raw-body corruption tests, event-order/replay suite and webhook crash/retry evidence.

**External inputs.** None beyond the listed dependencies.

### G28-43 - Implement the contribution ledger and reconciliation

**Dependencies:** G28-40, G28-42  
**Initial status:** Not started.

**Scope.** Add append-only financial events and audited projections for gifts, fees, payouts, election allocations, refunds, disputes and recurring installments. Use integer minor units, unique provider identifiers and explicit made/received/settled dates. Reconcile with provider reports and the treasurer-authorized accounting source, including other contribution channels.

**Acceptance.** Ledger totals reconcile to source reports; missing/disputed events are flagged rather than concealed. Gross/net/fee totals are distinct. Name/email alone never establishes that two donors are the same. Correcting a record adds an audit event instead of overwriting financial history.

**Evidence.** Reconciliation fixtures, duplicate/partial refund cases, currency precision tests and treasurer comparison report.

**External inputs.** None beyond the listed dependencies.

### G28-44 - Implement receipts and recurring donor self-service

**Dependencies:** G28-41, G28-42, G28-43, G28-24  
**Initial status:** Not started.

**Scope.** Connect the processor donor portal or supported API for receipts, recurring schedule visibility, cancellation and supported payment-method updates. Keep donor and volunteer accounts independent; an optional explicit link must be verified. Disclose frequency, next charge and cancellation effect and respect provider authority for final state.

**Acceptance.** A donor can cancel through the documented working path without joining the volunteer system. Replayed clicks do not create new commitments. Recurring limits/expiry rules apply before future charges through a proven provider mechanism; unavailable enforcement is a launch gap, not hidden behavior.

**Evidence.** Create/renew/cancel/retry sandbox scenarios, receipt accuracy and unauthorized donor-portal access tests.

**External inputs.** None beyond the listed dependencies.

### G28-45 - Implement finance exception and remedy workflows

**Dependencies:** G28-43, G28-44, G28-20  
**Initial status:** Not started.

**Scope.** Provide treasurer-only review of suspect/prohibited/excessive gifts, missing contributor information, refunds, disputes, chargebacks, cancellations and authorized redesignation/reattribution records. Model deadlines from the approved ruleset and store documentary evidence. Use generic donor notifications and approved provider actions, not direct card handling.

**Acceptance.** An ordinary admin cannot refund, reallocate or access donor identity. Partial refunds and disputes reconcile correctly. Best-efforts follow-up is bounded and recorded; the software does not falsely certify legal sufficiency. Donor intent/election records are preserved.

**Evidence.** Exception lifecycle tests, deadline fixtures, role enforcement and treasurer-reviewed remedy scenarios.

**External inputs.** None beyond the listed dependencies.

### G28-46 - Implement controlled treasury reporting and exports

**Dependencies:** G28-43, G28-45, G28-23  
**Initial status:** Not started.

**Scope.** Generate treasurer-approved exports for the chosen accounting/FEC filing workflow, with review, reconciliation totals, schema validation and evidence references. Limit PII to authorized recipients, log exports and apply approved retention. Keep public campaign analytics aggregate only; do not create a public donor directory.

**Acceptance.** Exports reconcile to ledger/source reports and preserve required designation/receipt information. CSV formula injection and unauthorized/bulk extraction are blocked. No filing is submitted automatically and no export is labeled an accepted FEC filing.

**Evidence.** Export golden files, schema/total validation, injection tests and a treasurer import dry run.

**External inputs.** The treasurer must identify the actual accounting/filing system and approve its mapping.

### G28-47 - Harden and test the full donation system

**Dependencies:** G28-41, G28-42, G28-43, G28-44, G28-45, G28-46  
**Initial status:** Not started.

**Scope.** Exercise card-testing/abuse controls using provider-supported protections, rate limits and no sensitive fingerprinting. Test unavailable provider, stale rules, parallel donations, excessive recurring schedules, conflicting identities, cancellations, refunds, chargebacks, webhook exhaustion, reconciliation outage and accessible fallback.

**Acceptance.** The site never shows payment success before authenticated confirmation. Failure states preserve clear donor choices and never silently retry a charge. Direct hosted links obey campaign restrictions. All requested exclusions are accounted for through configuration, attestation and treasurer review without claiming perfect automatic detection.

**Evidence.** Donation threat-model review, adversarial/sandbox suite, error-state screenshots and data-leak inspection.

**External inputs.** None beyond the listed dependencies.

### G28-48 - Complete treasury and fundraising release acceptance

**Dependencies:** G28-47, G28-17, G28-40, G28-46  
**Initial status:** Not started.

**Scope.** Have the authorized treasurer verify committee identity, processor onboarding, bank/payout setup, disclosures, effective election configuration, donor-field collection, receipts, cancellation, remedies, exports, retention and reconciliation ownership. Record approval against the exact build/configuration and expiry/review triggers.

**Acceptance.** Fundraising cannot enable unless evidence and responsible contacts exist. A code/config change affecting compliance invalidates the relevant approval. Sandbox tests are distinct from any later expressly authorized small live transaction; developers do not charge a card merely to claim completion.

**Evidence.** Signed/attributed treasury checklist, configuration digest, processor acceptance evidence and documented live-test authorization process.

**External inputs.** Actual committee/treasurer decisions and credentials are required; developers cannot manufacture this approval.

### G28-49 - Implement retention, privacy requests and secure lifecycle cleanup

**Dependencies:** G28-23, G28-26, G28-34, G28-38, G28-46, G28-05  
**Initial status:** Not started.

**Scope.** Implement per-class retention, account closure, consent withdrawal, authorized data access/export, deletion jobs and legal holds. Delete expired temporary files, token records and cache entries safely. Treat required financial retention separately from ordinary profile deletion. Backups have documented expiry and key custody.

**Acceptance.** Account deletion never promises to erase legally retained finance records or downloaded copies. No one can request another persons data by changing an ID. Cleanup is restart-safe, logged minimally and tested against protected-object/key references and active legal holds.

**Evidence.** Retention/deletion fixtures, legal-hold tests, privacy-request identity checks and backup-expiry runbook.

**External inputs.** None beyond the listed dependencies.

### G28-50 - Implement privacy-preserving campaign measurement

**Dependencies:** G28-18, G28-27, G28-43, G28-05  
**Initial status:** Not started.

**Scope.** Add aggregate public page/action counts and operational conversion measurements with documented definitions. Exclude session replay, ad pixels, cross-site tracking, hidden fingerprints and political profiling. Do not instrument protected form fields, reports, donor identity or individualized issue histories. Separate security logs from campaign measurement.

**Acceptance.** Staff can see that signup/checkout delivery is functioning without inspecting peoples private interests or messages. Opt-out/consent settings are respected. Dashboards display real data with sampling/latency caveats, not mock numbers.

**Evidence.** Event allowlist tests, network/PII canaries, log-retention checks and dashboard metric definitions.

**External inputs.** None beyond the listed dependencies.

### G28-51 - Complete accessibility across public and authenticated journeys

**Dependencies:** G28-18, G28-26, G28-28, G28-31, G28-33, G28-37, G28-38, G28-44  
**Initial status:** Not started.

**Scope.** Audit against WCAG 2.2 AA with automated and manual testing: keyboard, screen readers, headings, focus, errors/status announcements, accessible authentication, targets, contrast, reflow/zoom and reduced motion. Review media captions and audio description where relevant; transcripts alone do not satisfy every video criterion. Include third-party checkout and video failures.

**Acceptance.** No unresolved blocker prevents a user from reading issues, joining, using materials, completing forms or donating. Accessibility fixes preserve the design. Any third-party limitation has a genuinely accessible working alternative and an owner, not only a disclaimer.

**Evidence.** Manual audit report, automated results, assistive-technology journey recordings and issue closure evidence.

**External inputs.** None beyond the listed dependencies.

### G28-52 - Complete visual fidelity and cross-browser regression testing

**Dependencies:** G28-09, G28-10, G28-11, G28-12, G28-13, G28-14, G28-15, G28-16, G28-17, G28-27, G28-37, G28-38, G28-44  
**Initial status:** Not started.

**Scope.** Compare the eight approved views and newly required operational screens at mobile/tablet/desktop widths, including 320, 390, 768, 1024 and 1440 pixels. Test Chromium, Firefox and WebKit/Safari with stable fonts and motion frozen for screenshots. Review the explicit video amendment separately from unchanged baseline sections.

**Acceptance.** No accidental redesign, cropped portrait/hand, overflow, broken navigation, unreadable disclosures or dashboard-like public homepage remains. Snapshot updates require an explanation; a failing comparison cannot be fixed solely by approving the new image.

**Evidence.** Before/after visual report, cross-browser runs, approved amendment baseline and documented design exceptions.

**External inputs.** None beyond the listed dependencies.

### G28-53 - Meet performance, resilience and load budgets

**Dependencies:** G28-10, G28-12, G28-26, G28-38, G28-47, G28-50  
**Initial status:** Not started.

**Scope.** Optimize responsive images, selective hydration, deferred third-party content, caching, bundle splitting and API/database queries. Load-test authentication, library, task claims, document delivery and donation-event ingestion. Test slow networks, disabled JavaScript on public content, provider delays and database connection pressure.

**Acceptance.** Target public-page p75 LCP <=2.5s, INP <=200ms and CLS <=0.1 when sufficient field samples exist; use documented lab conditions before launch. Keep public initial compressed JS approximately <=100KB, excluding user-activated providers, unless a reviewed budget exception is justified. Slow services fail visibly without corrupting data.

**Evidence.** Lab measurements, load/recovery tests, bundle budget report and later field-measurement plan; targets are not preclaimed results.

**External inputs.** None beyond the listed dependencies.

### G28-54 - Complete application security review and remediation

**Dependencies:** G28-05, G28-20, G28-21, G28-22, G28-23, G28-34, G28-47, G28-49  
**Initial status:** Not started.

**Scope.** Run dependency/secret scans, authorization/CSRF/XSS/SSRF/upload tests, browser egress and supply-chain review, protected-data canaries and protocol integration tests. Produce an independent-review packet with exact build/profile scope. Remediate actual findings in tracked child/new work packages and preserve unresolved release gates.

**Acceptance.** No open release-blocking finding or missing required cryptographic production evidence is waived by a green unit test. Independent review is attributed to its actual reviewer, not self-certified. Public-only deployment and protected-production approval remain distinct scopes.

**Evidence.** Security test artifacts, threat-model closure, independent review evidence where required and exact scoped security status.

**External inputs.** External expert review is a genuine independent dependency. Continue unrelated work; do not mark the gate complete without its evidence.

### G28-55 - Prove durable jobs, backups and disaster recovery

**Dependencies:** G28-04, G28-24, G28-42, G28-43, G28-49  
**Initial status:** Not started.

**Scope.** Configure production-capable job execution, lease expiry, retries/dead letters, queue alerts and graceful shutdown. Back up database/content/object manifests and separately authorized recovery material. Rehearse restoring into a clean isolated environment, replaying provider events and rebuilding search/public content. Check actual Neon/Render retention/compute tier before making recovery claims.

**Acceptance.** Process restarts do not lose accepted tasks or double-send effects. A complete restore succeeds with documented key custody and without production PII in CI. Proposed starting objectives are RPO <=24h and RTO <=4h for ordinary operational content; unreconciled accepted financial events must be recoverable from durable/provider records. Objectives require measured proof and budget approval.

**Evidence.** Restore/drill report, outbox/crash tests, backup inventory and documented recovery owners.

**External inputs.** Production uptime, backup retention and worker capacity may require a paid plan; no free-tier assumption substitutes for the drill.

### G28-56 - Connect real deployment monitoring and Engine Room freshness

**Dependencies:** G28-08, G28-04, G28-24, G28-43, G28-55  
**Initial status:** Not started.

**Scope.** Publish authenticated/internal health summaries for service readiness, deployed SHA, approved content version, queue lag, last successful email/webhook/reconciliation/backup, configured videos, blocked modules and release gates. Connect GitHub events/reconciliation and Render deployment state to Engine Room without sending personal data.

**Acceptance.** Clicking Engine Room refresh retrieves actual available GitHub/deployment state, timestamps success, and retains honest partial-failure/stale indicators. Merged, deployed and live-verified are separate. No private volunteer/donor/report contents appear in status data.

**Evidence.** Observed Engine Room update, refresh/failure tests, deployed-SHA check and data-minimization audit.

**External inputs.** None beyond the listed dependencies.

### G28-57 - Run the complete staging acceptance rehearsal

**Dependencies:** G28-18, G28-26, G28-27, G28-28, G28-29, G28-30, G28-31, G28-32, G28-33, G28-34, G28-35, G28-36, G28-37, G28-38, G28-47, G28-49, G28-51, G28-52, G28-53, G28-54, G28-55, G28-56  
**Initial status:** Not started.

**Scope.** Deploy an isolated production-like staging release and run end-to-end public, volunteer, staff and treasury journeys using synthetic users and processor-approved test mechanisms. Include a new-device recovery exercise, expired activity module, withdrawn document, disabled integration, failed publishing build, provider outage and restored backup.

**Acceptance.** Every launch requirement has demonstrable pass/fail evidence, owner and exact build reference. Test communications cannot reach real supporters. Missing provider credentials or external reviews are visible blockers, not bypassed by a demo flag.

**Evidence.** Acceptance matrix, browser results, content/finance/security signoffs and staging release manifest.

**External inputs.** None beyond the listed dependencies.

### G28-58 - Close publication inputs and operational launch gates

**Dependencies:** G28-37, G28-48, G28-51, G28-54, G28-57  
**Initial status:** Not started.

**Scope.** Connect and verify the three supplied issue videos, approved bill/downloads and canonical Garden/Cornerstone sites. Confirm current volunteer kits, real contact/privacy channels, media rights, committee/legal wording, current activity modules where activation is intended and all responsible staff. Record any explicitly approved public-preview omissions separately from a full launch.

**Acceptance.** No prototype banner, invented link, missing required media, historic policy mislabeling or fake success remains in the full release. Publication readiness, security readiness and fundraising readiness all have evidence; an inactive optional field program is shown accurately rather than implied active.

**Evidence.** Final content/link/media crawl, launch-gate register and owner/treasurer/security approvals.

**External inputs.** Actual policy files, three YouTube links, dedicated-site URLs, sender/domain access, committee setup and required review evidence are unavoidable inputs.

### G28-59 - Deploy the production release and enable approved functions

**Dependencies:** G28-58, G28-55, G28-56  
**Initial status:** Not started.

**Scope.** Configure verified production domains/TLS, isolated secrets, database/object permissions, sender authentication, backups and monitoring. Apply reversible migrations, publish the immutable content release, deploy portal/API, verify health and enable volunteer/payment/module flags only after their gates pass. Use a rollback checklist and make external provider configuration part of the release.

**Acceptance.** Public pages, real verification mail, authorized materials, protected submissions and permitted donation flow work on the actual production origins. Preview data is absent. Any real-money test is separately authorized and reconciled by the treasurer; no unauthorized card charge is made.

**Evidence.** Production deployment records, domain/TLS checks, smoke results, feature-gate evidence and rollback-ready release record.

**External inputs.** DNS/domain control, production credentials and approved recurring operating costs are required before execution.

### G28-60 - Verify the live site and finish the durable handoff

**Dependencies:** G28-59  
**Initial status:** Not started.

**Scope.** Rerun critical journeys after production deployment and provider callbacks, verify Engine Room state, inspect errors/deliverability and document observed performance. Deliver operator guides for publishing an issue/video, adding volunteers/staff, activating modules, handling incidents, fundraising reconciliation and restoring service. Update README, AGENTS, changelog, input register and next-maintenance responsibilities.

**Acceptance.** Completion is supported by live evidence, not merely merged PRs. All remaining exceptions are explicit and any additional work is in the denominator. A new agent and a nontechnical campaign operator can continue without this conversation. No unattended ChatGPT scheduler is silently restarted.

**Evidence.** Live acceptance report, final status manifest, operator walkthrough, repository cold-start check and recorded maintenance owners.

**External inputs.** None beyond the listed dependencies.

## 13. Release gates and definition of done

Do not combine these states: implemented, tested, reviewed, merged, deployed, configured, live-verified and independently certified. Record the exact build/commit, content version, configuration and environment supporting every claim.

**Public preview gate:** faithful public UI, safe public content, no real sensitive collection, clearly disabled transaction/account features where incomplete, and no misleading publication status. A preview may omit owner-supplied videos/documents only if that omission is visible and recorded.

**Volunteer production gate:** real verified account delivery; all current materials accessible; working first actions/forms/admin; authorization and cryptographic dependencies satisfied for actual protected flows; privacy/retention/support ownership; deployment/recovery/accessibility evidence. Modules for unavailable regulated activity stay inactive. That honest inactive state is acceptable platform behavior, not proof that the external field program is active.

**Fundraising gate:** actual committee/processor onboarding; current treasurer-approved rules and wording; secure hosted checkout; authenticated callbacks; ledger/reconciliation; cancellation/remedies/exports; production secrets; approved costs and live verification by authorized people. A pretty payment form is not enough.

**Full launch gate:** all required content and three videos connected; actual canonical Garden/Cornerstone links; approved Kirk-Evers legislative library; verified current volunteer kit; no placeholder success paths; all public/volunteer/donation gates passed; measured production behavior; no unresolved release-blocking security/accessibility defect; durable runbooks and real Engine Room evidence. A missing required provider/review/input must remain a blocker, not be silently redefined out of completion.

**Postlaunch completion:** critical journeys rerun on production; real configured integrations show recent successful events; alerts and recovery ownership verified; artifacts and status updated. Later maintenance includes dependency/advisory monitoring, policy/video/link review, module expiry, treasury reconciliation, email deliverability, backup drills and content improvements. Dates and jobs must be configured in actual infrastructure, not promised conversationally.

## 14. Inputs that may genuinely require the owner or authorized staff

| Input | Why needed | Work that continues without it |
|---|---|---|
| Three YouTube URLs plus accessible media material | Actual large issue-video publication. | Component, posters/placeholders, URL validation, admin and all other pages. |
| Kirk-Evers publication bill and attachments | Exact legal text and real downloads. | Page layout, reader, versioning, summaries based on approved copy. |
| Verified Garden and Cornerstone destinations/current policy sources | Correct repeated links and synchronized kits. | Page layouts, link/config systems, archive reconciliation. |
| Verified biography/additional real photos when desired | Candidate content beyond existing approved copy/portrait. | The supplied portrait and approved candidate section already support the design. |
| Domain/DNS control and authorized sender | Production URLs, TLS and reliable verified email. | Local/staging development with safe origins. |
| Committee/treasurer/processor/accounting setup | Actual fundraising, payout and reporting configuration. | Payment adapter, mocks, tests, disclosure UI and ledger design. |
| Approved hosting/storage/email costs and credentials | Reliable production infrastructure. | Reproducible local code/infrastructure and previews within existing permissions. |
| Required E2EESA review/profile readiness | True protected-production claims and launch eligibility. | All public work and protected-system development/tests with explicit gates. |
| Approved state/activity modules and field providers | Activation of specific regulated work. | Basic volunteering, all materials, training, tasks and inactive-state workflows. |

Ask only when these inputs cannot be resolved from connected accounts, repository sources or approved campaign records. Do not ask the owner to choose ordinary libraries, code organization, test strategy or basic implementation details that the development agent should decide.

## 15. Autonomous execution and agent handoff rules

Use the repository as the source of truth. Begin by reading README, AGENTS, this plan, the PR register, design baseline and open PR/CI/deployment state. Never assume a previous conversation's report means a merge/deployment happened.

Chain ready work. Run checks, repair failures/conflicts, obtain required technical review, merge green authorized PRs, update the register and continue to the next unblocked package. Do not wait hours for the owner to approve routine engineering. Do not bypass branch protection or sensitive review gates under the autonomous-merge instruction. Coordinate shared migrations/contracts when multiple agents are active.

Stop or switch branches only for a real blocker: unavailable credentials/permissions/funding, unresolved material campaign decision, required legal/security authority, failed checks that cannot be resolved, or a dependency requiring external action. When stopping, state what was actually completed, evidence/links, the exact blocker and the smallest required user action. Do not imply background progress unless an actual running agent/job has been configured.

Every merge should leave the repository buildable and deployable with unfinished features disabled safely. Keep `docs/PR_REGISTER.json`, acceptance evidence, content/input status, operational docs and Engine Room in sync. Preserve commits/releases rather than replacing history. No empty completion placeholders, silent test skipping or fabricated production-ready labels.

Engine Room progress uses the entire active plan: green for accepted/merged completion; yellow for implemented work not yet accepted/merged; empty for remaining work. Added tasks increase the denominator. Do not distinguish original versus added work with color. Separate deployment/live verification and security/legal readiness from the progress bar. Refresh uses observed GitHub/service state and honest freshness/error timestamps.

Recommended durable repository structure:

```text
AGENTS.md
README.md
apps/site/                 # Astro public campaign site
apps/portal/               # React portal/admin client
apps/api/                  # Fastify portal host/API
packages/ui/
packages/contracts/
packages/content/
packages/security/
packages/jobs/
db/migrations/
content/public/            # approved public release exports only
infra/
tests/unit/
tests/integration/
tests/browser/
tests/visual/
tests/security/
docs/DEVELOPMENT_PLAN.md
docs/PR_REGISTER.json
docs/REQUIREMENTS_TRACEABILITY.md
docs/CONTENT_STATUS.md
docs/DONATION_COPY.md
docs/design/
docs/security/
docs/operations/
.exechub/project.yml       # only after validating actual Engine Room schema
.env.example               # names only, no real values
```

A fresh-checkout verification target should eventually include install, schema/migration validation, type/lint/unit/integration/browser/visual/security checks and production builds, for example `pnpm verify`. This is a required future command, not a command claimed to work in the presently empty repository.

## 16. Campaign-supplied donation wording

The following owner-supplied copy is reproduced exactly in substance and punctuation in the dedicated companion file. Its factual/legal publication approval remains a treasury gate; preserving the copy is not an independent verification of the representations.

You may donate if you:

- Are a U.S. citizen or lawfully admitted permanent resident (i.e., green card holder).
- Contribute from your own funds. You cannot contribute funds that are being provided by another person or entity.
- Are at least 18 years old.
- Are not a federal contractor.
- Are making this contribution with your personal credit card and not with a corporate or business credit card or a card issued to another person.

Phillip Galinsky for America does not accept contributions from PACs, corporations, unions, federal contractors, national banks, FARA registrants, or foreign nationals.

The Phillip Galinsky For America Principal Campaign Committee is the official organization responsible for managing all aspects of Phillip Galinsky’s campaign for President of the United States.

This committee handles fundraising, spending, and compliance with Federal Election Commission (FEC) regulations. As the central hub of the campaign’s activities, the Phillip Galinsky For America Principal Campaign Committee ensures that all financial contributions and expenditures are transparent, properly reported, and in full compliance with all US federal election laws.

Contributions to Phillip Galinsky for America are not deductible as charitable contributions for federal income tax purposes.


## 17. Sources, provenance and limits

Primary product source: the owner's campaign brief, video amendment and approved supplied mockup package. Volunteer source: the uploaded Edition 1.0 archive. These establish product requirements, not the current truth of every legal instruction in the historic documents.

External references below were consulted on 10 October 2026. They support implementation constraints, not blanket legal advice, provider approval or certification. Reverify changing law, provider contracts, library versions and standard status at implementation and release. No substantial copyrighted source text is copied into this plan; the full donation wording above was supplied by the owner.

**[R1] FEC: advertising and disclaimers.** https://www.fec.gov/help-candidates-and-committees/advertising-and-disclaimers/  
Clear/conspicuous website disclaimers and solicitation context; legal reviewer must assess applicable current rules.

**[R2] FEC: candidate contribution limits.** https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/contribution-limits/  
Election designation, aggregate limits and separate accounting; currently displayed chart is 2025-2026, not a verified 2028 configuration.

**[R3] FEC: recording receipts.** https://www.fec.gov/help-candidates-and-committees/keeping-records/recording-receipts/  
Contributor information and best-efforts recordkeeping; map exact obligations with treasurer.

**[R4] Anedot: webhooks API.** https://help.anedot.com/knowledge/webhooks  
Documented HMAC-SHA256 X-Request-Signature, supported event families and retry/resend behavior; revalidate before integration.

**[R5] YouTube: embed videos and playlists.** https://support.google.com/youtube/answer/171780?hl=en  
Supported embeds and privacy-enhanced mode; privacy-enhanced does not mean no external disclosure after playback.

**[R6] W3C: Understanding WCAG 2.2.** https://www.w3.org/WAI/WCAG22/Understanding/  
Accessibility acceptance baseline; consult normative WCAG as well as informative explanations.

**[R7] Astro: islands architecture.** https://docs.astro.build/en/concepts/islands/  
Static-first public pages with isolated interactive components.

**[R8] Render: deploy Astro.** https://render.com/docs/deploy-astro  
Static-site deployment and web-service options; verify production pricing/limits rather than assuming all infrastructure is free.

**[R9] Better Auth: Fastify integration.** https://better-auth.com/docs/integrations/fastify  
Maintained authentication integration; exact version/plugins and current advisories must be checked at implementation.

**[R10] Neon: connection pooling.** https://neon.com/docs/connect/connection-pooling  
Connection budget and pooled runtime strategy; verify driver/migration compatibility against chosen versions.

**[R11] E2EESA repository README.** https://github.com/neophilism/End-To-End-Everywhere-Security-Architecture-Standard/blob/6ec85d51f9207da31f0e90fd8a7c82ffff8448f6/README.md  
Observed basis on 2026-10-10; development toward 0.9.0-rc.2, not production certification.

**[R12] E2EESA Audit Remediation Plan.** https://github.com/neophilism/End-To-End-Everywhere-Security-Architecture-Standard/blob/6ec85d51f9207da31f0e90fd8a7c82ffff8448f6/docs/AUDIT_REMEDIATION_PLAN.md  
Corrected component/data-flow inventories, scoped claims, release and independent review gates.

