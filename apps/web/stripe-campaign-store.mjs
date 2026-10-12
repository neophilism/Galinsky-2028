import {createHash} from 'node:crypto';
import {verifyStripeWebhook} from '../../packages/core/stripe-campaign.mjs';

const SESSION=/^cs_(test|live)_[A-Za-z0-9]{10,}$/;
export class StripeCampaignStore {
 constructor(pool){this.pool=pool;}
 async recordSession({clientRef,sessionId,amountCents,election,livemode}){
  if(!/^attempt_[a-f0-9]{32}$/.test(clientRef)||!SESSION.test(sessionId)||
   !Number.isSafeInteger(amountCents)||amountCents<=0||amountCents>100000000||
   !['primary','general'].includes(election)||typeof livemode!=='boolean')
   throw new Error('Invalid Stripe checkout session record.');
  if(livemode !== sessionId.startsWith('cs_live_'))throw Error('Live and test Stripe session identity mismatch');
  await this.pool.query(
   "INSERT INTO g28.stripe_checkout_intents(client_reference,session_id,election,amount_cents,livemode) VALUES($1,$2,$3,$4,$5) ON CONFLICT(client_reference) DO NOTHING",
   [clientRef,sessionId,election,amountCents,livemode]);
  const found=await this.pool.query(
   'SELECT session_id,election,amount_cents,livemode FROM g28.stripe_checkout_intents WHERE client_reference=$1',[clientRef]);
  if(found.rowCount!==1||found.rows[0].session_id!==sessionId||
     found.rows[0].election!==election||Number(found.rows[0].amount_cents)!==amountCents||
     found.rows[0].livemode!==livemode)
   throw Error('Conflicting Stripe checkout idempotency reference');
 }
 async receiveSignedWebhook({raw,header,secret,sandbox}){
  const result=verifyStripeWebhook(raw,header,secret);
  if(!result.valid)return {status:400,outcome:'invalid_signature'};
  const e=result.event;
  if(e.livemode===sandbox)return {status:400,outcome:'environment_mismatch'};
  const recognized=e.type==='checkout.session.completed'||e.type==='checkout.session.async_payment_succeeded';
  if(!recognized)return {status:200,outcome:'verified_other_event_requires_manual_reconciliation'};
  if(e.paymentStatus!=='paid')return {status:200,outcome:'no_capture_confirmed'};
  if(!SESSION.test(e.objectId)||!e.clientReferenceId||
     !['primary','general'].includes(e.election)||e.currency!=='usd'||
     !Number.isSafeInteger(e.amountTotal)||e.amountTotal<=0||
     !Number.isSafeInteger(e.created)||e.created<=0)return {status:422,outcome:'unmatched_payment'};
  const digest=createHash('sha256').update(raw).digest('hex');
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   const attempts=await c.query(
    'SELECT client_reference,election,amount_cents,livemode,payment_state FROM g28.stripe_checkout_intents WHERE session_id=$1 FOR UPDATE',
    [e.objectId]);
   const record=attempts.rows[0];
   if(!record||record.client_reference!==e.clientReferenceId||
       record.election!==e.election||Number(record.amount_cents)!==e.amountTotal||
       record.livemode!==e.livemode){
    await c.query('ROLLBACK');return {status:422,outcome:'unmatched_payment'};
   }
   const receipt=await c.query(
    'INSERT INTO g28.stripe_webhook_receipts(event_id,event_sha256,session_id,livemode,event_type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id) DO NOTHING RETURNING event_id',
    [e.id,digest,e.objectId,e.livemode,e.type]);
   if(!receipt.rowCount){
    const old=await c.query('SELECT event_sha256 FROM g28.stripe_webhook_receipts WHERE event_id=$1',[e.id]);
    if(old.rows[0]?.event_sha256!==digest)throw Error('Stripe webhook duplicate ID content mismatch');
    await c.query('COMMIT');return {status:200,outcome:'duplicate'};
   }
   if(record.payment_state!=='pending'){
    await c.query('COMMIT');return {status:200,outcome:'already_captured'};
   }
   await c.query(
    "UPDATE g28.stripe_checkout_intents SET payment_state='paid',confirmed_at=now() WHERE client_reference=$1",
    [e.clientReferenceId]);
   await c.query(
    "INSERT INTO g28.financial_provider_events(provider,event_id,payment_id,event_digest,event_kind,amount_cents,occurred_at) VALUES($1,$2,$3,$4,'captured',$5,$6) ON CONFLICT(provider,event_id) DO NOTHING",
    [sandbox?'stripe-test':'stripe',e.id,e.objectId,digest,e.amountTotal,new Date(e.created*1000)]);
   await c.query('COMMIT');
   return {status:200,outcome:'verified_captured_not_settled'};
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
 }
}
