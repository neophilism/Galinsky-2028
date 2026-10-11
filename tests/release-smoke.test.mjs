import test from 'node:test';import assert from 'node:assert/strict';
import {smokePublic,smokePortal,validateHtml,args} from '../scripts/smoke-release.mjs';
import {renderPage,pages} from '../scripts/public-renderer.mjs';
const pageMap=new Map(pages.map(p=>[p.path,renderPage(p.key)]));
function mockFetch(origin,mode='preview'){
 return async(url)=>{const path=new URL(url).pathname;
  if(path==='/robots.txt')return new Response(mode==='preview'?'User-agent: *\nDisallow: /\n':'User-agent: *\nAllow: /\nSitemap: '+origin+'/sitemap.xml\n',{status:200,headers:{'Content-Type':'text/plain'}});
  if(path==='/sitemap.xml')return new Response('<?xml version="1.0"?><urlset>'+'<url/>'.repeat(8)+'</urlset>',{status:200,headers:{'Content-Type':'text/xml'}});
  if(pageMap.has(path))return new Response(pageMap.get(path),{status:200,headers:{'Content-Type':'text/html'}});
  return new Response('Not found',{status:404});
 };
}
test('preview catches accidental indexing, missing video and active payment controls',()=>{
 const issue=renderPage('garden');assert.deepEqual(validateHtml('/issues/garden/',issue,'preview'),[]);
 assert(validateHtml('/issues/garden/',issue.replace('issue-video-section','removed'),'preview').includes('video_not_before_policy'));
 assert(validateHtml('/donate/',renderPage('donate').replace('disabled','enabled'),'preview').includes('payment_input_enabled_in_preview'));
 assert(validateHtml('/',renderPage('index').replace('noindex,nofollow','index,follow'),'preview').includes('preview_should_be_noindex'));
});
test('HTTP preview probe checks all eight public routes without data writes',async()=>{
 const out=await smokePublic('https://campaign.example',{fetcher:mockFetch('https://campaign.example')});
 assert.equal(out.checks.length,9);assert.equal(out.passed,true);
});
test('production probe fails closed on noindexed preview and does not silently pass',async()=>{
 const out=await smokePublic('https://campaign.example',{mode:'production',fetcher:mockFetch('https://campaign.example','production')});
 assert.equal(out.checks.length,10);assert.equal(out.passed,false);
 assert(out.checks.find(x=>x.path==='/')?.issues.includes('production_is_noindexed'));
});
test('portal probe verifies readiness and protected library denies anonymous visitors',async()=>{
 const ok=await smokePortal('https://volunteer.example',{fetcher:async url=>new Response('',{status:new URL(url).pathname==='/api/materials'?401:200})});assert(ok.passed);
 const bad=await smokePortal('https://volunteer.example',{fetcher:async url=>new Response('',{status:new URL(url).pathname==='/api/materials'?200:503})});assert(!bad.passed);
});
test('only HTTPS origins and explicit modes are valid',async()=>{
 assert.throws(()=>args(['--public','http://example.org']));
 assert.throws(()=>args(['--public','https://example.org','--mode','production']));
 await assert.rejects(()=>smokePublic('https://example.org/admin'));
});
