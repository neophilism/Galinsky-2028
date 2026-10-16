import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {databasePool} from '../../apps/api/src/postgres-store.mjs';
import {CampaignStore,CampaignPublicStore} from '../../apps/api/src/campaign-store.mjs';
import {fixture} from '../campaign-fixture.mjs';
import {HERO_EFFECT_DEFAULT} from '../../packages/core/campaign-content.mjs';
const url=process.env.TEST_DATABASE_URL;
test('campaign persistence, atomic lifecycle and published-only SQL views',{skip:!url},async t=>{
 assert(['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname),'Only isolated local PostgreSQL is allowed.');
 const pool=databasePool(url),by='synthetic-campaign-editor',store=new CampaignStore(pool,{verifyStaticAsset:async path=>path==='/assets/test.webp'}),publicStore=new CampaignPublicStore(pool);
 try{
  await pool.query(await readFile('db/migrations/001_foundation.sql','utf8'));
  await pool.query(await readFile('db/migrations/20261016_campaign_public_views.sql','utf8'));
  await pool.query(await readFile('db/migrations/20261016_hero_effect_projection.sql','utf8'));

  await pool.query('DELETE FROM g28.content_revisions WHERE author_subject=$1',[by]);
  let first,second;
  await t.test('create and reload survives a store instance restart',async()=>{first=await store.create(fixture(),by);assert.deepEqual((await new CampaignStore(pool).get(first.id)).document,fixture());});
  await t.test('arbitrary independent campaigns and pagination',async()=>{second=await store.duplicate(first.id,1,'Synthetic second',by);await store.create({...fixture(),internalName:'Synthetic third'},by);await store.create({...fixture(),internalName:'Synthetic fourth'},by);const page=await store.list({limit:2,search:'Synthetic'});assert.equal(page.items.length,2);assert.ok(page.next);const next=await store.list({limit:2,after:page.next,search:'Synthetic'});assert.equal(next.items.length,2);assert.ok(!next.items.some(x=>page.items.some(y=>x.id===y.id)));});
  await t.test('unpublished selections rejected without a settings write',async()=>{await assert.rejects(store.saveSettings(0,{schemaVersion:1,modeSwitching:false,default:{campaignId:first.id,revision:1},day:null,night:null},by),e=>e.code==='unpublished_selection');assert.equal((await store.settings()).version,0);});
  await t.test('publishing omits labels and supports identical mode assignments',async()=>{await store.publish(first.id,1,by);const selection={campaignId:first.id,revision:1};await store.saveSettings(0,{schemaVersion:1,modeSwitching:true,default:selection,day:selection,night:selection},by);const snapshot=await publicStore.snapshot({preference:'night'});assert.equal(snapshot.selection.mode,'night');assert.ok(!JSON.stringify(snapshot).includes('Synthetic example'));});
  await t.test('two concurrent editors have one winner and no silent overwrite',async()=>{const a=fixture(),b=fixture();a.fields['home.hero.body']='First edit';b.fields['home.hero.body']='Second edit';const outcomes=await Promise.allSettled([store.save(first.id,1,a,by),store.save(first.id,1,b,by)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'revision_conflict');assert.equal((await store.get(first.id)).revision,2);assert.equal((await publicStore.snapshot()).selection.revision,1);});
  await t.test('publication updates selected slots atomically but preserves old revision',async()=>{await store.publish(first.id,2,by);const s=await store.settings();assert.equal(s.version,2);assert.equal(s.settings.day.revision,2);assert.equal(s.settings.night.revision,2);assert.equal((await publicStore.snapshot()).selection.revision,2);assert.equal((await store.get(first.id,{revision:1})).document.fields['home.hero.body'],'Synthetic text');});
  await t.test('publication retry idempotent and stale settings return conflict',async()=>{assert.equal((await store.publish(first.id,2,by)).alreadyPublished,true);assert.equal((await store.settings()).version,2);await assert.rejects(store.saveSettings(1,(await store.settings()).settings,by),e=>e.code==='revision_conflict');});
  await t.test('active archive prevented; inactive archive and stale lifecycle checked',async()=>{await assert.rejects(store.setArchived(first.id,2,0,true,by),e=>e.code==='campaign_in_use');await store.setArchived(second.id,1,0,true,by);await assert.rejects(store.save(second.id,1,fixture(),by),e=>e.code==='campaign_archived');await assert.rejects(store.setArchived(second.id,1,0,false,by),e=>e.code==='revision_conflict');await store.setArchived(second.id,1,1,false,by);});
  await t.test('restore appends a draft and never changes the live release',async()=>{const restored=await store.restore(first.id,2,1,by);assert.equal(restored.revision,3);assert.equal(restored.document.fields['home.hero.body'],'Synthetic text');assert.equal((await publicStore.snapshot()).selection.revision,2);assert.equal((await store.history(first.id)).items.length,3);});
  await t.test('hero appearance effects remain immutable in the published-only SQL projection',async()=>{
   const original=fixture();original.heroBackground={
    default:{...HERO_EFFECT_DEFAULT,preset:'clouds'},
    day:{...HERO_EFFECT_DEFAULT,preset:'halo',speed:'medium'},
    night:{...HERO_EFFECT_DEFAULT,preset:'beams',animated:false}
   };
   const created=await store.create(original,by);
   assert.deepEqual((await store.get(created.id)).document.heroBackground,original.heroBackground);
   await store.publish(created.id,1,by);
   const rows=await pool.query('SELECT document FROM g28.campaign_public_releases WHERE campaign_id=$1 AND revision=1',[created.id]);
   assert.equal(rows.rows.length,1);
   assert.deepEqual(rows.rows[0].document.heroBackground,original.heroBackground);
   assert.equal(Object.hasOwn(rows.rows[0].document,'internalName'),false);
   const edited=structuredClone(original);edited.heroBackground.day.preset='geometry';
   await store.save(created.id,1,edited,by);
   const frozen=await pool.query('SELECT document FROM g28.campaign_public_releases WHERE campaign_id=$1 AND revision=1',[created.id]);
   assert.equal(frozen.rows[0].document.heroBackground.day.preset,'halo');
  });
  await t.test('missing media prevents publication with transaction rollback',async()=>{const doc=fixture();doc.hero.assetPath='/assets/missing.png';const x=await store.create(doc,by);await assert.rejects(store.publish(x.id,1,by),e=>e.code==='asset_unavailable');assert.equal((await store.get(x.id)).publishedRevision,null);});
  await t.test('public SQL role can read views but not editorial records',async()=>{const client=await pool.connect();const role='campaign_test_'+randomUUID().replaceAll('-','');try{await client.query('BEGIN');await client.query(`CREATE ROLE ${role} NOLOGIN`);await client.query(`GRANT USAGE ON SCHEMA g28 TO ${role}`);await client.query(`GRANT SELECT ON g28.campaign_public_releases,g28.campaign_public_settings,g28.campaign_public_media TO ${role}`);await client.query(`SET LOCAL ROLE ${role}`);assert.ok((await client.query('SELECT document FROM g28.campaign_public_releases')).rows.length);await assert.rejects(client.query('SELECT record FROM g28.content_revisions'),e=>e.code==='42501');}finally{await client.query('ROLLBACK');client.release();}});
 }finally{await pool.query('DELETE FROM g28.content_revisions WHERE author_subject=$1',[by]);await pool.end();}
});
