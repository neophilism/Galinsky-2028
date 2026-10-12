import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {loadConfig} from '../apps/api/src/config.mjs';

const ready=()=>({
 NODE_ENV:'production',RENDER:'true',
 PREVIEW_ACCESS_PASSWORD:'example-private-preview-passphrase-456789',
 PUBLIC_ORIGIN:'https://public.example.test',PORTAL_ORIGIN:'https://portal.example.test',
 DATABASE_URL:'postgresql://unreachable.example.test/fixture',
 MAIL_PROVIDER:'resend',RESEND_API_KEY:'fixture-server-only-test-secret',
 MAIL_FROM:'campaign@example.test',SIGNUP_ENABLED:'true',
 DELIVERY_KEY:randomBytes(32).toString('base64'),
 LOGIN_PEPPER:'fixture-long-lookup-pepper-longer-than-32-bytes'
});
test('production account signup refuses to open without operational mail worker mode',()=>{
 const cfg=ready();
 assert.throws(()=>loadConfig(cfg),/cannot open without a configured, operational mail delivery worker/);
 assert.throws(()=>loadConfig({...cfg,MAIL_DELIVERY_MODE:'external'}),/operational mail delivery worker/);
 assert.throws(()=>loadConfig({...cfg,MAIL_DELIVERY_MODE:'unspecified'}),/Select disabled, inline or external/);
});
test('inline mode uses the same service and requires actual configured sender secrets',()=>{
 const cfg=ready();cfg.MAIL_DELIVERY_MODE='inline';
 const c=loadConfig(cfg);
 assert.equal(c.signup,true);
 assert.equal(c.mailReady,true);
 assert.equal(c.mailDeliveryMode,'inline');
 assert.throws(()=>loadConfig({...cfg,MAIL_FROM:undefined}),/configuration are incomplete/);
 assert.throws(()=>loadConfig({...cfg,RESEND_API_KEY:undefined}),/configuration are incomplete/);
});
test('separate external worker is accepted only after operator has approved its operation',()=>{
 const cfg=ready();cfg.MAIL_DELIVERY_MODE='external';cfg.MAIL_WORKER_OPERATIONAL_APPROVED='true';
 assert.equal(loadConfig(cfg).mailDeliveryMode,'external');
 assert.throws(()=>loadConfig({...cfg,MAIL_WORKER_OPERATIONAL_APPROVED:'false'}),/operational mail delivery worker/);
});
test('unopened accounts and authenticated private preview remain safe with default mail mode disabled',()=>{
 const cfg=ready();cfg.SIGNUP_ENABLED='false';
 const c=loadConfig(cfg);
 assert.equal(c.signup,false);
 assert.equal(c.mailDeliveryMode,'disabled');
});
