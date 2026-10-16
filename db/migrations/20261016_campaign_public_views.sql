-- Additive projection-only migration. No real editorial data belongs in Git.
-- Application writes retain immutable rows in the existing revision store.
CREATE OR REPLACE VIEW g28.campaign_public_releases WITH (security_barrier=true) AS
 SELECT substring(content_key FROM 17) AS campaign_id, revision,
  jsonb_build_object('schemaVersion',record->'schemaVersion','fields',record->'fields','theme',record->'theme','hero',record->'hero') AS document
 FROM g28.content_revisions
 WHERE content_key ~ '^campaign[.]public[.][0-9a-f-]{36}$' AND state='published';
CREATE OR REPLACE VIEW g28.campaign_public_settings WITH (security_barrier=true) AS
 SELECT revision AS version,
  jsonb_build_object('schemaVersion',record->'schemaVersion','modeSwitching',record->'modeSwitching','default',record->'default','day',record->'day','night',record->'night') AS document
 FROM g28.content_revisions
 WHERE content_key='campaign.selection' AND state='published'
 ORDER BY revision DESC LIMIT 1;
CREATE OR REPLACE VIEW g28.campaign_public_media WITH (security_barrier=true) AS
 SELECT substring(a.content_key FROM 16) AS asset_id, a.record->>'base64' AS base64
 FROM g28.content_revisions a
 WHERE a.content_key ~ '^campaign[.]asset[.][0-9a-f-]{36}$' AND a.revision=1
 AND EXISTS (SELECT 1 FROM g28.campaign_public_releases p
  WHERE p.document->'hero'->>'assetPath'='/campaign-media/'||substring(a.content_key FROM 16)||'.png');
REVOKE ALL ON g28.campaign_public_releases,g28.campaign_public_settings,g28.campaign_public_media FROM PUBLIC;
-- Grant USAGE on schema and SELECT only on these views to the separately
-- provisioned public runtime role. Never grant it SELECT on content_revisions.
INSERT INTO g28.schema_migrations(version) VALUES('20261016_campaign_public_views') ON CONFLICT DO NOTHING;
