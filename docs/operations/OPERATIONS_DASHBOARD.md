# Private operations dashboard (17 October 2026)

**Path:** `/operations` on the existing password-gated volunteer portal. Visible only after verified account sign-in as owner or an explicitly granted auditor. Treasurer, editor, ordinary volunteer, revoked staff and anonymous sessions cannot access its source endpoint. Read-only, never public campaign analytics.

**How it works:** Press **Refresh status** to retrieve `GET /api/admin/operations`. The server rechecks authorization and returns only schema versions and aggregate account, approved-material and email-queue counts. Queries never select addresses, source IPs, tokens, delivery envelopes, donor records or protected volunteer content. Common API headers enforce `no-store`. There are no write actions or background refreshes. A development memory snapshot is explicitly synthetic/unhealthy.

**Interpretation:** A queued, sent or leased message is not confirmed recipient delivery. Missing schema versions, dead-letter jobs and queued work older than 15 minutes create warnings. A failed refresh shows its error and identifies the previous view as possibly stale. No fabricated backup, sender-delivery or public conversion claims appear.

**Pending G28-50 / G28-56 work:** verified provider callbacks, explicit opt-out suppression, full staff MFA, real private owner login and backend deployment acceptance; Engine Room freshness integration, published-content and backup restore evidence, consented aggregate campaign measurement and full live release rehearsal. This new endpoint does not enable signup, fundraising, restricted work or public production.
