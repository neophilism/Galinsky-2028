import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPage,site} from '../scripts/public-renderer.mjs';
const origin='https://campaign.example.test';
const production={...site,mode:'production',canonicalOrigin:origin};
test('share controls are completely absent from all password-gated preview pages',()=>{
 for(const key of ['index','issues','garden','cornerstone','kirk-evers','volunteer','donate']){
  const html=renderPage(key);
  assert(!html.includes('data-share-action'),key);
  assert(!html.includes('data-share-url'),key);
 }
});
test('only exact canonical issue URLs are shared, without tracking or private records',()=>{
 for(const key of ['garden','cornerstone','kirk-evers']){
  const html=renderPage(key,{site:production});
  const path='/issues/'+key+'/';
  assert(html.includes('data-share-url="'+origin+path+'"'));
  assert(html.includes('<link rel="canonical" href="'+origin+path+'">'));
  assert.equal((html.match(/data-share-action="(?:native|copy|qr)"/g)||[]).length,3);
  assert(html.includes('id="issue-share-qr" hidden'));
  assert(html.includes('aria-controls="issue-share-qr"'));
  assert(!html.includes('utm_'));
  assert(!html.includes('private-preview.onrender.com'));
 }
 for(const key of ['index','issues','volunteer','donate'])assert(!renderPage(key,{site:production}).includes('data-share-action'));
});
test('rejects malformed canonical origin rather than leaking a preview/tracking link',()=>{
 for(const url of ['http://example.com','https://example.com/path','https://person:password@example.com']){
  assert.throws(()=>renderPage('garden',{site:{...production,canonicalOrigin:url}}));
 }
});
