import {VISITOR_PAGES,VISITOR_WINDOWS,visitorRange,visitorPage} from '../../../packages/core/visitor-analytics.mjs';

// Only an owner/auditor authenticated endpoint can return this report.
// Raw page-view IDs, click-event sequences and anonymous timelines never leave SQL.
export async function visitorReport(store,range='day',selectedPage='/'){
 const hours=VISITOR_WINDOWS[visitorRange(range)];
 const page=visitorPage(selectedPage);
 const source=store.pool?.query?'live_database_aggregate':'synthetic_memory_store';
 const [visitRows,eventRows,heatmapRows]=source==='live_database_aggregate'?await Promise.all([
  store.pool.query(
   "SELECT page, "+
   "count(*) FILTER (WHERE started_at >= now()-($1::integer * interval '1 hour'))::integer AS views, "+
   "COALESCE(sum(visible_seconds) FILTER (WHERE started_at >= now()-($1::integer * interval '1 hour')),0)::bigint AS seconds, "+
   "count(*) FILTER (WHERE ended_at IS NULL AND last_seen_at >= now()-interval '45 seconds')::integer AS active "+
   "FROM g28.page_visits WHERE started_at >= now()-interval '30 days' GROUP BY page",[hours]),
  store.pool.query(
   "SELECT kind,target,detail,count(*)::integer AS events,COALESCE(sum(amount),0)::bigint AS total_amount "+
   "FROM g28.page_events WHERE page=$2 AND recorded_at>=now()-($1::integer*interval '1 hour') "+
   "AND kind<>'click_heatmap' GROUP BY kind,target,detail ORDER BY events DESC LIMIT 500",[hours,page]),
  store.pool.query(
   "SELECT amount::integer AS cell,count(*)::integer AS events "+
   "FROM g28.page_events WHERE page=$2 AND kind='click_heatmap' "+
   "AND recorded_at>=now()-($1::integer*interval '1 hour') "+
   "GROUP BY amount ORDER BY amount",[hours,page])
 ]).then(result=>result.map(r=>r.rows)):[[],[],[]];
 const byPath=new Map(visitRows.map(row=>[row.page,row]));
 const pages=VISITOR_PAGES.map(({path,label})=>{
  const row=byPath.get(path),views=Number(row?.views||0),seconds=Number(row?.seconds||0);
  return {path,label,views,active:Number(row?.active||0),averageSeconds:views?Math.round(seconds/views):0};
 });
 const views=pages.reduce((n,p)=>n+p.views,0);
 const cells=heatmapRows.map(row=>({cell:Number(row.cell),clicks:Number(row.events)}));
 const actions=eventRows.map(row=>({
  kind:row.kind,target:row.target,detail:row.detail,
  count:Number(row.events),totalAmount:Number(row.total_amount)
 }));
 const counts=new Map();
 const sectionStats=new Map();
 for(const row of actions){
  counts.set(row.kind,(counts.get(row.kind)||0)+row.count);
  if(row.kind!=='section_enter'&&row.kind!=='section_time')continue;
  const previous=sectionStats.get(row.target)||{target:row.target,entries:0,visibleSeconds:0};
  if(row.kind==='section_enter')previous.entries+=row.count;
  else previous.visibleSeconds+=row.totalAmount;
  sectionStats.set(row.target,previous);
 }
 const sections=[...sectionStats.values()].sort((a,b)=>Number(a.target.slice(1))-Number(b.target.slice(1)))
  .map(item=>({...item,averageSeconds:item.entries?Math.round(item.visibleSeconds/item.entries):0}));
 const interactions=actions.filter(item=>!['section_enter','section_time','scroll_depth'].includes(item.kind))
  .sort((a,b)=>b.count-a.count).slice(0,60);
 const scroll=actions.filter(row=>row.kind==='scroll_depth').map(row=>({depth:Number(row.detail.slice(1)),views:row.count}))
  .sort((a,b)=>a.depth-b.depth);
 return {asOf:new Date().toISOString(),source,range,windowHours:hours,selectedPage:page,
  totals:{views,active:pages.reduce((n,p)=>n+p.active,0),
   averageSeconds:views?Math.round(pages.reduce((n,p)=>n+p.averageSeconds*p.views,0)/views):0},
  activity:{
   clicks:(counts.get('link_click')||0)+(counts.get('button_click')||0),
   accordionOpens:counts.get('accordion_open')||0,
   formInteractions:(counts.get('field_focus')||0)+(counts.get('field_change')||0),
   mediaStarts:counts.get('media_play')||0,
   sampledSectionSeconds:sections.reduce((sum,item)=>sum+item.visibleSeconds,0)
  },pages,sections,interactions,scroll,clickHeatmap:cells};
}
