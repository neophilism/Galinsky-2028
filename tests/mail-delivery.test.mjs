import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {Webhook} from 'svix';
import {createApp} from '../apps/api/src/app.mjs';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
import {queueAccountNotice} from '../apps/api/src/mail-notices.mjs';
import {processOneMailJob} from '../apps/api/src/worker.mjs';
import {sealDelivery} from '../packages/core/auth.mjs';
import {loadPreviewGate} from '../packages/core/preview-gate.mjs';
const secret='whsec_'+randomBytes(32).toString('base64'),providerId=randomUUID(),deliveryKey=randomBytes(32).toString('base64');
const cfg={portalOrigin:'http://localhost:4322',publicOrigin:'http://localhost:4321',deliveryKey,mailWebhookSecret:secret};
function signed(raw,id='msg_'+randomUUID(),when=new Date()){return {'content-type':'application/json','svix-id':id,'svix-timestamp':String(Math.floor(+when/1000)),'svix-signature':new Webhook(secret).sign(id,when,raw)};}
function payload(type='email.bounced',id=providerId){return JSON.stringify({type,data:{email_id:id,to:['synthetic@example.test'],bounce:{type:'hard_bounce'}}});}
test('actual mail callback HTTP verifies exact signed bytes, freshness, replay identity, and preserves preview protection',async()=>{
 const store=new MemoryStore(),app=createApp({store,config:cfg});
 const raw=payload(),h=signed(raw);
 try{
  assert.equal((await app.inject({method:'POST',url:'/api/mail/events',headers:{'content-type':'application/json'},payload:raw})).statusCode,400);
  assert.equal((await app.inject({method:'POST',url:'/api/mail/events',headers:h,payload:raw+' '})).statusCode,400);
  assert.equal((await app.inject({method:'POST',url:'/api/mail/events',headers:signed(raw,undefined,new Date(Date.now()-600000)),payload:raw})).statusCode,400);
  const accepted=await app.inject({method:'POST',url:'/api/mail/events',headers:h,payload:raw});assert.equal(accepted.statusCode,200,accepted.body);assert.equal(accepted.json().duplicate,false);
  assert.equal((await app.inject({method:'POST',url:'/api/mail/events',headers:h,payload:raw})).json().duplicate,true);
  const other=payload('email.delivered');assert.equal((await app.inject({method:'POST',url:'/api/mail/events',headers:signed(other,h['svix-id']),payload:other})).statusCode,409);
  assert(!JSON.stringify([...store.mailEvents.values()]).includes('synthetic@example.test'));
  const id=randomUUID();store.accounts.set(id,{id,emailKey:'fixture-key',deliveryEnvelope:sealDelivery({email:'synthetic@example.test'},deliveryKey),marketing:true});
  await queueAccountNotice(store,cfg,id,'account_reminder','reminder:test');const job=store.outbox[0];
  await store.recordMailAcceptance(job,providerId);assert.equal(await store.deliveryAllowed(job),false,'Callback before acceptance still suppresses recipient');
  assert.equal(await queueAccountNotice(store,cfg,id,'account_reminder','reminder:test'),false,'Stable event key prevents duplicate notifications');
  const after=await queueAccountNotice(store,cfg,id,'account_security','security:test');assert.equal(after,true);
 }finally{await app.close();}
 const password='synthetic-preview-password-longer-than-24',preview=createApp({store:new MemoryStore(),config:{...cfg,previewGate:loadPreviewGate({PREVIEW_ACCESS_PASSWORD:password})}});
 try{
  assert.equal((await preview.inject({method:'POST',url:'/api/mail/events',headers:h,payload:raw})).statusCode,401);
  assert.equal((await preview.inject({method:'POST',url:'/api/mail/events',headers:{...h,authorization:'Basic '+Buffer.from('preview:'+password).toString('base64')},payload:raw})).statusCode,200);
  assert.equal((await preview.inject({method:'POST',url:'/api/account/consent',headers:{...h,authorization:'Basic '+Buffer.from('preview:'+password).toString('base64')},payload:'{}'})).statusCode,403,'Other POST routes still require Origin');
 }finally{await preview.close();}
});
test('outbox notices recheck current consent/suppression, use fixed templates, persist provider IDs and retain redacted logs',async()=>{
 const store=new MemoryStore(),id=randomUUID();store.accounts.set(id,{id,emailKey:'key',deliveryEnvelope:sealDelivery({email:'synthetic@example.test'},deliveryKey),marketing:true});
 await queueAccountNotice(store,cfg,id,'account_reminder','reminder:1');let job=store.outbox[0];
 store.accounts.get(id).marketing=false;assert.equal(await store.deliveryAllowed(job),false);
 store.accounts.get(id).marketing=true;let claimed=false;const completions=[],logs=[];
 store.claimJob=async()=>claimed?null:(claimed=true,{...job,subject_key:job.subjectKey,payload_envelope:job.envelope});
 store.finishJob=async(j,error)=>completions.push(error);
 let sent;
 await processOneMailJob({store,config:cfg,transport:async(url,options)=>{sent={url,options};return {ok:true,json:async()=>({id:providerId})};},logger:line=>logs.push(line)});
 assert.equal(completions[0],null);assert.equal(store.outbox[0].providerId,providerId);
 assert.equal(sent.options.headers['Idempotency-Key'],'g28-notice-'+job.id);
 assert.deepEqual(JSON.parse(sent.options.body).to,['synthetic@example.test']);
 assert(!JSON.stringify(logs).includes('synthetic@example.test'));assert(!JSON.stringify(logs).includes(deliveryKey));
 claimed=false;store.mailSuppressions=new Map([['key','complaint']]);
 await processOneMailJob({store,config:cfg,transport:()=>{throw Error('must not send')},logger:()=>{}});
 assert.equal(completions[1],'suppressed');
});
