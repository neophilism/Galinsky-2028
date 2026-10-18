import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {databasePool} from '../../apps/api/src/postgres-store.mjs';
import {visitorReport} from '../../apps/api/src/visitor-report.mjs';
const url=process.env.TEST_DATABASE_URL;
test('anonymous interactions are idempotent, reported only in aggregate, and private from web ingest role',{skip:!url},async()=>{
 assert(['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname),'Isolated PostgreSQL only');
 const pool=databasePool(url),viewId=randomUUID();
 const events=[
  {seq:1,kind:'link_click',target:'l2',detail:'issues',amount:0},
  {seq:2,kind:'accordion_open',target:'a1',detail:'none',amount:0},
  {seq:3,kind:'section_enter',target:'s3',detail:'none',amount:0},
  {seq:4,kind:'section_time',target:'s3',detail:'none',amount:18},
  {seq:5,kind:'scroll_depth',target:'p0',detail:'d75',amount:0},
  {seq:6,kind:'click_heatmap',target:'p0',detail:'none',amount:150},
  {seq:7,kind:'share',target:'b2',detail:'none',amount:0},
  {seq:8,kind:'rage_click',target:'s3',detail:'none',amount:0},
  {seq:9,kind:'dead_click',target:'s3',detail:'none',amount:0},
  {seq:10,kind:'scroll_speed',target:'p0',detail:'fast',amount:0},
  {seq:11,kind:'scroll_direction',target:'p0',detail:'down',amount:0},
  {seq:12,kind:'funnel_step',target:'p0',detail:'policy_view',amount:0},
  {seq:13,kind:'funnel_step',target:'p0',detail:'policy_media',amount:0},
  {seq:14,kind:'device_class',target:'p0',detail:'mobile',amount:0},
  {seq:15,kind:'perf_ttfb',target:'p0',detail:'none',amount:94},
  {seq:16,kind:'perf_lcp',target:'p0',detail:'none',amount:1950},
  {seq:17,kind:'perf_cls',target:'p0',detail:'none',amount:16},
  {seq:18,kind:'resource_error',target:'p0',detail:'image',amount:0},
  {seq:19,kind:'navigation_stall',target:'p0',detail:'none',amount:0},
  {seq:20,kind:'youtube_play',target:'m1',detail:'none',amount:0},
  {seq:21,kind:'youtube_progress',target:'m1',detail:'q75',amount:0},
  {seq:22,kind:'youtube_error',target:'m1',detail:'none',amount:0}
 ];
 const write=(id,list,page='/issues/kirk-evers/')=>pool.query(
  'SELECT g28.ingest_page_events($1::uuid,$2::text,$3::jsonb)',[id,page,JSON.stringify(list)]);
 try{
  await pool.query(await readFile('db/migrations/001_foundation.sql','utf8'));
  await pool.query(await readFile('db/migrations/20261017_visitor_analytics.sql','utf8'));
  await pool.query(await readFile('db/migrations/20261018_visitor_interactions.sql','utf8'));
  for(const batch of [events.slice(0,16),events.slice(16)]){
   await write(viewId,batch);
   await write(viewId,batch);
  }
  let stored=await pool.query('SELECT count(*)::integer AS n FROM g28.page_events WHERE view_id=$1',[viewId]);
  assert.equal(stored.rows[0].n,events.length,'Retransmitted batch must not double count');
  const report=await visitorReport({pool},'day','/issues/kirk-evers/');
  assert.equal(report.activity.clicks,1);
  assert.equal(report.activity.accordionOpens,1);
  assert(report.sections.some(s=>s.target==='s3'&&s.visibleSeconds===18));
  assert.deepEqual(report.clickHeatmap,[{cell:150,clicks:1}]);
  assert(report.scroll.some(s=>s.depth===75&&s.views===1));
  assert.equal(report.activity.rageClicks,1);
  assert.equal(report.activity.deadClicks,1);
  assert.equal(report.activity.resourceErrors,1);
  assert.equal(report.activity.navigationStalls,1);
  assert.equal(report.activity.youtubeStarts,1);
  assert.equal(report.activity.youtubeErrors,1);
  assert.deepEqual(report.funnels.map(s=>s.stage),['policy_media','policy_view']);
  assert(report.funnels.every(f=>f.views===1&&f.percentOfPageViews===100));
  assert.deepEqual(report.devices,[{kind:'mobile',views:1}]);
  assert.equal(report.performances.find(p=>p.kind==='perf_ttfb')?.p75,94);
  assert.equal(report.performances.find(p=>p.kind==='perf_lcp')?.p95,1950);
  assert(report.scrollBehaviors.some(p=>p.kind==='scroll_speed'&&p.detail==='fast'));
  assert(report.interactions.some(p=>p.kind==='youtube_progress'&&p.detail==='q75'));
  assert(!JSON.stringify(report).includes(viewId));
  const forbidden=[
   {...events[0],seq:8,target:'javascript:alert(1)'},
   {...events[0],seq:8,detail:'form@email.example'},
   {...events[0],seq:8,kind:'keystroke'},
   {...events[0],seq:8,kind:'click_heatmap',target:'p0',detail:'none',amount:400}
  ];
  for(const wrong of forbidden)await assert.rejects(write(viewId,[wrong]),e=>e.code==='22023');
  await assert.rejects(write(viewId,events,'/issues/garden/'),e=>e.code==='22023');
  const role='g28_vistor_test_'+randomUUID().replaceAll('-',''),c=await pool.connect();
  try{
   await c.query('BEGIN');
   await c.query('CREATE ROLE '+role+' NOLOGIN');
   await c.query('GRANT USAGE ON SCHEMA g28 TO '+role);
   await c.query('GRANT EXECUTE ON FUNCTION g28.ingest_page_events(uuid,text,jsonb) TO '+role);
   await c.query('SET LOCAL ROLE '+role);
   await c.query('SELECT g28.ingest_page_events($1::uuid,$2::text,$3::jsonb)',[randomUUID(),'/',
    JSON.stringify([{seq:1,kind:'section_enter',target:'s1',detail:'none',amount:0}])]);
   await assert.rejects(c.query('SELECT * FROM g28.page_events'),e=>e.code==='42501');
  }finally{await c.query('ROLLBACK');c.release();}
  stored=await pool.query('SELECT count(*)::integer AS n FROM g28.page_visits WHERE view_id=$1',[viewId]);
  assert.equal(stored.rows[0].n,1);
 }finally{
  await pool.query('DELETE FROM g28.page_visits WHERE view_id=$1',[viewId]);
  await pool.end();
 }
});
