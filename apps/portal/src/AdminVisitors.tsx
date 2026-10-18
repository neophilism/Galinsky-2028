import React,{useEffect,useMemo,useState} from 'react';
import {request} from './api';
import controlNames from './visitor-control-labels.json';
import './admin-visitors.css';

type Page={path:string;label:string;views:number;active:number;averageSeconds:number};
type Section={target:string;entries:number;visibleSeconds:number;averageSeconds:number};
type Action={kind:string;target:string;detail:string;count:number;totalAmount:number};
type Vital={kind:string;samples:number;average:number;p75:number;p95:number;unit:string};
type Funnel={stage:string;views:number;percentOfPageViews:number};
type Device={kind:string;views:number};
type ScrollBehavior={kind:string;detail:string;count:number};
type Report={asOf:string;source:string;range:string;windowHours:number;selectedPage:string;
 totals:{views:number;active:number;averageSeconds:number};
 activity:{clicks:number;accordionOpens:number;formInteractions:number;mediaStarts:number;sampledSectionSeconds:number;
  rageClicks:number;deadClicks:number;navigationStalls:number;navigationAttempts:number;navigationHttpErrors:number;
  javascriptErrors:number;rejectedPromises:number;resourceErrors:number;youtubeErrors:number;
  youtubeStarts:number};
 pages:Page[];sections:Section[];interactions:Action[];
 scroll:{depth:number;views:number}[];clickHeatmap:{cell:number;clicks:number}[];
 funnels:Funnel[];performances:Vital[];devices:Device[];scrollBehaviors:ScrollBehavior[]};
