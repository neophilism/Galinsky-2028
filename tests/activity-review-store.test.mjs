import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
import {PostgresStore,databasePool} from '../apps/api/src/postgres-store.mjs';
import {summarizePublishedModule} from '../packages/core/activity-summary.mjs';

const now=new Date('2026-10-18T18:00:00Z'),digest='d'.repeat(64);
const staff=(id,scope)=>({id,scopes:[scope],verified:true});
const editor=staff('fixture-editor','activity:edit'),v1=staff('fixture-verifier-a','activity:verify'),
 v2=staff('fixture-verifier-b','activity:verify'),publisher=staff('fixture-publisher','activity:publish');
const input=()=>({id:'synthetic-record',jurisdiction:'CT',election:'2028 General',
 activity:'Synthetic low-risk training',validFrom:'2026-10-18T16:00:00Z',validUntil:'2026-12-18T16:00:00Z',
 training:['practice'],approvedTools:['synthetic-sandbox'],sources:[
  {url:'https://example.org/current',checkedAt:'2026-10-18T12:00:00Z',digest}
 ]});
const rev=x=>({revision:x.revision,stateVersion:x.stateVersion});
async function scenario(store){
 const d=await store.createActivityReviewDraft(input(),editor,now);
 assert.equal(d.revision,1);
 await assert.rejects(store.createActivityReviewDraft(input(),editor,now),x=>x.code==='duplicate_activity_id');
 assert.equal((await store.getLatestActivityReview(d.id)).status,'draft');
 await assert.rejects(store.transitionActivityReview(d.id,{type:'publish'},publisher,rev(d),now),
  x=>x.code==='missing_review');
 const a=await store.transitionActivityReview(d.id,{type:'verify',evidenceDigest:digest},v1,rev(d),now);
 const b=await store.transitionActivityReview(d.id,{type:'verify',evidenceDigest:digest},v2,rev(a),now);
 await assert.rejects(store.transitionActivityReview(d.id,{type:'publish'},publisher,rev(a),now),
  x=>x.code==='stale_activity_edit');
 const p=await store.transitionActivityReview(d.id,{type:'publish'},publisher,rev(b),now);
 assert.equal(p.status,'published');
 assert.equal(summarizePublishedModule(p,now).activityAuthorized,false);
 const revoked=await store.transitionActivityReview(d.id,{type:'revoke',reason:'source_withdrawn'},publisher,rev(p),now);
 assert.equal(revoked.revision,2);
 assert.equal(revoked.status,'revoked');
 assert.equal(summarizePublishedModule(await store.getLatestActivityReview(d.id),now),null);
 await assert.rejects(store.transitionActivityReview(d.id,{type:'verify',evidenceDigest:digest},v1,rev(p),now),
  x=>x.code==='invalid_activity_state');
 const changed=await store.transitionActivityReview(d.id,{type:'revise',draft:{...input(),activity:'Revised synthetic orientation'}},editor,rev(revoked),now);
 assert.equal(changed.revision,3);
 assert.equal(changed.status,'draft');
 assert.equal(changed.verifiers.length,0);
 return changed;
}
test('development store persists complete review lifecycle without volunteer authorization',async()=>{
 const store=new MemoryStore();
 await scenario(store);
 assert.equal(store.activityReviewAudit.length,6);
 assert.equal((await store.getLatestActivityReview('synthetic-record')).revision,3);
});
test('PostgreSQL activity writes remain atomic and reject stale review races',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const url=process.env.TEST_DATABASE_URL;
 assert(['localhost','127.0.0.1'].includes(new URL(url).hostname),'Only isolated local Postgres is allowed.');
 const pool=databasePool(url),store=new PostgresStore(pool);
 const recordId='synthetic-record';
 try{
  await pool.query(await readFile('db/migrations/001_foundation.sql','utf8'));
  await pool.query('DELETE FROM g28.activity_modules WHERE id=$1',[recordId]);
  await scenario(store);
  const rows=await pool.query('SELECT revision,record FROM g28.activity_modules WHERE id=$1 ORDER BY revision',[recordId]);
  assert.deepEqual(rows.rows.map(x=>x.revision),[1,2,3]);
  assert.equal(rows.rows[0].record.status,'published');
  assert.equal(rows.rows[1].record.status,'revoked');
  assert.equal(rows.rows[2].record.status,'draft');
  assert.equal((await store.listPublishedActivityModules()).some(x=>x.id===recordId),false,
   'A newer revision must suppress older published state');
  // Each concurrent verifier arrives with the same state-version token.
  const draft=await store.getLatestActivityReview(recordId);
  const outcome=await Promise.allSettled([
   store.transitionActivityReview(recordId,{type:'verify',evidenceDigest:digest},v1,rev(draft),now),
   store.transitionActivityReview(recordId,{type:'verify',evidenceDigest:digest},v2,rev(draft),now)
  ]);
  assert.equal(outcome.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(outcome.filter(x=>x.status==='rejected'&&x.reason.code==='stale_activity_edit').length,1);
  const audit=await pool.query("SELECT action FROM g28.audit_events WHERE object_id=$1 AND action LIKE 'activity_%'",[recordId]);
  assert(audit.rowCount>=7);
 }finally{
  await pool.query('DELETE FROM g28.activity_modules WHERE id=$1',[recordId]);
  await pool.query("DELETE FROM g28.audit_events WHERE object_id=$1 AND action LIKE 'activity_%'",[recordId]);
  await store.close();
 }
});
