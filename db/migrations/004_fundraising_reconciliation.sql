-- Schema scaffolding only: no payment route, processor secret, donor PII
-- or automatic acceptance. Do not treat data rows as legally reconciled.
CREATE TABLE IF NOT EXISTS g28.financial_provider_events(
 provider text NOT NULL CHECK(length(provider) BETWEEN 1 AND 128),
 event_id text NOT NULL CHECK(length(event_id) BETWEEN 1 AND 128),
 payment_id text NOT NULL CHECK(length(payment_id) BETWEEN 1 AND 128),
 event_digest text NOT NULL CHECK(event_digest ~ '^[0-9a-f]{64}$'),
 event_kind text NOT NULL CHECK(event_kind IN ('captured','partially_refunded','refunded','disputed')),
 amount_cents bigint NOT NULL CHECK(amount_cents > 0 AND amount_cents <= 100000000),
 occurred_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,event_id)
);
CREATE INDEX IF NOT EXISTS financial_provider_events_payment ON g28.financial_provider_events(provider,payment_id);
INSERT INTO g28.schema_migrations(version) VALUES('004_fundraising_reconciliation') ON CONFLICT DO NOTHING;
