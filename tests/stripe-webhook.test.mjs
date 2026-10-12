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
   if(!this.intent)this.intent={client_reference:p[0],session_id:p[1],election:p[2],amount_cents:p[3],livemode:p[4],payment_state:'pending'};
   return {rowCount:1,rows:[]};
  }
  if(sql.startsWith('SELECT session_id,election,amount_cents,livemode FROM')){
   return {rowCount:this.intent?1:0,rows:this.intent?[this.intent]:[]};
  }
  if(sql.startsWith('SELECT client_reference,election,amount_cents,livemode,payment_state FROM')){
   return {rowCount:this.intent?1:0,rows:this.intent?[this.intent]:[]};
  }
  if(sql.startsWith('INSERT INTO g28.stripe_webhook_receipts(')){
   if(this.receipts.has(p[0]))return {rowCount:0,rows:[]};
   this.receipts.set(p[0],p[1]);return {rowCount:1,rows:[{event_id:p[0]}]};
  }
  if(sql.startsWith('SELECT event_sha256 FROM')){
   return {rowCount:1,rows:[{event_sha256:this.receipts.get(p[0])}]};
  }
  if(sql.startsWith('UPDATE g28.stripe_checkout_intents SET')){
   this.intent.payment_state='paid';return {rowCount:1,rows:[]};
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
