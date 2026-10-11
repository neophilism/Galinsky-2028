import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';
import {databasePool,PostgresStore} from '../../apps/api/src/postgres-store.mjs';
const url=process.env.TEST_DATABASE_URL;
test('Postgres persistence, atomic verification, leasing and deletion',{skip:!url},async t=>{
 assert(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Tests must use an isolated local database, never the assigned Neon production database.');
 const pool=databasePool(url),store=new PostgresStore(pool);await pool.query(await readFile('db/migrations/001_foundation.sql','utf8'));await pool.query(await readFile('db/migrations/002_self_reported_task_progress.sql','utf8'));await pool.query(await readFile('db/migrations/003_material_reading.sql','utf8'));await pool.query('TRUNCATE g28.accounts,g28.login_requests,g28.outbox,g28.rate_buckets,g28.materials CASCADE');
 try{
  await t.test('database readiness',async()=>assert(await store.healthy()));
  await t.test('durable login request and encrypted outbox',async()=>{await store.requestLogin({hash:'test-token',binding:'binding',emailKey:'fixture-email-key',deliveryEnvelope:'fixture-encrypted-envelope',marketing:false,termsVersion:'test',expires:Date.now()+100000},{id:randomUUID(),kind:'account_login',envelope:'fixture-outbox-envelope'});const row=await pool.query('SELECT count(*) FROM g28.outbox');assert.equal(Number(row.rows[0].count),1);});
  let account;
  await t.test('concurrent consume has exactly one winner',async()=>{const consume=i=>store.consumeLogin('test-token','binding',{hash:'session-'+i,csrf:'csrf',expires:Date.now()+100000});const results=await Promise.all([consume(1),consume(2)]);assert.equal(results.filter(Boolean).length,1);account=results.find(Boolean);});
  await t.test('concurrent job leases cannot duplicate delivery',async()=>{const results=await Promise.all([store.claimJob(),store.claimJob()]);assert.equal(results.filter(Boolean).length,1);const job=results.find(Boolean);await store.finishJob(job);const row=await pool.query('SELECT status,payload_envelope FROM g28.outbox WHERE id=$1',[job.id]);assert.equal(row.rows[0].status,'sent');assert.equal(row.rows[0].payload_envelope,'');});
  await t.test('rate buckets are shared and atomic',async()=>{const r=await Promise.all(Array.from({length:8},()=>store.rate('fixture-rate',4,Date.now()+10000)));assert.equal(r.filter(Boolean).length,4);});
  await t.test('task checklist is idempotent, per-account and cascades on closure',async()=>{
   await store.setTaskCompletion(account.id,'choose-role',true);
   await store.setTaskCompletion(account.id,'choose-role',true);
   assert.deepEqual(await store.listTaskCompletion(account.id),['choose-role']);
   await store.setTaskCompletion(account.id,'read-principle',true);
   assert.deepEqual(await store.listTaskCompletion(account.id),['choose-role','read-principle']);
   await store.setTaskCompletion(account.id,'read-principle',false);
   assert.deepEqual(await store.listTaskCompletion(account.id),['choose-role']);
  });
  await t.test('reading acknowledgments persist and bind exact publication revisions',async()=>{
   const ack={revision:1,contentSha256:'a'.repeat(64)};
   await store.setMaterialAck(account.id,'test-guide',ack);
   assert.deepEqual(await store.readMaterialAck(account.id,'test-guide'),{materialId:'test-guide',...ack});
   const revised={revision:2,contentSha256:'b'.repeat(64)};
   await store.setMaterialAck(account.id,'test-guide',revised);
   assert.deepEqual(await store.readMaterialAck(account.id,'test-guide'),{materialId:'test-guide',...revised});
   await store.setMaterialAck(account.id,'test-guide',null);
   assert.equal(await store.readMaterialAck(account.id,'test-guide'),null);
   await store.setMaterialAck(account.id,'test-guide',ack);
  });
  await t.test('account closure cascades to all sessions, checklist and reading history',async()=>{await store.closeAccount(account.id);assert.equal(await store.session('session-1'),null);assert.equal(await store.session('session-2'),null);assert.deepEqual(await store.listTaskCompletion(account.id),[]);assert.equal(await store.readMaterialAck(account.id,'test-guide'),null);});
 }finally{await store.close();}
});
