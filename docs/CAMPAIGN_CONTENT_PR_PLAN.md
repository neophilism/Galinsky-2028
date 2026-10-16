# Database-backed campaign content manager

Owner-authorized expansion, 16 October 2026. This is an implementation plan, not evidence of deployment. Canonical work/PR tracking is `registry/prs.json`; `docs/PR_REGISTER.json` retains acceptance contracts. Preserve the existing 61 units and evidence. Do not overwrite unrelated open PRs or treat their source as merged.

## Repository and editorial separation

**Never write specific editorial campaign names, campaign scripts or owner-uploaded assets into repository files, fixtures, commit messages, PR titles/bodies, issues, screenshots, logs or CI artifacts.** Use generic synthetic examples and opaque IDs. Actual names, copy, colors and selected assets belong in the assigned database or authorized media storage. Existing site/product names are not editorial variant names. Do not add a denylist that itself publishes the private names. This amendment supersedes older instructions to export evolving campaign content into Git.

Git contains templates, field definitions, schemas, migrations, editor code, synthetic tests and generic operational documentation. The original checked-in public baseline can remain during staged migration, but must not remain a second editable authority. Database imports and exports containing editorial data must never become repository artifacts.

## Required experience

One shared website, with any number of independent campaigns. No two-item enum, fixed pair or product-level campaign-count cap; use pagination and ordinary payload/storage/abuse limits. Campaign names are private editorial labels, not automatic public headings, URLs or metadata. UUID identity is independent of the name. Existing policy substance and fixed legal/operational content are preserved.

The owner selects one published campaign for the whole site. An independent **Enable day/night mode** setting reveals **Day campaign** and **Night campaign** selectors. Either can select any published campaign, including the same one twice. With the setting disabled, the default campaign wins and the visitor appearance control is hidden. With it enabled, visitors choose Day, Night or System. System follows device color-scheme preference, not location, identity or political characteristics. These are appearance modes, not a sunrise/sunset scheduler. Invalid or unavailable preferences resolve deterministically; disabling mode switching overrides previously saved preferences.

One protected editorial workspace provides campaign selection, create/duplicate/rename/archive, page/section navigation, text editing, colors and hero-image selection/upload. Hero controls include descriptive alt text, crop/focal position and desktop/mobile preview. Changing the hero never requires visiting a different administration product. Use only an actual available portrait, do not claim its gesture has changed, and do not synthesize a likeness without a usable image target.

Views are **Single campaign**, **Side-by-side text**, and **Page preview**. Compare any two campaigns using stable page/section/field keys, differences, missing-field warnings and independent revision labels. Each column has its own save/conflict state; viewing is never publication. Comparing a campaign to itself is supported. Provide accessible stacked or switchable mobile comparison rather than two unreadably narrow columns. Never discard dirty fields on navigation, column swaps or background refresh.

## Data model and publication contract

Use campaign identities; immutable revisions with schema-versioned structured text, theme, hero and metadata; separate draft/published pointers; a revisioned singleton site-selection record; assets; and an audit trail. Duplicates are independent copies, not mutable inheritance. Renaming does not break URLs or references.

A publication pins a complete validated revision. Draft edits never mutate published data. Publication and site-selection changes are transactional and version-checked. Stale writes return 409 with enough information to recover work, never silent last-write-wins. Restore creates a new draft; explicit publication activates it. Prevent archiving a selected default/day/night campaign without a valid replacement. Validate foreign keys, required fields, contract version, media existence and contrast before publishing.

Shared legal disclosures, donor eligibility/terms, financial controls, account status and activity authorization are outside campaign-copy authority. Styling and editorial selection cannot activate payments, registration or restricted operations. Policy summaries must not contradict their canonical source definitions.

## Security and data boundaries

The assigned Neon project is `soft-bread-25523698`; the known preview branch is `br-purple-tooth-b4ra2kbm`. Verify both before writes. Use additive changes; do not alter existing account, volunteer or financial data. Real database tests run only on isolated local databases, never production data.

Public runtime reads only published release projections and published assets. Private names, drafts, edit history and owner identities never enter public responses or caches. Publication projections must explicitly omit internal metadata rather than exposing an entire record. Cache by settings/release version and appearance, not just path. Editor responses are private/no-store.

