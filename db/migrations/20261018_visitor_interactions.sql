-- High-resolution *anonymous* interactions, linked only within one short-lived page view.
-- No typed values, raw URLs, device identifiers, IPs, query parameters, or DOM text.
CREATE TABLE IF NOT EXISTS g28.page_events(
 view_id uuid NOT NULL REFERENCES g28.page_visits(view_id) ON DELETE CASCADE,
 seq smallint NOT NULL CHECK(seq BETWEEN 1 AND 2000),
 page text NOT NULL,
 kind text NOT NULL,
 target text NOT NULL,
 detail text NOT NULL,
 amount integer NOT NULL CHECK(amount BETWEEN 0 AND 14400),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(view_id,seq)
);
CREATE INDEX IF NOT EXISTS page_events_time_page_kind ON g28.page_events(recorded_at DESC,page,kind);
-- Security-definer function validates the input independently of JavaScript and
-- cannot read or write account, donation, identity or campaign editorial data.
CREATE OR REPLACE FUNCTION g28.ingest_page_events(p_id uuid,p_page text,p_events jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,g28 AS $$
DECLARE
 item jsonb;
 event_seq integer;
 event_kind text;
 event_target text;
 event_detail text;
 event_amount integer;
 event_prefix text;
BEGIN
 IF p_id IS NULL OR p_page IS NULL OR p_page NOT IN
 ('/','/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/','/volunteer/','/donate/','/notices/')
 OR jsonb_typeof(p_events) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_events) NOT BETWEEN 1 AND 16 THEN
  RAISE EXCEPTION 'Invalid analytics batch' USING ERRCODE='22023';
 END IF;

 -- A batch can reach the server before the view-start request; create an
 -- otherwise identical page-view row without introducing any new identifier.
 INSERT INTO g28.page_visits(view_id,page) VALUES(p_id,p_page) ON CONFLICT DO NOTHING;
 IF NOT EXISTS (SELECT 1 FROM g28.page_visits
  WHERE view_id=p_id AND page=p_page AND started_at>=now()-interval '4 hours') THEN
  RAISE EXCEPTION 'Page visit not recognized' USING ERRCODE='22023';
 END IF;

 FOR item IN SELECT value FROM jsonb_array_elements(p_events) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object'
   OR NOT (item ?& ARRAY['seq','kind','target','detail','amount'])
   OR (SELECT count(*) FROM jsonb_object_keys(item))<>5
   OR (item->>'seq') !~ '^[0-9]{1,4}$'
   OR (item->>'amount') !~ '^[0-9]{1,5}$' THEN
   RAISE EXCEPTION 'Invalid interaction fields' USING ERRCODE='22023';
  END IF;
  event_seq=(item->>'seq')::integer;
  event_kind=item->>'kind';
  event_target=item->>'target';
  event_detail=item->>'detail';
  event_amount=(item->>'amount')::integer;

  IF event_seq NOT BETWEEN 1 AND 2000
   OR event_kind NOT IN ('link_click','button_click','accordion_open','accordion_close',
    'section_enter','section_time','scroll_depth','hover_time','field_focus',
    'field_change','field_invalid','form_submit','form_abandon','media_play',
    'media_pause','media_end','media_seek','media_progress','copy','share',
    'download','click_heatmap')
   OR event_target !~ '^(?:[slbafmp](?:[1-9]|[1-9][0-9]{1,2})|p0)$'
   OR event_detail NOT IN ('none','home','issues','kirk-evers','garden','cornerstone',
    'volunteer','donate','notices','portal','external','anchor','document','other',
    'd10','d25','d50','d75','d90','d100','q25','q50','q75','q100')
   OR event_amount NOT BETWEEN 0 AND 14400 THEN
   RAISE EXCEPTION 'Invalid interaction' USING ERRCODE='22023';
  END IF;
  event_prefix=CASE
   WHEN event_kind IN ('link_click','hover_time','share','download') THEN 'l'
   WHEN event_kind='button_click' THEN 'b'
   WHEN event_kind IN ('accordion_open','accordion_close') THEN 'a'
   WHEN event_kind IN ('section_enter','section_time','copy') THEN 's'
   WHEN event_kind IN ('field_focus','field_change','field_invalid','form_submit','form_abandon') THEN 'f'
   WHEN event_kind IN ('media_play','media_pause','media_end','media_seek','media_progress') THEN 'm'
   ELSE 'p' END;
  IF left(event_target,1)<>event_prefix
    OR (event_kind IN ('scroll_depth','click_heatmap') AND event_target<>'p0')
    OR (event_kind='scroll_depth' AND event_detail NOT IN ('d10','d25','d50','d75','d90','d100'))
    OR (event_kind='media_progress' AND event_detail NOT IN ('q25','q50','q75','q100'))
    OR (event_kind='click_heatmap' AND event_amount>399)
    OR (event_kind='section_time' AND event_amount>60)
    OR (event_kind='hover_time' AND event_amount>300)
    OR (event_kind NOT IN ('section_time','hover_time','media_seek','click_heatmap') AND event_amount<>0)
    THEN RAISE EXCEPTION 'Invalid interaction properties' USING ERRCODE='22023';
  END IF;
  INSERT INTO g28.page_events(view_id,seq,page,kind,target,detail,amount)
   VALUES(p_id,event_seq,p_page,event_kind,event_target,event_detail,event_amount)
   ON CONFLICT (view_id,seq) DO NOTHING;
 END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION g28.ingest_page_events(uuid,text,jsonb) FROM PUBLIC;
INSERT INTO g28.schema_migrations(version) VALUES('20261018_visitor_interactions') ON CONFLICT DO NOTHING;
