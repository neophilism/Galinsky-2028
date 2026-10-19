# Stripe campaign fundraising: real onboarding, not API-key activation

**2026-10-12 owner reversal:** Stripe is allowed as the first campaign processor, with test-only development until the restricted-business account is approved.

**Release state:** DISABLED. A Stripe API key alone cannot activate this
federal campaign's regulated contribution processing. The adapter in
packages/core/stripe-campaign.mjs is code/test groundwork, not a live
checkout or an authorized merchant account.

## Approval prerequisites

1. A real committee/treasurer identity and federal committee registration
   details must be verified for the account receiving donations. The campaign
   source-copy committee name is unverified until confirmed by the treasurer.
2. Stripe must specifically approve the campaign's political-organization
   fundraising activity under its restricted-business review. Store the
   approval reference and authorized merchant account identity. The business
   may be asked for supporting due-diligence documents.
3. The treasurer/election counsel must sign off 2027-2028 effective per-election
   limits, primary/general designation, offline and other-channel aggregation,
   prohibited sources, required receipts, donor fields, best-efforts follow-up,
   recurring cap/cancellation and refunds. Do not reuse 2025-2026 limits.
4. Resolve a material card-policy gap: Stripe Checkout's "card" payment method
   can include debit/business cards. Selecting this method does NOT enforce
   the site's campaign rule of a personally owned CREDIT card. The approval
   must document technically feasible provider controls and a truthful,
   treasurer-accepted remediation path before checkout is enabled.
5. Obtain hosted checkout, webhook signing secret, approved recipient bank
   and test account capabilities. Place secrets in Render environment only,
   never in Git, URLs, issue descriptions or ChatGPT messages.
6. Implement durable verified webhooks, replay/idempotency protections,
   ledger/finance records, refunds/disputes, recurring cancellation,
   treasurer-only tools, appropriate authentication and restricted exports.
   Finish the independent security review and provider-backed test cases.
7. Authorize production payment configuration, costs and any LIVE test charge
   explicitly. Sandbox tests never authorize a real charge.

## Adapter guarantees and current limitations

- stripeCheckoutPlan rejects checkout before signed release evidence, merchant
  approval, committee identity, attestation approval, recurring/direct path
  review and per-election amount checks.
- createStripeCheckout builds an HTTPS provider-hosted URL with idempotency;
  no card data reaches campaign servers. No "payment succeeded" claim is
  made from a redirect or successful session creation.
- verifyStripeWebhook checks HMAC-SHA256 on raw bytes, timestamp tolerances,
  supported event names and minimal event metadata, excluding customer PII
  from ordinary logs.
- The Stripe Checkout route and signature-verified webhook listener are now implemented but remain disabled by default. Production
  DONATIONS_ENABLED=true intentionally remains rejected until the server,
  stateful ledger, provider-account verification, finance approval,
  registration and reconciliation requirements are satisfied.
- The final donor self-service must work without creating a volunteer account.

**Sources (recheck on onboarding):**
- Stripe's political organizations are within "Crowdfunding and fundraising"
  under restricted businesses: https://stripe.com/legal/restricted-businesses
- Stripe hosted Checkout API: https://docs.stripe.com/api/checkout/sessions/create
- Federal Election Commission contribution rules:
  https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/contribution-limits/
- The exact per-election 2027-28 caps cannot be inferred from the
  older 2025-26 chart; require current official election guidance.

## Outstanding user/treasurer inputs

- Approved Stripe campaign merchant account, not merely a random private API
  key; exact current onboarding/approval decision.
- Committee legal name/ID, treasurer and authorized bank/payout arrangement.
- Effective election designation and limits, legal donor disclosure/attestation
  wording, and approval of the personal-credit-card requirement handling.
- Stripe test credentials and webhook secret via Render's secret UI only.
- Written consent for any live charge/refund; no charge is made automatically.

See docs/DONATION_COPY.md for the owner's original disclosure text; do not
rewrite that text without treasurer approval.

## Oct 13, 2026: Stripe test-only end-to-end acceptance

