import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';

const labels=JSON.parse(await readFile('apps/portal/src/visitor-control-labels.json','utf8'));
assert(labels['/']?.l1,'Home control names should be generated before portal build');
assert.match(labels['/issues/kirk-evers/']?.a1||'',/Does this protect people/);
const root=resolve('dist/web'),received=[];
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  if(path==='/api/visitor-analytics'){
   let data='';for await(const chunk of req)data+=chunk;
   received.push(JSON.parse(data));res.writeHead(204);res.end();return;
  }
  let file=resolve(root,'.'+path);
  assert(file===root||file.startsWith(root+'/'));
  if(!extname(file))file=resolve(file,'index.html');
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:450,height:850}});
 const page=await context.newPage();
 await page.goto(origin+'/');
 await page.locator('.analytics-choice').waitFor();
 assert.equal(received.length,0,'No collection before opt-in');
 await page.getByRole('button',{name:'No thanks'}).click();
 await page.waitForTimeout(100);
 assert.equal(received.length,0,'Decline must not transmit');
 await page.reload();
 assert.equal(await page.locator('.analytics-choice').count(),0,'Decline persisted');
 await page.goto(origin+'/notices/');
 await page.getByRole('button',{name:'Change or revoke analytics preference'}).click();
 await page.getByRole('button',{name:'Allow anonymous analytics'}).click();
 await page.waitForTimeout(250);
 assert(received.some(x=>x.action==='start'),'Opt-in should start tracking');
 received.length=0;
 await page.goto(origin+'/issues/kirk-evers/');
 await page.locator('main details summary').first().click();
 await page.evaluate(()=>{
  const target=document.querySelector('main .policy-main p');
  if(!target)throw Error('Missing synthetic interaction target');
  for(let i=0;i<3;i++)target.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1,clientX:40,clientY:80}));
  window.dispatchEvent(new Event('error'));
 });
 // A subsequent test fixture DOM insertion should not invalidate the earlier
 // dead-click mutation check; let the heuristic's 750 ms interval finish.
 await page.waitForTimeout(1050);
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<html><body>Synthetic player</body></html>'}));
 await page.evaluate(()=>{
  window.YT={Player:class {
   constructor(iframe,options){
    this.playback=1;this.duration=40;this.position=20;
    setTimeout(()=>options.events.onReady(),0);
    setTimeout(()=>options.events.onStateChange({data:1}),10);
   }
   getDuration(){return this.duration;}
   getCurrentTime(){return this.position;}
   getPlayerState(){return this.playback;}
  }};
  const panel=document.createElement('div');panel.dataset.video='abcDEF123_-';
  const iframe=document.createElement('iframe');
  iframe.src='https://www.youtube-nocookie.com/embed/abcDEF123_-?enablejsapi=1';
  panel.append(iframe);document.body.append(panel);
  window.dispatchEvent(new CustomEvent('g28:youtube-mounted',{detail:{iframe}}));
 });
 // Progress is sampled at 1.5s and then batched asynchronously. Wait for the
 // actual signed-off event shape, not a delay shorter than those two timers.
 for(let attempt=0;attempt<80&&!received.some(x=>x.events?.some(e=>e.kind==='youtube_progress'&&e.detail==='q50'));attempt++)await page.waitForTimeout(100);
 const events=received.filter(x=>Array.isArray(x.events)).flatMap(x=>x.events);
 assert(events.some(e=>e.kind==='accordion_open'),'FAQ opening was not recorded');
 assert(events.some(e=>e.kind==='funnel_step'&&e.detail==='policy_view'),'Policy funnel entry missing');
 assert(events.some(e=>e.kind==='device_class'&&e.detail==='mobile'),'Anonymous viewport class missing');
 assert(events.some(e=>e.kind==='rage_click'),'Rapid repeat clicks not recorded');
 assert(events.some(e=>e.kind==='dead_click'),'Noninteractive click heuristic not recorded');
 assert(events.some(e=>e.kind==='javascript_error'),'Sanitized script-error count missing');
 assert(events.some(e=>e.kind==='youtube_play'),'YouTube API playback start missing');
 assert(events.some(e=>e.kind==='youtube_progress'&&e.detail==='q50'),'YouTube quartile missing');
 assert(events.some(e=>e.kind==='click_heatmap'),'Document click density was not recorded');
 assert(events.every(e=>Object.keys(e).sort().join(',')==='amount,detail,kind,seq,target'));
 assert(!JSON.stringify(received).includes('Does this protect people'));
 await page.goto(origin+'/notices/');
 await page.getByRole('button',{name:'Change or revoke analytics preference'}).click();
 await page.goto(origin+'/');
 await page.waitForTimeout(150);
 assert(!received.some(x=>x.action==='start'&&x.path==='/'),'Revocation must stop new page collection');
 await context.close();

 const privateContext=await browser.newContext();
 await privateContext.addInitScript(()=>{Object.defineProperty(navigator,'globalPrivacyControl',{value:true,configurable:true});});
 const privatePage=await privateContext.newPage();
 received.length=0;
 await privatePage.goto(origin+'/');
 await privatePage.waitForTimeout(200);
 assert.equal(await privatePage.locator('.analytics-choice').count(),0,'Global Privacy Control avoids prompting');
 assert.equal(received.length,0,'Global Privacy Control blocks collection');
 await privateContext.close();
 console.log('Visitor analytics consent, FAQ and click events: verified in Chromium');
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
