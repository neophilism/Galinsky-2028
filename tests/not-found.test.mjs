import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPage,site,pages} from '../scripts/public-renderer.mjs';

test('404 has dedicated explanation, one heading and useful campaign navigation',()=>{
 const html=renderPage('404');
 assert.match(html,/<title>Page Not Found \| Galinsky 2028<\/title>/);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('We couldn’t find that page.'));
 assert.ok(html.includes('href="/issues/"'));
 assert.ok(html.includes('href="/"'));
 assert.ok(!html.includes('<h1>Campaign notices.</h1>'));
 assert.ok(!html.includes('id="resources"'));
 assert.ok(html.includes('content="noindex,nofollow"'));
});

test('404 remains non-indexable without canonical URL in production',()=>{
 const html=renderPage('404',{site:{...site,mode:'production',canonicalOrigin:'https://example.org'}});
 assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
 assert.ok(!html.includes('<link rel="canonical"'));
 assert.ok(!html.includes('<meta property="og:url"'));
 assert.ok(html.includes('class="brand"'));
});

test('404 does not leak into the public sitemap pages',()=>{
 assert.ok(pages.some(p=>p.key==='eternal-liberty'));
 assert.ok(!pages.find(p=>p.key==='404'));
 assert.throws(()=>renderPage('404x'),/Unknown page/);
});
