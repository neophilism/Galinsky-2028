import {VISITOR_PAGES,VISITOR_WINDOWS,visitorRange} from '../../../packages/core/visitor-analytics.mjs';

// Only an owner/auditor authenticated endpoint calls this grouped report.
// No view identifiers or visitor timelines are returned.
export async function visitorReport(store,range='day'){
 const hours=VISITOR_WINDOWS[visitorRange(range)];
 const source=store.pool?.query?'live_database_aggregate':'synthetic_memory_store';
 const rows=source==='live_database_aggregate'?(await store.pool.query(
  "SELECT page, "+
  "count(*) FILTER (WHERE started_at >= now() - ($1::integer * interval '1 hour'))::integer AS views, "+
  "COALESCE(sum(visible_seconds) FILTER (WHERE started_at >= now() - ($1::integer * interval '1 hour')),0)::integer AS seconds, "+
  "count(*) FILTER (WHERE ended_at IS NULL AND last_seen_at >= now()-interval '45 seconds')::integer AS active "+
  "FROM g28.page_visits WHERE started_at >= now()-interval '30 days' GROUP BY page",[hours])).rows:[];
 const byPath=new Map(rows.map(row=>[row.page,row]));
 const pages=VISITOR_PAGES.map(({path,label})=>{
  const row=byPath.get(path),views=Number(row?.views||0),seconds=Number(row?.seconds||0);
  return {path,label,views,active:Number(row?.active||0),averageSeconds:views?Math.round(seconds/views):0};
 });
 const views=pages.reduce((n,p)=>n+p.views,0);
 return {asOf:new Date().toISOString(),source,range,windowHours:hours,
  totals:{views,active:pages.reduce((n,p)=>n+p.active,0),
   averageSeconds:views?Math.round(pages.reduce((n,p)=>n+p.averageSeconds*p.views,0)/views):0},
  pages};
}
