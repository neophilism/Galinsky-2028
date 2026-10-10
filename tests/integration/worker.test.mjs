import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {deliverLogin} from '../../apps/api/src/worker.mjs';import {sealDelivery} from '../../packages/core/auth.mjs';
const config={portalOrigin:'https://volunteer.example.test',deliveryKey:randomBytes(32).toString('base64'),mailKey:'fixture',mailFrom:'test@example.test'};
const job=p=>({id:'fixture-job',payload_envelope:sealDelivery(p,config.deliveryKey)});
test('expired mail does not contact the provider',async()=>assert.equal(await deliverLogin(job({expires:1}),config,()=>{throw Error('must not send')}),'expired'));
test('mail destination is bound to the configured portal',async()=>assert.equal(await deliverLogin(job({expires:Date.now()+1000,url:'https://evil.example/verify'}),config,()=>{throw Error('must not send')}),'invalid_destination'));
test('account email uses a stable idempotency key and the explicit recipient',async()=>{let sent;const result=await deliverLogin(job({expires:Date.now()+1000,url:config.portalOrigin+'/verify#token=fixture',email:'test@example.test'}),config,async(url,request)=>{sent={url,request};return {ok:true};});assert.equal(result,null);assert.equal(sent.request.headers['Idempotency-Key'],'g28-login-fixture-job');assert.deepEqual(JSON.parse(sent.request.body).to,['test@example.test']);});
