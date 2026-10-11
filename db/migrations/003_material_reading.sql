-- A personal acknowledgment of reading an approved revision. It never certifies
-- training competence, ballot access, canvassing authority or legal compliance.
CREATE TABLE IF NOT EXISTS g28.material_reading(
 account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,
 material_id text NOT NULL CHECK(length(material_id) BETWEEN 1 AND 80),
 revision integer NOT NULL CHECK(revision>0),
 content_sha256 text NOT NULL CHECK(content_sha256 ~ '^[0-9a-f]{64}$'),
 acknowledged_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,material_id)
);
INSERT INTO g28.schema_migrations(version) VALUES('003_material_reading') ON CONFLICT DO NOTHING;
