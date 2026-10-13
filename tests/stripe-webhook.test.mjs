import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {StripeCampaignStore} from '../apps/web/stripe-campaign-store.mjs';

const secret='whsec_12345678901234567890',now=Math.floor(Date.now()/1000);
const id='attempt_'+'a'.repeat(32),session='cs_test_ABCDEFGHIJKLM';
const event=(options={})=>({id:'evt_ABCDEFGHIJKL',type:'checkout.session.completed',created:now,
 livemode:false,data:{object:{id:session,payment_status:'paid',amount_total:2500,
 currency:'usd',client_reference_id:id,metadata:{election:'primary'}}},...options});
const raw=payload=>Buffer.from(JSON.stringify(payload));
const signature=data=>'t='+now+',v1='+createHmac('sha256',secret).update(now+'.').update(data).digest('hex');
class FakePool{
 constructor(){this.intent=null;this.receipts=new Map();this.captured=[];this.commits=0;}
 async connect(){return {query:(sql,p)=>this.query(sql,p),release:()=>{}}}
 async query(sql,p=[]){
  if(sql==='BEGIN'||sql==='ROLLBACK')return {rowCount:0,rows:[]};
  if(sql==='COMMIT'){this.commits++;return {rowCount:0,rows:[]};}
  if(sql.startsWith('INSERT INTO g28.stripe_checkout_intents(')){
   if(!this.intent)this.intent={client_reference:p[0],session_id:p[1],election:p[2],amount_cents:p[3],livemode:p[4],terms_version:p[5]??null,payment_state:'pending'};
   return {rowCount:1,rows:[]};
  }
  if(sql.startsWith('SELECT session_id,election,amount_cents,livemode')){
   return {rowCount:this.intent?1:0,rows:this.intent?[{...this.intent}]:[]};
  }
  if(sql.startsWith('SELECT client_reference,election,amount_cents,livemode,payment_state')){
   return {rowCount:this.intent?1:0,rows:this.intent?[{...this.intent}]:[]};
  }
  if(sql.startsWith('INSERT INTO g28.stripe_webhook_receipts(')){
   if(this.receipts.has(p[0]))return {rowCount:0,rows:[]};
   this.receipts.set(p[0],p[1]);return {rowCount:1,rows:[{event_id:p[0]}]};
  }
  if(sql.startsWith('SELECT event_sha256 FROM')){
   return {rowCount:1,rows:[{event_sha256:this.receipts.get(p[0])}]};
  }
  if(sql.startsWith('UPDATE g28.stripe_checkout_intents SET')){
   this.intent.payment_state=sql.includes('payment_state=$1')?p[0]:
    sql.includes("payment_state='requires_review'")?'requires_review':'paid';
   return {rowCount:1,rows:[]};
  }
  if(sql.startsWith('INSERT INTO g28.financial_provider_events(')){
   this.captured.push({provider:p[0],event:p[1],payment:p[2],amount:p[4]});
   return {rowCount:1,rows:[]};
  }
  throw Error('Unexpected query: '+sql.slice(0,90));
 }
}
test('session record is idempotent and rejects changing amount or mode',async()=>{
 const pool=new FakePool(),s=new StripeCampaignStore(pool);
 await s.recordSession({clientRef:id,sessionId:session,election:'primary',amountCents:2500,livemode:false});
 await s.recordSession({clientRef:id,sessionId:session,election:'primary',amountCents:2500,livemode:false});
 await assert.rejects(()=>s.recordSession({clientRef:id,sessionId:session,election:'general',amountCents:2500,livemode:false}),/Conflicting/);
 await assert.rejects(()=>s.recordSession({clientRef:id,sessionId:session,election:'primary',amountCents:2500,livemode:true}),/mismatch/);
});
test('signed Stripe event must match the versioned one-checkbox agreement stored with the contribution',async()=>{
 const pool=new FakePool(),store=new StripeCampaignStore(pool);
 const version='2026-10-13-general-v1';
 await store.recordSession({clientRef:id,sessionId:session,election:'primary',
  amountCents:2500,livemode:false,termsVersion:version});
 assert.equal(pool.intent.terms_version,version);
 const bad=raw(event({data:{object:{...event().data.object,metadata:{
  election:'primary',terms_version:'2026-01-01-outdated-v1'}}}}));
 const rejected=await store.receiveSignedWebhook({raw:bad,header:signature(bad),secret,sandbox:true});
 assert.deepEqual(rejected,{status:422,outcome:'unmatched_payment'});
 assert.equal(pool.captured.length,0);
 const valid=raw(event({data:{object:{...event().data.object,metadata:{
  election:'primary',terms_version:version}}}}));
 const accepted=await store.receiveSignedWebhook({raw:valid,header:signature(valid),secret,sandbox:true});
 assert.equal(accepted.outcome,'verified_captured_not_settled');
 assert.equal(pool.captured.length,1);
});

