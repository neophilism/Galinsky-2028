import test from 'node:test';import assert from 'node:assert/strict';
import {pages,renderPage} from '../scripts/public-renderer.mjs';
test('all public routes have a focusable main landmark and working skip link',()=>{
 for(const page of pages){
  const html=renderPage(page.key);
  assert.match(html,/<main id="main" tabindex="-1"/,page.key);
  assert.match(html,/href="#main"/,page.key);
  assert.equal((html.match(/id="main"/g)||[]).length,1,page.key);
 }
});
test('production and not-found routes preserve accessible main landmark',()=>{
 const page=renderPage('404');
 assert.match(page,/<main id="main" tabindex="-1"/);
 assert.match(page,/content="noindex,nofollow"/);
});
