-- Operational routing evidence ONLY, not contribution receipts or proof of settlement.
-- No donor/card identity is processed in this schema.
CREATE TABLE IF NOT EXISTS g28.donation_provider_state (
 provider_id text PRIMARY KEY CHECK (provider_id ~ '^[a-z][a-z0-9-]{1,39}$'),
 status text NOT NULL DEFAULT 'quarantined' CHECK (status IN ('active','quarantined','excluded')),
 reason text NOT NULL DEFAULT 'not_activated',
 evidence_ref text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS g28.donation_provider_observations (
 observation_seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 provider_id text NOT NULL REFERENCES g28.donation_provider_state(provider_id),
 event_id text NOT NULL CHECK(length(event_id) BETWEEN 6 AND 128),
 attempt_ref text NOT NULL CHECK(length(attempt_ref) BETWEEN 6 AND 128),
 signal text NOT NULL CHECK(signal IN (
  'verified_success','donor_decline','donor_cancelled',
  'gateway_error','gateway_timeout','processor_unavailable',
  'access_terminated','credentials_revoked','merchant_suspended'
 )),
 observed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (provider_id,event_id)
);
CREATE INDEX IF NOT EXISTS donation_provider_observations_recent
 ON g28.donation_provider_observations(provider_id,observation_seq DESC);
CREATE TABLE IF NOT EXISTS g28.donation_route_selections (
 id uuid PRIMARY KEY,
 provider_id text NOT NULL REFERENCES g28.donation_provider_state(provider_id),
 selected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS donation_route_selections_recent
 ON g28.donation_route_selections(selected_at DESC);
INSERT INTO g28.schema_migrations(version) VALUES('007_donation_rotation')
 ON CONFLICT DO NOTHING;
