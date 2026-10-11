#!/usr/bin/env node
// Exact-ID, owner-authorized service cleanup. Never deletes projects or databases.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const OWNER='tea-db23jkks728c73av263g',RAM_DB='dpg-db39gm1srm7s73b62mv0-a';
const TARGETS=[
 {id:'srv-db53cknavr4c73faj5fg',name:'music-video-wizard-live',repo:'Music_Video_Wizard',branch:'main',keep:'music-video-wizard-preview'},
 {id:'srv-db53ag8473hc739nkl8g',name:'music-video-wizard-web',repo:'Music_Video_Wizard',branch:'main',keep:'music-video-wizard-preview'},
 {id:'srv-db39haid0e5s73fik1kg',name:'civic-registry-preview',repo:'Civic-Registry-Transparency-Engine',branch:'main',keep:'civic-registry-preview-v2'},
 {id:'srv-db39gtid0e5s73fiirjg',name:'ram-marketplace-preview',repo:'RAM-Marketplace',branch:'main',keep:'ram-marketplace-sandbox'},
 {id:'srv-db3ptde0tbcc738giui0',name:'e2eesa-standards-portal',repo:'End-To-End-Everywhere-Security-Architecture-Standard',branch:'website/standards-portal',keep:'end-to-end-everywhere-standard'}
];
export const DELETE_IDS=Object.freeze(TARGETS.map(s=>s.id));
export function validateRequest(raw){
 const q=typeof raw==='string'?JSON.parse(raw):raw;
 if(!q||typeof q!=='object'||Array.isArray(q)||Object.keys(q).sort().join(',')!=='action,serviceIds,workspaceId')throw Error('Invalid cleanup request shape');
 if(q.workspaceId!==OWNER||!['audit','delete'].includes(q.action))throw Error('Wrong owner or cleanup action');
 if(!Array.isArray(q.serviceIds)||JSON.stringify(q.serviceIds)!==JSON.stringify(DELETE_IDS))throw Error('Only the five owner-approved IDs may be removed');
 return q;
}
async function api(method,path,token){
 const res=await fetch('https://api.render.com/v1'+path,{
  method,headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(25000)
 });
 if(method==='DELETE'){
  if(res.status!==204)throw Error('DELETE failed (HTTP '+res.status+')');
  return null;
 }
 if(!res.ok)throw Error('Read '+path.split('?')[0]+' failed (HTTP '+res.status+')');
 return res.json();
}
async function preflight(token){
 const all=[];let cursor='',complete=false;
 for(let page=0;page<12;page++){
  const qs=new URLSearchParams({ownerId:OWNER,includePreviews:'true',limit:'100'});
  if(cursor)qs.set('cursor',cursor);
  const batch=await api('GET','/services?'+qs,token);
  if(!Array.isArray(batch))throw Error('Invalid service list');
  for(const row of batch){
   if(!row.service||row.service.ownerId!==OWNER)throw Error('Foreign owner in service listing');
   all.push(row.service);
  }
  const next=batch.at(-1)?.cursor||'';
  if(!next){complete=true;break;}
  if(next===cursor)throw Error('Repeated list cursor');
  cursor=next;
 }
 if(!complete)throw Error('Incomplete workspace service list');
 const byName=new Map(all.map(s=>[s.name,s]));
 if(byName.size!==all.length)throw Error('Duplicate service names');
 const checked=[];
 for(const t of TARGETS){
  const s=await api('GET','/services/'+t.id,token);
  if(s.id!==t.id||s.ownerId!==OWNER||s.name!==t.name||s.repo!=='https://github.com/neophilism/'+t.repo||s.branch!==t.branch)
   throw Error('Target identity changed: '+t.name);
  const k=byName.get(t.keep);
  if(!k||k.id===t.id||k.ownerId!==OWNER||k.repo!==s.repo||k.branch!=='main')
   throw Error('Survivor cannot be verified: '+t.name);
  const domains=await api('GET','/services/'+t.id+'/custom-domains?limit=100',token);
  if(!Array.isArray(domains)||domains.length)throw Error('Custom domain present or unverifiable: '+t.name);
  checked.push({delete:t.name,keep:k.name,customDomains:0});
 }
 const db=await api('GET','/postgres/'+RAM_DB,token);
 if(db.id!==RAM_DB||db.owner?.id!==OWNER)throw Error('RAM database cannot be verified as preserved');
 console.log('PRE_DELETE_AUDIT '+JSON.stringify({servicesBefore:all.length,checked,
  ramDatabase:{id:db.id,name:db.name,plan:db.plan,expiresAt:db.expiresAt||null,action:'PRESERVE'},
  note:'No RAM database or associated storage is deleted. Row-level content cannot be inspected through this restricted connector.'}));
}
export async function executeCleanup(raw,env=process.env){
 const q=validateRequest(raw);
 if(env.GITHUB_ACTIONS==='true'&&(env.GITHUB_REPOSITORY!=='neophilism/Galinsky-2028'||env.GITHUB_REF!=='refs/heads/main'))
  throw Error('Must run on designated main branch');
 const token=env.G28_RENDER_API_KEY||'';
 if(token.length<10)throw Error('Missing secured Render API key');
 await preflight(token); // Entire preflight finishes before the first DELETE.
 if(q.action==='audit'){console.log('AUDIT_ONLY_NO_CHANGES');return;}
 for(const t of TARGETS){
  await api('DELETE','/services/'+t.id,token);
  console.log('DELETED '+t.name+' '+t.id);
 }
 const db=await api('GET','/postgres/'+RAM_DB,token);
 if(db.id!==RAM_DB||db.owner?.id!==OWNER)throw Error('RAM database preservation must be investigated');
 console.log('DELETION_COMPLETE '+JSON.stringify({deleted:DELETE_IDS,preservedDatabase:RAM_DB}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await executeCleanup(await readFile('ops/render-workspace-cleanup-request.json','utf8'))}
 catch(e){console.error('Render cleanup stopped: '+(e instanceof Error?e.message:'Unknown safe failure'));process.exitCode=1;}
}
