import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadPreviewGate,previewAuthorized,PREVIEW_REALM} from '../packages/core/preview-gate.mjs';
import {createPrivatePreviewServer} from '../apps/web/private-preview.mjs';

const password='fixture-very-long-and-random-looking-passphrase-98765';
const header=(pass=password,user='preview')=>'Basic '+Buffer.from(user+':'+pass).toString('base64');

test('password must be explicitly provided, suitably long and never defaults open',()=>{
 assert.throws(()=>loadPreviewGate({}),/PREVIEW_ACCESS_PASSWORD/);
 assert.throws(()=>loadPreviewGate({PREVIEW_ACCESS_PASSWORD:'short'}));
 assert.throws(()=>loadPreviewGate({PREVIEW_ACCESS_PASSWORD:'long-enough-but-has-a-newline\n'}));
 const creds=loadPreviewGate({PREVIEW_ACCESS_PASSWORD:password});
 assert.equal(previewAuthorized(header(),creds),true);
 for(const other of [undefined,'','Bearer x','Basic !!!',header('wrong'),header(password,'someone-else')])
  assert.equal(previewAuthorized(other,creds),false);
 assert.equal(PREVIEW_REALM.includes('Basic realm='),true);
});
test('the private preview server protects all pages, images, styles and direct links',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'g28-private-'));
 await mkdir(join(directory,'assets'));await mkdir(join(directory,'issues'));await mkdir(join(directory,'issues','garden'));
 await writeFile(join(directory,'index.html'),'<html>Campaign private home</html>');
 await writeFile(join(directory,'assets','secret.css'),'.secret{display:block}');
 const videoBytes=Buffer.from(Array.from({length:256},(_,i)=>i));
 await writeFile(join(directory,'assets','issue-video-placeholder.mp4'),videoBytes);
 await writeFile(join(directory,'issues','garden','index.html'),'<html>Garden private policy</html>');
 await writeFile(join(directory,'.env'),'SHOULD_NEVER_BE_SERVED');
 const server=createPrivatePreviewServer({directory,env:{PREVIEW_ACCESS_PASSWORD:password}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+server.address().port;
 for(const path of ['/','/index.html','/issues/garden/','/assets/secret.css','/.env','/robots.txt','/does-not-exist','/%2e%2e/.env']){
  const missing=await fetch(base+path);
  assert.equal(missing.status,401,path);
  assert.equal(missing.headers.get('www-authenticate'),PREVIEW_REALM);
  assert.match(missing.headers.get('x-robots-tag'),/noindex/);
  assert.match(missing.headers.get('cache-control'),/no-store/);
  assert.ok(!(await missing.text()).includes('private home'));
  const wrong=await fetch(base+path,{headers:{Authorization:header('incorrect')}});
  assert.equal(wrong.status,401,path);
 }
 for(const [path,text] of [['/','Campaign private home'],['/index.html','Campaign private home'],['/issues/garden/','Garden private policy'],['/assets/secret.css','.secret{']]){
  const ok=await fetch(base+path,{headers:{Authorization:header()}});
  assert.equal(ok.status,200,path);
  assert.ok((await ok.text()).includes(text),path);
  assert.match(ok.headers.get('x-robots-tag'),/noindex/);
 }
 // MP4 playback is private too; byte-range requests work for video seeking.
 const unauthorizedRange=await fetch(base+'/assets/issue-video-placeholder.mp4',{headers:{Range:'bytes=0-10'}});
 assert.equal(unauthorizedRange.status,401,'Byte ranges must not bypass authentication');
 const full=await fetch(base+'/assets/issue-video-placeholder.mp4',{headers:{Authorization:header()}});
 assert.equal(full.status,200);
 assert.equal(full.headers.get('content-type'),'video/mp4');
 assert.equal(full.headers.get('accept-ranges'),'bytes');
 assert.equal((await full.arrayBuffer()).byteLength,256);
 const range=await fetch(base+'/assets/issue-video-placeholder.mp4',{headers:{Authorization:header(),Range:'bytes=25-44'}});
 assert.equal(range.status,206);
 assert.equal(range.headers.get('content-range'),'bytes 25-44/256');
 assert.equal((await range.arrayBuffer()).byteLength,20);
 const suffix=await fetch(base+'/assets/issue-video-placeholder.mp4',{headers:{Authorization:header(),Range:'bytes=-5'}});
 assert.equal(suffix.status,206);
 assert.equal(suffix.headers.get('content-range'),'bytes 251-255/256');
 for(const badRange of ['bytes=1000-','bytes=1-0','bytes=0-1,3-4','bytes=-0']){
  const bad=await fetch(base+'/assets/issue-video-placeholder.mp4',{headers:{Authorization:header(),Range:badRange}});
  assert.equal(bad.status,416,'Malformed and unsatisfiable ranges must fail closed: '+badRange);
 }
 const denied=await fetch(base+'/.env',{headers:{Authorization:header()}});
 assert.equal(denied.status,404);
 const post=await fetch(base+'/',{method:'POST',headers:{Authorization:header()}});
 assert.equal(post.status,405);
 const head=await fetch(base+'/assets/secret.css',{method:'HEAD',headers:{Authorization:header()}});
 assert.equal(head.status,200);
 assert.equal(await head.text(),'');
});
