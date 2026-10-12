# Campaign payment provider decision and production gate

**Decision (2026-10-12): Stripe is prohibited.** The campaign's first hosted donation processor candidate is Anedot, which explicitly supports political campaigns. This does **not** represent merchant approval or authorization to collect donations.

## Security / implementation

- Public site renders a hosted secure Anedot payment link only if the release configuration is production, `DONATIONS_ENABLED=true`, `DONATIONS_TREASURER_APPROVED=true`, and `ANEDOT_DONATION_URL` validates as a clean `https://secure.anedot.com/{account}/{page}` URL. Otherwise the existing non-collecting form stays disabled.
- The browser leaves the campaign site for Anedot's verified hosted donation page. Do not use an iframe, accept cards within this app, proxy donor or card fields, or depend on Stripe.
- The hosted page MUST reproduce the approved campaign eligibility, restricted-source policy, election designation, one-time default, unselected recurring donation, required disclosure, and required collection of name/address/employer/occupation. The active campaign has a narrower **personal credit card only** policy; disable all other methods and fee/tip upgrades until specifically approved.
- The treasurer must verify legal committee name, active registration, deposit account, current cycle limits, source eligibility, refunds and chargebacks, donor receipts, source code, repeated/retried gift handling, recurring controls, exports, reconciliations and signed webhooks before setting approval flags. A checkbox is not proof of nationality or ownership.
- Validate real transactions in processor-supported test mode when available; never use a live personal card to demonstrate that testing is complete.
- Preserve provider independence: authoritative donations and reconciliation must be exportable in usable formats. Maintain an alternative independently underwritten merchant/ACH contingency; a second vendor is not automatically immune from suspension.
- When moving beyond hosted checkout, use signed raw-body HMAC webhooks, durable append-only receipt ledger, idempotency, explicit payment/refund/reversal states, origin verification and treasury-approved reconciliation. A browser callback is never financial proof.

Sources: https://www.anedot.com/political ; https://help.anedot.com/knowledge/share-an-action-page ; https://help.anedot.com/knowledge/webhooks ; https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/who-can-and-cant-contribute/

## Deployment inputs required

1. Approved Anedot campaign account and exact **public hosted URL** (not an API key).
2. Treasurer confirmation that the hosted donation page's mandatory copy and eligible methods were independently checked and that receipts, limits, recurring terms and reconciliation are configured.
3. Only then configure the three build variables above, rebuild the static site, and run authenticated/unauthenticated preview checks plus external redirect acceptance tests. This does not remove the separate public release gate.
