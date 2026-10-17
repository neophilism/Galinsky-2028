import test from 'node:test';
import assert from 'node:assert/strict';
import {pages,renderPage} from '../scripts/public-renderer.mjs';

test('space policy has its own route and its own top-level heading',()=>{
 const entry=pages.find(p=>p.key==='eternal-liberty');
 assert.equal(entry?.path,'/policies/eternal-liberty/');
 const html=renderPage('eternal-liberty');
 assert.equal(html.split('<h1>').length-1,1);
 for(const section of ['mission','rights','financing','science','questions'])assert(html.includes('id="'+section+'"'));
 for(const term of ['SPISA','Lunar Far Side Reserve','American-backed','No celestial annexation'])assert(html.includes(term));
 assert(html.includes('aria-label="Eternal Liberty sections"'));
 assert(!html.includes('{{'));
});
test('site navigation links to the new policy without adding a fourth launch priority',()=>{
 for(const page of ['index','issues','eternal-liberty'])assert(renderPage(page).includes('href="/policies/eternal-liberty/"'));
 const issues=renderPage('issues');
 assert(issues.includes('THREE LAUNCH PRIORITIES'));
 assert(issues.includes('Kirk–Evers')&&issues.includes('The Garden')&&issues.includes('The Cornerstone'));
});
