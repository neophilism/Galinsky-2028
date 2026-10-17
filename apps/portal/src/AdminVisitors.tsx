import React,{useEffect,useState} from 'react';
import {request} from './api';
import './admin-visitors.css';
type Page={path:string;label:string;views:number;active:number;averageSeconds:number};
type Report={asOf:string;source:string;range:string;windowHours:number;totals:{views:number;active:number;averageSeconds:number};pages:Page[]};
const count=(n:number)=>new Intl.NumberFormat('en-US').format(n);
function time(n:number){if(n<60)return n+' sec';if(n<3600)return Math.floor(n/60)+' min '+(n%60)+' sec';return Math.floor(n/3600)+' hr '+Math.floor(n%3600/60)+' min';}
export function AdminVisitors({role}:{role:string}){
 const allowed=role==='owner'||role==='auditor';
 const[range,setRange]=useState('day'),[report,setReport]=useState<Report|null>(null);
 const[error,setError]=useState(''),[busy,setBusy]=useState(false),[refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  if(!allowed)return;
  let live=true;setReport(null);
  async function refresh(){
   if(document.hidden)return;
   setBusy(true);setError('');
   try{const result=await request<Report>('/api/admin/visitors?range='+range);if(live)setReport(result);}
   catch(e){if(live)setError((e as Error).message);}
   finally{if(live)setBusy(false);}
  }
  void refresh();
  const interval=window.setInterval(()=>{void refresh();},30000);
  const onVisible=()=>{if(!document.hidden)void refresh();};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{live=false;window.clearInterval(interval);document.removeEventListener('visibilitychange',onVisible);};
 },[allowed,range,refreshKey]);
 if(!allowed)return <section className="narrow panel"><h1>Visitor analytics restricted</h1><p>Only the verified campaign owner or an individually authorized auditor can view website traffic.</p></section>;
 return <div className="admin-visitors"><span className="eyebrow">PRIVATE CAMPAIGN ADMINISTRATION</span><h1>Visitor analytics.</h1>
 <p className="lead">Which public pages people are viewing and how much time they spend on each page. No individual visitor identification.</p>
 <div className="visitor-controls"><label>Reporting period <select value={range} onChange={e=>setRange(e.target.value)}>
  <option value="day">Last 24 hours</option><option value="week">Last 7 days</option><option value="month">Last 30 days</option></select></label>
  <button type="button" className="btn blue" disabled={busy} onClick={()=>setRefreshKey(x=>x+1)}>{busy?'Updating...':'Refresh now'}</button>
 </div>
 {error&&<p role="alert" className="service-notice">Could not load analytics: {error}. {report?'The displayed snapshot may be stale.':''}</p>}
 {report?<>
  <div className="cards two">
   <article className="panel"><h2>{count(report.totals.active)}</h2><p>Active page views in the last 45 seconds</p></article>
   <article className="panel"><h2>{count(report.totals.views)}</h2><p>Page views in selected period</p></article>
   <article className="panel"><h2>{time(report.totals.averageSeconds)}</h2><p>Average visible time per page view</p></article>
  </div>
  <section className="panel spaced"><h2>Pages people are viewing</h2><div className="visitor-table-wrap">
   <table className="visitor-table"><thead><tr><th scope="col">Page</th><th scope="col">Active now</th><th scope="col">Page views</th><th scope="col">Avg. visible time</th></tr></thead>
   <tbody>{[...report.pages].sort((a,b)=>b.active-a.active||b.views-a.views).map(p=><tr key={p.path}>
    <th scope="row">{p.label}<small>{p.path}</small></th><td>{count(p.active)}</td><td>{count(p.views)}</td><td>{time(p.averageSeconds)}</td>
   </tr>)}</tbody></table></div>
   <p className="fine">Snapshot: {new Date(report.asOf).toLocaleString()}. Refreshes every 30 seconds while open.</p>
   {report.source!=='live_database_aggregate'&&<p role="status">Development fixture; live traffic data is not connected.</p>}
  </section>
 </>:!busy&&!error?<p role="status">No analytics snapshot available.</p>:null}
 <p className="fine">Foreground focused time, capped at four hours per view. Multiple open tabs count separately. No names, IP addresses, tracking cookies, journey histories or political profiles are stored. Records are deleted after 30 days.</p></div>;
}