Use existing maintained authentication and explicit server-authorized editorial grants. Reviewer-only and volunteer sessions never confer editorial access. Every object operation needs authorization, CSRF/origin checks, size limits, rate controls and an audit record. Negative tests cover guessed IDs, roles and cross-origin requests. Do not share broad cookies across public and protected origins.

No executable HTML, JavaScript, arbitrary CSS or arbitrary server-side fetch URL is valid editorial content. Escape text by output context. Use structured rich text only where needed, allowlisted theme tokens and safe link/media references. Upload handling checks size, actual decoded raster type, dimensions and pixel count; re-encode accepted images, strip metadata, reject SVG/script/polyglots and decompression bombs. No traversal or arbitrary remote fetching. The selected hero, text and colors appear in the same editor even if media bytes reside in separate authorized storage.

Draft editorial data is access-controlled server-readable information, not claimed to be E2EE. Published copy is intentionally public. Preserve the separate protected-content and finance boundaries. Perform AI security review and relevant tests now; outside human review remains deferred, not an implementation prerequisite.

## Rendering, appearance and rollout

Preserve the shared layout, navigation, issue videos, working controls, legal disclosures and preview password protection. Render selected copy and metadata from the same pinned release before delivering the response, not through after-load text replacement. Theme tokens cover background, surfaces, body/muted text, links, brand accents, buttons, borders and focus; validate actual component color pairs. Per-campaign themes are data, not two hard-coded style branches.

Read one complete revision/snapshot rather than querying per text field. Cache invalidation and publication versioning make ordinary edits available without a code deployment. On transient failure, serve only a verified last-known-good published snapshot; cold starts without one fail honestly, never substitute drafts. Preserve private/no-store preview responses. Test first-load System behavior explicitly: without an established preference or usable hint, use a deterministic documented default; do not falsely promise the server knows an unknown device setting.

Bootstrap the existing approved baseline into the database and add the owner-requested alternative as a draft with honest provenance. Store all specific names, text, color choices and selected image references directly in the database, not Git. Imports are idempotent and never overwrite subsequent owner edits. Do not enable public launch or switch the active site merely by importing. Day/night begins disabled; unpublished alternatives cannot become public assignments.

Use the two existing authorized Render services and assigned Neon project. No new paid CMS, extra cloud project, duplicate service, public launch, donor activation or mass communication. Code, data migration, merged state and deployed state remain separately evidenced.

## PR sequence and acceptance

Planning IDs are work units, not predicted GitHub PR numbers. Add ten units, G28-062 through G28-071, preserving all existing IDs. Registry totals become 71 only when both registers are actually updated. A PR can contribute to multiple units; acceptance requires full scope, not merely a merge. Dependencies refer to needed components rather than requiring unrelated broad packages to be fully accepted.

### G28-062: contracts, plan and registry

Record this generic amendment, reconcile both canonical registers, define stable field/API/document schemas and a requirements-to-test matrix. Preserve all previous approvals and evidence. Acceptance: validators agree on the new total, synthetic fixtures contain no editorial identities, and a cold-start agent can find exact next work. Evidence: registry checks, schema tests and plan diff.

### G28-063: campaigns, immutable revisions, assets and settings

Depends on 062. Add persistent, paginated campaign creation/duplication/rename/archive, revisioned drafts, publication, atomic site settings, assets and audit. Evaluate existing content-revision contracts before reuse; never weaken their unrelated rules. Acceptance: isolated PostgreSQL tests prove independent duplicates, restarts, stale/concurrent writes, archive protection, transaction rollback and role isolation. Public roles cannot read private drafts.

### G28-064: shared templates and editable-field inventory

Depends on 062. Define stable slots for marketing pages, shared editorial navigation/footer strings, headings/buttons, metadata and hero. Explicitly mark legal/payment/account operational strings fixed. Convert one template set, not parallel HTML sites. Acceptance: field-coverage manifest, baseline parity, required/unknown-field validation, safe escaping and preservation of functional IDs, names and existing video/payment hooks.

### G28-065: server-side delivery and resilient caching

Depends on 063/064. Load/render one complete published revision with matching metadata, theme and media; version cache invalidation, public/draft isolation, no-code-deploy updates and safe failure/recovery. Acceptance: publication changes returned HTML without deploy; internally consistent concurrent responses; no draft selection or cross-mode cache leaks; deterministic first render; honest cold-start failure; preview authentication preserved.

