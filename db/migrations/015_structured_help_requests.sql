-- Account-scoped NON-SENSITIVE, structured help metadata only.
-- No narrative, attachments, recipient identity, evidence or protected content.
-- Other sensitive incident reports remain disabled pending reviewed E2EE.
CREATE TABLE IF NOT EXISTS g28.help_requests(
 id uuid PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('account_correction','material_correction','accessibility','privacy_question')),
 area text NOT NULL CHECK(area IN ('account','portal','materials','issues','homepage','volunteer')),
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','acknowledged','resolved','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS help_requests_owner_recent ON g28.help_requests(account_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS help_requests_pending ON g28.help_requests(created_at,id) WHERE status IN ('received','acknowledged');
INSERT INTO g28.schema_migrations(version) VALUES('015_structured_help_requests') ON CONFLICT DO NOTHING;
