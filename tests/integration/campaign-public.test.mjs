import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderPage} from '../../scripts/public-renderer.mjs';
import {startCampaignPublicHarness} from '../browser/campaign-public-server.mjs';
test('published HTTP rendering runs only after existing preview authentication',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'g28-public-'));
 const h=await startCampaignPublicHarness({directory,readTemplate:async(path,key)=>renderPage(key)});
 const headers={authorization:'Basic '+Buffer.from('preview:'+h.password).toString('base64')};
 try{
  for(const path of ['/','/assets/campaign-mode.js','/campaign-media/00000000-0000-4000-8000-000000000009.png'])assert.equal((await fetch(h.origin+path)).status,401);
  assert.equal(h.reads(),0);
  const response=await fetch(h.origin+'/?appearance=night',{headers});assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('<title>Synthetic night title</title>'));assert.ok(!html.includes('Synthetic example'));assert.match(response.headers.get('cache-control'),/private, no-store/);
  assert.equal((await fetch(h.origin+'/',{headers,method:'POST'})).status,405);
  const head=await fetch(h.origin+'/',{headers,method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await fetch(h.origin+'/api/editorial/campaigns',{headers})).status,404);
  const missing=await fetch(h.origin+'/campaign-media/00000000-0000-4000-8000-000000000009.png',{headers});assert.equal(missing.status,404);
  h.fail(Object.assign(Error('transient'),{code:'ECONNRESET'}));const stale=await fetch(h.origin+'/?appearance=night',{headers});assert.equal(stale.status,200);assert.equal(stale.headers.get('x-campaign-snapshot'),'last-known-good');
  h.fail(Object.assign(Error('privilege details must stay private'),{code:'42501'}));const failed=await fetch(h.origin+'/?appearance=night',{headers});assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('privilege'));
 }finally{await h.close();await rm(directory,{recursive:true,force:true});}
});
