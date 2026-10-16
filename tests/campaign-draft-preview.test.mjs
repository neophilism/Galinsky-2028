import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCampaignDraftPage} from '../apps/api/src/campaign-draft-preview.mjs';
import {fixture} from './campaign-fixture.mjs';

const original=()=>{const d=fixture();d.hero.assetPath='/assets/candidate.webp';return d;};
test('private draft preview renders every shared page without database publication',()=>{
 const doc=original();
 for(const page of ['home','issues','issue-freedom','issue-repair','issue-opportunity','volunteer','donate','notices']){
  const html=renderCampaignDraftPage(doc,page);
  assert.ok(html.includes('data-campaign="true"'),page);
  assert.ok(!html.includes(doc.internalName),page);
  assert.ok(html.includes('data-campaign-theme'),page);
  assert.ok(!html.includes('data-campaign-mode-enabled="true"'),page);
 }
});
test('draft changes immediately affect preview without saving or editing immutable releases',()=>{
 const doc=original();doc.fields['home.hero.headline']='Unsaved synthetic change & <script>alert("x")</script>';
 const html=renderCampaignDraftPage(doc,'home');
 assert.ok(html.includes('Unsaved synthetic change &amp; &lt;script&gt;'),html.slice(0,200));
 assert.ok(!html.includes('Unsaved synthetic change & <script>'));
 assert.ok(!html.includes('class="campaign-appearance"'));
});
test('trusted assets stay relative to protected editor and uploaded media uses protected route',()=>{
 const doc=original();let html=renderCampaignDraftPage(doc,'home');
 assert.ok(html.includes('/editor/campaigns/preview-assets/design.css'));
 assert.ok(html.includes('/editor/campaigns/preview-assets/candidate.webp'));
 doc.hero.assetPath='/campaign-media/00000000-0000-4000-8000-000000000001.png';
 html=renderCampaignDraftPage(doc,'home');
 assert.ok(html.includes('/api/editorial/media/00000000-0000-4000-8000-000000000001'));
 assert.ok(!html.includes('src="/campaign-media/00000000'));
});
test('incomplete, unknown and low-contrast drafts cannot be mistaken for a complete public page',()=>{
 const d=original();delete d.fields['home.hero.headline'];
 assert.throws(()=>renderCampaignDraftPage(d,'home'),e=>e.code==='missing_content');
 assert.throws(()=>renderCampaignDraftPage(original(),'untrusted'),e=>e.code==='invalid_page');
 const bad=original();bad.theme.text='#FFFFFF';
 assert.throws(()=>renderCampaignDraftPage(bad,'home'),e=>e.code==='insufficient_contrast');
});
