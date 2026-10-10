CREATE SCHEMA IF NOT EXISTS g28;
CREATE TABLE IF NOT EXISTS g28.schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS g28.accounts(
 id uuid PRIMARY KEY, email_key text UNIQUE NOT NULL, delivery_envelope text NOT NULL,
 verified_at timestamptz NOT NULL, marketing_consent boolean NOT NULL DEFAULT false,
 terms_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS g28.login_requests(
 token_hash text PRIMARY KEY, binding_hash text NOT NULL, email_key text NOT NULL,
 delivery_envelope text NOT NULL, marketing_consent boolean NOT NULL DEFAULT false,
 terms_version text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS g28.sessions(
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,
 csrf_token text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiration ON g28.sessions(expires_at);
CREATE TABLE IF NOT EXISTS g28.outbox(
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('account_login')),
 subject_key text NOT NULL, payload_envelope text NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','leased','sent','dead')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, lease_token uuid, last_error_code text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_available ON g28.outbox(status,available_at);
CREATE TABLE IF NOT EXISTS g28.rate_buckets(key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS g28.materials(
 id text PRIMARY KEY, revision integer NOT NULL CHECK(revision>0), status text NOT NULL,
 audience text NOT NULL, record jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS g28.content_revisions(
 id uuid PRIMARY KEY, content_key text NOT NULL, revision integer NOT NULL,
 record jsonb NOT NULL, state text NOT NULL DEFAULT 'draft', author_subject text NOT NULL,
 reviewer_subject text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(content_key,revision), CHECK(reviewer_subject IS NULL OR reviewer_subject<>author_subject)
);
CREATE TABLE IF NOT EXISTS g28.activity_modules(
 id text NOT NULL, revision integer NOT NULL, record jsonb NOT NULL,
 PRIMARY KEY(id,revision)
);
-- No plaintext protected-content column or automatic provider-held recipient key.
-- Application access remains off until the reviewed protected-content adapter is implemented.
CREATE TABLE IF NOT EXISTS g28.encrypted_records(
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,
 profile_pin text NOT NULL, envelope bytea NOT NULL, recipient_manifest_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS g28.audit_events(
 id uuid PRIMARY KEY, actor_subject text NOT NULL, action text NOT NULL,
 object_id text NOT NULL, result text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO g28.schema_migrations(version) VALUES('001_foundation') ON CONFLICT DO NOTHING;