test('only paid, signed, matched test transactions enter ledger; no bank settlement assumed',async()=>{
 const pool=new FakePool(),s=new StripeCampaignStore(pool);
 await s.recordSession({clientRef:id,sessionId:session,election:'primary',amountCents:2500,livemode:false});
 const good=raw(event());
 const forged=await s.receiveSignedWebhook({raw:good,header:'t='+now+',v1='+'0'.repeat(64),secret,sandbox:true});
 assert.equal(forged.status,400);assert.equal(pool.captured.length,0);
 const mismatched=raw(event({data:{object:{...event().data.object,amount_total:2600}}}));
 assert.equal((await s.receiveSignedWebhook({raw:mismatched,header:signature(mismatched),secret,sandbox:true})).status,422);
 const liveEvent=raw(event({livemode:true}));
 assert.equal((await s.receiveSignedWebhook({raw:liveEvent,header:signature(liveEvent),secret,sandbox:true})).status,400);
 const unpaid=raw(event({data:{object:{...event().data.object,payment_status:'unpaid'}}}));
 assert.equal((await s.receiveSignedWebhook({raw:unpaid,header:signature(unpaid),secret,sandbox:true})).outcome,'no_capture_confirmed');
 const accepted=await s.receiveSignedWebhook({raw:good,header:signature(good),secret,sandbox:true});
 assert.deepEqual(accepted,{status:200,outcome:'verified_captured_not_settled'});
 assert.deepEqual(pool.captured,[{provider:'stripe-test',event:'evt_ABCDEFGHIJKL',payment:session,amount:2500}]);
 assert.equal((await s.receiveSignedWebhook({raw:good,header:signature(good),secret,sandbox:true})).outcome,'duplicate');
 assert.equal(pool.captured.length,1);
});

test('verified checkout expiration is a nonpayment; signed later paid event requires reconciliation',async()=>{
 const pool=new FakePool(),store=new StripeCampaignStore(pool);
 await store.recordSession({clientRef:id,sessionId:session,election:'primary',amountCents:2500,livemode:false});
 const base=event();
 const expiration=raw({...base,id:'evt_ExpireSession12',type:'checkout.session.expired',
  data:{object:{...base.data.object,payment_status:'unpaid'}}});
 const first=await store.receiveSignedWebhook({raw:expiration,header:signature(expiration),secret,sandbox:true});
 assert.deepEqual(first,{status:200,outcome:'verified_expired_no_charge'});
 assert.equal(pool.intent.payment_state,'expired');
 assert.equal(pool.captured.length,0);
 assert.equal((await store.receiveSignedWebhook({raw:expiration,header:signature(expiration),secret,sandbox:true})).outcome,'duplicate');
 const late=raw({...base,id:'evt_LatePayment123'});
 const outcome=await store.receiveSignedWebhook({raw:late,header:signature(late),secret,sandbox:true});
 assert.deepEqual(outcome,{status:200,outcome:'verified_capture_requires_reconciliation'});
 assert.equal(pool.intent.payment_state,'requires_review');
 assert.equal(pool.captured.length,1);
});
test('asynchronous payment failures and late expiration never overwrite a confirmed capture',async()=>{
 const pool=new FakePool(),store=new StripeCampaignStore(pool);
 await store.recordSession({clientRef:id,sessionId:session,election:'primary',amountCents:2500,livemode:false});
 const base=event();
 const failure=raw({...base,id:'evt_AsyncFailureABC',type:'checkout.session.async_payment_failed',
  data:{object:{...base.data.object,payment_status:'unpaid'}}});
 const badSig=await store.receiveSignedWebhook({raw:failure,header:'t='+now+',v1='+'0'.repeat(64),secret,sandbox:true});
 assert.equal(badSig.status,400);assert.equal(pool.intent.payment_state,'pending');
 assert.equal((await store.receiveSignedWebhook({raw:failure,header:signature(failure),secret,sandbox:true})).outcome,'verified_failed_no_charge');
 assert.equal(pool.intent.payment_state,'failed');
 const later=raw({...base,id:'evt_CapturedAfterFailure'});
 assert.equal((await store.receiveSignedWebhook({raw:later,header:signature(later),secret,sandbox:true})).outcome,'verified_capture_requires_reconciliation');
 assert.equal(pool.intent.payment_state,'requires_review');
 const expiration=raw({...base,id:'evt_ExpiredLateAfter',type:'checkout.session.expired',
  data:{object:{...base.data.object,payment_status:'unpaid'}}});
 assert.equal((await store.receiveSignedWebhook({raw:expiration,header:signature(expiration),secret,sandbox:true})).outcome,'already_requires_review');
 assert.equal(pool.intent.payment_state,'requires_review');
 assert.equal(pool.captured.length,1);
});
test('expired event arriving after a paid checkout never reclassifies the recorded payment',async()=>{
 const pool=new FakePool(),store=new StripeCampaignStore(pool);
 await store.recordSession({clientRef:id,sessionId:session,election:'primary',amountCents:2500,livemode:false});
 const base=event(),paid=raw(base);
 assert.equal((await store.receiveSignedWebhook({raw:paid,header:signature(paid),secret,sandbox:true})).outcome,'verified_captured_not_settled');
 const expired=raw({...base,id:'evt_LateExpiryXYZ12',type:'checkout.session.expired',
  data:{object:{...base.data.object,payment_status:'unpaid'}}});
 assert.equal((await store.receiveSignedWebhook({raw:expired,header:signature(expired),secret,sandbox:true})).outcome,'already_paid');
 assert.equal(pool.intent.payment_state,'paid');
 assert.equal(pool.captured.length,1);
});
