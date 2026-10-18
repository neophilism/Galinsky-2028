import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PostgresStore,databasePool} from '../../apps/api/src/postgres-store.mjs';
import {prepareAccountNotice,queueAccountNotice} from '../../apps/api/src/mail-notices.mjs';
import {sealDelivery} from '../../packages/core/auth.mjs';
const url=process.env.TEST_DATABASE_URL;
test('Postgres callback/acceptance races preserve suppression, durable deduplication, current consent and lease receipts',{skip:!url},async()=>{
 assert(['localhost','127.0.0.1'].includes(new URL(url).hostname));
 const pool=databasePool(url),store=new PostgresStore(pool),id=randomUUID(),key='synthetic-mail-'+id;
 const config={deliveryKey:randomBytes(32).toString('base64')},envelope=sealDelivery({email:'synthetic@example.test'},config.deliveryKey),jobs=[];
 try{
  await pool.query(await readFile('db/migrations/001_foundation.sql','utf8'));await pool.query(await readFile('db/migrations/018_mail_delivery.sql','utf8'));
  await pool.query("INSERT INTO g28.accounts(id,email_key,delivery_envelope,verified_at,terms_version,marketing_consent) VALUES($1,$2,$3,now(),'synthetic',true)",[id,key,envelope]);
  const queued=await Promise.all(Array.from({length:5},()=>queueAccountNotice(store,config,id,'account_reminder','synthetic-reminder')));assert.equal(queued.filter(Boolean).length,1);
  const outbox=await pool.query('SELECT * FROM g28.outbox WHERE subject_key=$1',[key]);assert.equal(outbox.rowCount,1);jobs.push(outbox.rows[0].id);
  const j=outbox.rows[0];assert.equal(await store.deliveryAllowed(j),true);
  await pool.query('UPDATE g28.accounts SET marketing_consent=false WHERE id=$1',[id]);assert.equal(await store.deliveryAllowed(j),false);
  await pool.query('UPDATE g28.accounts SET marketing_consent=true WHERE id=$1',[id]);
  const providerId=randomUUID(),e={id:'msg_'+randomUUID(),providerId,type:'email.complained',suppress:true,digest:createHash('sha256').update('synthetic').digest('hex')};
  await Promise.all([store.recordMailAcceptance(j,providerId),store.recordMailEvent(e)]);
  assert.equal(await store.deliveryAllowed(j),false);
  const restarted=new PostgresStore(pool);assert.equal(await restarted.deliveryAllowed({...j,kind:'account_login'}),false);
  assert.equal((await restarted.recordMailEvent(e)).duplicate,true);
  await assert.rejects(restarted.recordMailEvent({...e,digest:'a'.repeat(64)}),x=>x.code==='mail_event_conflict');
  assert.equal((await pool.query('SELECT provider_email_id FROM g28.outbox WHERE id=$1',[j.id])).rows[0].provider_email_id,providerId);
  await pool.query('DELETE FROM g28.accounts WHERE id=$1',[id]);assert.equal((await pool.query('SELECT 1 FROM g28.account_notice_keys WHERE account_id=$1',[id])).rowCount,0);
  assert.equal((await pool.query('SELECT 1 FROM g28.mail_suppressions WHERE subject_key=$1',[key])).rowCount,1,'A complaint remains suppressed after account closure');
  // Preparing a notice never embeds private narrative or provider secrets.
  assert(!JSON.stringify(prepareAccountNotice({email_key:key,delivery_envelope:envelope},config,'account_security')).includes('synthetic@example.test'));
 }finally{
  await pool.query('DELETE FROM g28.mail_events WHERE provider_email_id=ANY(SELECT provider_email_id FROM g28.outbox WHERE id=ANY($1::uuid[]))',[jobs]);
  await pool.query('DELETE FROM g28.outbox WHERE subject_key=$1',[key]);
  await pool.query('DELETE FROM g28.accounts WHERE id=$1',[id]);await pool.query('DELETE FROM g28.mail_suppressions WHERE subject_key=$1',[key]);await store.close();
 }
});