The owner reports that the **existing campaign Stripe TEST secret** and the **TEST webhook signing secret** were saved directly in the existing Render website's Environment settings, rebuilt and redeployed. The website service is `srv-db5teuajnfac73bm8pug` inside the previously authorized project `prj-db57fnm7bikc739783q0` under Phillip's workspace.

**Historical claim superseded by the 19 October runtime privilege inspection:** see `docs/security/RUNTIME_ROLE_FINDING_20261019.md`. Explicit grants were narrow, but inherited provider administration was not. Current runtime replacement/verification must be recorded before treating this identity as least privilege.

An independent **intended least-privilege database role** `g28_stripe_test_web` has been created in the **existing** Neon staging branch `br-purple-tooth-b4ra2kbm`. It has only `SELECT/INSERT/UPDATE` on `g28.stripe_checkout_intents`, `SELECT/INSERT` on `g28.stripe_webhook_receipts`, and `INSERT` on `g28.financial_provider_events`. No access to volunteer, reviewer, admin, bank, or treasury records. The role's URI belongs only in the protected Render Environment; it is not a repository secret.

The server's `G28_STRIPE_TEST_ENABLED=true` exposes a Basic-password-protected **TEST** checkout. `DONATIONS_ENABLED=false`, `G28_STRIPE_LIVE_APPROVED=false`, and `G28_PUBLIC_MODE=preview` ensure real funds are not accepted. `G28_STRIPE_RETURN_ORIGIN` must be `https://galinsky-2028-private-preview.onrender.com`.

An explicit `G28_STRIPE_SMOKE_ON_BOOT=true` launches a ONE-SHOT isolated Stripe test integration 15 seconds after protected service startup, never in live mode. It validates the restricted database connection, uses `sk_test_` to GET the Stripe Account API, creates a $1 Stripe **TEST** Checkout Session, persists its reference in the staging ledger, immediately expires it via Stripe's test API, and waits up to ~36 seconds for a genuine Stripe-signed `checkout.session.expired` webhook to mark the session **expired**, not paid. Logs contain only status booleans and stage names—never the API key, webhook signing secret, Stripe Checkout URL, donor information, or account profile. After verifying the smoke, set `G28_STRIPE_SMOKE_ON_BOOT=false` to avoid repeating it after subsequent redeploys.

Successful smoke is not sufficient to prove card payment completion. To verify an **actual test-card** charge, the owner must open the password-protected `/donate/stripe` page, complete one Checkout Session using Stripe's official test-card number (no real funds), and verify a **signed** `checkout.session.completed` webhook and corresponding staging DB status `paid`. A redirect to the success page alone is **not proof of payment**. In live mode, further legal compliance, payer identity capture, cross-channel contribution aggregation, settlement/reconciliation, and Stripe committee status remain separate release gates; switching only `sk_test_` to `sk_live_` is insufficient and is blocked in the current preview mode.

If smoke reports `stripe-account/failed`, the key or account permissions are wrong; if `checkout-session/failed`, inspect request compatibility without logging Stripe's account response; if `database-session/failed`, inspect only the restricted schema grants; if `signed-webhook/awaiting_delivery`, verify the webhook destination, Stripe TEST mode, selected `checkout.session.expired` event, and that the `whsec_` secret belongs to the same TEST destination. No mock result should be represented as a successful real Stripe integration.

### Distinguishing a missing test webhook from an API/checkout failure

If the real test session is accepted by Stripe, persists in staging and successfully expires, but its signed `checkout.session.expired` event has not arrived after the preflight wait, set **only** `G28_STRIPE_DIAGNOSE_WEBHOOKS_ON_BOOT=true` temporarily (and switch `G28_STRIPE_SMOKE_ON_BOOT=false`). The diagnostic reads Stripe's **test-mode** `GET /v1/webhook_endpoints`, compares the exact expected private-preview URL, requires enabled state and event subscriptions, checks `GET /v1/events?type=checkout.session.expired` for the latest test session, and makes a harmless HEAD probe of the webhook URL (expected 405). It logs only booleans and the staging payment_state; no secret, Stripe account ID, signed data, endpoint URL or Checkout session ID. This does not send or sign an event and cannot falsely make the payment ledger look reconciled.

