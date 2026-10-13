-- Stripe checkout expiry and asynchronous payment failure must not be
-- confused with paid donations, settlements, or processor outages.
ALTER TABLE g28.stripe_checkout_intents
 DROP CONSTRAINT IF EXISTS stripe_checkout_intents_payment_state_check;
ALTER TABLE g28.stripe_checkout_intents
 ADD CONSTRAINT stripe_checkout_intents_payment_state_check
 CHECK (payment_state IN ('pending','paid','expired','failed','requires_review'));
ALTER TABLE g28.stripe_checkout_intents
 ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;
INSERT INTO g28.schema_migrations(version) VALUES('011_stripe_checkout_lifecycle')
 ON CONFLICT DO NOTHING;
