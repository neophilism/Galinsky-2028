-- Explicit public projection of the latest owner publication, independent of drafts.
CREATE OR REPLACE VIEW g28.sharing_assets_public WITH(security_barrier=true) AS
 WITH latest AS (
 SELECT DISTINCT ON(content_key) content_key,record FROM g28.content_revisions
 WHERE content_key ~ '^campaign[.]sharing[.]public[.][0-9a-f-]{36}$'
 ORDER BY content_key,revision DESC
 ) SELECT split_part(l.content_key,'.',4) AS id,(l.record->>'sourceRevision')::integer AS revision,
  l.record->'document' AS document
 FROM latest l WHERE l.record->>'status'='published'
 AND l.record->'document'->>'rightsApproved'='true'
 AND (l.record->'document'->>'expiresAt')::timestamptz>now()
 AND (l.record->'document'->>'imagePath'='/assets/candidate.webp' OR EXISTS(
  SELECT 1 FROM g28.content_revisions a WHERE a.content_key='campaign.asset.'||substring(l.record->'document'->>'imagePath' FROM 17 FOR 36) AND a.revision=1));
REVOKE ALL ON g28.sharing_assets_public FROM PUBLIC;
-- A rights-approved current sharing publication can authorize its own image;
-- a draft, expired or withdrawn asset never makes an image publicly readable.
CREATE OR REPLACE VIEW g28.campaign_public_media WITH(security_barrier=true) AS
 SELECT substring(a.content_key FROM 16) AS asset_id,a.record->>'base64' AS base64
 FROM g28.content_revisions a WHERE a.content_key ~ '^campaign[.]asset[.][0-9a-f-]{36}$' AND a.revision=1
 AND (EXISTS(SELECT 1 FROM g28.campaign_public_releases p WHERE p.document->'hero'->>'assetPath'='/campaign-media/'||substring(a.content_key FROM 16)||'.png')
 OR EXISTS(SELECT 1 FROM g28.sharing_assets_public s WHERE s.document->>'imagePath'='/campaign-media/'||substring(a.content_key FROM 16)||'.png'));
REVOKE ALL ON g28.campaign_public_media FROM PUBLIC;
INSERT INTO g28.schema_migrations(version) VALUES('20261019_sharing_assets') ON CONFLICT DO NOTHING;
