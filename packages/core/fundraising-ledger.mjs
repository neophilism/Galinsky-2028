import {createHash} from 'node:crypto';

// This is an internal reconciliation contract, NOT a payment processor.
// It cannot issue charges, make donor eligibility determinations, or clear
// election-specific contribution limits; those require treasurer review.
const EVENTS=new Set(['captured','partially_refunded','refunded','disputed']);
const SHA=/^[0-9a-f]{64}$/;
const ID=/^[a-zA-Z0-9_-]{1,128}$/;
const CENTS=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
export function reconcileProviderEvent(previous,event){
 if(!event||typeof event!=='object'||Array.isArray(event))throw Error('Invalid provider event');
 const keys=Object.keys(event).sort().join(',');
 if(keys!=='amountCents,currency,eventId,kind,occurredAt,provider,providerPaymentId,verified')throw Error('Unexpected or missing event fields');
 if(event.verified!==true)throw Error('Unsigned or unverified processor events cannot be posted');
 if(!ID.test(event.provider)||!ID.test(event.providerPaymentId)||!ID.test(event.eventId)||!EVENTS.has(event.kind))throw Error('Invalid processor reference or event type');
 if(event.currency!=='USD'||!CENTS(event.amountCents)||event.amountCents===0||!Number.isFinite(Date.parse(event.occurredAt)))throw Error('Invalid amount, currency or timestamp');
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(event.occurredAt))throw Error('Timestamp must use ISO UTC');
 const reference=event.provider+':'+event.providerPaymentId;
 const digest=createHash('sha256').update(JSON.stringify(event)).digest('hex');
 if(!SHA.test(digest))throw Error('Invalid event digest');
 const state=previous||{reference,capturedCents:0,refundedCents:0,disputed:false,seen:[]};
 if(state.reference!==reference||!CENTS(state.capturedCents)||!CENTS(state.refundedCents)||!Array.isArray(state.seen))throw Error('Ledger identity mismatch');
 const seen=state.seen.find(e=>e.eventId===event.eventId);
 if(seen){
  if(seen.digest!==digest)throw Error('Reused provider event ID with conflicting data');
  return {state,duplicate:true};
 }
 let captured=state.capturedCents,refunded=state.refundedCents,disputed=state.disputed;
 if(event.kind==='captured'){
   if(captured!==0||refunded!==0)throw Error('Second capture for one provider payment');
   captured=event.amountCents;
 }else{
   if(!captured)throw Error('Refund/dispute before capture requires manual reconciliation');
   if(event.kind==='disputed'){if(event.amountCents!==captured)throw Error('Dispute amount must match captured charge');disputed=true;}
   else{
     if(disputed)throw Error('Do not reconcile refunds while payment is disputed');
     if(event.amountCents>captured-refunded)throw Error('Refund exceeds remaining captured funds');
     refunded+=event.amountCents;
     if(event.kind==='refunded'&&refunded!==captured)throw Error('Full refund event does not balance');
     if(event.kind==='partially_refunded'&&refunded===captured)throw Error('Full refund requires refunded event');
   }
 }
 return {state:{reference,capturedCents:captured,refundedCents:refunded,disputed,seen:[...state.seen,{eventId:event.eventId,digest}]},duplicate:false};
}
export function netContributionCents(state){
 if(!state||state.disputed) return null;
 return state.capturedCents-state.refundedCents;
}
