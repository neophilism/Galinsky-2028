import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {loadConfig} from '../apps/api/src/config.mjs';
import {createApp} from '../apps/api/src/app.mjs';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
import {emailKey,openDelivery} from '../packages/core/auth.mjs';
const cfg=loadConfig({G28_ADMIN_LOGIN_ENABLED:'true',G28_OWNER_ADMIN_EMAIL:'owner@example.test',
 G28_TREASURY_VAULT_KEY:randomBytes(32).toString('base64'),DELIVERY_KEY:randomBytes(32).toString('base64'),
 LOGIN_PEPPER:'fixture-pepper-32-character-minimum-for-logins-2026',MAIL_PROVIDER:'resend',
 RESEND_API_KEY:'synthetic',MAIL_FROM:'login@example.test',SIGNUP_ENABLED:'false'});
const headers={origin:cfg.portalOrigin,'content-type':'application/json','sec-fetch-site':'same-origin'};
async function login(app,store,email){
 const started=await app.inject({method:'POST',url:'/api/auth/request',headers,payload:{email,termsAccepted:true}});
 const binding=started.headers['set-cookie'].split(';')[0];
 const token=new URL(openDelivery(store.outbox.at(-1).envelope,cfg.deliveryKey).url).hash.slice(7);
 const verified=await app.inject({method:'POST',url:'/api/auth/verify',headers:{...headers,cookie:binding},payload:{token}});
 return verified.headers['set-cookie'][0].split(';')[0];
}
test('only verified owner and active auditor can read aggregated visitor reports',async()=>{
 const store=new MemoryStore(),app=createApp({store,config:cfg});
 try{
  assert.equal((await app.inject({url:'/api/admin/visitors?range=day'})).statusCode,401);
  const owner=await login(app,store,'owner@example.test');
  const report=await app.inject({url:'/api/admin/visitors?range=day',headers:{cookie:owner}});
  assert.equal(report.statusCode,200,report.body);
  assert.equal(report.json().pages.length,8);
  assert(!report.body.includes('owner@example.test'));
  assert.equal((await app.inject({url:'/api/admin/visitors?range=bad',headers:{cookie:owner}})).statusCode,400);
  const treasurerKey=emailKey('treasurer@example.test',cfg.pepper);
  await store.setAdminGrant('synthetic',treasurerKey,'treasurer','Treasurer');
  const treasurer=await login(app,store,'treasurer@example.test');
  assert.equal((await app.inject({url:'/api/admin/visitors',headers:{cookie:treasurer}})).statusCode,403);
  const auditorKey=emailKey('auditor@example.test',cfg.pepper);
  await store.setAdminGrant('synthetic',auditorKey,'auditor','Auditor');
  const auditor=await login(app,store,'auditor@example.test');
  assert.equal((await app.inject({url:'/api/admin/visitors',headers:{cookie:auditor}})).statusCode,200);
  await store.revokeAdminGrant('synthetic',auditorKey.slice(0,12));
  assert.equal((await app.inject({url:'/api/admin/visitors',headers:{cookie:auditor}})).statusCode,403);
 }finally{await app.close();}
});