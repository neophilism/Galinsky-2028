import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CampaignError,HERO_EFFECT_DEFAULT,HERO_EFFECT_PRESETS,validateHeroEffect,
 validateHeroBackground,resolveHeroBackground,validateCampaignDocument,
 publicCampaignDocument,validatePublicCampaignDocument
} from '../packages/core/campaign-content.mjs';
import {heroBackdropMarkup,heroEffectNeedsScript} from '../packages/core/campaign-hero-effects.mjs';
import {fixture} from './campaign-fixture.mjs';
import {renderCampaignDraftPage} from '../apps/api/src/campaign-draft-preview.mjs';
import {renderPage} from '../scripts/public-renderer.mjs';
import {compileCampaignTemplate,renderCampaignTemplate,indexTrustedHtml} from '../packages/core/campaign-template.mjs';
const base=()=>({default:{...HERO_EFFECT_DEFAULT},day:null,night:null});
const rejects=(code,fn)=>assert.throws(fn,e=>e instanceof CampaignError&&e.code===code);
test('older persisted documents continue to round-trip with the new default',()=>{
 const old=fixture();assert.deepEqual(validateCampaignDocument(old,{publishing:true}),old);
 const published=publicCampaignDocument(old);assert.equal(Object.hasOwn(published,'heroBackground'),false);
 assert.equal(resolveHeroBackground(published.heroBackground).preset,'aurora');
});
test('all preset IDs are distinct, bounded and legacy is opt-in',()=>{
 const ids=HERO_EFFECT_PRESETS.map(x=>x.id);assert.equal(ids.length,8);
 assert.equal(new Set(ids).size,8);assert.ok(ids.includes('none')&&ids.includes('legacy'));
 for(const preset of ids){
  const doc={heroBackground:{default:{...HERO_EFFECT_DEFAULT,preset}}};
  const markup=heroBackdropMarkup(doc);
  if(preset==='legacy')assert.equal(markup,'<canvas aria-hidden="true" class="flag-canvas"></canvas>');
  else if(preset==='none')assert.equal(markup,'');
  else{assert.match(markup,/class="campaign-hero-effect"/);assert.match(markup,new RegExp('data-effect="'+preset+'"'));assert.ok(!markup.includes('flag-canvas'));}
 }
});
test('unknown effect values, extra settings and arbitrary HTML/CSS input are rejected',()=>{
 for(const value of ['',null,7,'aurora\" onclick=\"evil','custom'])rejects('invalid_hero_effect',()=>validateHeroEffect({...HERO_EFFECT_DEFAULT,preset:value}));
 for(const value of [-1,101,1.5,NaN,Infinity,'33',null])rejects('invalid_hero_parameter',()=>validateHeroEffect({...HERO_EFFECT_DEFAULT,intensity:value}));
 rejects('unknown_field',()=>validateHeroEffect({...HERO_EFFECT_DEFAULT,style:'background:url(https://invalid)'}));
 rejects('unknown_field',()=>validateHeroBackground({...base(),constructor:'evil'}));
 rejects('unknown_field',()=>validateCampaignDocument({...fixture(),heroBackground:{...base(),css:'alert(1)'}}));
 rejects('invalid_hero_speed',()=>validateHeroEffect({...HERO_EFFECT_DEFAULT,speed:'extreme'}));
 rejects('invalid_hero_animation',()=>validateHeroEffect({...HERO_EFFECT_DEFAULT,animated:'true'}));
 rejects('invalid_hero_mode',()=>resolveHeroBackground(base(),'mobile'));
});
test('appearance overrides are independent and fallback inherits default',()=>{
 const data=base();data.default.preset='clouds';
 assert.equal(resolveHeroBackground(data,'night').preset,'clouds');
 data.night={...HERO_EFFECT_DEFAULT,preset:'silk',opacity:71,animated:false};
 data.day={...HERO_EFFECT_DEFAULT,preset:'halo',speed:'medium'};
 assert.equal(resolveHeroBackground(data,'night').opacity,71);
 assert.equal(resolveHeroBackground(data,'day').preset,'halo');
 assert.equal(resolveHeroBackground(data,'default').preset,'clouds');
 assert.equal(heroEffectNeedsScript({heroBackground:data},'night'),false);
 assert.equal(heroEffectNeedsScript({heroBackground:data},'day'),true);
});
test('animation may be disabled, paused or inherit a slow default',()=>{
 let document={heroBackground:{default:{...HERO_EFFECT_DEFAULT,animated:false}}};
 assert.match(heroBackdropMarkup(document),/data-animated="false"/);
 assert.equal(heroEffectNeedsScript(document),false);
 document.heroBackground.default={...HERO_EFFECT_DEFAULT,speed:'still'};
 assert.match(heroBackdropMarkup(document),/data-speed="still"/);
 assert.equal(heroEffectNeedsScript(document),false);
 document.heroBackground.default={...HERO_EFFECT_DEFAULT,speed:'medium',opacity:33,intensity:77,blur:10};
 const markup=heroBackdropMarkup(document);
 assert.match(markup,/--hfx-opacity:0.33/);assert.match(markup,/--hfx-intensity:0.77/);
 assert.match(markup,/--hfx-duration:22s/);assert.match(markup,/--hfx-blur:9px/);
});
test('a revision publishes complete effects without leaking its private label',()=>{
 const raw=fixture();raw.heroBackground={default:{...HERO_EFFECT_DEFAULT},day:null,night:{...HERO_EFFECT_DEFAULT,preset:'beams'}};
 const published=publicCampaignDocument(raw);
 assert.deepEqual(validatePublicCampaignDocument(published),published);
 assert.deepEqual(published.heroBackground,raw.heroBackground);
 assert.ok(!JSON.stringify(published).includes(raw.internalName));
 assert.notStrictEqual(published.heroBackground,raw.heroBackground);
});
test('shared hero template replaces particles and includes only static self-hosted assets',()=>{
 const doc=publicCampaignDocument(fixture());const template=compileCampaignTemplate(renderPage('index'),'index');
 for(const appearance of ['default','night']){
  const html=renderCampaignTemplate(template,doc,{mode:appearance});
  assert.ok(!html.includes('<canvas aria-hidden="true" class="flag-canvas"></canvas>'));
  assert.ok(html.includes('data-effect="aurora"'));
  assert.ok(html.includes('href="/assets/hero-effects.css"'));
  assert.ok(html.includes('src="/assets/hero-effects.js"'));
  indexTrustedHtml(html);
 }
 const raw=fixture();raw.heroBackground={default:{...HERO_EFFECT_DEFAULT,preset:'legacy'},day:null,night:null};
 const legacy=renderCampaignTemplate(template,publicCampaignDocument(raw));
 assert.ok(legacy.includes('<canvas aria-hidden="true" class="flag-canvas"></canvas>'));
 assert.ok(!legacy.includes('src="/assets/hero-effects.js"'));
 raw.heroBackground.default.preset='none';
 assert.equal(renderCampaignTemplate(template,publicCampaignDocument(raw)).includes('class="campaign-hero-effect"'),false);
});
test('unpublished draft preview accepts an appearance without publishing or leaking private copy',()=>{
 const doc=fixture();doc.hero.assetPath='/assets/candidate.webp';
 doc.heroBackground={default:{...HERO_EFFECT_DEFAULT,preset:'clouds'},day:null,night:{...HERO_EFFECT_DEFAULT,preset:'halo'}};
 const a=renderCampaignDraftPage(doc,'home');
 const b=renderCampaignDraftPage(doc,'home','night');
 assert.ok(a.includes('data-effect="clouds"'));assert.ok(b.includes('data-effect="halo"'));
 assert.ok(b.includes('/editor/campaigns/preview-assets/hero-effects.css'));
 assert.ok(!b.includes(doc.internalName));rejects('invalid_preview_mode',()=>renderCampaignDraftPage(doc,'home','untrusted'));
});
