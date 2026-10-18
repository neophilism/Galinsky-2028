import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {databasePool,PostgresStore} from '../../apps/api/src/postgres-store.mjs';

const url=process.env.TEST_DATABASE_URL;
test('Postgres structured-help queue isolates accounts, serializes concurrent creates and cascades on closure',{skip:!url},async()=>{
 assert(['127.0.0.1','localhost'].includes(new URL(url).hostname),
  'Use isolated local test PostgreSQL, never the assigned Neon service.');
 const pool=databasePool(url),store=new PostgresStore(pool);
 const people=[randomUUID(),randomUUID()];
 try{
  for(const f of ['001_foundation','014_volunteer_coordination','015_structured_help_requests'])
   await pool.query(await readFile('db/migrations/'+f+'.sql','utf8'));
  for(const person of people)
   await pool.query('INSERT INTO g28.accounts(id,email_key,delivery_envelope,verified_at,terms_version) VALUES($1,$2,$3,now(),$4)',
    [person,randomUUID(),'synthetic-encrypted-email','test']);
  const data={kind:'accessibility',area:'portal'};
  const calls=await Promise.allSettled(Array.from({length:6},()=>store.createHelpRequest(people[0],data)));
  const accepted=calls.filter(c=>c.status==='fulfilled');
  const denied=calls.filter(c=>c.status==='rejected');
  assert.equal(accepted.length,3,'The same account cannot submit more than three active cases under concurrent load.');
  assert.equal(denied.length,3);
  assert(denied.every(c=>c.reason?.code==='help_limit'));
  const other=await store.createHelpRequest(people[1],{kind:'account_correction',area:'account'});
  const first=accepted[0].value;
  assert.equal(first.status,'received');
  assert.equal((await store.listHelpRequests(people[0])).length,3);
  assert.deepEqual((await store.listHelpRequests(people[1])).map(x=>x.id),[other.id]);
  assert(!JSON.stringify(await store.listStaffHelpRequests()).includes(people[0]));
  await assert.rejects(store.changeHelpRequest(first.id,people[1],'withdraw','volunteer',people[1]),
   e=>e.code==='help_not_found');
  const acknowledged=await store.changeHelpRequest(first.id,null,'acknowledge','staff',people[1]);
  assert.equal(acknowledged.status,'acknowledged');
  await assert.rejects(store.changeHelpRequest(first.id,null,'withdraw','staff',people[1]),
   e=>e.code==='help_status_conflict');
  const resolved=await store.changeHelpRequest(first.id,null,'resolve','staff',people[1]);
  assert.equal(resolved.status,'resolved');
  await assert.rejects(store.changeHelpRequest(first.id,people[0],'withdraw','volunteer',people[0]),
   e=>e.code==='help_status_conflict');
  const withdrawal=await store.changeHelpRequest(accepted[1].value.id,people[0],'withdraw','volunteer',people[0]);
  assert.equal(withdrawal.status,'withdrawn');
  const replacement=await store.createHelpRequest(people[0],{kind:'privacy_question',area:'portal'});
  assert.equal(replacement.status,'received');
  assert((await pool.query('SELECT count(*) FROM g28.audit_events WHERE object_id=$1',[first.id])).rows[0].count==='2');
  await store.closeAccount(people[0]);
  assert.equal((await store.listHelpRequests(people[0])).length,0);
  assert.equal((await store.listHelpRequests(people[1])).length,1);
 }finally{
  await pool.query('DELETE FROM g28.accounts WHERE id=ANY($1::uuid[])',[people]);
  await store.close();
 }
});
