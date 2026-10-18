import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {databasePool} from '../../apps/api/src/postgres-store.mjs';
import {visitorReport} from '../../apps/api/src/visitor-report.mjs';
const url=process.env.TEST_DATABASE_URL;
test('anonymous visitor rows are idempotent and denied to ingest-only DB role',{skip:!url},async()=>{
 assert(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname));
 const pool=databasePool(url),one=randomUUID(),two=randomUUID();
 try{
  await pool.query(await readFile('db/migrations/001_foundation.sql','utf8'));
  await pool.query(await readFile('db/migrations/20261017_visitor_analytics.sql','utf8'));
  await pool.query(await readFile('db/migrations/20261018_visitor_interactions.sql','utf8'));
  const send=(id,page,action,seconds)=>pool.query('SELECT g28.ingest_page_visit($1::uuid,$2::text,$3::text,$4::integer)',[id,page,action,seconds]);
  await send(one,'/issues/','start',0);
  await send(one,'/issues/','pulse',20);
  await send(one,'/issues/','pulse',20);
  await send(two,'/donate/','start',0);
  await assert.rejects(send(randomUUID(),'/admin','start',0),e=>e.code==='22023');
  const report=await visitorReport({pool},'day');
  assert(report.pages.some(p=>p.path==='/issues/'&&p.views>=1));
  const rows=await pool.query('SELECT count(*)::integer AS n FROM g28.page_visits WHERE view_id=$1',[one]);
  assert.equal(rows.rows[0].n,1);
  const role='g28_visitor_test_'+randomUUID().replaceAll('-','');
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   await c.query('CREATE ROLE '+role+' NOLOGIN');
   await c.query('GRANT USAGE ON SCHEMA g28 TO '+role);
   await c.query('GRANT EXECUTE ON FUNCTION g28.ingest_page_visit(uuid,text,text,integer) TO '+role);
   await c.query('SET LOCAL ROLE '+role);
   await c.query("SELECT g28.ingest_page_visit($1::uuid,'/','start',0)",[randomUUID()]);
   await assert.rejects(c.query('SELECT * FROM g28.page_visits'),e=>e.code==='42501');
  }finally{await c.query('ROLLBACK');c.release();}
 }finally{await pool.query('DELETE FROM g28.page_visits WHERE view_id=$1 OR view_id=$2',[one,two]);await pool.end();}
});