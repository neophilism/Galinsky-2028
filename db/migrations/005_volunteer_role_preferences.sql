-- Durable, self-selected account preferences. No profiling, contact lists,
-- hidden political inference, activity authorization, or third-party data.
CREATE TABLE IF NOT EXISTS g28.volunteer_role_preferences(
 account_id uuid PRIMARY KEY REFERENCES g28.accounts(id) ON DELETE CASCADE,
 role_id text NOT NULL CHECK(role_id IN (
  'network','digital','issue','canvass','phone','host','recruit',
  'captain','ballot','voter','fundraising','skills'
 )),
 available_minutes integer NOT NULL CHECK(available_minutes IN (15,30,120,240)),
 willing_to_train boolean NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO g28.schema_migrations(version) VALUES('005_volunteer_role_preferences') ON CONFLICT DO NOTHING;
