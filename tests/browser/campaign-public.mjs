import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
import {startCampaignPublicHarness} from './campaign-public-server.mjs';
const out='test-results/browser/campaign-public';await mkdir(out,{recursive:true});const results=[];
for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const h=await startCampaignPublicHarness(),browser=await engine.launch();
 h.documents.night.heroBackground={default:{preset:'aurora',animated:true,intensity:55,opacity:58,blur:56,speed:'slow'},day:null,night:{preset:'beams',animated:false,intensity:55,opacity:58,blur:30,speed:'slow'}};
 h.documents.day.heroBackground={default:{preset:'clouds',animated:true,intensity:60,opacity:64,blur:46,speed:'slow'},day:{preset:'halo',animated:true,intensity:68,opacity:62,blur:30,speed:'medium'},night:null};
 const context=await browser.newContext({httpCredentials:{username:'preview',password:h.password},colorScheme:'dark',reducedMotion:'reduce',viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(h.origin+'/');await page.waitForFunction(()=>document.documentElement.dataset.campaignMode==='night');
  assert.equal(await page.title(),'Synthetic night title');assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),'Synthetic supporting text');
  assert.equal(await page.locator('.hero img.candidate').getAttribute('alt'),'Synthetic published portrait description');
  assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(16, 16, 16)');
  assert.equal(await page.locator('.campaign-hero-effect').getAttribute('data-effect'),'beams');
  assert.equal(await page.locator('.campaign-hero-effect').getAttribute('data-animated'),'false');
  assert.equal(await page.locator('.campaign-hero-effect .hfx-layer').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.screenshot({path:`${out}/${name}-night-desktop.png`});
  for(const path of ['/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/','/volunteer/','/donate/','/notices/']){const response=await page.goto(h.origin+path);assert.equal(response.status(),200);await page.waitForFunction(()=>document.documentElement.dataset.campaignMode==='night');}
  await page.goto(h.origin+'/');await page.locator('[name="appearance"]').selectOption('day');await page.locator('.campaign-appearance button').click();await page.waitForFunction(()=>document.documentElement.dataset.campaignMode==='day');
  assert.equal(await page.title(),'Synthetic day title');
  assert.equal(await page.locator('.campaign-hero-effect').getAttribute('data-effect'),'halo');
  assert.equal(await page.locator('.campaign-hero-effect').getAttribute('data-animated'),'true');
  assert.equal(await page.locator('.campaign-hero-effect .hfx-layer').evaluate(el=>getComputedStyle(el).animationName),'none','Reduced-motion browser must not animate');
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  await page.waitForFunction(()=>document.querySelector('.campaign-hero-effect')?.dataset.running==='false');
  await page.goto(h.origin+'/issues/');assert.equal(await page.locator('html').getAttribute('data-campaign-mode'),'day');
  await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});assert.equal(await page.locator('html').getAttribute('data-campaign-mode'),'day');
  await page.locator('[name="appearance"]').selectOption('system');await page.locator('.campaign-appearance button').click();await page.waitForFunction(()=>document.documentElement.dataset.campaignMode==='night');
  await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.campaignMode==='day');
  await page.goto(h.origin+'/');await page.screenshot({path:`${out}/${name}-day-desktop.png`});
  for(const appearance of ['day','night'])for(const width of [1280,780,700,375,320]){
   await page.setViewportSize({width,height:900});await page.goto(h.origin+'/?appearance='+appearance);await page.waitForFunction(expected=>document.documentElement.dataset.campaignMode===expected,appearance);
   const size=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.viewport,`${name} ${appearance} overflow at ${width}: ${JSON.stringify(size)}`);
   const hero=await page.locator('.hero').boundingBox(),heading=await page.locator('.hero h1').boundingBox();assert.ok(heading.y+heading.height<=hero.y+hero.height,`${name}: heading escapes hero`);
   if(width<=780){
    const copy=await page.locator('.hero-copy').boundingBox(),portrait=await page.locator('.hero .candidate').boundingBox();assert.ok(portrait.y>=copy.y+copy.height-1,`${name}: portrait overlaps mobile copy`);
    const menu=page.locator('.mobile-menu');assert.ok(await menu.isVisible());
    const contrast=await menu.evaluate(el=>{
     const style=getComputedStyle(el);const luminance=color=>{const c=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;};const a=luminance(style.color),b=luminance(style.backgroundColor);return(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
    });assert.ok(contrast>=4.5,`${name}: unreadable mobile menu`);
    await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');const dropdown=await page.locator('.navlinks').boundingBox(),header=await page.locator('.header').boundingBox();assert.ok(dropdown.y>=header.y+header.height-1,`${name}: menu covers appearance controls`);await menu.click();
   }
  }
  await page.screenshot({path:`${out}/${name}-night-mobile.png`});
  h.documents.night.fields['home.metadata.title']='Synthetic revised title';h.publish();await page.reload();assert.equal(await page.title(),'Synthetic revised title');
  // Without JavaScript, explicit mode selection still works through a normal GET form.
  const plain=await browser.newContext({javaScriptEnabled:false,httpCredentials:{username:'preview',password:h.password}});const plainPage=await plain.newPage();await plainPage.goto(h.origin+'/?appearance=night');assert.equal(await plainPage.locator('html').getAttribute('data-campaign-mode'),'night');await plain.close();
  h.disable();await page.reload();assert.equal(await page.locator('html').getAttribute('data-campaign-mode'),'default');assert.equal(await page.locator('.campaign-appearance').count(),0);
  const noJs=await browser.newContext({javaScriptEnabled:false,httpCredentials:{username:'preview',password:h.password}});const noJsPage=await noJs.newPage();await noJsPage.goto(h.origin+'/?appearance=night');assert.equal(await noJsPage.locator('html').getAttribute('data-campaign-mode'),'default');await noJs.close();
  assert.deepEqual(errors,[]);results.push({browser:name,status:'passed',scope:'real preview server and shared templates with synthetic published-store adapter'});
 }finally{await context.close();await browser.close();await h.close();}
}
await writeFile(out+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