A missing matching test destination means the user should confirm that they added it in Stripe **test mode and the same Stripe account as the sk_test key**; a live-mode webhook destination does NOT subscribe to test sessions. Stripe Webhooks may also support API v2 Event Destinations, so a result from the classic v1 endpoint listing is evidence for the v1 adapter only, not proof that no alternative destination exists. The actual accepted event is a v1 snapshot event, not a v2 thin event; do not mix those payload formats. Once inspected, set `G28_STRIPE_DIAGNOSE_WEBHOOKS_ON_BOOT=false`.


### Workbench v2 event destinations (2026-10-13)

Stripe's Workbench `Add destination` may use the **v2 Event Destinations API**, which does not necessarily appear in the classic `/v1/webhook_endpoints` listing. Official Stripe API endpoint: `GET /v2/core/event_destinations` with `Stripe-Version: 2026-09-30.endive` and `include[0]=webhook_endpoint.url`. The read-only test diagnostic now inspects BOTH registries, compares target URLs without printing them, checks `livemode=false`, enabled status, required `checkout.session.expired` and `checkout.session.completed` subscriptions, and confirms that v2 `event_payload` is `snapshot`. **Thin** event destinations are not compatible with the v1 webhook signature/event handler without a separate adapter. Stripe docs: https://docs.stripe.com/api/v2/core/event-destinations/list and https://docs.stripe.com/api/v2/core/event-destinations/create.

The first live TEST integration proved Stripe account API authorization, Checkout Session creation, staging persistence, and Stripe API expiration, with `checkout.session.expired` generated in the Stripe test Events API. However NO signed expiration webhook reached staging in the first 36-second window. Before attributing this to the owner, inspect BOTH classic and Workbench v2 destination registries for a matching enabled test-mode webhook. If neither exists for the **same account** as `sk_test_`, ask the owner to create the destination in Stripe TEST mode, obtain a NEW test destination signing secret and replace only `STRIPE_WEBHOOK_SECRET` in Render. No live secret should be used for the test webhook. Never label remote event generation a completed end-to-end webhook check without a signed delivery record.

## Owner-approved single-box general-election donation UX — 2026-10-13

The donor-facing `/donate/stripe` page contains **exactly one** required, properly aligned checkbox: "I agree to the contribution terms." Its hyperlink opens the dedicated `/donate/terms` page, which lists all previously approved citizen/residency, own funds, minimum-age, federal-contractor, personal-card and prohibited-source conditions, information disclosure and non-deductibility notices. The original committee paid-for line and a **clear, conspicuous FEC best-efforts** notice remain outside the linked terms on the payment form, as required by FEC guidance: https://www.fec.gov/help-candidates-and-committees/best-efforts-document-receipts/ and https://www.fec.gov/help-candidates-and-committees/making-disbursements/fundraising-notices-campaigns/.

**No donor election selector:** The checkout's versioned terms explicitly designate the **2028 general election**, with `election='general'` set only by the backend. The contributor cannot forge a primary or alternate election value by editing POST fields. Stripe metadata and the staging ledger record the election and `terms_version`, with a server-side `agreed_at` timestamp for new sessions. Signed event matching checks both the election designation and terms version. Earlier smoke-test sessions are retained with NULL terms version. The source of the campaign's designation must be transparent to donors and cannot be changed retroactively without satisfying FEC redesignation rules. An independent may be entitled to a primary-equivalent limit under FEC, but is NOT obliged to offer donors a primary/general choice on the web checkout. FEC: https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/contribution-limits/.

**Live release still blocked:** To accept real money, obtain campaign treasurer/election-counsel authorization for the applicable 2027–28 limit and the use of general-election designation, review any required segregation and permitted expenditures, implement cumulative limits across all channels, donor identity/occupation/employer retrieval and FEC reporting, validate processor's campaign merchant approval and review source/settlement/refund controls. The one-checkbox form does not turn these checks off.
