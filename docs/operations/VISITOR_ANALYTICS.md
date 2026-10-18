# Galinsky 2028 — first-party visitor analytics

## What the protected admin dashboard shows

Open **Visitor analytics** at /visitors in the existing protected staff portal. Every report requires a current verified owner or auditor role. The owner can select a 24-hour, 7-day, or 30-day window, drill into any of the nine registered public campaign pages, and export **aggregated** CSV. A visible admin tab refreshes every 30 seconds.

- Page views, approximate active foreground pages, average visible dwell.
- Link and button clicks by ordinal control ID and approved category of destination.
- FAQ accordion opens and closes; copy, share, and download clicks.
- Times a page section was meaningfully in view, focused visible seconds and averages.
- Scroll-depth thresholds (10, 25, 50, 75, 90, 100 percent).
- Link-hover dwell time; generic form focus/change/error/submit/abandon **events only**.
- Native HTML media play, pause, seek, finish and playback quartiles.
- Embedded YouTube playback state and 25/50/75/100 percent milestones, using the IFrame API only when the visitor has separately opted into analytics and clicked play. Never capture video identifiers in events; no external API script before consent and play.
- Heuristic rage clicks (three rapid clicks in one section), noninteractive/dead clicks, scroll speed/direction classes and likely stalled same-site navigations.
- Generic resource failures, JavaScript errors, promise rejection counts, HTTP status classes and slow-resource duration classes without URLs/messages/stacks.
- TTFB, FCP, LCP, CLS scaled x1,000, longest observed Event Timing latency (not exact standardized INP), and main-thread long-task and slow-resource time distributions.
- Consent-based on-page funnel stages for public policy reading, contribution-page controls and volunteer role finding, never actual donations or account identities. Viewport width band (mobile/tablet/desktop) only.
- Anonymous 20×20 normalized, **aggregate-only** click-density map.

No name, account identifier, IP address, entered value, clipboard contents, free-text search query, URL query/hash, raw referrer, exact destination URL, user journey, fingerprint, mouse trail, session replay or third-party analytics provider is stored. A random v4 UUID is generated per page view only, not retained in localStorage/cookies, and cannot correlate visitors between pages. Do not extend these metrics into an individual political profile or user-linked campaign CRM. Consent choice (yes/no) is held locally to remember the visitor's preference without a trackable ID.

Consent is explicit: no analytics request occurs before **Allow anonymous analytics**. The first visit shows a compact accept/decline panel. **No thanks** persists the refusal; Global Privacy Control or Do Not Track suppress the panel and analytics. The privacy notices page has a button to revoke or change consent. Changing consent to off stops future collection; already captured data expires under the retention policy. No critical website function depends on consent.

The browser sends only fixed action enums, anonymous component ordinals and bounded integers. Events are batched (up to 12 per POST). PostgreSQL independently validates actions and page IDs, idempotency by (view_id,seq), maximum 2,000 actions/page view and maximum four hours/view. The web-origin gate runs before ingestion; a distinct EXECUTE-only database role has **no SELECT** on visitor rows. The administration endpoint rechecks verified role on every request. Responses have private no-store headers.

**Retention:** page view rows and their automatically cascaded event rows are deleted after 30 days by a transactional daily-eligibility purge on new view starts. A dedicated operator should also arrange regular DB cleanup once public, since a completely inactive site won't run the purge.

**Accuracy limits:** section exposure is an approximation based on a focused tab and viewport occupancy; nested areas may overlap. Click heatmaps combine responsive layouts. Embedded YouTube iframe metrics require browser support, an approved third-party Player API load and a successfully initialized player. The API is loaded only after the visitor has opted in and then clicks play. When unavailable, only the video-activation click is known. No viewing attribution is created. Background tabs do not count toward focused reading time. Ad blockers, network failures, and privacy settings produce intentional undercounts. No "unique visitor" counts are claimed because no persistent visitor identifier is collected.

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
- Browser: consent off -> no network, opt-in -> events, FAQ opens and clicks -> fixed event batch, privacy signal -> no tracking; synthetic clicks/error paths and mocked YouTube progress. Verify no external YouTube script loads until opt-in *and* user play.
- CI/build: TypeScript/lint, PostgreSQL, browser journeys and first-render byte budget including the script.

## Future opt-in enhancements

Further enhancements require separate evidence and approval: certified standardized INP instrumentation (rather than worst Event Timing proxy), cross-page conversion attribution if ever lawful and consented, verified processor payment outcomes in a legally separated finance dashboard, and wider browser compatibility audits. Do not add keystroke recording, full session replay, individual political engagement scores, fingerprinting or identity-linked behavioral histories.
