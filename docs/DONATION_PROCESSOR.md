# Campaign donation checkout: four-way randomized continuity

**Policy, 2026-10-12:** Stripe is prohibited. The campaign requires FOUR actual independently underwritten providers/acquirers, assessed for ordinary equal-treatment merchant terms. An approved general-purpose gateway alone is not evidence of an independent acquiring relationship. No provider is approved as of this document; no live donations are enabled. JPMorgan Chase merchant services, Chase Paymentech and WePay are excluded by the owner's 2026-10-12 directive. The earlier four named candidates have been withdrawn pending a genuine self-service, no-fee eligibility screen. See `docs/operations/PROCESSOR_SELF_SERVICE_SCREEN_20261012.md`.

## Exactly one donor button
- In production mode, and ONLY with four treasurer-approved hosted checkout configurations, the public page displays **one** link labeled "Continue to secure contribution" pointing to same-origin /donate/continue.
- The password-protected web server handles GET /donate/continue, queries persistent PostgreSQL provider health, and chooses uniformly at random via cryptographic randomInt among ACTIVE routes. It records a privacy-minimal **redirect event**, NOT a contribution/payment. It sends a non-cacheable 303 to that processor's exact allowlisted HTTPS hosted payment URL.
- NO client-side links to backups. Every new click receives a freshly selected healthy processor. Authenticated private previews remain protected, and preview mode cannot display the donation link. A read-only outage or all providers unhealthy returns 503 with "No payment was attempted."
- Checkout amount, election designation, donor identity/employer/occupation, qualification attestation, authorized personal-card policy, statutory information and receipts MUST be handled on each provider's reviewed checkout. Page redirects do not accept card data or automatically credit a gift. No recurring option is preselected; never auto-retry an ambiguous transaction through another processor.

## Incident recognition and exclusion
- Table g28.donation_provider_state is authoritative across application instances. Four approved config slots must exist but only rows with status **active** are randomly selected.
- Trusted observations are appended with unique provider event ID and attempt reference. **Three distinct independent gateway errors, timeouts or processor outages within ten minutes**, with no verified success separating them, quarantine the provider immediately. Read-only hosted-page reachability is tracked in a separate signal stream; three independently observed checkout outages within ten minutes quarantine a provider but a reachable checkout page is NEVER accepted as a successful payment. Verified service termination, revoked credentials or merchant suspension quarantine after one observation. Ordinary donor declines and cancellations NEVER count as processor faults.
- Quarantine is reversible ONLY after verified repair and an operator evidence reference. A finding of discriminatory service denial requires HUMAN evidentiary review; **the system does not automatically label outages political**. Documented final exclusion is irreversible through the ordinary recovery command.
- Each event must originate from a verified external processor API, signed webhook or authorized independent operational check. Do NOT expose the operator CLI as HTTP. Never accept unauthenticated donation-page reports as proof of a gateway outage: otherwise an attacker could remove processors from the rotation.
- IMPORTANT: The operational observation interface, persistent circuit breaker and routing are implemented. **A gated, best-effort read-only checkout availability monitor is implemented but not enabled. Provider-specific signed payment-status adapters and settlement verification remain unimplemented.** A hosted link by itself cannot detect a processor quietly refusing donations. Until these are provided and tested, continuous automatic detection of real authorization/settlement failures must NOT be claimed.

## Merchant contract approval for each of four
Obtain written confirmation of ordinary merchant treatment, actual legal committee name, approved merchant account and final settlement bank. Review gateway, acquiring bank and subprocessor as separate dependencies; map shared owners, card networks and common failure domains. Reject discretionary political-only restrictions not imposed on otherwise comparable lawful merchants. Do not misrepresent merchant activity, regulatory classifications, payment channel or eligible donor type to bypass risk review. Record independent provider agreements, fees, reserves, chargeback procedures, termination/appeal mechanisms, export rights and escalation contacts. A processor cannot guarantee never to terminate service.

Treasurer/security must separately verify all four real hosted donation pages, signed transaction event notifications, usable contribution exports, deposits, FEC-required information/eligibility screening, election limits, refund workflows, idempotency and a documented no-double-charge switch drill. Four configured URLs or green synthetic tests are NOT four real merchant integrations.

## Runtime configuration

Production (web build AND web service runtime) requires G28_PUBLIC_MODE=production, verified CANONICAL_ORIGIN, DONATIONS_ENABLED=true, DONATIONS_TREASURER_APPROVED=true, DATABASE_URL to the authorized migration-007 database, and four APPROVED/ID/NAME/HOST/URL sets in .env.example. Set each APPROVED=true only AFTER its underwriting and checkout acceptance. No primary/preferred provider exists. Build the page only after external gates are satisfied, run migrations with authorization, and use the CLI (below) to register four quarantined state rows, then mark ACTIVE only after test evidence. The server fails closed when database access is unavailable. Keep site password protection until the owner authorizes public publication.

## Operator commands (trusted shell; NEVER public HTTP)

- node scripts/donation-ops.mjs bootstrap — register the four configuration-approved providers as quarantined initially; never overwrites existing blocked/quarantined state.
- node scripts/donation-ops.mjs status — report operational states and evidence references.
- node scripts/donation-ops.mjs observe merchant-a event-0001 attempt-0001 gateway_timeout — ingest one VERIFIED observation; repeated event IDs are ignored. Do not use arbitrary human/donor reports.
- node scripts/donation-ops.mjs set-state merchant-a active verified-repair-ticket-123 — activate or restore after approved live evidence.
- node scripts/donation-ops.mjs set-state merchant-a quarantined incident-ticket-456 — operator quarantine.
- node scripts/donation-ops.mjs set-state merchant-a excluded adjudicated-case-789 — permanent exclusion after authorized evidentiary review.

Maintain a separate, treasury-controlled FINANCIAL event ledger for actual authorized payments, refunds, disputed transactions and bank settlement; routing selection telemetry must never be treated as money received. Run provider-reported faults through a verified signed adapter and collect alerts. See docs/operations/DONATION_HEALTH_MONITOR.md for the optional page-availability workflow, which does not prove successful card processing. Provide a safe 503 and operator alert if all four are unavailable.

## Why still gated
No merchant contracts, approved direct-payment endpoints, verified provider event APIs, sandbox keys, live test charges, refund confirmations or banking settlement evidence have been supplied. Deploying this code cannot create those external relationships. For repository work status see GitHub issue #51 and the payment PR chain.
