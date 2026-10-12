import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const home=await readFile('content/public/pages/index.html','utf8');
const issues=await readFile('content/public/pages/issues.html','utf8');
const css=await readFile('apps/web/public/assets/site.css','utf8');
for(const [name,path] of [['Kirk–Evers','kirk-evers'],['The Garden','garden'],['The Cornerstone','cornerstone']]){
 test(name+' card and full issue row point to an actual proposal route',()=>{
  assert(home.includes('aria-label="Explore the '+name+' proposal" href="/issues/'+path+'/"'));
  assert(issues.includes('aria-label="Read the '+name+' proposal" href="/issues/'+path+'/"'));
  assert(home.includes('href="/issues/'+path+'/">'));
 });
}
test('both article styles extend their CTA hit area to the full card',()=>{
 assert(css.includes('.issue-card .issue-card-body>.textlink::after'));
 assert(css.includes('.issue-wide .content>.actions>.btn::after'));
 assert.match(css,/\.issue-card,\.issue-wide\{position:relative;cursor:pointer\}/);
 assert.match(css,/inset:0/);
 assert.match(css,/\.issue-card:focus-within,\.issue-wide:focus-within/);
});
test('all three promise-strip priorities are actual keyboard-focusable links',()=>{
 const match=home.match(/<nav class="promise-items" aria-label="Explore the campaign priorities">([\s\S]*?)<\/nav>/);
 assert(match,'expected a navigation landmark instead of inert spans');
 const urls=[...match[1].matchAll(/<a href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(urls,['/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/']);
 assert(css.includes('.promise-items a:focus-visible'));
});
