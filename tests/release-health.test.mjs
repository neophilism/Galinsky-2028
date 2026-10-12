
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {safeReleaseCommit} from '../packages/core/release-id.mjs';
import {createPrivatePreviewServer} from '../apps/web/private-preview.mjs';
import {createApp} from '../apps/api/src/app.mjs';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
import {loadConfig} from '../apps/api/src/config.mjs';

const password='deployment-health-test-password-strong-12345';
const auth='Basic '+Buffer.from('preview:'+password).toString('base64');

test('commit identity accepts only a full safe Git SHA, never arbitrary secrets',()=>{
 assert.equal(safeReleaseCommit('ABCDEF0123456789'.repeat(2)+'ABCDEF01'),'abcdef0123456789'.repeat(2)+'abcdef01');
 for(const bad of ['','abc','x'.repeat(40),'a'.repeat(41),'a'.repeat(40)+'\n',null,{},undefined])
  assert.equal(safeReleaseCommit(bad),null);
});
test('the private preview health endpoint requires authentication before revealing its revision',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'g28-health-'));
 await writeFile(join(directory,'index.html'),'<html>private</html>');
 const env={PREVIEW_ACCESS_PASSWORD:password,RENDER_GIT_COMMIT:'a'.repeat(40),G28_PUBLIC_MODE:'preview'};
 const server=createPrivatePreviewServer({directory,env});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});
 const url='http://127.0.0.1:'+server.address().port+'/healthz';
 const denied=await fetch(url);
 assert.equal(denied.status,401);
 assert(!((await denied.text()).includes('a'.repeat(40))));
 const accepted=await fetch(url,{headers:{Authorization:auth}});
 assert.equal(accepted.status,200);
 assert.deepEqual(await accepted.json(),{ok:true,service:'galinsky-2028-web',mode:'preview',commit:'a'.repeat(40)});
 assert.match(accepted.headers.get('cache-control'),/no-store/);
 assert.match(accepted.headers.get('x-robots-tag'),/noindex/);
 const head=await fetch(url,{method:'HEAD',headers:{Authorization:auth}});
 assert.equal(head.status,200);assert.equal(await head.text(),'');
 const post=await fetch(url,{method:'POST',headers:{Authorization:auth}});
 assert.equal(post.status,405);
});
test('volunteer API health returns the same validated Git SHA behind the existing API boundary',async()=>{
 const config=loadConfig({RENDER_GIT_COMMIT:'b'.repeat(40)});
 const app=createApp({store:new MemoryStore(),config});
 try{
  const health=await app.inject({method:'GET',url:'/healthz'});
  assert.equal(health.statusCode,200);
  assert.deepEqual(health.json(),{ok:true,service:'galinsky-2028-api',version:'0.1.0',commit:'b'.repeat(40)});
  assert.equal(loadConfig({RENDER_GIT_COMMIT:'not-a-git-sha'}).commit,null);
 }finally{await app.close();}
});
