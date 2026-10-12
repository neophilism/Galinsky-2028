import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {loadConfig} from '../apps/api/src/config.mjs';
import {createApp} from '../apps/api/src/app.mjs';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
import {emailKey,openDelivery} from '../packages/core/auth.mjs';
import {treasuryVaultKey,cleanTreasuryPayload,sealTreasury,openTreasury} from '../packages/core/treasury-vault.mjs';

const vaultKey=randomBytes(32).toString('base64'),deliveryKey=randomBytes(32).toString('base64');
const config=loadConfig({
 G28_ADMIN_LOGIN_ENABLED:'true',G28_OWNER_ADMIN_EMAIL:'owner@example.test',
 G28_TREASURY_VAULT_KEY:vaultKey,DELIVERY_KEY:deliveryKey,
 LOGIN_PEPPER:'fixture-pepper-32-character-minimum-for-logins-2026',
 MAIL_PROVIDER:'resend',RESEND_API_KEY:'dev-fixture-only',MAIL_FROM:'login@example.test',
 SIGNUP_ENABLED:'false'
});
const originHeaders={origin:config.portalOrigin,'content-type':'application/json','sec-fetch-site':'same-origin'};
const bank={bankName:'Example Bank',accountName:'Official Campaign Committee',
 routingNumber:'021000021',accountNumber:'123456789123'};
