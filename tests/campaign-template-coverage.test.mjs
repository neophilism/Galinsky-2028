import test from 'node:test';
import assert from 'node:assert/strict';
import {pages,renderPage} from '../scripts/public-renderer.mjs';
import {compileCampaignTemplate,renderCampaignTemplate,campaignTemplateCoverage,indexTrustedHtml} from '../packages/core/campaign-template.mjs';
import {fixture} from './campaign-fixture.mjs';
import {publicCampaignDocument} from '../packages/core/campaign-content.mjs';
// The existing eight campaign-variant templates remain the editable baseline.
// Supplemental policy pages are rendered as static content until dedicated editorial slots are defined.
const source=pages.filter(page=>page.key!=='eternal-liberty').map(page=>({page,html:renderPage(page.key)}));
const compiled=source.map(({page,html})=>compileCampaignTemplate(html,page.key));
test('actual shared page templates bind every configured field exactly where intended',()=>{assert.equal(compiled.length,8);assert.deepEqual(campaignTemplateCoverage(compiled),[]);});
test('synthetic revisions render all real templates with matching metadata and no private names',()=>{const document=publicCampaignDocument(fixture());for(const template of compiled){const html=renderCampaignTemplate(template,document);assert.ok(!html.includes('Synthetic example'));assert.ok(html.includes('data-campaign="true"'));indexTrustedHtml(html);if(template.page!=='notices')assert.ok(html.includes('<title>Synthetic text</title>'));}});
test('legal and payment operational blocks remain byte-identical after campaign rendering',()=>{const original=source.find(x=>x.page.key==='donate').html;const rendered=renderCampaignTemplate(compiled.find(x=>x.routeKey==='donate'),publicCampaignDocument(fixture()));for(const pattern of [/<div class="eligibility">[\s\S]*?<\/div>/,/<div class="committee-copy">[\s\S]*?<\/div>/,/<p class="reporting-notice">[\s\S]*?<\/p>/]){const expected=original.match(pattern)?.[0];assert.ok(expected);assert.ok(rendered.includes(expected));}});
