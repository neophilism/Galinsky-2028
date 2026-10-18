import test from 'node:test';
import assert from 'node:assert/strict';
import {indexingDocuments,publicRelease} from '../packages/core/indexing.mjs';
import {pages,site,renderPage} from '../scripts/public-renderer.mjs';

test('preview mode stays unindexed even when a canonical URL is set',()=>{
 const docs=indexingDocuments({...site,canonicalOrigin:'https://example.org'},pages,{});
 assert.match(docs.robots,/Disallow: \/\n/);
 assert.equal(docs.sitemap,null);
});
test('production requires verified HTTPS canonical origin',()=>{
 assert.throws(()=>indexingDocuments({...site,mode:'production'},pages,{}),/CANONICAL_ORIGIN/);
 assert.throws(()=>publicRelease({...site,mode:'production',canonicalOrigin:'http:\/\/insecure.example'},{}));
 assert.throws(()=>indexingDocuments({...site,mode:'production',canonicalOrigin:'https://valid.test/path'},pages,{}));
});
test('production sitemap includes exactly all public pages and no private routes',()=>{
 const canonical='https://www.example.org';
 const docs=indexingDocuments({...site,mode:'production',canonicalOrigin:canonical},pages,{});
 assert.equal((docs.sitemap.match(/<url>/g)||[]).length,pages.length);
 assert.match(docs.robots,/Allow: \/\nSitemap: https:\/\/www.example.org\/sitemap.xml/);
 for(const page of pages)assert.ok(docs.sitemap.includes('<loc>'+canonical+page.path+'</loc>'));
 assert.ok(!docs.sitemap.includes('/api/'));
 assert.ok(!docs.sitemap.includes('/settings'));
});
test('search publisher rejects invalid paths, malformed modes and duplicate routes',()=>{
 const cfg={...site,mode:'production',canonicalOrigin:'https://www.example.org'};
 assert.throws(()=>indexingDocuments(cfg,[{path:'/../private/'}],{}));
 assert.throws(()=>indexingDocuments(cfg,[],{}));
 assert.throws(()=>publicRelease({...site,mode:'oops'},{}));
 assert.equal((indexingDocuments(cfg,[{path:'/'},{path:'/'}],{}).sitemap.match(/<url>/g)||[]).length,1);
});
test('public page metadata is unique, descriptive and not labeled design preview',()=>{
 assert.equal(new Set(pages.map(p=>p.title)).size,pages.length);
 for(const p of pages){
  assert.ok(p.description.length>=50);
  assert.ok(!p.title.includes('Design Preview'));
  const html=renderPage(p.key);
  assert.ok(html.includes('<title>'+p.title+'</title>'));
  assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
  assert.ok(html.includes('<meta property="og:site_name" content="Galinsky 2028">'));
 }
});
