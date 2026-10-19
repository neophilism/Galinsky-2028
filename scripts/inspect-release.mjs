// Read-only, exact-project inspection. Secret values never leave this process.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const PROJECT='prj-db57fnm7bikc739783q0',ENVIRONMENT='evm-db57fnm7bikc739783qg',WORKSPACE='tea-db23jkks728c73av263g';
const SERVICES={
 'srv-db5teuajnfac73bm8pug':'https://galinsky-2028-private-preview.onrender.com',
 'srv-db5v0lfavr4c73a62870':'https://galinsky-2028-volunteer-portal.onrender.com'
};
export function validateReleaseInspection(raw){
 const r=typeof raw==='string'?JSON.parse(raw):raw;
 if(!r||Object.keys(r).sort().join(',')!=='action,expectedCommit,nonce,schemaVersion'||r.schemaVersion!==1||!['inspect','verify'].includes(r.action)||!/^[a-f0-9]{40}$/.test(r.expectedCommit)||typeof r.nonce!=='string'||!/^[a-z0-9-]{1,80}$/.test(r.nonce))throw Error('Invalid exact-project release inspection request.');
 return r;
}
export function safeEnvironmentSummary(vars){
 const result={keys:Object.keys(vars).sort(),databaseRoles:{},flags:{},configured:{}};
 for(const name of ['DATABASE_URL','G28_REVIEW_DATABASE_URL','G28_CAMPAIGN_READ_DATABASE_URL','G28_VISITOR_ANALYTICS_DATABASE_URL'])if(vars[name]){try{const u=new URL(vars[name]);result.databaseRoles[name]={role:decodeURIComponent(u.username),endpoint:u.hostname.split('.')[0],database:decodeURIComponent(u.pathname.slice(1))};}catch{result.databaseRoles[name]={invalid:true};}}
 for(const name of ['SIGNUP_ENABLED','STAFF_IDENTITY_ENABLED','PROTECTED_CONTENT_ENABLED','DONATIONS_ENABLED','G28_ADMIN_LOGIN_ENABLED','G28_CAMPAIGN_EDITOR_ENABLED','COORDINATION_ENABLED','G28_HELP_REQUESTS_ENABLED','G28_VISITOR_ANALYTICS_ENABLED'])result.flags[name]=vars[name]==='true';
 for(const name of ['RESEND_API_KEY','MAIL_FROM','DELIVERY_KEY','LOGIN_PEPPER','G28_TREASURY_VAULT_KEY','RESEND_WEBHOOK_SECRET','PREVIEW_ACCESS_PASSWORD'])result.configured[name]=Boolean(vars[name]);
 return result;
}
export async function inspectRelease(raw,{env=process.env,transport=fetch}={}){
 const request=validateReleaseInspection(raw);
 if(env.GITHUB_ACTIONS==='true'&&(env.GITHUB_REPOSITORY!=='neophilism/Galinsky-2028'||env.GITHUB_REF!=='refs/heads/main'))throw Error('Only the authorized main branch can inspect release secrets.');
 if(!env.G28_RENDER_API_KEY||!env.G28_PREVIEW_ACCESS_PASSWORD)throw Error('Existing Render/preview workflow secrets are unavailable.');
 async function api(path){const r=await transport('https://api.render.com/v1'+path,{headers:{Authorization:'Bearer '+env.G28_RENDER_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Read-only Render inspection failed with HTTP '+r.status+'. Response withheld.');return r.json();}
 const unwrap=(r,key)=>r?.[key]||r,project=unwrap(await api('/projects/'+PROJECT),'project'),environment=unwrap(await api('/environments/'+ENVIRONMENT),'environment');
 if(project.id!==PROJECT||(project.ownerId||project.owner?.id)!==WORKSPACE||!project.environmentIds?.includes(ENVIRONMENT)||environment.id!==ENVIRONMENT||environment.projectId!==PROJECT)throw Error('Exact authorized project/environment binding failed.');
 const reports=[];
 for(const [id,origin]of Object.entries(SERVICES)){
  const service=unwrap(await api('/services/'+id),'service');
  if(service.id!==id||service.environmentId!==ENVIRONMENT||service.ownerId!==WORKSPACE||service.repo!=='https://github.com/neophilism/Galinsky-2028'||service.branch!=='main'||service.serviceDetails?.url!==origin)throw Error('Exact service placement failed.');
  const vars={};let cursor='';
  for(let page=0;page<10;page++){
   const rows=await api('/services/'+id+'/env-vars?limit=100'+(cursor?'&cursor='+encodeURIComponent(cursor):''));if(!Array.isArray(rows))throw Error('Invalid environment inventory.');
   for(const row of rows){const v=row.envVar;if(v&&typeof v.key==='string'&&typeof v.value==='string')vars[v.key]=v.value;}
   const next=rows.at(-1)?.cursor||'';if(rows.length<100||!next)break;if(next===cursor||page===9)throw Error('Incomplete environment inventory.');cursor=next;
  }
  const summary=safeEnvironmentSummary(vars),auth='Basic '+Buffer.from((vars.PREVIEW_ACCESS_USER||'preview')+':'+env.G28_PREVIEW_ACCESS_PASSWORD).toString('base64');
  // Configured direct variables only; env-group collisions are not guessed.
  for(const authorization of [null,'Basic '+Buffer.from('preview:synthetic-wrong-password').toString('base64')]){
   const r=await transport(origin+'/healthz',{redirect:'manual',headers:authorization?{Authorization:authorization}:{},signal:AbortSignal.timeout(60000)});await r.text();if(r.status!==401)throw Error('Private health route did not reject anonymous/wrong credentials.');
  }
  const response=await transport(origin+'/healthz',{redirect:'manual',headers:{Authorization:auth},signal:AbortSignal.timeout(60000)});if(response.status!==200)throw Error('Authenticated health verification failed with HTTP '+response.status+'.');const health=await response.json();
  if(request.action==='verify'&&health.commit!==request.expectedCommit)throw Error('Deployed health commit differs from expected tested revision.');
  let databaseReadyVerified=null;if(id==='srv-db5v0lfavr4c73a62870'){const ready=await transport(origin+'/readyz',{redirect:'manual',headers:{Authorization:auth},signal:AbortSignal.timeout(60000)});if(ready.status!==200||(await ready.json()).ready!==true)throw Error('Authenticated portal database readiness failed.');databaseReadyVerified=true;}
  reports.push({serviceId:id,databaseReadyVerified,placementVerified:true,autoDeploy:service.autoDeployTrigger||service.autoDeploy,configuration:summary,authenticatedHealth:true,unauthorizedRejected:true,deployedCommit:health.commit||null,expectedCommit:request.expectedCommit,commitMatches:health.commit===request.expectedCommit});
 }
 return {observedAt:new Date().toISOString(),action:request.action,reports};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await inspectRelease(await readFile('ops/release-inspection-request.json','utf8')),null,2));}catch{console.error('Read-only release inspection failed. Secret-bearing responses withheld.');process.exitCode=1;}
}
