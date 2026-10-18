import React,{useEffect,useState} from 'react';
import {request} from './api';
import './help-center.css';

type Kind='accessibility'|'account_correction'|'material_correction'|'privacy_question';
type Area='account'|'portal'|'materials'|'issues'|'homepage'|'volunteer';
type HelpCase={id:string;kind:Kind;area:Area;status:'received'|'acknowledged'|'resolved'|'withdrawn';createdAt:string;updatedAt:string};
const kindLabels:Record<Kind,string>={
 accessibility:'Accessibility or usability problem',
 account_correction:'Account information correction',
 material_correction:'Published material or issue correction',
 privacy_question:'Privacy or personal-data question'
};
const areaLabels:Record<Area,string>={
 account:'Account settings',portal:'Volunteer portal',materials:'Volunteer materials',
 issues:'Issue pages',homepage:'Homepage',volunteer:'Public volunteer page'
};
const allowed:Record<Kind,Area[]>={
 accessibility:['portal','homepage','issues','materials','volunteer','account'],
 account_correction:['account','portal'],
 material_correction:['materials','issues'],
 privacy_question:['account','portal']
};
const states:Record<HelpCase['status'],string>={
 received:'Received (not yet acknowledged)',acknowledged:'Acknowledged',
 resolved:'Marked resolved',withdrawn:'Withdrawn by you'
};
type ListResponse={requests:HelpCase[];notice:string};
export function HelpCenter({csrf,role,enabled}:{csrf:string;role:string;enabled:boolean}){
 const[kind,setKind]=useState<Kind>('accessibility');
 const[area,setArea]=useState<Area>('portal');
 const[requests,setRequests]=useState<HelpCase[]>([]);
 const[inbox,setInbox]=useState<HelpCase[]>([]);
 const[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const[error,setError]=useState(''),[message,setMessage]=useState('');
 const owner=role==='owner';
 async function refresh(){
  setLoading(true);setError('');
  try{
   const own=await request<ListResponse>('/api/help/requests');
   setRequests(own.requests);
   if(owner){const staff=await request<ListResponse>('/api/help/staff/requests');setInbox(staff.requests);}
  }catch(e){setError((e as Error).message);}finally{setLoading(false);}
 }
 useEffect(()=>{if(enabled)void refresh();},[enabled,owner]);
 function selectKind(value:Kind){
  setKind(value);setArea(allowed[value][0]);setMessage('');setError('');
 }
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setMessage('');setBusy(true);
  try{
   await request('/api/help/requests',{kind,area},csrf);
   setMessage('Your structured request was stored. Return here to check its status; no email notification is sent.');
   await refresh();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function withdraw(id:string){
  setError('');setMessage('');setBusy(true);
  try{
   await request('/api/help/requests/'+encodeURIComponent(id)+'/withdraw',{},csrf);
   setMessage('The request was withdrawn.');await refresh();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function triage(id:string,action:'acknowledge'|'resolve'){
  setError('');setMessage('');setBusy(true);
  try{
   await request('/api/help/staff/requests/'+encodeURIComponent(id)+'/'+action,{},csrf);
   setMessage(action==='acknowledge'?'Acknowledgment recorded.':'Resolution state recorded.');
   await refresh();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const items=(data:HelpCase[],staff=false)=>data.map(item=><li key={item.id} className="help-case">
  <div><strong>{kindLabels[item.kind]}</strong><p>{areaLabels[item.area]} · {states[item.status]}</p>
   <p className="fine">Reference: {item.id.slice(0,8)} · Created <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></p>
  </div>
  <div className="help-case-actions">
   {!staff&&['received','acknowledged'].includes(item.status)&&
    <button className="btn outline" disabled={busy} onClick={()=>void withdraw(item.id)} type="button">Withdraw</button>}
   {staff&&item.status==='received'&&<button className="btn outline" disabled={busy} type="button"
    onClick={()=>void triage(item.id,'acknowledge')}>Acknowledge</button>}
   {staff&&item.status==='acknowledged'&&<button className="btn outline" disabled={busy} type="button"
    onClick={()=>void triage(item.id,'resolve')}>Mark handled</button>}
  </div>
 </li>);
 return <div className="help-center">
  <span className="eyebrow">VOLUNTEER HELP</span><h1>Help and corrections.</h1>
  <p className="lead">Find a safe way to flag an account, accessibility, privacy or published-content issue.</p>
  <div className="service-notice" role="note">
   <strong>Not emergency assistance or confidential incident intake.</strong>
   <p>Do not send threats, medical details, testimony, identifying information, screenshots or private evidence. For immediate danger, contact local emergency services. Sensitive incident reporting is not available until its protected channel is verified.</p>
  </div>
  {!enabled?<section className="panel spaced"><h2>Structured requests are not open yet</h2>
   <p>The protected help service is being finished. Nothing entered here is sent or stored. Account exports and consent controls remain available in Account settings.</p>
  </section>:<>
   <section className="panel spaced" aria-labelledby="help-request-form">
    <h2 id="help-request-form">Open a structured request</h2>
    <p>This form records only your chosen category and area; there is no free-text box or attachment option. No response time or outbound notification is promised. Keep the reference in your account.</p>
    <form onSubmit={e=>void create(e)} className="help-form">
     <label>What do you need help with?
      <select value={kind} onChange={e=>selectKind(e.target.value as Kind)}>
       {(Object.keys(kindLabels) as Kind[]).map(k=><option key={k} value={k}>{kindLabels[k]}</option>)}
      </select>
     </label>
     <label>Which area is affected?
      <select value={area} onChange={e=>setArea(e.target.value as Area)}>
       {allowed[kind].map(a=><option key={a} value={a}>{areaLabels[a]}</option>)}
      </select>
     </label>
     <button className="btn blue" disabled={busy||loading} type="submit">{busy?'Saving...':'Save structured request'}</button>
    </form>
   </section>
   {error&&<p role="alert" className="service-notice">The request could not be completed: {error}</p>}
   {message&&<p role="status" className="service-notice">{message}</p>}
   <section className="panel spaced" aria-labelledby="my-help-requests">
    <h2 id="my-help-requests">My requests</h2>
    <button className="btn outline" type="button" disabled={busy||loading} onClick={()=>void refresh()}>{loading?'Refreshing...':'Refresh status'}</button>
    {requests.length?<ul className="help-case-list">{items(requests)}</ul>:<p>No structured requests have been stored for this account.</p>}
   </section>
   {owner&&<section className="panel spaced" aria-labelledby="owner-help-inbox">
    <h2 id="owner-help-inbox">Owner triage · structured metadata only</h2>
    <p>This preview inbox contains no identities or incident text. Acknowledge only requests actually reviewed, and mark handled only after carrying out the associated correction offline. This is not a secure messaging system.</p>
    {inbox.length?<ul className="help-case-list">{items(inbox,true)}</ul>:<p>No pending structured requests.</p>}
   </section>}
  </>}
 </div>;
}
