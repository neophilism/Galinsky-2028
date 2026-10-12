import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {policyFilesFromTree,livePolicyIndex,livePolicyBytes,policyIndexHtml,policySources} from '../packages/core/live-policy-library.mjs';
import {createPrivatePreviewServer} from '../apps/web/private-preview.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const blob=(path,bytes)=>({type:'blob',path,size:bytes.length,sha:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')});
const txt=Buffer.from('This is an authored policy document, not enacted law.\n');
const good=blob('policy/legislation/Garden_Act_v1-0_2026-09-28.md',txt);
const first={sha:'a'.repeat(40),truncated:false,tree:[good,
 blob('policy/historical-research/Not-From-Nowhere_Resume-Here.md',txt),
 blob('policy/legislation/evil.html',txt),
 blob('policy/legislation/.env',txt),
 {...good,path:'policy/legislation/fake.pdf',size:20000000},
 {...good,path:'policy/legislation/trick/../../private.md'},
 ]};
const asResponse=json=>new Response(JSON.stringify(json),{status:200,headers:{'content-type':'application/json'}});
test('only intended authorized source files are listed, never the restricted Garden research archive',()=>{
 assert.deepEqual(policyFilesFromTree('garden',first.tree).map(x=>x.path),[good.path]);
 assert.deepEqual(policyFilesFromTree('cornerstone',[blob('policy/Federal_Cornerstone_Bill.docx',txt),blob('policy/historical-research/secrets.txt',txt)]).map(x=>x.path),['policy/Federal_Cornerstone_Bill.docx']);
 assert.equal(policySources().garden.ref,'docs/policy-research-source-library-20261012');
});
test('one-minute cache resolves current branch, not a hardcoded frozen document',async()=>{
 const url=[];
 const fake=async(req,options)=>{url.push({req,authorization:options.headers.Authorization});return asResponse(first);};
 const r=await livePolicyIndex('garden',{token:'read-token-not-logged-abcdefghijkl',fetchImpl:fake,now:12345,ttl:1000});
 assert.equal(r.files.length,1);
 assert.equal(r.treeSha,first.sha);
 const cached=await livePolicyIndex('garden',{token:'read-token-not-logged-abcdefghijkl',fetchImpl:fake,now:12355,ttl:1000});
 assert.deepEqual(cached,r);assert.equal(url.length,1);
 const again=await livePolicyIndex('garden',{token:'read-token-not-logged-abcdefghijkl',fetchImpl:fake,now:20000,ttl:1000});
 assert.equal(again.treeSha,first.sha);assert.equal(url.length,2);
 assert(url[0].req.includes('The-Garden/git/trees/docs%2Fpolicy-research-source-library-20261012'));
});
test('download verifies exact git blob digest and refuses other content, including old removed files',async()=>{
 const index={repo:'The-Garden',ref:'docs/policy-research-source-library-20261012',treeSha:first.sha,files:[{name:good.path.split('/').at(-1),size:txt.length,sha:good.sha,path:good.path}]};
 const result=await livePolicyBytes('garden',good.sha,{token:'read-token-not-logged-abcdefghijkl',index,fetchImpl:async()=>asResponse({encoding:'base64',size:txt.length,content:txt.toString('base64')})});
 assert.deepEqual(result.bytes,txt);
 assert.match(result.mime,/markdown/);
 await assert.rejects(()=>livePolicyBytes('garden','f'.repeat(40),{token:'read-token-not-logged-abcdefghijkl',index}),/no longer/);
 await assert.rejects(()=>livePolicyBytes('garden',good.sha,{token:'read-token-not-logged-abcdefghijkl',index,fetchImpl:async()=>asResponse({encoding:'base64',size:txt.length,content:Buffer.from('x'.repeat(txt.length)).toString('base64')})}),/temporarily unavailable/i);
});
test('fail closed on missing token, refused APIs, malicious tree and unknown issue',async()=>{
 await assert.rejects(()=>livePolicyIndex('garden',{}),/temporarily unavailable/i);
 await assert.rejects(()=>livePolicyIndex('other',{token:'safe-token-abcdefghijklmnopqrstuv'}),/Unknown policy issue/);
 await assert.rejects(()=>livePolicyIndex('cornerstone',{token:'safe-token-abcdefghijklmnopqrstuv',now:333333333,fetchImpl:async()=>new Response('unauthorized',{status:401})}),/temporarily unavailable/i);
 assert.throws(()=>policyFilesFromTree('garden','wrong'),/temporarily unavailable/i);
 const html=policyIndexHtml('garden',{repo:'The-Garden',ref:'main',treeSha:first.sha,files:[{...good,name:'<evil>.md'}]});
 assert(!html.includes('<evil>'));assert(html.includes('&lt;evil&gt;'));
});
test('private site never discloses private repo docs or token without password',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'g28-policies-'));
 await writeFile(join(dir,'index.html'),'<html>private</html>');
 const server=createPrivatePreviewServer({directory:dir,env:{PREVIEW_ACCESS_PASSWORD:'fixture-private-authorization-password-123456'}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+server.address().port;
 const denied=await fetch(base+'/policy-library/garden/');
 assert.equal(denied.status,401);
 assert.equal(denied.headers.get('www-authenticate')?.startsWith('Basic realm='),true);
 const auth='Basic '+Buffer.from('preview:fixture-private-authorization-password-123456').toString('base64');
 const missing=await fetch(base+'/policy-library/garden/',{headers:{authorization:auth}});
 assert.equal(missing.status,503);
 assert(!((await missing.text()).includes('github_pat_')));
 const fakePath=await fetch(base+'/policy-library/garden/download/f'.repeat(40),{headers:{authorization:auth}});
 assert.notEqual(fakePath.status,200);
});
