import {VISITOR_PAGES,VISITOR_WINDOWS,visitorRange,visitorPage} from '../../../packages/core/visitor-analytics.mjs';

// A current owner/auditor role is required by the surrounding API route.
// SQL returns aggregates only. Per-view UUIDs are never returned, exported,
// joined to registered users, or reused between site pages.
export async function visitorReport(store,range='day',selectedPage='/'){
 const hours=VISITOR_WINDOWS[visitorRange(range)],page=visitorPage(selectedPage);
 const source=store.pool?.query?'live_database_aggregate':'synthetic_memory_store';
 const results=source==='live_database_aggregate'?await Promise.all([
  store.pool.query(
   "SELECT page,count(*) FILTER (WHERE started_at>=now()-($1::integer*interval '1 hour'))::integer AS views, "+
   "COALESCE(sum(visible_seconds) FILTER (WHERE started_at>=now()-($1::integer*interval '1 hour')),0)::bigint AS seconds, "+
   "count(*) FILTER (WHERE ended_at IS NULL AND last_seen_at>=now()-interval '45 seconds')::integer AS active "+
   "FROM g28.page_visits WHERE started_at>=now()-interval '30 days' GROUP BY page",[hours]),
  store.pool.query(
   "SELECT kind,target,detail,count(*)::integer AS events,COALESCE(sum(amount),0)::bigint AS total_amount "+
   "FROM g28.page_events WHERE page=$2 AND recorded_at>=now()-($1::integer*interval '1 hour') "+
   "AND kind<>'click_heatmap' GROUP BY kind,target,detail ORDER BY events DESC LIMIT 5000",[hours,page]),
  store.pool.query(
   "SELECT amount::integer AS cell,count(*)::integer AS events "+
   "FROM g28.page_events WHERE page=$2 AND kind='click_heatmap' "+
   "AND recorded_at>=now()-($1::integer*interval '1 hour') "+
   "GROUP BY amount ORDER BY amount",[hours,page]),
  store.pool.query(
   "SELECT detail,count(DISTINCT view_id)::integer AS views FROM g28.page_events "+
   "WHERE page=$2 AND kind='funnel_step' AND recorded_at>=now()-($1::integer*interval '1 hour') "+
   "GROUP BY detail ORDER BY detail",[hours,page]),
  store.pool.query(
   "SELECT kind,count(*)::integer AS samples,ROUND(avg(amount))::integer AS avg_value,"+
   "ROUND((percentile_cont(0.75) WITHIN GROUP (ORDER BY amount))::numeric)::integer AS p75,"+
   "ROUND((percentile_cont(0.95) WITHIN GROUP (ORDER BY amount))::numeric)::integer AS p95 "+
   "FROM g28.page_events WHERE page=$2 AND recorded_at>=now()-($1::integer*interval '1 hour') "+
   "AND kind IN ('perf_ttfb','perf_fcp','perf_lcp','perf_cls','perf_interaction_delay','perf_longtask','resource_slow') "+
   "GROUP BY kind ORDER BY kind",[hours,page]),
  store.pool.query(
   "SELECT detail,count(DISTINCT view_id)::integer AS views FROM g28.page_events "+
   "WHERE page=$2 AND kind='device_class' AND recorded_at>=now()-($1::integer*interval '1 hour') "+
   "GROUP BY detail ORDER BY detail",[hours,page])
 ]):[];
 const [visitRows=[],eventRows=[],heatmapRows=[],funnelRows=[],performanceRows=[],deviceRows=[]]=
  results.map(r=>r.rows);
 const visits=new Map(visitRows.map(row=>[row.page,row]));
 const pages=VISITOR_PAGES.map(({path,label})=>{
  const row=visits.get(path),views=Number(row?.views||0),seconds=Number(row?.seconds||0);
  return {path,label,views,active:Number(row?.active||0),averageSeconds:views?Math.round(seconds/views):0};
 });
 const views=pages.reduce((n,p)=>n+p.views,0);
 const actions=eventRows.map(row=>({
  kind:row.kind,target:row.target,detail:row.detail,
  count:Number(row.events),totalAmount:Number(row.total_amount)
 }));
 const count=new Map(),sectionsByTarget=new Map();
 for(const row of actions){
  count.set(row.kind,(count.get(row.kind)||0)+row.count);
  if(row.kind!=='section_enter'&&row.kind!=='section_time')continue;
  const previous=sectionsByTarget.get(row.target)||{target:row.target,entries:0,visibleSeconds:0};
  if(row.kind==='section_enter')previous.entries+=row.count;
  else previous.visibleSeconds+=row.totalAmount;
  sectionsByTarget.set(row.target,previous);
 }
 const sections=[...sectionsByTarget.values()]
  .sort((a,b)=>Number(a.target.slice(1))-Number(b.target.slice(1)))
  .map(s=>({...s,averageSeconds:s.entries?Math.round(s.visibleSeconds/s.entries):0}));
 const interactions=actions.filter(row=>!['section_enter','section_time','scroll_depth',
   'funnel_step','device_class','scroll_speed','scroll_direction',
   'perf_ttfb','perf_fcp','perf_lcp','perf_cls','perf_interaction_delay',
   'perf_longtask','resource_slow'].includes(row.kind))
  .sort((a,b)=>b.count-a.count).slice(0,90);
 const scroll=actions.filter(row=>row.kind==='scroll_depth').map(row=>({
  depth:Number(row.detail.slice(1)),views:row.count
 })).sort((a,b)=>a.depth-b.depth);
 const selectedViews=pages.find(row=>row.path===page)?.views||0;
 const funnels=funnelRows.map(row=>({
  stage:row.detail,views:Number(row.views),
  percentOfPageViews:selectedViews?Math.round(100*Number(row.views)/selectedViews):0
 }));
 const performances=performanceRows.map(row=>({
  kind:row.kind,samples:Number(row.samples),average:Number(row.avg_value),
  p75:Number(row.p75),p95:Number(row.p95),
  unit:row.kind==='perf_cls'?'CLS × 1,000':'milliseconds'
 }));
 const devices=deviceRows.map(row=>({kind:row.detail,views:Number(row.views)}));
 const scrollBehaviors=actions.filter(row=>['scroll_speed','scroll_direction'].includes(row.kind))
  .map(row=>({kind:row.kind,detail:row.detail,count:row.count}));
 return {
  asOf:new Date().toISOString(),source,range,windowHours:hours,selectedPage:page,
  totals:{views,active:pages.reduce((n,p)=>n+p.active,0),
   averageSeconds:views?Math.round(pages.reduce((n,p)=>n+p.averageSeconds*p.views,0)/views):0},
  activity:{
   clicks:(count.get('link_click')||0)+(count.get('button_click')||0),
   accordionOpens:count.get('accordion_open')||0,
   formInteractions:(count.get('field_focus')||0)+(count.get('field_change')||0),
   mediaStarts:(count.get('media_play')||0)+(count.get('youtube_play')||0),
   sampledSectionSeconds:sections.reduce((sum,item)=>sum+item.visibleSeconds,0),
   rageClicks:count.get('rage_click')||0,
   deadClicks:count.get('dead_click')||0,
   navigationStalls:count.get('navigation_stall')||0,
   navigationAttempts:count.get('navigation_attempt')||0,
   navigationHttpErrors:count.get('navigation_http_error')||0,
   javascriptErrors:count.get('javascript_error')||0,
   rejectedPromises:count.get('promise_rejection')||0,
   resourceErrors:count.get('resource_error')||0,
   youtubeErrors:count.get('youtube_error')||0,
   youtubeStarts:count.get('youtube_play')||0
  },
  pages,sections,interactions,scroll,
  clickHeatmap:heatmapRows.map(row=>({cell:Number(row.cell),clicks:Number(row.events)})),
  funnels,performances,devices,scrollBehaviors
 };
}
