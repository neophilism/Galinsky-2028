import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createApp} from '../../apps/api/src/app.mjs';
import {MemoryStore} from '../../apps/api/src/memory-store.mjs';
import {emailKey,randomToken,tokenHash} from '../../packages/core/auth.mjs';

const pepper=randomBytes(32).toString('hex');
const ownerKey=emailKey('owner@example.test',pepper);
const config={portalOrigin:'http://localhost:4322',publicOrigin:'http://localhost:4321',
 adminLoginReady:true,adminOwnerEmailKey:ownerKey,helpRequests:true,production:false,pepper,signup:false};

function login(store,owner=false){
 const id=randomUUID(),token=randomToken(),csrf=randomToken();
 store.accounts.set(id,{id,emailKey:owner?ownerKey:emailKey(id+'@example.test',pepper),verified:true});
 store.sessions.set(tokenHash(token),{hash:tokenHash(token),csrf,expires:Date.now()+3600000,accountId:id});
 return {id,auth:{cookie:'g28-local='+token},write:{
  origin:config.portalOrigin,'content-type':'application/json',cookie:'g28-local='+token,'x-csrf-token':csrf
 }};
}
const payload={kind:'accessibility',area:'portal'};
const post=(app,url,headers,body={})=>app.inject({method:'POST',url,headers,payload:body});

test('help HTTP routes require verified account, exact origin, CSRF and zero narrative',async()=>{
 const store=new MemoryStore(),app=createApp({store,config});
 try{
  const alice=login(store),bob=login(store),owner=login(store,true);
  assert.equal((await app.inject({url:'/api/help/requests'})).statusCode,401);
  assert.equal((await post(app,'/api/help/requests',alice.auth,payload)).statusCode,403);
  assert.equal((await post(app,'/api/help/requests',{...alice.write,origin:'https://attacker.test'},payload)).statusCode,403);
  assert.equal((await post(app,'/api/help/requests',alice.write,{...payload,notes:'sensitive private report'})).statusCode,400);
  assert.equal((await store.listHelpRequests(alice.id)).length,0);
  const created=await post(app,'/api/help/requests',alice.write,payload);
  assert.equal(created.statusCode,201);const id=created.json().request.id;
  assert(!created.body.includes(alice.id));
  assert(!created.body.includes(alice.auth.cookie));
  assert.equal((await app.inject({url:'/api/help/requests',headers:alice.auth})).json().requests.length,1);
  assert.equal((await app.inject({url:'/api/help/requests',headers:bob.auth})).json().requests.length,0);
  assert.equal((await app.inject({url:'/api/help/staff/requests',headers:alice.auth})).statusCode,403);
  const queue=await app.inject({url:'/api/help/staff/requests',headers:owner.auth});
  assert.equal(queue.statusCode,200);assert.equal(queue.json().requests.length,1);
  assert(!queue.body.includes(alice.id));
  assert.equal((await post(app,'/api/help/requests/'+id+'/withdraw',bob.write)).statusCode,404);
  assert.equal((await post(app,'/api/help/staff/requests/'+id+'/acknowledge',alice.write)).statusCode,403);
  assert.equal((await post(app,'/api/help/staff/requests/'+id+'/acknowledge',owner.auth)).statusCode,403);
  assert.equal((await post(app,'/api/help/staff/requests/'+id+'/acknowledge',owner.write)).statusCode,200);
  assert.equal((await post(app,'/api/help/staff/requests/'+id+'/resolve',owner.write)).statusCode,200);
  assert.equal((await post(app,'/api/help/requests/'+id+'/withdraw',alice.write)).statusCode,409);
  const exported=await app.inject({url:'/api/account/export',headers:alice.auth});
  assert.equal(exported.statusCode,200);
  assert.equal(exported.json().helpRequests[0].status,'resolved');
  assert.equal((await app.inject({url:'/api/help/staff/requests',headers:owner.auth})).json().requests.length,0);
 }finally{await app.close();}
});

test('account export retains structured history when new intake is disabled',async()=>{
 const store=new MemoryStore(),app=createApp({store,config:{...config,helpRequests:false}});
 try{
  const who=login(store);
  const saved=await store.createHelpRequest(who.id,payload);
  const response=await app.inject({url:'/api/account/export',headers:who.auth});
  assert.equal(response.statusCode,200);
  assert.deepEqual(response.json().helpRequests.map(item=>item.id),[saved.id]);
  assert.equal((await post(app,'/api/help/requests',who.write,payload)).statusCode,503);
  const still=await app.inject({url:'/api/account/export',headers:who.auth});
  assert.deepEqual(still.json().helpRequests.map(item=>item.id),[saved.id]);
  assert(!still.body.includes(who.id+'@example.test'));
 }finally{await app.close();}
});

test('unreleased help workflows never accept or store account requests',async()=>{
 const store=new MemoryStore(),app=createApp({store,config:{...config,helpRequests:false}});
 try{
  const who=login(store);
  const r=await post(app,'/api/help/requests',who.write,payload);
  assert.equal(r.statusCode,503);
  assert.deepEqual(await store.listHelpRequests(who.id),[]);
  assert(!JSON.stringify(r.json()).includes('requestId'));
 }finally{await app.close();}
});