test('vault is authenticated, slot-bound, never echoes secrets, and rejects invalid keys',()=>{
 const key=treasuryVaultKey(vaultKey);assert.equal(key.length,32);
 const sealed=sealTreasury('bank',bank,vaultKey);
 assert(!sealed.includes(bank.accountNumber));
 assert.deepEqual(openTreasury('bank',sealed,vaultKey),bank);
 assert.throws(()=>openTreasury('merchant-a',sealed,vaultKey),/integrity/i);
 assert.throws(()=>openTreasury('bank',sealed,randomBytes(32).toString('base64')),/integrity/i);
 assert.throws(()=>treasuryVaultKey('invalid'),/encryption/i);
});
test('validation rejects bad ABA checksums, card-like fields, and live merchant credentials',()=>{
 assert.equal(cleanTreasuryPayload('bank',bank).maskedLabel,'Example Bank ending 9123');
 assert.throws(()=>cleanTreasuryPayload('bank',{...bank,routingNumber:'123456789'}),/routing checksum/i);
 assert.throws(()=>cleanTreasuryPayload('bank',{...bank,cvv:'123'}),/Unsupported bank/i);
 assert.throws(()=>cleanTreasuryPayload('merchant-a',{mode:'production',merchantId:'acct_4',apiKey:'sandbox-secret-123456'}),/Only sandbox/i);
 assert.equal(cleanTreasuryPayload('merchant-b',{mode:'sandbox',merchantId:'acct_4',apiKey:'sandbox-secret-123456'}).value.mode,'sandbox');
});
async function login(app,store,address){
 const start=await app.inject({method:'POST',url:'/api/auth/request',headers:originHeaders,payload:{email:address,termsAccepted:true}});
 assert.equal(start.statusCode,202);
 const cookie=start.headers['set-cookie']?.split(';')[0];
 const job=store.outbox.at(-1);
 if(!cookie||!job)return null;
 const token=new URL(openDelivery(job.envelope,config.deliveryKey).url).hash.slice(7);
 const v=await app.inject({method:'POST',url:'/api/auth/verify',headers:{...originHeaders,cookie},payload:{token}});
 assert.equal(v.statusCode,200);
 const sessionCookie=v.headers['set-cookie'][0].split(';')[0];
 const session=await app.inject({url:'/api/session',headers:{cookie:sessionCookie}});
 assert.equal(session.statusCode,200);
 return {cookie:sessionCookie,csrf:session.json().csrf,role:session.json().account.role};
}
test('only verified owner or individually invited staff can access encrypted treasury; no real transactions',async()=>{
 const store=new MemoryStore(),app=createApp({store,config});
 try{
  const anonymous=await app.inject({url:'/api/admin/settings'});
  assert.equal(anonymous.statusCode,401);
  const outsider=await app.inject({method:'POST',url:'/api/auth/request',headers:originHeaders,
   payload:{email:'random@example.test',termsAccepted:true}});
  assert.equal(outsider.statusCode,202);assert.equal(store.outbox.length,0);
  const owner=await login(app,store,'owner@example.test');
  assert.equal(owner.role,'owner');
  const deniedCsrf=await app.inject({method:'POST',url:'/api/admin/settings/bank',headers:{...originHeaders,cookie:owner.cookie},payload:bank});
  assert.equal(deniedCsrf.statusCode,403);
  const h={...originHeaders,cookie:owner.cookie,'x-csrf-token':owner.csrf};
  const invalid=await app.inject({method:'POST',url:'/api/admin/settings/bank',headers:h,payload:{...bank,routingNumber:'000000000'}});
  assert.equal(invalid.statusCode,400);
  const save=await app.inject({method:'POST',url:'/api/admin/settings/bank',headers:h,payload:bank});
  assert.equal(save.statusCode,200);assert.equal(save.json().financialActivation,false);
  const raw=store.treasurySecretsStore.get('bank').envelope;
  assert(!raw.includes(bank.accountNumber));
  assert.deepEqual(openTreasury('bank',raw,vaultKey),bank);
  const status=await app.inject({url:'/api/admin/settings',headers:{cookie:owner.cookie}});
  assert.equal(status.statusCode,200);assert.equal(status.json().mode,'sandbox-only');
  assert.equal(status.json().bankConfigured,true);
  assert(!status.body.includes(bank.accountNumber));
  const prod=await app.inject({method:'POST',url:'/api/admin/settings/providers/merchant-a',
   headers:h,payload:{mode:'production',merchantId:'acct-owner',apiKey:'test-sandbox-long-secret'}});
  assert.equal(prod.statusCode,403);
  const sandbox=await app.inject({method:'POST',url:'/api/admin/settings/providers/merchant-a',
   headers:h,payload:{mode:'sandbox',merchantId:'acct-owner',apiKey:'test-sandbox-long-secret'}});
  assert.equal(sandbox.statusCode,200);
  assert.equal(store.treasurySecretsStore.size,2);
  const grant=await app.inject({method:'POST',url:'/api/admin/grants',headers:h,
   payload:{email:'staff@example.test',role:'auditor',label:'Audit desk'}});
  assert.equal(grant.statusCode,200);
  assert(!grant.body.includes('staff@example.test'));
  const auditor=await login(app,store,'staff@example.test');
  assert.equal(auditor.role,'auditor');
  const auditorH={...originHeaders,cookie:auditor.cookie,'x-csrf-token':auditor.csrf};
  assert.equal((await app.inject({url:'/api/admin/settings',headers:{cookie:auditor.cookie}})).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:'/api/admin/settings/bank',headers:auditorH,payload:bank})).statusCode,403);
  assert.equal((await app.inject({url:'/api/admin/grants',headers:{cookie:auditor.cookie}})).statusCode,403);
  const revoked=await app.inject({method:'POST',url:'/api/admin/grants/revoke',
   headers:h,payload:{reference:emailKey('staff@example.test',config.pepper).slice(0,12)}});
  assert.equal(revoked.statusCode,200);
  assert.equal((await app.inject({url:'/api/admin/settings',headers:{cookie:auditor.cookie}})).statusCode,403);
  assert.equal((await app.inject({method:'POST',url:'/api/admin/publish',headers:h,payload:{}})).statusCode,503);
  assert.equal((await app.inject({method:'POST',url:'/api/payments/checkout',headers:h,payload:{}})).statusCode,503);
 }finally{await app.close();}
});
test('existing volunteer registration remains disabled when treasury admin setup is off',async()=>{
 const normal=loadConfig({SIGNUP_ENABLED:'false'});
 const app=createApp({store:new MemoryStore(),config:normal});
 try{
  const r=await app.inject({method:'POST',url:'/api/auth/request',headers:{...originHeaders,origin:normal.portalOrigin},payload:{email:'any@example.test',termsAccepted:true}});
  assert.equal(r.statusCode,503);
  assert.equal((await app.inject({url:'/api/admin/settings'})).statusCode,503);
 }finally{await app.close();}
});
