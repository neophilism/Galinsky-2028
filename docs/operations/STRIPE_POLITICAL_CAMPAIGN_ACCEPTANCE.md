# Stripe campaign fundraising: real onboarding, not API-key activation

**2026-10-12 owner reversal:** Stripe is allowed as the first campaign processor, with test-only development until the restricted-business account is approved.\n\n**Release state:** DISABLED. A Stripe API key alone cannot activate this
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
- Adapters are NOT exposed as live API routes. Production
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
