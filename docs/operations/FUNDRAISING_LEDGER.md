# Provider-neutral financial reconciliation foundation

**Status: not connected to payment processing.** This is a strict integer-cent reducer and a server-side event-id uniqueness schema. It does NOT verify a real provider's HMAC/signature, determine statutory election limits, collect payments, issue receipts, support recurring cancellation, or reconcile actual treasury deposits.

The required production adapter must verify signed, exact raw-body events *before* setting the internal `verified` marker, persist the provider event and ledger state atomically, handle retries/out-of-order messages by provider-specific reconciliation, reconcile settlement versus provider reports, keep donor personally identifying information in restricted treasury-controlled systems only, and allow supervised exceptions rather than silently accepting anomalies. The provider, account, election designation, contribution caps and treasurer approval are missing external inputs.

Synthetic tests cover one capture, partial refunds, final refund, replay idempotency, identity confusion, dispute handling and rejection of ambiguous/out-of-order events. There are no public financial endpoints and `DONATIONS_ENABLED` remains impossible to enable through a mere flag. Migration 004 introduces only event references and amounts (no card or donor data). Apply to an isolated staging branch before any production rollout. Do not claim real donation availability until the provider, treasurer, data protection, ledger, disclosure and signed-webhook end-to-end tests are independently accepted.

## Runtime donation routing vs. actual financial events

Migration 007 and the four-way routing engine track which hosted processor the donor was directed to and health observations **without donor PII or card data**. A redirect selection is not a financial contribution and does NOT update this ledger. Until four real processor-specific verified webhook/export implementations are accepted and reconciled, finance reporting and automated charged-payment outage detection remain UNIMPLEMENTED. Do not infer donations from redirects or payment success from a reachable checkout page.

Read-only checkout availability observations from migration 008 are not financial events; they cannot establish whether an account is actually authorized to accept or settle a contribution.
