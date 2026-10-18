import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../apps/api/src/app.mjs';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
import {randomToken,tokenHash} from '../packages/core/auth.mjs';
test('actual staff HTTP lifecycle enforces scopes, MFA, independent reviews, revision fencing and immediate public withdrawal',async()=>{
 const now=Date.now(),store=new MemoryStore(),origin='http://localhost:4322';store.staffSecurity=new Map();
 function login(role){
  const id=randomUUID(),key=tokenHash(id),token=randomToken(),hash=tokenHash(token),csrf=randomToken();
  store.accounts.set(id,{id,emailKey:key,verified:true});store.adminGrantsStore.set(key,{role,active:true});
  store.sessions.set(hash,{hash,accountId:id,csrf,expires:now+86400000});
  store.staffSecurity.set(id,{credentials:[{id:'fixture-'+id}],challenges:{},sessions:{[hash]:{credentialId:'fixture-'+id,expires:now+900000}}});
  return {id,key,hash,headers:{origin,cookie:'g28-local='+token,'content-type':'application/json','x-csrf-token':csrf}};
 }
 const editor=login('editor'),first=login('module-verifier'),second=login('module-verifier'),publisher=login('module-approver'),finance=login('treasurer');
 const app=createApp({store,config:{portalOrigin:origin,publicOrigin:'http://localhost:4321',staffIdentity:true,adminLoginReady:true,adminOwnerEmailKey:'owner'},clock:()=>now});
 const post=(url,who,payload)=>app.inject({method:'POST',url:'/api/staff/activity'+url,headers:who.headers,payload});
 const draft={id:'synthetic-http-activity',jurisdiction:'CT',election:'2028 General',activity:'Synthetic training',validFrom:new Date(now-10000).toISOString(),validUntil:new Date(now+3600000).toISOString(),training:['orientation-core'],approvedTools:['practice'],sources:[{url:'https://example.org/official',checkedAt:new Date(now).toISOString(),digest:'a'.repeat(64)}]};
 const expected=m=>({revision:m.revision,stateVersion:m.stateVersion});
 try{
  assert.equal((await post('',finance,{draft})).statusCode,403);
  const created=await post('',editor,{draft});assert.equal(created.statusCode,201,created.body);let m=created.json().module;
  assert.equal((await post('/'+m.id+'/publish',editor,{expected:expected(m)})).statusCode,403);
  const a=await post('/'+m.id+'/verify',first,{expected:expected(m),evidenceDigest:'b'.repeat(64)});assert.equal(a.statusCode,200,a.body);const old=m;m=a.json().module;
  assert.equal((await post('/'+m.id+'/verify',second,{expected:expected(old),evidenceDigest:'c'.repeat(64)})).statusCode,409);
  const b=await post('/'+m.id+'/verify',second,{expected:expected(m),evidenceDigest:'c'.repeat(64)});assert.equal(b.statusCode,200,b.body);m=b.json().module;
  const publication=await post('/'+m.id+'/publish',publisher,{expected:expected(m)});assert.equal(publication.statusCode,200,publication.body);m=publication.json().module;
  const visible=await app.inject({url:'/api/activity-status',headers:editor.headers});assert.equal(visible.json().modules.length,1);assert.equal(visible.json().modules[0].activityAuthorized,false);
  const revoked=await post('/'+m.id+'/revoke',publisher,{expected:expected(m),reason:'activity_suspended'});assert.equal(revoked.statusCode,200,revoked.body);
  assert.deepEqual((await app.inject({url:'/api/activity-status',headers:editor.headers})).json().modules,[]);
  store.staffSecurity.get(editor.id).sessions={};
  assert.equal((await post('',editor,{draft:{...draft,id:'mfa-denied'}})).statusCode,403);
  store.adminGrantsStore.get(publisher.key).active=false;
  assert.equal((await app.inject({url:'/api/staff/activity',headers:publisher.headers})).statusCode,403);
 }finally{await app.close();}
});
