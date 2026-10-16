-- A team is the transaction boundary for membership and event capacity. All
-- updates lock its row, so concurrent joins, removals and RSVPs are serialized.
-- This is operational metadata, not an E2EE content or contact database.
CREATE TABLE IF NOT EXISTS g28.coordination_teams (
 id uuid PRIMARY KEY,
 record jsonb NOT NULL CHECK (jsonb_typeof(record)='object'),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (record->>'id'=id::text)
);
INSERT INTO g28.schema_migrations(version) VALUES('014_volunteer_coordination') ON CONFLICT DO NOTHING;
