CREATE TABLE IF NOT EXISTS g28.staff_security(
 account_id uuid PRIMARY KEY REFERENCES g28.accounts(id) ON DELETE CASCADE,
 record jsonb NOT NULL DEFAULT '{"credentials":[],"challenges":{},"sessions":{}}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO g28.schema_migrations(version) VALUES('016_staff_passkeys') ON CONFLICT DO NOTHING;
