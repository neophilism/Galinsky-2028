-- A single explicit, versioned agreement replaces five independent browser
-- checkboxes. Preserve consent evidence only for newly created sessions.
-- Prior Stripe test sessions retain a NULL terms_version.
ALTER TABLE g28.stripe_checkout_intents
 ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE g28.stripe_checkout_intents
 ADD COLUMN IF NOT EXISTS agreed_at timestamptz;
INSERT INTO g28.schema_migrations(version)
 VALUES('013_stripe_contribution_terms')
 ON CONFLICT DO NOTHING;
