import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {deliverLogin,processOneMailJob,runMailQueueLoop} from '../../apps/api/src/worker.mjs';import {sealDelivery} from '../../packages/core/auth.mjs';
const config={portalOrigin:'https://volunteer.example.test',deliveryKey:randomBytes(32).toString('base64'),mailKey:'fixture',mailFrom:'test@example.test'};
const job=p=>({id:'fixture-job',payload_envelope:sealDelivery(p,config.deliveryKey)});
test('expired mail does not contact the provider',async()=>assert.equal(await deliverLogin(job({expires:1}),config,()=>{throw Error('must not send')}),'expired'));
test('mail destination is bound to the configured portal',async()=>assert.equal(await deliverLogin(job({expires:Date.now()+1000,url:'https://evil.example/verify'}),config,()=>{throw Error('must not send')}),'invalid_destination'));
test('account email uses a stable idempotency key and the explicit recipient',async()=>{let sent;const result=await deliverLogin(job({expires:Date.now()+1000,url:config.portalOrigin+'/verify#token=fixture',email:'test@example.test'}),config,async(url,request)=>{sent={url,request};return {ok:true};});assert.equal(result,null);assert.equal(sent.request.headers['Idempotency-Key'],'g28-login-fixture-job');assert.deepEqual(JSON.parse(sent.request.body).to,['test@example.test']);});

test('real leased queue runner sends one job and records durable completion',async()=>{
 const payload=job({expires:Date.now()+300000,url:config.portalOrigin+'/verify#token=private-login-abc',
  email:'recipient@example.test'});
 payload.kind='account_login';
 const queue=[payload],finished=[],logs=[],sent=[];
 const store={
  async claimJob(){return queue.shift()||null;},
  async finishJob(j,result){finished.push({id:j.id,result});},
  async cleanup(){finished.push({cleanup:true});}
 };
 const cfg={...config,signup:true,mailReady:true,databaseUrl:'postgresql://fixture.invalid/workers'};
 const result=await runMailQueueLoop({store,config:cfg,maxIterations:2,pollMs:50,logger:msg=>logs.push(msg),
  transport:async(url,options)=>{sent.push({url,headers:options.headers,body:options.body});return {ok:true};}});
 assert.equal(result.processed,1);
 assert.equal(result.storageFailures,0);
 assert.equal(sent.length,1);
 assert.equal(sent[0].headers['Idempotency-Key'],'g28-login-fixture-job');
 assert.deepEqual(finished[0],{id:'fixture-job',result:null});
 assert(logs.some(s=>s.includes('"result":"sent"')));
 assert(!JSON.stringify(logs).includes('recipient@example.test'));
 assert(!JSON.stringify(logs).includes('private-login-abc'));
});
test('provider/network failures retry via existing durable outbox instead of claiming success',async()=>{
 const payload=job({expires:Date.now()+300000,url:config.portalOrigin+'/verify#token=private-login-abc',
  email:'recipient@example.test'});payload.kind='account_login';
 const completed=[];
 const store={async claimJob(){return payload;},async finishJob(j,result){completed.push(result);}};
 const cfg={...config,signup:true,mailReady:true,databaseUrl:'postgresql://fixture.invalid/workers'};
 const dispatched=await processOneMailJob({store,config:cfg,
  transport:async()=>{throw Error('provider secret: DO NOT LOG');},logger:()=>{}});
 assert.equal(dispatched,true);
 assert.deepEqual(completed,['delivery_failed']);
});
test('queue runner cannot operate with incomplete sender, signup or database configuration',async()=>{
 const store={async claimJob(){return null;},async cleanup(){}};
 for(const bad of [
  {...config,signup:false,mailReady:true,databaseUrl:'postgresql://fixture'},
  {...config,signup:true,mailReady:false,databaseUrl:'postgresql://fixture'},
  {...config,signup:true,mailReady:true,databaseUrl:''}
 ])await assert.rejects(()=>runMailQueueLoop({store,config:bad,maxIterations:1,pollMs:50}),/requires a real database/);
});
