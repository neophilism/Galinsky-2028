import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEnvironment,createPreviewSpec,run,TARGET_PROJECT_ID,TARGET_SERVICE} from '../scripts/render-project-preview.mjs';
const project={id:TARGET_PROJECT_ID,name:'Galinsky 2028',owner:{id:'tea-test-workspace',name:'Example workspace'},environmentIds:['env-a123456789']};
const e1={id:'env-a123456789',name:'Preview',projectId:TARGET_PROJECT_ID};
const pass='synthetic-long-preview-password-with-32-plus-characters';
test('chooses ONLY an environment belonging to the requested Render project',()=>{
 assert.equal(chooseEnvironment(project,[e1]).id,e1.id);
 assert.throws(()=>chooseEnvironment({...project,id:'prj-other'},[e1]));
 assert.throws(()=>chooseEnvironment(project,[{...e1,projectId:'prj-other'}]));
 assert.throws(()=>chooseEnvironment(project,[e1,{...e1,id:'env-other12345'}]));
 assert.throws(()=>chooseEnvironment(project,[e1], 'env-different1234'));
});
test('multiple environments require explicit verified selection',()=>{
 const second={...e1,id:'env-another123456',name:'Production'};
 assert.throws(()=>chooseEnvironment(project,[e1,second]));
 assert.equal(chooseEnvironment(project,[e1,second],second.id).id,second.id);
});
test('service creation is non-static, private and atomically password-protected',()=>{
 const spec=createPreviewSpec(project.owner.id,e1.id,pass);
 assert.equal(spec.type,'web_service');assert.equal(spec.environmentId,e1.id);
 assert.equal(spec.autoDeployTrigger,'off');
 assert.equal(spec.serviceDetails.runtime,'node');assert.equal(spec.serviceDetails.plan,'free');
 assert.equal(spec.serviceDetails.envSpecificDetails.startCommand,'npm run preview:serve');
 assert.equal(spec.envVars.find(x=>x.key==='PREVIEW_ACCESS_PASSWORD')?.value,pass);
 assert.equal(spec.name,TARGET_SERVICE);
 assert.throws(()=>createPreviewSpec(project.owner.id,e1.id,''));
 assert.throws(()=>createPreviewSpec(project.owner.id,'env-invalid! ',pass));
});
test('inspect mode queries exact project and environments but makes no writes',async()=>{
 const calls=[];
 const client=async(method,path)=>{calls.push(method+' '+path);if(path.startsWith('/projects/'))return project;if(path.startsWith('/environments/'))return e1;throw Error('Unexpected path');};
 const old=console.log;let output='';
 console.log=x=>{output+=x;};
 try{
  const result=await run({env:{G28_RENDER_API_KEY:'fixture-render-api-token',G28_RENDER_ACTION:'inspect'},client});
  assert.equal(result.project.id,TARGET_PROJECT_ID);
  assert.deepEqual(calls,['GET /projects/'+TARGET_PROJECT_ID,'GET /environments/'+e1.id]);
  assert.equal(output.includes('fixture-render-api-token'),false);
 }finally{console.log=old;}
});
test('create mode requires password before any POST and preserves environment identity',async()=>{
 const calls=[];const client=async(method,path)=>{calls.push(method+' '+path);if(path.startsWith('/projects/'))return project;if(path.startsWith('/environments/'))return e1;if(path.startsWith('/services?'))return [];throw Error('POST must not run');};
 await assert.rejects(()=>run({env:{G28_RENDER_API_KEY:'fixture-render-api-token',G28_RENDER_ACTION:'create'},client}),/G28_PREVIEW_ACCESS_PASSWORD/);
 assert(calls.every(x=>x.startsWith('GET ')));
});
test('existing service cannot be replaced or created in another project',async()=>{
 const calls=[];const client=async(method,path)=>{calls.push(method+' '+path);if(path.startsWith('/projects/'))return project;if(path.startsWith('/environments/'))return e1;if(path.startsWith('/services?'))return [{service:{id:'srv-old',name:TARGET_SERVICE,environmentId:'env-other'}}];throw Error('Unexpected POST');};
 await assert.rejects(()=>run({env:{G28_RENDER_API_KEY:'fixture-render-api-token',G28_RENDER_ACTION:'create',G28_PREVIEW_ACCESS_PASSWORD:pass},client}),/already exists/);
 assert(calls.every(x=>x.startsWith('GET ')));
});

test('successful project-scoped create is atomic and reports only nonsecret references',async()=>{
 const calls=[];const consoleText=[];const old=console.log;
 const client=async(method,path,args)=>{
  calls.push({method,path,body:args?.body});
  if(path.startsWith('/projects/'))return project;
  if(path.startsWith('/environments/'))return e1;
  if(path.startsWith('/services?'))return [];
  if(method==='POST'&&path==='/services')
   return {service:{id:'srv-fixture12345',name:TARGET_SERVICE,ownerId:project.owner.id,environmentId:e1.id,dashboardUrl:'https://dashboard.render.com/web/srv-fixture12345',serviceDetails:{url:'https://fixture.onrender.com'}}};
  throw Error('Unexpected external call');
 };
 console.log=v=>consoleText.push(v);
 try{
  const result=await run({env:{G28_RENDER_API_KEY:'fixture-render-api-token',G28_RENDER_ACTION:'create',G28_PREVIEW_ACCESS_PASSWORD:pass},client});
  assert.equal(result.environmentId,e1.id);
  assert.equal(result.projectId,TARGET_PROJECT_ID);
  assert.equal(result.autoDeploy,'off');
  const post=calls.find(x=>x.method==='POST');
  assert.equal(post?.body?.environmentId,e1.id);
  assert.equal(post?.body?.envVars.find(x=>x.key==='PREVIEW_ACCESS_PASSWORD')?.value,pass);
  assert.equal(post?.body?.serviceDetails?.runtime,'node');
  assert.equal(post?.body?.serviceDetails?.plan,'free');
  assert(!consoleText.join('').includes(pass));
  assert(!consoleText.join('').includes('fixture-render-api-token'));
 }finally{console.log=old;}
});
test('a chosen environment from another project refuses to create',async()=>{
 let posted=false;
 const client=async(method,path)=>{
  if(method==='POST')posted=true;
  if(path.startsWith('/projects/'))return project;
  if(path.startsWith('/environments/'))return e1;
  throw Error('Unexpected request');
 };
 await assert.rejects(()=>run({env:{G28_RENDER_API_KEY:'fixture-render-api-token',G28_RENDER_ACTION:'create',G28_RENDER_ENVIRONMENT_ID:'env-other123456',G28_PREVIEW_ACCESS_PASSWORD:pass},client}),/does not belong/);
 assert.equal(posted,false);
});
