import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileProviderEvent,netContributionCents} from '../packages/core/fundraising-ledger.mjs';
let seq=0;
const evt=(kind,amountCents,extra={})=>({provider:'fixture-provider',providerPaymentId:'test-payment',eventId:'e_'+(++seq),kind,amountCents,currency:'USD',verified:true,occurredAt:'2026-10-11T01:00:00.000Z',...extra});
test('capture, partial refund and full refund balance in cents',()=>{
 const a=evt('captured',3500);
 let {state,duplicate}=reconcileProviderEvent(null,a);
 assert.equal(duplicate,false);assert.equal(netContributionCents(state),3500);
 assert.equal(reconcileProviderEvent(state,a).duplicate,true);
 state=reconcileProviderEvent(state,evt('partially_refunded',500)).state;
 assert.equal(netContributionCents(state),3000);
 state=reconcileProviderEvent(state,evt('refunded',3000)).state;
 assert.equal(netContributionCents(state),0);
});
test('reject chargeback-before-capture, double capture and excess refunds',()=>{
 assert.throws(()=>reconcileProviderEvent(null,evt('disputed',1000)));
 const state=reconcileProviderEvent(null,evt('captured',1000)).state;
 assert.throws(()=>reconcileProviderEvent(state,evt('captured',1000)));
 assert.throws(()=>reconcileProviderEvent(state,evt('refunded',1001)));
 assert.throws(()=>reconcileProviderEvent(state,evt('partially_refunded',1000)));
 assert.throws(()=>reconcileProviderEvent(state,evt('refunded',999)));
});
test('dispute prevents automatic net designation and refunds',()=>{
 const a=reconcileProviderEvent(null,evt('captured',2500)).state;
 const disputed=reconcileProviderEvent(a,evt('disputed',2500)).state;
 assert.equal(netContributionCents(disputed),null);
 assert.throws(()=>reconcileProviderEvent(disputed,evt('refunded',2500)));
});
test('reject unverified, malformed, non-USD and imprecise financial events',()=>{
 const bad=[
 {verified:false},{amountCents:1.5},{amountCents:-1},{currency:'EUR'},
 {eventId:'bad id'},{occurredAt:'not a date'},{providerPaymentId:'bad/id'},
 {amountCents:100000001},{somePII:'never store PII'}
 ];
 for(const change of bad)assert.throws(()=>reconcileProviderEvent(null,evt('captured',1000,change)),JSON.stringify(change));
});
test('reject cross-payment events and conflicting webhook replays',()=>{
 const first=evt('captured',300);const state=reconcileProviderEvent(null,first).state;
 assert.throws(()=>reconcileProviderEvent(state,{...first,amountCents:400}));
 assert.throws(()=>reconcileProviderEvent(state,evt('partially_refunded',100,{providerPaymentId:'another-payment'})));
});
