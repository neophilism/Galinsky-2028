ALTER TABLE g28.outbox DROP CONSTRAINT IF EXISTS outbox_kind_check;
ALTER TABLE g28.outbox ADD CONSTRAINT outbox_kind_check CHECK(kind IN ('account_login','account_welcome','account_security','account_reminder'));
ALTER TABLE g28.outbox ADD COLUMN IF NOT EXISTS provider_email_id uuid UNIQUE;
CREATE TABLE IF NOT EXISTS g28.mail_events(
 event_id text PRIMARY KEY CHECK(length(event_id) BETWEEN 1 AND 180),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 provider_email_id uuid NOT NULL,
 event_type text NOT NULL CHECK(event_type IN ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed')),
 permanent_suppression boolean NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mail_events_provider ON g28.mail_events(provider_email_id);
CREATE TABLE IF NOT EXISTS g28.mail_suppressions(
 subject_key text PRIMARY KEY,reason text NOT NULL CHECK(reason IN ('hard_bounce','complaint','provider_suppressed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS g28.account_notice_keys(
 account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,
 event_key text NOT NULL CHECK(length(event_key) BETWEEN 1 AND 180),PRIMARY KEY(account_id,event_key)
);
INSERT INTO g28.schema_migrations(version) VALUES('018_mail_delivery') ON CONFLICT DO NOTHING;
