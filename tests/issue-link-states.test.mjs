import test from 'node:test';import assert from 'node:assert/strict';
import {site,renderPage} from '../scripts/public-renderer.mjs';
test('unverified Garden and Cornerstone websites never masquerade as working links',()=>{
 for(const slug of ['garden','cornerstone']){
  const html=renderPage(slug);
  assert(!html.includes('{{DESTINATION:'));
  assert(!html.includes('data-destination="'+slug+'" href="/notices/#resources"'));
  assert((html.match(/data-pending-issue="/g)||[]).length>=3,slug);
  assert(html.includes('Full issue site link pending verification'));
  assert(!html.includes('Mockup copy is awaiting final policy review'));
  assert(html.includes('issue-video-section'));
 }
});
test('a verified HTTPS website replaces every external CTA without changing video placement',()=>{
 for(const slug of ['garden','cornerstone']){
  const cfg=structuredClone(site);cfg.issues[slug].websiteUrl='https://www.example.org/proposal?revision=1&source=issue';
  const html=renderPage(slug,{site:cfg});
  const escaped='href="https://www.example.org/proposal?revision=1&amp;source=issue"';
  assert((html.match(/rel="noopener noreferrer"/g)||[]).length>=3,slug);
  assert(html.includes(escaped),slug);
  assert(!html.includes('data-pending-issue="'+slug+'"'));
  assert(html.indexOf('issue-video-section')<html.indexOf('policy-hero'));
 }
});
test('unsafe configured issue URLs fail closed',()=>{
 for(const url of ['http://example.org/','https://user:pass@example.org/','https://localhost/','https://127.0.0.1/','https://example.local/','https://example.org:444/']){
  const cfg=structuredClone(site);cfg.issues.garden.websiteUrl=url;
  assert.throws(()=>renderPage('garden',{site:cfg}),undefined,url);
 }
});
