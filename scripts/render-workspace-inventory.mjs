#!/usr/bin/env node
// Read-only inventory. Never print API keys, environment variables or resource secrets.
// Queries the official Render API for every project, environment and service in
// Phillip's workspace. Does not create, deploy, change or delete resources.
const OWNER_ID='tea-db23jkks728c73av263g';
const token=process.env.G28_RENDER_API_KEY;

async function request(path){
 const response=await fetch('https://api.render.com/v1'+path,{
  method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(20000)
 });
 if(!response.ok)throw Error('Render read-only '+path.split('?')[0]+' returned HTTP '+response.status);
 return response.json();
}
async function collect(path,field){
 const rows=[];let cursor='';
 for(let page=0;page<30;page++){
  const params=new URLSearchParams({ownerId:OWNER_ID,limit:'100'});
  if(path==='/services')params.set('includePreviews','true');
  if(cursor)params.set('cursor',cursor);
  const batch=await request(path+'?'+params.toString());
  if(!Array.isArray(batch))throw Error('Unexpected Render listing for '+path);
  for(const x of batch)if(x?.[field])rows.push(x[field]);else throw Error('Malformed listing row in '+path);
  if(batch.length===0) return rows;
  const next=batch[batch.length-1].cursor;
  if(!next)return rows;
  if(next===cursor)throw Error('Repeated Render pagination cursor');
  cursor=next;
 }
 throw Error('Render pagination exceeded safe limit for '+path);
}
export function organize({projects,environments,services}){
 const projectById=new Map();
 const output={workspaceId:OWNER_ID,projectCount:projects.length,serviceCount:services.length,projects:[],unassigned:[]};
 for(const project of projects){
  if(project.owner?.id!==OWNER_ID||!/^prj-/.test(project.id)||projectById.has(project.id))
   throw Error('Wrong owner or duplicate Render project');
  projectById.set(project.id,project);
  output.projects.push({id:project.id,name:project.name,environments:[]});
 }
 const envLookup=new Map(),serviceToEnv=new Map();
 for(const env of environments){
  if(!projectById.has(env.projectId)||envLookup.has(env.id)||!/^evm-/.test(env.id))
   throw Error('Wrong project or duplicate Render environment');
  const container=output.projects.find(p=>p.id===env.projectId);
  const summary={id:env.id,name:env.name,services:[],databases:env.databasesIds?.length||0,redis:env.redisIds?.length||0};
  container.environments.push(summary);
  envLookup.set(env.id,summary);
  for(const id of env.serviceIds||[]){
   if(serviceToEnv.has(id)&&serviceToEnv.get(id)!==env.id)
    throw Error('A service is unexpectedly assigned to multiple environments');
   serviceToEnv.set(id,env.id);
  }
 }
 const visited=new Set();
 for(const srv of services){
  if(srv.ownerId!==OWNER_ID||visited.has(srv.id))throw Error('Wrong owner or duplicate Render service');
  visited.add(srv.id);
  const envId=srv.environmentId||serviceToEnv.get(srv.id)||null;
  if(srv.environmentId&&serviceToEnv.get(srv.id)&&srv.environmentId!==serviceToEnv.get(srv.id))
   throw Error('Conflicting Render service environment assignments');
  const summary={id:srv.id,name:srv.name,kind:srv.type,
   repo:srv.repo||null,branch:srv.branch||null,
   url:srv.serviceDetails?.url||null,
   status:srv.suspended||'unknown',
   plan:srv.serviceDetails?.plan||null,
   autoDeploy:srv.autoDeployTrigger||null};
  if(envId&&envLookup.has(envId))envLookup.get(envId).services.push(summary);
  else if(envId)throw Error('Service refers to an environment outside the scoped workspace project listing: '+srv.id);
  else output.unassigned.push(summary);
 }
 for(const p of output.projects){
  p.environments.sort((a,b)=>a.name.localeCompare(b.name));
  for(const e of p.environments)e.services.sort((a,b)=>a.name.localeCompare(b.name));
 }
 output.projects.sort((a,b)=>a.name.localeCompare(b.name));
 output.unassigned.sort((a,b)=>a.name.localeCompare(b.name));
 const classified=output.unassigned.length+output.projects.reduce((n,p)=>n+p.environments.reduce((m,e)=>m+e.services.length,0),0);
 if(classified!==output.serviceCount)throw Error('Inventory omits some Render services');
 return output;
}
export async function run(){
 if(!token||token.length<10)throw Error('Missing configured Render API token.');
 const [projects,services]=await Promise.all([collect('/projects','project'),collect('/services','service')]);
 const environmentIds=[...new Set(projects.flatMap(p=>p.environmentIds||[]))];
 const environments=await Promise.all(environmentIds.map(id=>{
  if(!/^evm-[a-z0-9-]+$/.test(id))throw Error('Invalid environment ID');
  return request('/environments/'+id);
 }));
 const report=organize({projects,environments,services});
 console.log('RENDER_WORKSPACE_INVENTORY_START');
 console.log(JSON.stringify(report,null,2));
 console.log('RENDER_WORKSPACE_INVENTORY_END');
 return report;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)
 run().catch(e=>{console.error('Read-only Render inventory failed: '+e.message);process.exitCode=1;});
