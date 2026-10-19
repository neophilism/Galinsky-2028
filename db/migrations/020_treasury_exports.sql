CREATE TABLE IF NOT EXISTS g28.treasury_exports(
 id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES g28.accounts(id),
 range_from timestamptz NOT NULL,range_until timestamptz NOT NULL CHECK(range_until>range_from),
 format text NOT NULL CHECK(format IN ('csv','json')),purpose text NOT NULL CHECK(purpose IN ('reconciliation','authorized_review')),
 row_count integer NOT NULL CHECK(row_count BETWEEN 0 AND 10000),sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO g28.schema_migrations(version) VALUES('020_treasury_exports') ON CONFLICT DO NOTHING;
