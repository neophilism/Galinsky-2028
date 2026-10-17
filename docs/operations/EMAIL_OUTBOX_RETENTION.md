# Durable mail outbox retention (17 October 2026)

The existing PostgreSQL outbox stores encrypted short-lived sign-in delivery jobs. A previously scheduled cleanup deleted every job older than one day, even while queued or leased. During a sender outage or a suspended free worker, that could discard work before the worker processed it. This is now prohibited.

- Expired login requests, sessions and rate buckets may still be removed. They are distinct from the send queue.
- An outbox row remains until the worker records its terminal `sent` or `dead` state. A queued or leased row is never removed on age alone. After revival, an expired sign-in link is refused by the worker and marked dead; it is never sent late.
- Only terminal rows created more than **30 days** ago are purged, in bounded groups of 250 using PostgreSQL row locking to avoid disturbing concurrent workers.
- Retention cleanup is not a proof of recipient receipt or a substitute for the provider's delivery callback. Sending status is separate from mailbox delivery.
- Accounts, treasury records, financial ledger, protected records and publication logs are outside this cleanup. Any future legal hold / finance retention extension must use its own policy.

Regression coverage: `tests/integration/postgres.test.mjs` creates month-old queued, leased, sent and dead jobs, a recent sent job and repeats cleanup. Integration suite uses only `TEST_DATABASE_URL` on local PostgreSQL, never the assigned Neon database.

**Further work (G28-24/49/55):** verified sender/domain delivery, real provider callbacks, dead-letter handling/alerts, retention hold metadata, independent recovery drill and backup lifespan measurement. Do not declare these work packages complete from this fix alone.
