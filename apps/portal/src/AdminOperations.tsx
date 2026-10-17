import React,{useEffect,useState} from 'react';
import {request} from './api';

type Metrics={accounts:number;approvedMaterials:number;queuedJobs:number;leasedJobs:number;deadJobs:number;oldestQueuedSeconds:number};
type Operations={asOf:string;source:string;commit:string|null;schemaReady:boolean;healthy:boolean;warnings:string[];missingMigrations:string[];metrics:Metrics;notice:string;deliveryEvidence:string};
const fmt=(n:number)=>new Intl.NumberFormat('en-US').format(n);
export function AdminOperations({role}:{role:string}){
 const[data,setData]=useState<Operations|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const allowed=role==='owner'||role==='auditor';
 async function refresh(){setBusy(true);setError('');try{setData(await request<Operations>('/api/admin/operations'));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{if(allowed){void refresh();}},[allowed]);
 if(!allowed)return <section className="narrow panel"><h1>Restricted operations.</h1><p>Only the verified campaign owner or an individually authorized auditor can see this status.</p></section>;
 return <div className="admin-operations"><span className="eyebrow">PRIVATE SYSTEM OPERATIONS</span><h1>Operational status.</h1>
 <p className="lead">Manual, read-only refresh of aggregate delivery and account health. No volunteer names, mailbox addresses, donor information, messages or behavioral tracking.</p>
 <div className="actions"><button className="btn blue" type="button" disabled={busy} onClick={()=>void refresh()}>{busy?'Refreshing...':'Refresh status'}</button></div>
 {error&&<p role="alert" className="service-notice">Could not retrieve current status: {error}. The previous snapshot, if shown, may be stale.</p>}
 {data?<>
 <section className="panel spaced" aria-labelledby="ops-summary"><h2 id="ops-summary">Current snapshot</h2>
 <p><strong>{data.healthy?'No detected operational warnings':'Attention or verification required'}</strong> — {data.source==='live_database_aggregate'?'Aggregated from the connected database':'Development fixture; not a real operational measurement'}.</p>
 <p className="fine">Observed at {data.asOf}. Deployed commit: {data.commit||'not reported'}. Only refresh when needed; this screen never polls in the background.</p>
 {data.warnings.length?<p role="status">Signals: {data.warnings.join(', ')}. Investigate before enabling real registration.</p>:<p role="status">No issues detected in the limited checks shown. External email delivery, uptime, backups and real sign-in still require live verification.</p>}
 {data.missingMigrations.length>0&&<p>Missing required schema versions: {data.missingMigrations.join(', ')}.</p>}
 </section>
 <div className="cards two">
 {([
  ['Verified accounts',data.metrics.accounts],['Published volunteer materials',data.metrics.approvedMaterials],
  ['Queued email jobs',data.metrics.queuedJobs],['Leased email jobs',data.metrics.leasedJobs],
  ['Dead-letter email jobs',data.metrics.deadJobs],['Oldest queued job (seconds)',data.metrics.oldestQueuedSeconds]
 ] as [string,number][]).map(([label,value])=><article className="panel" key={label}><h2>{fmt(value)}</h2><p>{label}</p></article>)}
 </div>
 <div className="panel spaced"><h2>What these numbers do not prove</h2><p>{data.deliveryEvidence}</p><p>{data.notice}</p><p>There are no session replay scripts, user-level engagement histories or automatic public monitoring requests in this view. Financial, encryption, login-delivery and launch acceptance remain separate.</p></div>
 </>:!busy&&!error?<p role="status">No operational snapshot is available.</p>:null}
 </div>;
}
