import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {databasePool} from '../../apps/api/src/postgres-store.mjs';
import {DonationRotationStore} from '../../apps/web/donation-rotation-store.mjs';
const url=process.env.TEST_DATABASE_URL;
test('real PostgreSQL rotation is durable, idempotent and quarantines only proven systemic failures',{skip:!url},async()=>{
 assert(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Do not run payment integration tests on production data');
 const pool=databasePool(url),store=new DonationRotationStore(pool);
 const routes=Array.from({length:4},(_,i)=>({id:'itest-rot-'+(i+1),url:'https://payment-'+(i+1)+'.example/donate'}));
 try{
  await pool.query(await readFile('db/migrations/001_foundation.sql','utf8'));
  await pool.query(await readFile('db/migrations/007_donation_rotation.sql','utf8'));
  await pool.query("DELETE FROM g28.donation_route_selections WHERE provider_id LIKE 'itest-rot-%'");
  await pool.query("DELETE FROM g28.donation_provider_observations WHERE provider_id LIKE 'itest-rot-%'");
  await pool.query("DELETE FROM g28.donation_provider_state WHERE provider_id LIKE 'itest-rot-%'");
  await store.bootstrap(routes);
  assert.equal(await store.selectRoute(routes),null,'unapproved/unverified activation must not take payments');
  for(const route of routes)await store.setStatus(route.id,'active','four independent merchant tests passed');
  for(let i=0;i<4;i++){
   const selection=await store.selectRoute(routes,()=>i);
   assert.equal(selection.providerId,routes[i].id);
   assert.match(selection.selectionId,/^[0-9a-f-]{36}$/);
  }
  const count=await pool.query("SELECT count(*)::int AS n FROM g28.donation_route_selections WHERE provider_id LIKE 'itest-rot-%'");
  assert.equal(count.rows[0].n,4);
  const id=routes[0].id;
  const benign=await Promise.all([
   store.observe(id,{eventId:'benign-000001',attemptRef:'attempt-b-000001',signal:'donor_decline'}),
   store.observe(id,{eventId:'benign-000001',attemptRef:'attempt-b-000001',signal:'donor_decline'})
  ]);
  assert.equal(benign.filter(x=>x.accepted).length,1,'replayed provider events may not increment health failure counters');
  assert.equal((await store.statuses()).find(x=>x.provider_id===id).status,'active');
  for(let i=1;i<=2;i++) {
   const r=await store.observe(id,{eventId:'system-00000'+i,attemptRef:'attempt-s-00000'+i,signal:'gateway_timeout'});
   assert.equal(r.status,'active','one-off and two transient faults do not block healthy payments');
  }
  const third=await store.observe(id,{eventId:'system-000003',attemptRef:'attempt-s-000003',signal:'gateway_error'});
  assert.equal(third.status,'quarantined');
  assert.equal(third.reason,'repeated_systemic_failure');
  const after=await Promise.all(Array.from({length:12},()=>store.selectRoute(routes)));
  assert(after.every(r=>r.providerId!==id),'even concurrent routing must exclude quarantined processor');
  const same=await store.observe(id,{eventId:'system-000003',attemptRef:'attempt-s-000003',signal:'gateway_error'});
  assert.equal(same.accepted,false);
  await store.setStatus(id,'active','verified gateway repair test 20261012');
  const clear=await store.observe(id,{eventId:'benign-000002',attemptRef:'attempt-b-000002',signal:'donor_decline'});
  assert.equal(clear.status,'active','old quarantined epoch errors may not re-quarantine after verified repair');
  const fatal=await store.observe(id,{eventId:'fatal-000001',attemptRef:'attempt-f-000001',signal:'access_terminated'});
  assert.equal(fatal.status,'quarantined','account termination must quarantine immediately');
  await store.setStatus(id,'excluded','documented owner reviewed provider denial');
  await assert.rejects(()=>store.setStatus(id,'active','operator should not undo exclusion'),/permanently excluded/);
  assert((await Promise.all(Array.from({length:9},()=>store.selectRoute(routes)))).every(x=>x.providerId!==id));
 }finally{await store.close();}
});
