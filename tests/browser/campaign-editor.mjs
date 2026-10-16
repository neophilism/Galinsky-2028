import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
import {startEditorHarness} from './campaign-editor-server.mjs';
import {id} from '../campaign-fixture.mjs';
const evidence='test-results/browser/campaign-editor';await mkdir(evidence,{recursive:true});
const results=[];
for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const harness=await startEditorHarness(),browser=await engine.launch(),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'Synthetic new campaign':undefined));
 const field=(key,which=id(1))=>page.locator(`textarea[data-id="${which}"][data-key="${key}"]`);
 try{
  await page.goto(harness.origin+'/editor/campaigns');await page.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Ready.'));
  assert.equal(await page.locator('.panel').count(),1);assert.equal(await page.locator('#fields textarea').count(),6);
  await page.locator('#view').selectOption('compare');await page.waitForFunction(()=>document.querySelectorAll('.panel').length===2);assert.equal(await page.locator('#fields textarea').count(),12);
  await field('home.hero.headline').fill('Edited synthetic headline');
  await page.locator('#view').selectOption('single');await page.locator('#view').selectOption('compare');assert.equal(await field('home.hero.headline').inputValue(),'Edited synthetic headline');
  await page.getByRole('button',{name:'Swap columns',exact:true}).click();assert.equal(await page.locator('#right').inputValue(),id(1));assert.equal(await field('home.hero.headline').inputValue(),'Edited synthetic headline');
  await page.getByRole('button',{name:'Save draft',exact:true}).nth(1).click();await page.waitForFunction(()=>document.getElementById('message').textContent==='Draft saved. The website has not changed.');assert.equal(harness.records.get(id(1)).revision,2);assert.equal(harness.records.get(id(2)).revision,1);
  // Self-comparison uses one in-memory draft, not two conflicting silent copies.
  await page.locator('#left').selectOption(id(1));await page.waitForFunction(()=>document.querySelectorAll('textarea[data-id="00000000-0000-4000-8000-000000000001"]').length===12);
  await field('home.hero.headline').first().fill('Shared synthetic edit');assert.equal(await field('home.hero.headline').nth(1).inputValue(),'Shared synthetic edit');
  // Save conflicts preserve entered text rather than reloading it away.
  harness.records.get(id(1)).revision++;
  await page.getByRole('button',{name:'Save draft',exact:true}).first().click();await page.waitForFunction(()=>document.getElementById('message').classList.contains('error'));assert.equal(await field('home.hero.headline').first().inputValue(),'Shared synthetic edit');
  await page.locator('#left').selectOption(id(2));await page.locator('#right').selectOption(id(2));
  await page.locator('.panel').first().getByText('Hero image and preview',{exact:true}).click();
  // Effects are edited beside the hero image, and day/night overrides remain independent.
  const effectPanel=page.locator('.panel').first();
  await effectPanel.getByRole('combobox',{name:'Background effect preset'}).selectOption('clouds');
  assert.equal(harness.records.get(id(2)).document.heroBackground?.default?.preset,undefined,'unsaved changes stay in the editor');
  assert.equal(await effectPanel.locator('.hero-preview .campaign-hero-effect').getAttribute('data-effect'),'clouds');
  await effectPanel.getByRole('combobox',{name:'Edit hero background for appearance'}).selectOption('night');
  assert.equal(await effectPanel.getByRole('checkbox',{name:'Inherit default effect for this appearance'}).isChecked(),true);
  await effectPanel.getByRole('checkbox',{name:'Inherit default effect for this appearance'}).uncheck();
  await effectPanel.getByRole('combobox',{name:'Background effect preset'}).selectOption('halo');
  await effectPanel.getByRole('combobox',{name:'Background motion speed'}).selectOption('still');
  assert.equal(await effectPanel.locator('.hero-preview .campaign-hero-effect').getAttribute('data-effect'),'halo');
  assert.notEqual(await effectPanel.locator('.hero-preview .hfx-a').evaluate(el=>getComputedStyle(el).backgroundImage),'none','Halo gradient is actually supported by this browser');
  await effectPanel.getByRole('combobox',{name:'Edit hero background for appearance'}).selectOption('default');
  assert.equal(await effectPanel.locator('.hero-preview .campaign-hero-effect').getAttribute('data-effect'),'clouds');
  await page.locator('.hero-controls input[maxlength="500"]').first().fill('Synthetic image description');assert.equal(await page.locator('.hero-preview img').first().getAttribute('alt'),'Synthetic image description');
  await page.locator('.theme-grid input[type="color"]').first().evaluate(el=>{el.value='#eeeeee';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('.hero-preview').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 238, 238)');
  await page.locator('input[type="file"]').first().setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:harness.raster});await page.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Image uploaded'));
  assert.equal(harness.media.size,1);await page.getByRole('button',{name:'Save draft',exact:true}).first().click();await page.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Draft saved'));assert.ok(harness.records.get(id(2)).document.hero.assetPath.startsWith('/campaign-media/'));
  assert.equal(harness.records.get(id(2)).document.heroBackground.default.preset,'clouds');
  assert.equal(harness.records.get(id(2)).document.heroBackground.night.preset,'halo');
  assert.equal(harness.records.get(id(2)).document.heroBackground.night.speed,'still');
  await page.locator('#default-campaign').selectOption(id(1));await page.locator('#mode-switching').check();await page.locator('#day-campaign').selectOption(id(2));await page.locator('#night-campaign').selectOption(id(2));
  await page.getByRole('button',{name:'Save website selection',exact:true}).click();await page.waitForFunction(()=>document.getElementById('settings-status').textContent==='Settings version 1');
  assert.equal(harness.getSettings().settings.modeSwitching,true);assert.equal(harness.getSettings().settings.day.campaignId,harness.getSettings().settings.night.campaignId);
  await page.locator('#mode-switching').uncheck();await page.getByRole('button',{name:'Save website selection',exact:true}).click();await page.waitForFunction(()=>document.getElementById('settings-status').textContent==='Settings version 2');assert.equal(harness.getSettings().settings.modeSwitching,false);
  await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Blank campaign created'));assert.equal(harness.records.size,3);
  await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.waitForFunction(()=>document.getElementById('left').value==='00000000-0000-4000-8000-000000000004');assert.equal(harness.records.size,4);
  await page.locator('#left').selectOption(id(2));await page.locator('#right').selectOption(id(1));
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${evidence}/${name}-desktop.png`});
  for(const width of [1280,700,375,320]){await page.setViewportSize({width,height:900});const dimensions=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.viewport,`${name}: overflow at ${width}: ${JSON.stringify(dimensions)}`);}
  await page.screenshot({path:`${evidence}/${name}-mobile.png`});
  // Script-looking text stays literal in the preview and text controls.
  await page.locator('.panel').first().getByText('Hero image and preview',{exact:true}).click();
  await field('home.hero.headline',id(2)).fill('<img src=x onerror="window.editorInjection=true">');assert.equal(await page.evaluate(()=>window.editorInjection),undefined);assert.ok((await page.locator('.hero-preview h3').first().textContent()).startsWith('<img'));
  await page.locator('#view').selectOption('preview');
  await page.waitForFunction(()=>document.querySelector('.draft-page-frame')?.getAttribute('srcdoc')?.includes('data-campaign="true"'));
  const preview=page.frameLocator('.draft-page-frame');
  assert.ok((await preview.locator('.hero h1').textContent()).startsWith('<img src=x onerror='));
  assert.equal(await preview.locator('.campaign-hero-effect').getAttribute('data-effect'),'clouds');
  await page.getByRole('combobox',{name:'Draft preview appearance'}).selectOption('night');
  await page.waitForFunction(()=>document.querySelector('.draft-page-frame')?.srcdoc.includes('data-effect="halo"'));
  assert.equal(await preview.locator('.campaign-hero-effect').getAttribute('data-effect'),'halo');
  assert.equal(await page.evaluate(()=>window.editorInjection),undefined);
  await page.getByRole('button',{name:'Mobile width'}).click();
  assert.ok((await page.locator('.draft-page-frame').boundingBox()).width<=375);
  assert.ok(harness.calls.some(call=>call.path==='/api/editorial/preview'&&call.method==='POST'));
  await page.locator('#view').selectOption('single');
  assert.deepEqual(errors,[]);results.push({browser:name,status:'passed',backend:'synthetic UI harness; real API and PostgreSQL tested separately',checks:18});
 }finally{await context.close();await browser.close();await harness.close();}
}
await writeFile(evidence+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
