-- Durable, account-scoped bookmarks; withdrawn or unreviewed material is
-- never exposed by bookmark APIs. Account closure cascades.
CREATE TABLE IF NOT EXISTS g28.account_bookmarks(
 account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,
 material_id text NOT NULL CHECK(material_id~'^[a-z0-9][a-z0-9-]{0,79}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,material_id)
);
INSERT INTO g28.schema_migrations(version) VALUES('006_account_bookmarks') ON CONFLICT DO NOTHING;
