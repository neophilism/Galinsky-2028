# Galinsky 2028 — visitor analytics

Visitor metrics are shown at /visitors in the **existing verified-owner/admin portal**, accessible only by owner and auditor roles. The dashboard refreshes once per 30 seconds while visible and supports 24-hour, 7-day and 30-day windows. Data is anonymous per-page visits, active pages and foreground focused dwell time only; it cannot show identifiable users or page-to-page journeys.

## Deployment prerequisites

1. Apply db/migrations/20261017_visitor_analytics.sql in the assigned **staging** Neon project.
2. Create a distinct restricted Neon role for ingestion, with only schema USAGE and function EXECUTE on g28.ingest_page_visit(uuid,text,text,integer). It must NOT have SELECT on g28.page_visits or access to existing volunteer, identity or treasury tables. Example using authorized DBA access: CREATE ROLE g28_visitor_ingest LOGIN PASSWORD '<GENERATE-OUTSIDE-SOURCE>'; GRANT USAGE ON SCHEMA g28 TO g28_visitor_ingest; GRANT EXECUTE ON FUNCTION g28.ingest_page_visit(uuid,text,text,integer) TO g28_visitor_ingest;
3. In the existing protected web Render service (srv-db5teuajnfac73bm8pug), set G28_VISITOR_ANALYTICS_DATABASE_URL to the restricted role's Neon TLS URL. Set G28_VISITOR_ANALYTICS_ORIGIN to the real first-party HTTPS website origin. Only then set G28_VISITOR_ANALYTICS_ENABLED=true.
4. The existing protected portal Render service (srv-db5v0lfavr4c73a62870) uses its existing application DB role for the aggregate report; verified administrator email sign-in must be operational.
5. Deploy tested commits only to the two preauthorized Render services, without lifting preview password, enabling donations/sign-ups or opening a public production site. Verify same-origin POST, anonymous rejected with 401, unauthorized user rejected with 403, reporting status and retention. No historical data backfill.

Collection defaults OFF, emits no third-party analytics traffic, honors GPC/DNT, uses only temporary per-page UUIDs, sends no IP or query/hash/referrer/account identifiers. Database rows are pruned after 30 days during incoming measurements, at most once per day. The website's authentication gate precedes collection. Server-side response data is aggregated without view IDs. For privacy and reliability, live counts and durations are approximate; multiple tabs count separately and browser/network failures may undercount. This change is not evidence of an already active live deployment.
