# Galinsky 2028 — first-party visitor analytics

## What the protected admin dashboard shows

Open **Visitor analytics** at /visitors in the existing protected staff portal. Every report requires a current verified owner or auditor role. The owner can select a 24-hour, 7-day, or 30-day window, drill into any of the eight public campaign pages, and export **aggregated** CSV. A visible admin tab refreshes every 30 seconds.

- Page views, approximate active foreground pages, average visible dwell.
- Link and button clicks by ordinal control ID and approved category of destination.
- FAQ accordion opens and closes; copy, share, and download clicks.
- Times a page section was meaningfully in view, focused visible seconds and averages.
- Scroll-depth thresholds (10, 25, 50, 75, 90, 100 percent).
- Link-hover dwell time; generic form focus/change/error/submit/abandon **events only**.
- Native HTML media play, pause, seek, finish and playback quartiles.
- Anonymous 20×20 normalized, **aggregate-only** click-density map.

No name, account identifier, IP address, entered value, clipboard contents, free-text search query, URL query/hash, raw referrer, exact destination URL, user journey, fingerprint, mouse trail, session replay or third-party analytics provider is stored. A random v4 UUID is generated per page view only, not retained in localStorage/cookies, and cannot correlate visitors between pages. Do not extend these metrics into an individual political profile or user-linked campaign CRM. Consent choice (yes/no) is held locally to remember the visitor's preference without a trackable ID.

Consent is explicit: no analytics request occurs before **Allow anonymous analytics**. The first visit shows a compact accept/decline panel. **No thanks** persists the refusal; Global Privacy Control or Do Not Track suppress the panel and analytics. The privacy notices page has a button to revoke or change consent. Changing consent to off stops future collection; already captured data expires under the retention policy. No critical website function depends on consent.

The browser sends only fixed action enums, anonymous component ordinals and bounded integers. Events are batched (up to 12 per POST). PostgreSQL independently validates actions and page IDs, idempotency by (view_id,seq), maximum 2,000 actions/page view and maximum four hours/view. The web-origin gate runs before ingestion; a distinct EXECUTE-only database role has **no SELECT** on visitor rows. The administration endpoint rechecks verified role on every request. Responses have private no-store headers.

**Retention:** page view rows and their automatically cascaded event rows are deleted after 30 days by a transactional daily-eligibility purge on new view starts. A dedicated operator should also arrange regular DB cleanup once public, since a completely inactive site won't run the purge.

**Accuracy limits:** section exposure is an approximation based on a focused tab and viewport occupancy; nested areas may overlap. Click heatmaps combine responsive layouts. Native HTML media metrics do not read third-party YouTube iframe playback state. A video activation button click is observable, but iframe quartiles require separate, consented Player API integration. Background tabs do not count toward focused reading time. Ad blockers, network failures, and privacy settings produce intentional undercounts. No "unique visitor" counts are claimed because no persistent visitor identifier is collected.

## Provision and deploy only to approved existing infrastructure

1. Apply migrations db/migrations/20261017_visitor_analytics.sql and db/migrations/20261018_visitor_interactions.sql in the **assigned staging** Galinsky 2028 Neon database after verifying the branch and target.
2. Create a restricted, unrelated **web ingestion** database login and grant schema USAGE and only these two functions (no table SELECT/INSERT/UPDATE/DELETE and no access to volunteer, editorial, account, or treasury data):

       CREATE ROLE g28_visitor_ingest LOGIN PASSWORD '<GENERATE-OUTSIDE-SOURCE>';
       GRANT USAGE ON SCHEMA g28 TO g28_visitor_ingest;
       GRANT EXECUTE ON FUNCTION g28.ingest_page_visit(uuid,text,text,integer) TO g28_visitor_ingest;
       GRANT EXECUTE ON FUNCTION g28.ingest_page_events(uuid,text,jsonb) TO g28_visitor_ingest;

   Never copy that password into source, tickets, fixtures, CI logs or chat.
3. Set environment values **only** on authorized existing protected WEB service srv-db5teuajnfac73bm8pug (project prj-db57fnm7bikc739783q0): G28_VISITOR_ANALYTICS_DATABASE_URL (restricted role's TLS Neon URL), G28_VISITOR_ANALYTICS_ORIGIN (exact HTTPS website origin), and finally G28_VISITOR_ANALYTICS_ENABLED=true. Disabled is the default; never provide the main database credentials to the collector.
4. The existing portal/API srv-db5v0lfavr4c73a62870 uses its existing application database credential for **grouped** SQL aggregates. Verified administrator email sign-in must work. Reviewer or Basic preview credentials alone are not administrator authorization.
5. Deploy only green, reviewed exact commits to those two services; verify collector origin rejection, privilege denials, consent, section metrics, role revocation, and no user fields. Preserve private-preview password gates and existing disabled sign-ups, regulated actions, and payments. A merged PR is not live activation. Historical visits cannot be backfilled.

## Test gates

- Validation: extra keys, arbitrary URLs/text, invalid targets, out-of-range readings, duplicate sequences and oversized batches rejected.
- SQL integration: replay idempotence, anonymous page containment, read-denied ingestion-only role, grouped time/click/accordion metrics, retention linkage.
- HTTP: preview authentication, same-origin POST, body limits and owner/auditor-only read including revocation.
- Browser: consent off -> no network, opt-in -> events, FAQ opens and clicks -> fixed event batch, privacy signal -> no tracking.
- CI/build: TypeScript/lint, PostgreSQL, browser journeys and first-render byte budget including the script.

## Future opt-in enhancements

Performance timings (Core Web Vitals), aggregate error-rate telemetry, rage-click/dead-click signals, anonymous device viewport-class breakdown, and YouTube Player API playback quartiles are feasible. They need their own reviewed schema, notices and QA before claiming implementation. Do not add keystroke recording, full session replay, individual political engagement scores, fingerprinting, or identity-linked behavioral histories.
