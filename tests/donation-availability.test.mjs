import test from 'node:test';
import assert from 'node:assert/strict';
import {probeHostedCheckout} from '../packages/core/donation-availability.mjs';
import {evaluateIncident} from '../packages/core/donation-rotation.mjs';
const url='https://merchant.example/secure/contribution';
const fake=(status,location)=>async()=>({status,headers:{get:k=>k==='location'?location:null}});
const observation=(signal,id,ago=0)=>({signal,attempt_ref:'probe-'+id,observed_at:new Date(Date.now()-ago)});
test('read-only checkout reachability is NOT verified payment acceptance',async()=>{
 const result=await probeHostedCheckout(url,{fetchImpl:fake(200)});
 assert.deepEqual(result,{signal:'checkout_reachable',code:'http_ok'});
 assert.equal(evaluateIncident([observation('gateway_error',3),observation('gateway_error',2),observation('checkout_reachable',1),observation('gateway_error',0)]).quarantine,true,'reachable page must not erase real gateway errors');
});
test('repeated unavailable pages cause an availability-specific quarantine',async()=>{
 assert.equal((await probeHostedCheckout(url,{fetchImpl:fake(503)})).signal,'checkout_unreachable');
 assert.equal((await probeHostedCheckout(url,{fetchImpl:fake(404)})).signal,'checkout_unreachable');
 assert.equal((await probeHostedCheckout(url,{fetchImpl:async()=>{throw Error('timeout');}})).signal,'checkout_unreachable');
 assert.deepEqual(evaluateIncident([observation('checkout_unreachable',3),observation('checkout_unreachable',2),observation('checkout_unreachable',1)]),{quarantine:true,reason:'repeated_checkout_outage'});
 assert.equal(evaluateIncident([observation('checkout_unreachable',3),observation('checkout_reachable',2),observation('checkout_unreachable',1)]).quarantine,false);
});
test('WAF denials, rate-limits and prohibited upstream redirects need human investigation',async()=>{
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(403)}),{signal:null,code:'http_inconclusive'});
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(429)}),{signal:null,code:'http_inconclusive'});
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(302,'https://checkout.stripe.com/session')}),{signal:null,code:'prohibited_upstream'});
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(302,'https://other-provider.example/campaign')}),{signal:null,code:'external_redirect_unverified'});
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(302,'http://merchant.example/insecure')}),{signal:null,code:'external_redirect_unverified'});
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(302,'/login')}),{signal:null,code:'same_origin_redirect_unverified'});
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(302)}),{signal:null,code:'redirect_without_destination'});
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(302,'https://bad host') }),{signal:null,code:'invalid_redirect'});
 assert.deepEqual(await probeHostedCheckout(url,{fetchImpl:fake(204)}),{signal:'checkout_reachable',code:'http_ok'});

 await assert.rejects(()=>probeHostedCheckout('https://checkout.stripe.com/pay'),/Invalid approved/);
});
