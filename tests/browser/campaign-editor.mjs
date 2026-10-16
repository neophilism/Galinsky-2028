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
  assert.equal(await page.locator('.panel').count(),1);assert.equal(await page.locator('#fields textarea').count(),35);
  await page.locator('#view').selectOption('compare');await page.waitForFunction(()=>document.querySelectorAll('.panel').length===2);assert.equal(await page.locator('#fields textarea').count(),70);
  await field('home.hero.headline').fill('Edited synthetic headline');
  await page.locator('#view').selectOption('single');await page.locator('#view').selectOption('compare');assert.equal(await field('home.hero.headline').inputValue(),'Edited synthetic headline');
  await page.getByRole('button',{name:'Swap columns',exact:true}).click();assert.equal(await page.locator('#right').inputValue(),id(1));assert.equal(await field('home.hero.headline').inputValue(),'Edited synthetic headline');
  await page.getByRole('button',{name:'Save draft',exact:true}).nth(1).click();await page.waitForFunction(()=>document.getElementById('message').textContent==='Draft saved. The website has not changed.');assert.equal(harness.records.get(id(1)).revision,2);assert.equal(harness.records.get(id(2)).revision,1);
  // Self-comparison uses one in-memory draft, not two conflicting silent copies.
  await page.locator('#left').selectOption(id(1));await page.waitForFunction(()=>document.querySelectorAll('textarea[data-id="00000000-0000-4000-8000-000000000001"]').length===70);
  await field('home.hero.headline').first().fill('Shared synthetic edit');assert.equal(await field('home.hero.headline').nth(1).inputValue(),'Shared synthetic edit');
  // Save conflicts preserve entered text rather than reloading it away.
  harness.records.get(id(1)).revision++;
  await page.getByRole('button',{name:'Save draft',exact:true}).first().click();await page.waitForFunction(()=>document.getElementById('message').classList.contains('error'));assert.equal(await field('home.hero.headline').first().inputValue(),'Shared synthetic edit');
  await page.locator('#left').selectOption(id(2));await page.locator('#right').selectOption(id(2));
  await page.locator('.hero-controls input[maxlength="500"]').first().fill('Synthetic image description');assert.equal(await page.locator('.hero-preview img').first().getAttribute('alt'),'Synthetic image description');
  await page.locator('.theme-grid input[type="color"]').first().evaluate(el=>{el.value='#eeeeee';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('.hero-preview').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 238, 238)');
  await page.locator('input[type="file"]').first().setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:harness.raster});await page.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Image uploaded'));
  assert.equal(harness.media.size,1);await page.getByRole('button',{name:'Save draft',exact:true}).first().click();await page.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Draft saved'));assert.ok(harness.records.get(id(2)).document.hero.assetPath.startsWith('/campaign-media/'));
  await page.locator('#default-campaign').selectOption(id(1));await page.locator('#mode-switching').check();await page.locator('#day-campaign').selectOption(id(2));await page.locator('#night-campaign').selectOption(id(2));
  await page.getByRole('button',{name:'Save website selection',exact:true}).click();await page.waitForFunction(()=>document.getElementById('settings-status').textContent==='Settings version 1');
  assert.equal(harness.getSettings().settings.modeSwitching,true);assert.equal(harness.getSettings().settings.day.campaignId,harness.getSettings().settings.night.campaignId);
  await page.locator('#mode-switching').uncheck();await page.getByRole('button',{name:'Save website selection',exact:true}).click();await page.waitForFunction(()=>document.getElementById('settings-status').textContent==='Settings version 2');assert.equal(harness.getSettings().settings.modeSwitching,false);
  await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Blank campaign created'));assert.equal(harness.records.size,3);
  await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.waitForFunction(()=>document.getElementById('left').value==='00000000-0000-4000-8000-000000000004');assert.equal(harness.records.size,4);
  await page.locator('#left').selectOption(id(2));await page.locator('#right').selectOption(id(1));
  await page.screenshot({path:`${evidence}/${name}-desktop.png`});
  for(const width of [1280,700,375,320]){await page.setViewportSize({width,height:900});const dimensions=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.viewport,`${name}: overflow at ${width}: ${JSON.stringify(dimensions)}`);}
  await page.screenshot({path:`${evidence}/${name}-mobile.png`});
  // Script-looking text stays literal in the preview and text controls.
  await field('home.hero.headline',id(2)).fill('<img src=x onerror="window.editorInjection=true">');assert.equal(await page.evaluate(()=>window.editorInjection),undefined);assert.ok((await page.locator('.hero-preview h3').first().textContent()).startsWith('<img'));
  assert.deepEqual(errors,[]);results.push({browser:name,status:'passed',backend:'synthetic UI harness; real API and PostgreSQL tested separately',checks:18});
 }finally{await context.close();await browser.close();await harness.close();}
}
await writeFile(evidence+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
