import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {registerCampaignEditor} from '../../apps/api/src/campaign-routes.mjs';
import {randomToken,tokenHash} from '../../packages/core/auth.mjs';
import {fixture,id} from '../campaign-fixture.mjs';
const origin='https://portal.example';
async function setup({enabled=true,role='owner',rate=true}={}){
 const token=randomToken(),csrf=randomToken(),calls=[];
 const accountStore={session:async hash=>hash===tokenHash(token)?{account:{id:id(99)},csrf}:null,adminRole:async()=>role,rate:async()=>rate};
 const campaignStore={
  list:async options=>{calls.push(['list',options]);return{items:[],next:null};},
  get:async()=>({id:id(1),revision:1,document:fixture(),archived:false,lifecycleVersion:0}),
  create:async(...args)=>{calls.push(['create',...args]);return{id:id(3),revision:1};},
  save:async(...args)=>{calls.push(['save',...args]);return{id:id(1),revision:2,document:fixture()};},
  publish:async(...args)=>{calls.push(['publish',...args]);return{id:id(1),revision:1};},
  settings:async()=>({version:0,settings:null}),
  saveSettings:async(...args)=>{calls.push(['settings',...args]);return{version:1};},
  assets:async()=>({items:[],next:null}),
  addAsset:async(...args)=>{calls.push(['asset',...args]);return{id:id(9)};}
 };
 const app=Fastify();registerCampaignEditor(app,{accountStore,config:{production:false,adminLoginReady:true,adminOwnerEmailKey:'synthetic',portalOrigin:origin},env:{G28_CAMPAIGN_EDITOR_ENABLED:String(enabled)},campaignStore});
 await app.ready();return{app,calls,headers:{cookie:'g28-local='+token,origin,'x-csrf-token':csrf,'content-type':'application/json','sec-fetch-site':'same-origin'}};
}
test('editor routes require fresh owner/editor authorization before body parsing',async()=>{
 const s=await setup();try{
  const noAuth=await s.app.inject({method:'POST',url:'/api/editorial/campaigns',headers:{'content-type':'application/json'},payload:'{invalid'});
  assert.equal(noAuth.statusCode,401);assert.equal(s.calls.length,0);
  const yes=await s.app.inject({url:'/api/editorial/contract',headers:s.headers});assert.equal(yes.statusCode,200);assert.equal(yes.json().fields.length,80);assert.equal(yes.json().role,'owner');assert.match(yes.headers['cache-control'],/no-store/);
  const created=await s.app.inject({method:'POST',url:'/api/editorial/campaigns',headers:s.headers,payload:{document:fixture()}});assert.equal(created.statusCode,200);assert.equal(s.calls.at(-1)[0],'create');assert.equal(s.calls.at(-1)[2],id(99));
 }finally{await s.app.close();}
});
test('reviewer, volunteer and financial roles cannot read or mutate editorial data',async()=>{
 for(const role of ['reviewer','volunteer','treasurer','auditor',null]){const s=await setup({role});try{for(const url of ['/api/editorial/contract','/api/editorial/campaigns','/api/editorial/settings','/api/editorial/media']){const r=await s.app.inject({url,headers:s.headers});assert.equal(r.statusCode,403);}assert.equal(s.calls.length,0);}finally{await s.app.close();}}
});
test('editor can save drafts but cannot publish or select campaigns',async()=>{
 const s=await setup({role:'editor'});try{
  assert.equal((await s.app.inject({method:'PUT',url:'/api/editorial/campaigns/'+id(1),headers:s.headers,payload:{expectedRevision:1,document:fixture()}})).statusCode,200);
  for(const [method,url,payload]of [['POST','/api/editorial/campaigns/'+id(1)+'/publish',{expectedRevision:1}],['PUT','/api/editorial/settings',{expectedVersion:0,settings:{}}]])assert.equal((await s.app.inject({method,url,headers:s.headers,payload})).statusCode,403);
 }finally{await s.app.close();}
});
test('CSRF, cross-origin and unexpected request fields fail without storage calls',async()=>{
 const s=await setup();try{
  for(const patch of [{'x-csrf-token':'wrong'},{origin:'https://attacker.example'},{'sec-fetch-site':'cross-site'}])assert.equal((await s.app.inject({method:'POST',url:'/api/editorial/campaigns',headers:{...s.headers,...patch},payload:{document:fixture()}})).statusCode,403);
  const unknown=await s.app.inject({method:'POST',url:'/api/editorial/campaigns',headers:s.headers,payload:{document:fixture(),role:'owner'}});assert.equal(unknown.statusCode,400);assert.equal(s.calls.length,0);
  const upload=await s.app.inject({method:'POST',url:'/api/editorial/media',headers:s.headers,payload:{base64:Buffer.from('<svg onload="bad"/>').toString('base64')}});assert.equal(upload.statusCode,400);assert.equal(s.calls.length,0);
 }finally{await s.app.close();}
});
test('feature disabled and rate limits remain real gates',async()=>{
 for(const options of [{enabled:false},{rate:false}]){const s=await setup(options);try{assert.equal((await s.app.inject({url:'/api/editorial/contract',headers:s.headers})).statusCode,options.enabled===false?503:429);assert.equal(s.calls.length,0);}finally{await s.app.close();}}
});
test('generic editor assets serve with private caching and no inline executable code',async()=>{
 const s=await setup();try{for(const url of ['/editor/campaigns','/editor/campaigns/editor.mjs','/editor/campaigns/editor.css']){const r=await s.app.inject({url});assert.equal(r.statusCode,200);assert.match(r.headers['cache-control'],/private/);assert.match(r.headers['content-security-policy'],/script-src 'self'/);}const page=(await s.app.inject({url:'/editor/campaigns'})).body;assert.ok(page.includes('Side-by-side text'));assert.ok(page.includes('Enable day/night mode'));}finally{await s.app.close();}
});
