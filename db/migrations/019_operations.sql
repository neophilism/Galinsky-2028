CREATE TABLE IF NOT EXISTS g28.operation_definitions(
 kind text NOT NULL CHECK(kind IN ('task','training','tool')),id text NOT NULL,revision integer NOT NULL CHECK(revision>0),record jsonb NOT NULL,PRIMARY KEY(kind,id)
);
CREATE TABLE IF NOT EXISTS g28.operation_claims(
 task_id text NOT NULL,account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,record jsonb NOT NULL,PRIMARY KEY(task_id,account_id)
);
CREATE TABLE IF NOT EXISTS g28.training_attestations(
 account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,training_id text NOT NULL,record jsonb NOT NULL,PRIMARY KEY(account_id,training_id)
);
CREATE TABLE IF NOT EXISTS g28.tool_consents(
 account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,tool_id text NOT NULL,revision integer NOT NULL,allowed boolean NOT NULL,PRIMARY KEY(account_id,tool_id)
);
CREATE TABLE IF NOT EXISTS g28.operation_claim_history(
 id bigserial PRIMARY KEY,task_id text NOT NULL,account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,record jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO g28.schema_migrations(version) VALUES('019_operations') ON CONFLICT DO NOTHING;
