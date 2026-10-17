import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseVisitorEvent,VISITOR_PAGES,visitorRange} from '../packages/core/visitor-analytics.mjs';
import {createPrivatePreviewServer} from '../apps/web/private-preview.mjs';
import {visitorReport} from '../apps/api/src/visitor-report.mjs';
import {renderPage} from '../scripts/public-renderer.mjs';
test('events accept only allowed anonymous page metrics',()=>{
 const good={action:'pulse',path:'/issues/garden/',viewId:randomUUID(),seconds:22};
 assert.deepEqual(parseVisitorEvent(good),good);assert.equal(VISITOR_PAGES.length,8);
 for(const bad of [{...good,path:'/api/admin/grants'},{...good,seconds:14401},{...good,seconds:-1},{...good,viewId:'id'}, {...good,email:'private'},{...good,action:'identify'}])assert.throws(()=>parseVisitorEvent(bad));
 assert.equal(visitorRange('month'),'month');assert.throws(()=>visitorRange('all'));
});
test('public templates contain first-party visitor script',()=>{
 for(const key of ['index','issues','kirk-evers','garden','cornerstone','volunteer','donate','notices'])
  assert(renderPage(key).includes('/assets/visitor-analytics.js'));
});
test('development reporting does not claim live data',async()=>{
 const result=await visitorReport({},'day');assert.equal(result.source,'synthetic_memory_store');assert.equal(result.totals.views,0);
});
test('collection is behind preview gate and enforces origin and strict body',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'g28-visitors-'));
 await mkdir(join(dir,'assets'));await writeFile(join(dir,'index.html'),'<html>Private</html>');
 const events=[],password='fixture-very-long-and-random-looking-passphrase-98765',authorization='Basic '+Buffer.from('preview:'+password).toString('base64');
 const server=createPrivatePreviewServer({directory:dir,env:{PREVIEW_ACCESS_PASSWORD:password,G28_VISITOR_ANALYTICS_ENABLED:'true',G28_VISITOR_ANALYTICS_ORIGIN:'http://127.0.0.1:7777'},analyticsStore:{async ingest(e){events.push(e);}}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
 const url='http://127.0.0.1:'+server.address().port+'/api/visitor-analytics';
 const valid={action:'start',path:'/',viewId:randomUUID(),seconds:0};
 const post=(headers,value=valid)=>fetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(value)});
 assert.equal((await post({origin:'http://127.0.0.1:7777'})).status,401);
 assert.equal((await post({origin:'https://evil.test',authorization})).status,403);
 assert.equal((await post({origin:'http://127.0.0.1:7777',authorization},{...valid,email:'secret'})).status,400);
 assert.equal((await post({origin:'http://127.0.0.1:7777',authorization})).status,204);
 assert.deepEqual(events,[valid]);
});
