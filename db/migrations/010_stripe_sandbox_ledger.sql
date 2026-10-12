-- Stripe Checkout continuity data only; never contains donor identity or card data.
-- Stripe captured status is NOT a reconciled bank deposit or FEC-certified receipt.
CREATE TABLE IF NOT EXISTS g28.stripe_checkout_intents(
 client_reference text PRIMARY KEY CHECK(client_reference ~ '^attempt_[a-f0-9]{32}$'),
 session_id text NOT NULL UNIQUE CHECK(length(session_id) BETWEEN 15 AND 150),
 election text NOT NULL CHECK(election IN ('primary','general')),
 amount_cents bigint NOT NULL CHECK(amount_cents>0 AND amount_cents<=100000000),
 livemode boolean NOT NULL,
 payment_state text NOT NULL DEFAULT 'pending' CHECK(payment_state IN('pending','paid','requires_review')),
 created_at timestamptz NOT NULL DEFAULT now(),
 confirmed_at timestamptz
);
CREATE INDEX IF NOT EXISTS stripe_checkout_intents_created ON g28.stripe_checkout_intents(created_at DESC);
CREATE TABLE IF NOT EXISTS g28.stripe_webhook_receipts(
 event_id text PRIMARY KEY CHECK(length(event_id) BETWEEN 9 AND 150),
 event_sha256 text NOT NULL CHECK(event_sha256 ~ '^[a-f0-9]{64}$'),
 session_id text NOT NULL,
 livemode boolean NOT NULL,
 event_type text NOT NULL CHECK(length(event_type) BETWEEN 5 AND 128),
 received_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO g28.schema_migrations(version) VALUES('010_stripe_sandbox_ledger')
ON CONFLICT DO NOTHING;
