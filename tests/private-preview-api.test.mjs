import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
import {loadConfig} from '../apps/api/src/config.mjs';
import {createApp} from '../apps/api/src/app.mjs';
import {PREVIEW_REALM} from '../packages/core/preview-gate.mjs';

const pass='fixture-high-entropy-private-password-123456789';
const valid='Basic '+Buffer.from('preview:'+pass).toString('base64');
const settings=()=>({NODE_ENV:'production',RENDER:'true',PUBLIC_ORIGIN:'https://public.example.test',PORTAL_ORIGIN:'https://portal.example.test',DATABASE_URL:'postgresql://invalid.test/unused',PREVIEW_ACCESS_PASSWORD:pass});

test('Render API refuses launch without password and production runtime',()=>{
 assert.throws(()=>loadConfig({...settings(),PREVIEW_ACCESS_PASSWORD:undefined}),/PREVIEW_ACCESS_PASSWORD/);
 assert.throws(()=>loadConfig({...settings(),NODE_ENV:'development'}),/NODE_ENV=production/);
 const c=loadConfig(settings());assert(c.previewGate);
 assert.throws(()=>createApp({store:new MemoryStore(),config:{...c,previewGate:null}}),/private preview password gate/);
});
test('portal password gate protects public endpoints, health, unavailable actions and app paths',async()=>{
 const store=new MemoryStore(),config=loadConfig(settings()),app=createApp({store,config});
 try{
  for(const url of ['/healthz','/readyz','/api/config','/api/roles','/api/materials','/api/admin/publish','/api/payments/checkout','/random.js']){
   const r=await app.inject({url});
   assert.equal(r.statusCode,401,url);
   assert.equal(r.headers['www-authenticate'],PREVIEW_REALM,url);
   assert.match(r.headers['x-robots-tag'],/noindex/);
   assert.equal((await app.inject({url,headers:{authorization:'Basic '+Buffer.from('preview:wrong').toString('base64')}})).statusCode,401,url);
  }
  const healthy=await app.inject({url:'/healthz',headers:{authorization:valid}});
  assert.equal(healthy.statusCode,200);
  const appCfg=await app.inject({url:'/api/config',headers:{authorization:valid}});
  assert.equal(appCfg.statusCode,200);
  assert.equal(appCfg.json().signupEnabled,false);
  assert.equal((await app.inject({url:'/api/materials',headers:{authorization:valid}})).statusCode,401,'Volunteer session remains required');
  assert.equal((await app.inject({url:'/api/admin/publish',headers:{authorization:valid}})).statusCode,503,'Admin remains unreleased');
  assert.equal((await app.inject({url:'/api/payments/checkout',headers:{authorization:valid}})).statusCode,503,'Payments remain unreleased');
  assert.equal(store.accounts.size,0);
  assert.equal(store.outbox.length,0);
 }finally{await app.close();}
});
test('private preview denies unauthenticated POST before reading any account body',async()=>{
 const store=new MemoryStore(),app=createApp({store,config:loadConfig(settings())});
 try{
  const reply=await app.inject({url:'/api/auth/request',method:'POST',headers:{'content-type':'application/json'},payload:{email:'should-never-be-stored@example.test',termsAccepted:true}});
  assert.equal(reply.statusCode,401);
  assert.equal(store.accounts.size,0);
  assert.equal(store.outbox.length,0);
 }finally{await app.close();}
});
