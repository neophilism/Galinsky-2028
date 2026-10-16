-- Extend the existing published-only projection with validated appearance effects.
-- Keep all private editorial labels and draft metadata outside the public role.
-- This migration is additive and preserves existing view grants.
CREATE OR REPLACE VIEW g28.campaign_public_releases WITH (security_barrier=true) AS
 SELECT substring(content_key FROM 17) AS campaign_id, revision,
  jsonb_build_object(
   'schemaVersion',record->'schemaVersion',
   'fields',record->'fields',
   'theme',record->'theme',
   'hero',record->'hero'
  ) ||
  CASE WHEN record ? 'heroBackground'
   THEN jsonb_build_object('heroBackground',record->'heroBackground')
   ELSE '{}'::jsonb END AS document
 FROM g28.content_revisions
 WHERE content_key ~ '^campaign[.]public[.][0-9a-f-]{36}$' AND state='published';
REVOKE ALL ON g28.campaign_public_releases FROM PUBLIC;
INSERT INTO g28.schema_migrations(version)
 VALUES('20261016_hero_effect_projection') ON CONFLICT DO NOTHING;