### G28-066: protected editorial API and lifecycle

Depends on 063. Add permitted owner/editor create/read/save/duplicate/rename/archive/publish/restore/settings operations, CSRF/origin/request limits and audit. Acceptance: permitted users can act; anonymous/reviewer/volunteer/ungranted-admin clients cannot; guessed IDs fail authorization; 409 preserves stale work; selected campaigns cannot be archived; restores produce drafts rather than silently rewriting history.

### G28-067: unified text, color and hero editor

Depends on 064/066. Build searchable campaign picker, create/duplicate/rename/archive, section navigation, fields, theme controls, hero selection/upload/alt/focal controls, dirty/conflict states and responsive previews. Acceptance: create third/fourth campaigns without code; change text/colors/image in one workspace; save/reload exact state; keyboard/accessibility and raster-upload safety tests; no lost unsaved work; contrast failures identify offending pairs.

### G28-068: side-by-side and single-campaign views

Depends on 067. Add any-pair comparison with aligned keys, changed/identical/missing filters, independent revisions/save states, swap columns, field-copy action and mobile alternative. Acceptance: arbitrary pairs and self-comparison; independent editing; dirty-state preservation; all editable pages; protected preview without publishing drafts; correct conflict handling when both columns refer to one campaign.

### G28-069: optional day/night assignments

Depends on 065/066/067. Add owner enable/disable plus independent default/day/night selectors, visitor Day/Night/System, validated preference, OS-change handling and cross-page continuity. No profiling or geolocation. Acceptance: enabled/disabled, same/different assignments, invalid/missing preference, OS changes, no-JS/default, settings changes, cache separation and archived/unpublished rejection. Text, theme, image and metadata always use one revision.

### G28-070: private initial-content bootstrap

Depends on 063/064. Import the approved baseline and requested alternative into the assigned preview database, with themes, hero references and complete field inventory. Preserve original public baseline and mark new wording as draft. Acceptance: exact content round-trip, no overwrites on repeated import, all names/text retained outside Git/logs/artifacts, truthful draft/published/mode state and no claim of an unavailable image replacement.

### G28-071: integrated acceptance and handoff

Depends on 065-070. Run unit, isolated PostgreSQL, HTTP and Chromium/Firefox/WebKit journeys; 320px/reflow/keyboard/focus/contrast/visual checks; hostile content/upload, authorization, concurrency, outage, rollback and restore tests. Preserve existing payment/account/video tests. Perform AI source/security review, fix actual vulnerabilities and retain source-bound evidence. Acceptance: complete flows proven, actual implementation/merge/deploy status separated, existing protected services only and exact pending inputs documented. A human auditor is not a prerequisite.

## Required end-to-end journeys

1. Create an arbitrary campaign, edit text/colors/hero together, save/reload, publish explicitly and select it. Public visitors receive only its published revision.
2. Edit a published campaign again while visitors continue receiving the old publication. A second editor's stale write returns 409 without losing either user's work.
3. Compare any two campaigns, edit independently, switch views/swap columns and retain unsaved changes. Test self-comparison conflicts.
4. Enable day/night, assign arbitrary published campaigns, choose Day/Night/System, navigate and change OS preference. Disabling returns every visitor to the default despite saved preference.
5. Anonymous/reviewer-only/volunteer/cross-origin requests cannot read drafts, upload, edit, publish or change assignments. Stored text and media cannot execute code.
6. Database interruption serves only verified published content or honest unavailability; recovery, invalidation, archive safeguards and rollback remain correct.
7. Initial content renders all marketing routes with its own themes and selected actual portrait. Legal disclosures, operational controls and canonical policy definitions remain unchanged.

## Evidence and stopping rules

Checkpoint generic source frequently. Never include specific editorial identities or text in evidence, tests, commits, PR metadata, screenshots or artifacts. Record actual commands/results and exact commits, not assumed success. Do not accept ten units because a plan or a schema exists. Preserve original scope, unrelated PRs and security boundaries. On stopping leave a durable generic handoff with completed work, precise missing functionality and next commands; do not rely on chat memory or promise unscheduled background work.
