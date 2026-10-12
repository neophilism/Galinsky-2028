-- Additive change; preview accounts remain separate from campaign accounts.
ALTER TABLE public.g28_review_user ADD COLUMN IF NOT EXISTS "previewPasswordChangeRequired" boolean NOT NULL DEFAULT false;
INSERT INTO g28.schema_migrations(version) VALUES ('012_private_review_credentials') ON CONFLICT DO NOTHING;
