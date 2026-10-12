import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRotatingProvider,evaluateIncident} from '../packages/core/donation-rotation.mjs';
const routes=Array.from({length:4},(_,i)=>({id:'merchant-'+(i+1),url:'https://checkout-'+(i+1)+'.example/donate'}));
const states=(...ids)=>ids.map(id=>({provider_id:id,status:'active'}));
const event=(signal,attempt_ref,ago=0)=>({signal,attempt_ref,observed_at:new Date(Date.now()-ago)});
test('a donor has one route, uniformly addressable among all four active providers',()=>{
 const all=states(...routes.map(x=>x.id));
 for(let i=0;i<4;i++)assert.equal(selectRotatingProvider(routes,all,()=>i).id,routes[i].id);
 assert.equal(selectRotatingProvider(routes,[],()=>0),null);
 assert.throws(()=>selectRotatingProvider(routes.slice(0,3),all),/Exactly four/);
});
test('quarantined or excluded processors cannot be chosen even by injected index',()=>{
 const s=[{provider_id:'merchant-1',status:'quarantined'},{provider_id:'merchant-2',status:'active'},
  {provider_id:'merchant-3',status:'excluded'},{provider_id:'merchant-4',status:'active'}];
 assert.equal(selectRotatingProvider(routes,s,()=>0).id,'merchant-2');
 assert.equal(selectRotatingProvider(routes,s,()=>1).id,'merchant-4');
 assert.equal(selectRotatingProvider(routes,s.map(x=>({...x,status:'excluded'})),()=>0),null);
});
test('donor declines and abandoned checkouts never quarantine a processor',()=>{
 const events=[event('donor_decline','attempt-000003'),event('donor_cancelled','attempt-000002'),event('donor_decline','attempt-000001')];
 assert.equal(evaluateIncident(events).quarantine,false);
});
test('three separate systemic failures within ten minutes quarantine',()=>{
 const events=[event('gateway_timeout','attempt-000003'),event('processor_unavailable','attempt-000002',1000),
  event('gateway_error','attempt-000001',2000)];
 assert.deepEqual(evaluateIncident(events),{quarantine:true,reason:'repeated_systemic_failure'});
});
test('single transitory failure, duplicate attempt, prior recovery, stale events remain in rotation',()=>{
 assert.equal(evaluateIncident([event('gateway_error','attempt-000003')]).quarantine,false);
 assert.equal(evaluateIncident([event('gateway_error','same-attempt'),event('gateway_timeout','same-attempt'),event('gateway_error','same-attempt')]).quarantine,false);
 assert.equal(evaluateIncident([event('gateway_error','attempt-000003'),event('verified_success','attempt-000002'),event('gateway_error','attempt-000001')]).quarantine,false);
 assert.equal(evaluateIncident([event('gateway_error','attempt-000003'),event('gateway_error','attempt-000002',11*60000),event('gateway_error','attempt-000001',12*60000)]).quarantine,false);
});
test('actual access termination or account revocation quarantines immediately without declaring motive',()=>{
 assert.deepEqual(evaluateIncident([event('access_terminated','case-000001')]),{quarantine:true,reason:'hard_provider_denial'});
 assert.deepEqual(evaluateIncident([event('credentials_revoked','case-000002')]),{quarantine:true,reason:'hard_provider_denial'});
});
