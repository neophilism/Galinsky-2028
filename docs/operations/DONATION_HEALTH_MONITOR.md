# Checkout availability monitor: installation and limits

**Release state:** OFF by default; no external merchant health or payment processing has been verified. This is an automated, read-only check of hosted checkout PAGE reachability, not authorization, settlement, contribution eligibility, account good standing, or reconciliation.

## Workflow
.github/workflows/donation-checkout-monitor.yml offers a best-effort GitHub Actions scheduled job every three minutes. Because GitHub schedule runs can be delayed or skipped, this is NOT an SLA monitoring substitute. Use a properly redundant approved external runner and provider-signed transaction events for production-grade continuity.

Enable only after all four merchant accounts are independently approved and owners/treasurer authorize the health check traffic:
1. Set Actions repository variable G28_DONATIONS_MONITOR_ENABLED=true (leave false otherwise).
2. Add Actions secret G28_DONATIONS_MONITOR_DATABASE_URL pointing to a least-privileged **pooled** campaign database connection on the right branch. Testing must use staging, never production data; use a separate narrowly scoped DB user for monitoring as feasible.
3. Add Actions secret G28_DONATIONS_MONITOR_ROUTES_JSON containing FOUR approved provider objects with exactly id,name,host,url,approved:true. Example shape for documentation only: [{"id":"provider-a","name":"Provider A","host":"checkout.example.org","url":"https://checkout.example.org/approved-page","approved":true}, ... four real objects]. Never use example hosts in production.
4. The route configuration MUST match the four production web-service checkout URLs and IDs. Migrations 007 and 008 must have been applied and the provider rows must already be explicitly activated after separate merchant acceptance.
5. Test via workflow_dispatch in staging first; inspect incident events and states without donor PII, then demonstrate a controlled 5xx outage, verified repair and irreversible exclusion. Obtain approval before pointing it at production.

The monitor checks approved HTTPS hosted-page GET status without following redirects, never submitting any card or donor data. A 2xx/3xx page is "checkout_reachable" but NOT verified payment processing. A 404, 410, 5xx, DNS failure, or timeout is "checkout_unreachable"; three distinct scheduled failure buckets within ten minutes quarantine a provider. A checkout success resets only checkout-availability error streaks, never gateway authorization/settlement error streaks. HTTP 401/403/429, suspicious Stripe redirect, or other inconclusive responses require an operator to investigate and do NOT independently quarantine. If three or more providers fail together from the same probe runner, treat it as a common monitor/network outage and DO NOT quarantine them on that evidence.

The workflow writes idempotent, non-PII observations to PostgreSQL. A provider in quarantined or excluded state is omitted immediately from all new random rotations; it cannot resume automatically. A human must supply documented repair acceptance for restoration. If confirmed wrongful service denial or another contract violation warrants final exclusion, an authorized operator must record the decision and evidence before using set-state excluded. Do not automatically diagnose motives from generic network failures.

## Additional work before claimed production protection
Each merchant still needs its own actual signed webhook or authenticated processing API adapter, independent financial ledger and settlement reconciliation, refund/chargeback handling, a functioning live test, and a contact/escalation route. A successful page probe is insufficient to detect a processor that silently declines every donation or never settles funds. The campaign treasurer must monitor real deposit reconciliation and authorized financial exceptions until the real provider events are connected.