const count=(n:number)=>new Intl.NumberFormat('en-US').format(n);
function time(n:number){
 if(n<60)return n+' sec';
 if(n<3600)return Math.floor(n/60)+' min '+(n%60)+' sec';
 return Math.floor(n/3600)+' hr '+Math.floor(n%3600/60)+' min';
}
const actionLabels:Record<string,string>={
 link_click:'Link click',button_click:'Button click',accordion_open:'Accordion opened',
 accordion_close:'Accordion closed',section_enter:'Section viewed',section_time:'Section visible time',
 scroll_depth:'Scroll milestone',hover_time:'Link hovered',field_focus:'Field focused',
 field_change:'Field changed',field_invalid:'Field validation error',form_submit:'Form submitted',
 form_abandon:'Form abandoned',media_play:'Media played',media_pause:'Media paused',
 media_end:'Media ended',media_seek:'Media seeked',media_progress:'Media playback milestone',
 copy:'Content copied',share:'Share button used',download:'Download link clicked',
 click_heatmap:'Click area',rage_click:'Rapid repeated clicks (estimate)',
 dead_click:'Click on noninteractive content (estimate)',
 scroll_direction:'Scroll direction',scroll_speed:'Scroll speed',
 navigation_attempt:'Navigation attempted',navigation_stall:'Possible stalled navigation',
 navigation_http_error:'Navigation HTTP error',javascript_error:'JavaScript error',
 promise_rejection:'Unhandled promise rejection',
 resource_error:'Page resource failed',resource_slow:'Slow resource',
 device_class:'Viewport class',funnel_step:'Anonymous funnel milestone',
 perf_ttfb:'Server response (TTFB)',perf_fcp:'First contentful paint',
 perf_lcp:'Largest contentful paint',perf_cls:'Cumulative layout shift (scaled)',
 perf_interaction_delay:'Slowest observed interaction',
 perf_longtask:'Long main-thread task',
 youtube_play:'YouTube played',youtube_pause:'YouTube paused',
 youtube_end:'YouTube finished',youtube_progress:'YouTube playback milestone',
 youtube_error:'YouTube player error'
};
const funnelNames:Record<string,string>={
 donate_view:'Contribution page viewed',donate_choice:'Contribution controls used',
 donate_handoff:'Checkout handoff clicked',
 volunteer_view:'Volunteer page viewed',volunteer_role:'Role finder used',
 volunteer_handoff:'Volunteer portal opened',
 issues_view:'Policy index viewed',issues_policy:'Policy detail selected',
 policy_view:'Policy page viewed',policy_media:'Policy video opened'
};
const prefixLabels:Record<string,string>={s:'Area',l:'Link',b:'Button',a:'Accordion',f:'Field or form',m:'Media'};
const accordionDescriptions:Record<string,string[]> = {
 '/issues/kirk-evers/':[
  'Does this protect people who disagree with Phillip?',
  'Is this already federal law?',
  'Why Kirk–Evers?'
 ],
 '/issues/garden/':[
  'Is this a program people can enroll in today?',
  'Who decides the remedy?',
  'Does repair require taking someone else’s livelihood?'
 ],
 '/issues/cornerstone/':[
  'Does every displaced worker qualify?',
  'Would outside funding take control away from workers?',
  'Is a successful business guaranteed?'
 ],
 '/policies/eternal-liberty/':[
  'Does this proposal claim American sovereignty over the Moon or Mars?',
  'How is SPISA different from an ordinary government loan?',
  'Does this mean forcing other nations to follow American law?',
  'Is vivigenesis possible today?'
 ]
};
const descriptions:Record<string,string[]> = {
 '/':['Hero','Campaign principles','Our philosophy','Issues overview','Kirk–Evers card',
  'Garden card','Cornerstone card','Meet Phillip','Volunteer invitation','Donate'],
 '/issues/':['Introduction','Issue index','Kirk–Evers overview','The Garden overview',
  'The Cornerstone overview','Closing information'],
 '/issues/kirk-evers/':['Proposal introduction','Issue explanation','Why it matters',
  'How it works','Questions','Documents','Sidebar'],
 '/issues/garden/':['Proposal introduction','Issue explanation','Why it matters',
  'How it works','Questions','Documents','Sidebar'],
 '/issues/cornerstone/':['Proposal introduction','Issue explanation','Why it matters',
  'How it works','Questions','Documents','Sidebar'],
 '/volunteer/':['Volunteer introduction','Getting started','Role finder','Network organizer',
  'Digital ambassador','Issue ambassador','Canvassing','Phone and text',
  'Event host','Recruiter','Team captain','Petition work','Voter activities',
  'Fundraising','Skills and operations','More ways to help','Volunteer sign-up'],
 '/policies/eternal-liberty/':['Mission overview','The mission','Guiding principles','Principle 1','Principle 2','Principle 3','Our rights','SPISA financing','Science and research','Questions','Closing call to action'],
 '/donate/':['Contribution information'],
 '/notices/':['Introduction','Notices','Privacy','Accessibility','Volunteer terms','Contact','Resources']
};
function targetName(kind:string,target:string,page:string){
 const index=Number(target.slice(1));
 const publishedLabel=(controlNames as Record<string,Record<string,string>>)[page]?.[target];
 if(publishedLabel&&['l','b','a'].includes(target[0]))return publishedLabel;
 if(target==='p0')return 'Page overview';
 if(kind==='accordion_open'||kind==='accordion_close')return accordionDescriptions[page]?.[index-1]||'Accordion '+index;
 if(kind==='section_time'||kind==='section_enter'||kind==='rage_click'||kind==='dead_click'){
  return descriptions[page]?.[index-1]||'Area '+index;
 }
 return (prefixLabels[target[0]]||'Control')+' '+index;
}
const escapeCsv=(value:string|number)=>'"'+String(value).replaceAll('"','""')+'"';
function exportAggregates(report:Report){
 const rows=[['group','page','item','metric','count','seconds'],
  ...report.pages.map(p=>['page',p.path,p.label,'views',p.views,p.averageSeconds]),
  ...report.sections.map(s=>['section',report.selectedPage,targetName('section_time',s.target,report.selectedPage),'views',s.entries,s.visibleSeconds]),
  ...report.interactions.map(a=>['action',report.selectedPage,actionLabels[a.kind]||a.kind+' '+a.target,a.detail,a.count,a.totalAmount]),
  ...report.scroll.map(s=>['scroll',report.selectedPage,String(s.depth)+'%','reached',s.views,0]),
  ...report.funnels.map(f=>['funnel',report.selectedPage,funnelNames[f.stage]||f.stage,'page views',f.views,f.percentOfPageViews]),
  ...report.performances.map(v=>['performance',report.selectedPage,actionLabels[v.kind]||v.kind,'p75 '+v.unit,v.samples,v.p75]),
  ...report.devices.map(d=>['viewport',report.selectedPage,d.kind,'page views',d.views,0]),
  ...report.scrollBehaviors.map(s=>['scroll behavior',report.selectedPage,s.kind,s.detail,s.count,0])
 ];
 const csv=rows.map(row=>row.map(escapeCsv).join(',')).join('\n')+'\n';
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='galinsky-2028-visitor-aggregates.csv';
 link.click();URL.revokeObjectURL(url);
}
export function AdminVisitors({role}:{role:string}){
 const allowed=role==='owner'||role==='auditor';
 const[range,setRange]=useState('day'),[selectedPage,setSelectedPage]=useState('/');
 const[report,setReport]=useState<Report|null>(null);
 const[error,setError]=useState(''),[busy,setBusy]=useState(false),[refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  if(!allowed)return;
  let live=true;setReport(null);
  async function refresh(){
   if(document.hidden)return;
   setBusy(true);setError('');
   try{
    const r=await request<Report>('/api/admin/visitors?range='+range+'&page='+encodeURIComponent(selectedPage));
    if(live)setReport(r);
   }catch(e){if(live)setError((e as Error).message);}
   finally{if(live)setBusy(false);}
  }
  void refresh();
  const interval=window.setInterval(()=>{void refresh();},30000);
  const onVisible=()=>{if(!document.hidden)void refresh();};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{live=false;window.clearInterval(interval);document.removeEventListener('visibilitychange',onVisible);};
 },[allowed,range,selectedPage,refreshKey]);
 const cells=useMemo(()=>{
  const values=Array.from({length:400},()=>0);
  for(const row of report?.clickHeatmap||[])if(row.cell>=0&&row.cell<400)values[row.cell]=row.clicks;
  return values;
 },[report]);
 if(!allowed)return <section className="narrow panel"><h1>Visitor analytics restricted.</h1>
  <p>Only the verified campaign owner or an individually authorized auditor can view website activity.</p></section>;
 const high=Math.max(0,...cells);
 return <div className="admin-visitors">
  <span className="eyebrow">PRIVATE CAMPAIGN ADMINISTRATION</span><h1>Visitor analytics.</h1>
  <p className="lead">Analyze page engagement, every defined interaction, scrolling, navigation friction, media, performance and anonymous funnel milestones. All data below is aggregated from visitors who explicitly opted in.</p>
  <div className="visitor-controls">
   <label>Reporting period <select value={range} onChange={e=>setRange(e.target.value)}>
    <option value="day">Last 24 hours</option><option value="week">Last 7 days</option><option value="month">Last 30 days</option>
   </select></label>
   <label>Detailed page <select value={selectedPage} onChange={e=>setSelectedPage(e.target.value)}>
    {(report?.pages||[
     {path:'/',label:'Home'},{path:'/issues/',label:'Issues overview'},
     {path:'/issues/kirk-evers/',label:'Kirk–Evers'},{path:'/issues/garden/',label:'The Garden'},
     {path:'/issues/cornerstone/',label:'The Cornerstone'},{path:'/volunteer/',label:'Volunteer'},
     {path:'/donate/',label:'Donate'},{path:'/policies/eternal-liberty/',label:'Eternal Liberty'},{path:'/notices/',label:'Notices'}
    ]).map(p=><option key={p.path} value={p.path}>{p.label}</option>)}
   </select></label>
   <button type="button" className="btn blue" disabled={busy} onClick={()=>setRefreshKey(x=>x+1)}>{busy?'Updating...':'Refresh now'}</button>
   <button type="button" className="btn outline" disabled={!report} onClick={()=>{if(report)exportAggregates(report);}}>Export aggregate CSV</button>
  </div>
  {error&&<p role="alert" className="service-notice">Could not load analytics: {error}. {report?'The displayed snapshot may be stale.':''}</p>}
  {report?<>
   <div className="cards two">
    <article className="panel"><h2>{count(report.totals.active)}</h2><p>Active page views (last 45 seconds)</p></article>
    <article className="panel"><h2>{count(report.totals.views)}</h2><p>Page views during selected period</p></article>
    <article className="panel"><h2>{time(report.totals.averageSeconds)}</h2><p>Average focused time per page view</p></article>
    <article className="panel"><h2>{count(report.activity.clicks)}</h2><p>Link and button clicks on selected page</p></article>
    <article className="panel"><h2>{count(report.activity.accordionOpens)}</h2><p>Accordion questions opened</p></article>
    <article className="panel"><h2>{time(report.activity.sampledSectionSeconds)}</h2><p>Total visible time across page areas</p></article>
   </div>
   <section className="panel spaced"><h2>Interaction friction and reliability</h2>
    <p className="fine">Rage and dead clicks are heuristics, not proof a control malfunctioned. A possible navigation stall means that a link click did not leave the page within four seconds.</p>
    <div className="visitor-scroll">
     {[
      ['Rapid repeat clicks',report.activity.rageClicks],
      ['Noninteractive clicks',report.activity.deadClicks],
      ['Navigation attempts',report.activity.navigationAttempts],
      ['Possible stalled navigations',report.activity.navigationStalls],
      ['HTTP navigation errors',report.activity.navigationHttpErrors],
      ['JavaScript errors',report.activity.javascriptErrors],
      ['Unhandled promise rejections',report.activity.rejectedPromises],
      ['Failed page resources',report.activity.resourceErrors],
      ['Embedded YouTube playback starts',report.activity.youtubeStarts],
      ['YouTube player errors',report.activity.youtubeErrors]
     ].map(([label,value])=><div key={String(label)}><strong>{count(Number(value))}</strong><span>{label}</span></div>)}
    </div>
   </section>
   <section className="panel spaced"><h2>Real-user performance</h2>
    <p className="fine">Browser performance observations are reported only after opt-in. Values below reflect supported browsers. Interaction delay is the slowest observed Event Timing duration, not the standardized INP metric. CLS is multiplied by 1,000 for integer storage.</p>
    {report.performances.length?<div className="visitor-table-wrap"><table className="visitor-table">
     <thead><tr><th scope="col">Measurement</th><th scope="col">Samples</th><th scope="col">Average</th><th scope="col">P75</th><th scope="col">P95</th><th scope="col">Unit</th></tr></thead>
     <tbody>{report.performances.map(m=><tr key={m.kind}>
      <th scope="row">{actionLabels[m.kind]||m.kind}</th>
      <td>{count(m.samples)}</td><td>{count(m.average)}</td>
      <td>{count(m.p75)}</td><td>{count(m.p95)}</td><td>{m.unit}</td>
     </tr>)}</tbody></table></div>:<p>No performance readings collected for this period.</p>}
   </section>
   <section className="panel spaced"><h2>Anonymous conversion funnels</h2>
    <p className="fine">Milestone counts represent distinct consented page views, not identified people. Percentages use the selected page's opt-in views. These are *on-page actions*, never verified donations or account registrations; cross-page conversion cannot be inferred without identifiers.</p>
    {report.funnels.length?<div className="visitor-table-wrap"><table className="visitor-table">
     <thead><tr><th scope="col">Page milestone</th><th scope="col">Page views reaching milestone</th><th scope="col">Share of page views</th></tr></thead>
     <tbody>{report.funnels.map(f=><tr key={f.stage}>
      <th scope="row">{funnelNames[f.stage]||f.stage}</th>
      <td>{count(f.views)}</td><td>{Math.min(100,f.percentOfPageViews)}%</td>
     </tr>)}</tbody></table></div>:<p>No opt-in funnel activity has been recorded.</p>}
   </section>
   <section className="panel spaced"><h2>Viewport classes and scrolling habits</h2>
    <p className="fine">These classes use only viewport widths (mobile, tablet, desktop). No browser fingerprints, device IDs or user agents are stored.</p>
    <div className="visitor-table-wrap"><table className="visitor-table">
     <thead><tr><th scope="col">Breakdown</th><th scope="col">Category</th><th scope="col">Occurrences</th></tr></thead>
     <tbody>{[...report.devices.map(d=>({kind:'Viewport',detail:d.kind,value:d.views})),
       ...report.scrollBehaviors.map(b=>({kind:actionLabels[b.kind]||b.kind,detail:b.detail,value:b.count}))].map(r=>
      <tr key={r.kind+r.detail}><th scope="row">{r.kind}</th><td>{r.detail}</td><td>{count(r.value)}</td></tr>
     )}</tbody></table></div>
   </section>
   <section className="panel spaced"><h2>Page traffic overview</h2><div className="visitor-table-wrap">
    <table className="visitor-table"><thead><tr><th scope="col">Page</th><th scope="col">Active now</th><th scope="col">Page views</th><th scope="col">Average focused time</th></tr></thead>
    <tbody>{[...report.pages].sort((a,b)=>b.active-a.active||b.views-a.views).map(p=><tr key={p.path}>
     <th scope="row">{p.label}<small>{p.path}</small></th><td>{count(p.active)}</td><td>{count(p.views)}</td><td>{time(p.averageSeconds)}</td>
    </tr>)}</tbody></table></div></section>
   <section className="panel spaced"><h2>Time spent in each area</h2>
    <p className="fine">An area is counted when at least half of it is visible while the page is focused. Nested areas can overlap; these totals are not additive to total page time.</p>
    {report.sections.length?<div className="visitor-table-wrap"><table className="visitor-table"><thead>
     <tr><th scope="col">Area</th><th scope="col">Times entered</th><th scope="col">Visible time</th><th scope="col">Avg. per entry</th></tr></thead>
     <tbody>{report.sections.map(s=><tr key={s.target}>
      <th scope="row">{targetName('section_time',s.target,selectedPage)}<small>{s.target}</small></th>
      <td>{count(s.entries)}</td><td>{time(s.visibleSeconds)}</td><td>{time(s.averageSeconds)}</td>
     </tr>)}</tbody></table></div>:<p>No section activity recorded for this period.</p>}
   </section>
   <section className="panel spaced"><h2>Recorded actions and controls</h2>
    <p className="fine">Controls are indexed by their order in the page. Destinations are classified without storing URLs, query parameters or submitted values.</p>
    {report.interactions.length?<div className="visitor-table-wrap"><table className="visitor-table"><thead>
     <tr><th scope="col">Interaction</th><th scope="col">Control or area</th><th scope="col">Category</th><th scope="col">Count</th></tr></thead>
     <tbody>{report.interactions.map(a=><tr key={a.kind+a.target+a.detail}>
      <th scope="row">{actionLabels[a.kind]||a.kind}</th>
      <td>{targetName(a.kind,a.target,selectedPage)}<small>{a.target}</small></td>
      <td>{a.detail==='none'?'—':a.detail}</td><td>{count(a.count)}</td>
     </tr>)}</tbody></table></div>:<p>No detailed interactions recorded for this period.</p>}
   </section>
   <section className="panel spaced"><h2>Scroll-depth milestones</h2>
    <div className="visitor-scroll">{[10,25,50,75,90,100].map(n=>{
     const value=report.scroll.find(s=>s.depth===n)?.views||0;
     return <div key={n}><strong>{n}% reached</strong><span>{count(value)} page views</span></div>;
    })}</div>
   </section>
   <section className="panel spaced"><h2>Click-density map</h2>
    <p className="fine">Document-relative 20 × 20 grid. Darker cells represent more clicks; layout changes across mobile and desktop can shift positions. This is aggregate density, not a recording of a person's cursor.</p>
    {high>0?<div className="visitor-heatmap" role="img" aria-label={'Aggregated click-density map for '+selectedPage}>
     {cells.map((value,index)=><span key={index} title={'Row '+(Math.floor(index/20)+1)+', column '+(index%20+1)+': '+value+' clicks'}
      style={{backgroundColor:'rgba(10,49,97,'+(value?(.10+.88*value/high):.025)+')'}} />)}
    </div>:<p>No opt-in clicks have been recorded on this page.</p>}
   </section>
   <p className="fine">Snapshot taken {new Date(report.asOf).toLocaleString()}. Updated every 30 seconds while the dashboard is visible.
    {report.source!=='live_database_aggregate'?' Development fixture only; live traffic is not connected.':''}</p>
  </>:!busy&&!error?<p role="status">No analytics snapshot available.</p>:null}
  <p className="fine">Analytics are consent-based and anonymous. No entered data, account identity, IP address, cross-page visitor ID, raw URL, unfiltered error stack, session replay, mouse trail or political profile is collected. The temporary measurements expire after 30 days. Some activity is approximate; privacy signals and revocation take precedence.</p>
 </div>;
}
