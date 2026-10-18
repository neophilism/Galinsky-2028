-- Anonymous page-view metrics; no account, IP, browser or cross-page identity.
CREATE TABLE IF NOT EXISTS g28.page_visits(
 view_id uuid PRIMARY KEY,
 page text NOT NULL CHECK(page IN ('/','/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/','/volunteer/','/donate/','/notices/','/policies/eternal-liberty/')),
 started_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,
 visible_seconds integer NOT NULL DEFAULT 0 CHECK(visible_seconds BETWEEN 0 AND 14400)
);
CREATE INDEX IF NOT EXISTS page_visits_started ON g28.page_visits(started_at DESC,page);
CREATE INDEX IF NOT EXISTS page_visits_active ON g28.page_visits(last_seen_at DESC) WHERE ended_at IS NULL;
CREATE TABLE IF NOT EXISTS g28.page_visit_retention(
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 last_pruned timestamptz NOT NULL
);
INSERT INTO g28.page_visit_retention(id,last_pruned)
 VALUES(true,now()-interval '2 days') ON CONFLICT DO NOTHING;

-- EXECUTE-only public web role; no direct table access. Fixed search_path.
CREATE OR REPLACE FUNCTION g28.ingest_page_visit(p_id uuid,p_page text,p_action text,p_seconds integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,g28 AS $$
DECLARE should_prune boolean;
BEGIN
 IF p_id IS NULL OR p_page NOT IN ('/','/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/','/volunteer/','/donate/','/notices/','/policies/eternal-liberty/')
  OR p_action NOT IN ('start','pulse','end') OR p_seconds IS NULL OR p_seconds NOT BETWEEN 0 AND 14400 THEN
  RAISE EXCEPTION 'Invalid visitor measurement' USING ERRCODE='22023';
 END IF;
 IF p_action='start' THEN
  UPDATE g28.page_visit_retention SET last_pruned=now()
   WHERE id=true AND last_pruned<now()-interval '1 day' RETURNING true INTO should_prune;
  IF should_prune IS TRUE THEN
   DELETE FROM g28.page_visits WHERE started_at<now()-interval '30 days';
  END IF;
 END IF;
 INSERT INTO g28.page_visits AS v(view_id,page,started_at,last_seen_at,ended_at,visible_seconds)
 VALUES(p_id,p_page,now(),now(),CASE WHEN p_action='end' THEN now() ELSE NULL END,0)
 ON CONFLICT(view_id) DO UPDATE SET
  last_seen_at=CASE WHEN v.ended_at IS NULL AND p_action<>'start' THEN now() ELSE v.last_seen_at END,
  visible_seconds=CASE WHEN v.ended_at IS NULL AND p_action<>'start'
   THEN GREATEST(v.visible_seconds,LEAST(p_seconds,14400,GREATEST(0,floor(extract(epoch FROM now()-v.started_at))::integer)))
   ELSE v.visible_seconds END,
  ended_at=CASE WHEN p_action='end' THEN coalesce(v.ended_at,now()) ELSE v.ended_at END
 WHERE v.page=p_page AND v.started_at>=now()-interval '4 hours';
END;
$$;
REVOKE ALL ON FUNCTION g28.ingest_page_visit(uuid,text,text,integer) FROM PUBLIC;
INSERT INTO g28.schema_migrations(version) VALUES('20261017_visitor_analytics') ON CONFLICT DO NOTHING;
