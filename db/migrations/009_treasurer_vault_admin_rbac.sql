-- Owner-authorized treasurer console: grants based on verified email HMAC only.
-- Never store a bank number or provider API key in plaintext database columns.
CREATE TABLE IF NOT EXISTS g28.admin_grants (
 email_key text PRIMARY KEY CHECK(email_key ~ '^[a-f0-9]{64}$'),
 role text NOT NULL CHECK(role IN ('treasurer','editor','auditor')),
 display_label text NOT NULL CHECK(length(display_label) BETWEEN 2 AND 90),
 granted_by uuid NOT NULL REFERENCES g28.accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS admin_grants_active ON g28.admin_grants(role) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS g28.treasury_secrets (
 slot text PRIMARY KEY CHECK(slot IN ('bank','merchant-a','merchant-b','merchant-c','merchant-d')),
 encrypted_envelope text NOT NULL CHECK(length(encrypted_envelope) BETWEEN 20 AND 15000),
 masked_label text NOT NULL CHECK(length(masked_label) BETWEEN 2 AND 190),
 last_updated_by uuid NOT NULL REFERENCES g28.accounts(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS g28.treasury_audit (
 id uuid PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES g28.accounts(id),
 action text NOT NULL CHECK(action IN ('vault_set','grant_set','grant_revoke')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS treasury_audit_newest ON g28.treasury_audit(created_at DESC);

INSERT INTO g28.schema_migrations(version) VALUES('009_treasurer_vault_admin_rbac')
ON CONFLICT DO NOTHING;
