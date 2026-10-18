import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PostgresStore,databasePool} from '../../apps/api/src/postgres-store.mjs';
const url=process.env.TEST_DATABASE_URL;
test('staff passkey state survives restarts, serializes competing device edits and revokes all device-bound step-up sessions',{skip:!url},async()=>{
 assert(['localhost','127.0.0.1'].includes(new URL(url).hostname));
 const pool=databasePool(url),store=new PostgresStore(pool),id=randomUUID(),now=Date.now();
 try{
  await pool.query(await readFile('db/migrations/001_foundation.sql','utf8'));
  await pool.query(await readFile('db/migrations/016_staff_passkeys.sql','utf8'));
  await pool.query(`INSERT INTO g28.accounts(id,email_key,delivery_envelope,verified_at,terms_version) VALUES($1,$2,'synthetic',now(),'fixture')`,[id,'staff-fixture-'+id]);
  await store.withStaffSecurity(id,s=>{s.credentials=[{id:'synthetic-device'}];s.sessions={one:{credentialId:'synthetic-device',expires:now+10000},two:{credentialId:'synthetic-device',expires:now+10000}};});
  const restarted=new PostgresStore(pool);
  assert.equal(await restarted.staffMfaValid(id,'one',now),true);
  assert.equal(await restarted.staffMfaValid(id,'other',now),false);
  assert.equal(await restarted.staffMfaValid(id,'one',now+20000),false);
  const count=await Promise.all(Array.from({length:8},()=>store.withStaffSecurity(id,s=>{s.count=(s.count||0)+1;return s.count;})));
  assert.deepEqual(count.sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);
  await store.withStaffSecurity(id,s=>{s.credentials=[];});
  assert.equal(await restarted.staffMfaValid(id,'one',now),false);
  assert.equal(await restarted.staffMfaValid(id,'two',now),false);
  await pool.query('DELETE FROM g28.accounts WHERE id=$1',[id]);
  await assert.rejects(store.withStaffSecurity(id,()=>true),e=>e.code==='authentication_required');
  assert.equal((await pool.query('SELECT 1 FROM g28.staff_security WHERE account_id=$1',[id])).rowCount,0);
 }finally{await pool.query('DELETE FROM g28.accounts WHERE id=$1',[id]);await store.close();}
});
