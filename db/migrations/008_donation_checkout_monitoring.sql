-- Add nonfinancial site-reachability observations without conflating them with payments.
ALTER TABLE g28.donation_provider_observations
 DROP CONSTRAINT IF EXISTS donation_provider_observations_signal_check;
ALTER TABLE g28.donation_provider_observations
 ADD CONSTRAINT donation_provider_observations_signal_check
 CHECK (signal IN (
  'verified_success','donor_decline','donor_cancelled',
  'gateway_error','gateway_timeout','processor_unavailable',
  'access_terminated','credentials_revoked','merchant_suspended',
  'checkout_reachable','checkout_unreachable'
 ));
INSERT INTO g28.schema_migrations(version) VALUES('008_donation_checkout_monitoring')
 ON CONFLICT DO NOTHING;
